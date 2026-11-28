import AsyncStorage from '@react-native-async-storage/async-storage';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { FlatList, FlatListProps, NativeScrollEvent, NativeSyntheticEvent } from 'react-native';

type ItemHistory = {
  read: ReadonlySet<string>;
  archived: ReadonlySet<string>;
};

type ItemStatus = 'unread' | 'read' | 'archived';
const pendingWrites = new Map<string, Promise<void>>();
const viewabilityConfig = { itemVisiblePercentThreshold: 50 };

function isKeyList(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === 'string');
}

async function loadHistory(storageKey: string): Promise<ItemHistory> {
  await pendingWrites.get(storageKey);
  const stored = await AsyncStorage.getItem(storageKey);
  if (stored === null) return { read: new Set(), archived: new Set() };

  const data: unknown = JSON.parse(stored);
  if (!data || typeof data !== 'object' || !('read' in data) || !('archived' in data) ||
      !isKeyList(data.read) || !isKeyList(data.archived)) {
    throw new Error('Historique invalide');
  }
  const archived = new Set(data.archived);
  return { read: new Set(data.read.filter((key) => !archived.has(key))), archived };
}

function saveHistory(storageKey: string, history: ItemHistory) {
  const stored = JSON.stringify({ read: [...history.read], archived: [...history.archived] });
  const write = (pendingWrites.get(storageKey) ?? Promise.resolve()).then(() => AsyncStorage.setItem(storageKey, stored));
  pendingWrites.set(storageKey, write.catch(() => undefined));
  return write;
}

function updateHistory(history: ItemHistory, keys: string[], status: ItemStatus): ItemHistory {
  let read: Set<string> | undefined;
  let archived: Set<string> | undefined;

  for (const key of keys) {
    const wasRead = history.read.has(key);
    const wasArchived = history.archived.has(key);

    if (status === 'read' && !wasRead && !wasArchived) {
      (read ??= new Set(history.read)).add(key);
    } else if (status === 'archived' && wasRead) {
      (read ??= new Set(history.read)).delete(key);
      (archived ??= new Set(history.archived)).add(key);
    } else if (status === 'unread') {
      if (wasRead) (read ??= new Set(history.read)).delete(key);
      if (wasArchived) (archived ??= new Set(history.archived)).delete(key);
    }
  }

  return read || archived ? { read: read ?? history.read, archived: archived ?? history.archived } : history;
}

export function useFeedHistory<T>(items: T[], getKey: (item: T) => string, storageKey: string) {
  const [history, setHistory] = useState<ItemHistory | null>(null);
  const [error, setError] = useState<'load' | 'save' | null>(null);
  const [loadAttempt, setLoadAttempt] = useState(0);
  const [showArchived, setShowArchived] = useState(false);
  const current = useRef<ItemHistory | null>(null);
  const list = useRef<FlatList<T>>(null);
  const scrollOffset = useRef(0);
  const previousViewport = useRef<{ items: T[]; firstIndex: number; offset: number } | null>(null);

  useEffect(() => {
    let active = true;
    loadHistory(storageKey).then((loaded) => {
      if (!active) return;
      current.current = loaded;
      setHistory(loaded);
    }).catch(() => {
      if (active) setError('load');
    });
    return () => { active = false; };
  }, [loadAttempt, storageKey]);

  const save = useCallback((next: ItemHistory) => {
    setError(null);
    saveHistory(storageKey, next).catch(() => {
      if (current.current === next) setError('save');
    });
  }, [storageKey]);

  const update = useCallback((keys: string[], status: ItemStatus) => {
    if (!current.current) return;
    const next = updateHistory(current.current, keys, status);
    if (next === current.current) return;
    current.current = next;
    setHistory(next);
    save(next);
  }, [save]);

  function retry() {
    if (current.current) {
      save(current.current);
    } else {
      setError(null);
      setLoadAttempt((attempt) => attempt + 1);
    }
  }

  const archived = history?.archived;
  const displayedItems = useMemo(() => showArchived || !archived?.size ? items : items.filter(
    (item) => !archived.has(getKey(item)),
  ), [archived, getKey, items, showArchived]);

  function scrollToTop(animated: boolean) {
    list.current?.scrollToOffset({ offset: 0, animated });
  }

  function hideArchived() {
    setShowArchived(false);
    scrollToTop(false);
  }

  function isSeen(item: T) {
    const key = getKey(item);
    return !!(history?.read.has(key) || archived?.has(key));
  }

  function onScroll(event: NativeSyntheticEvent<NativeScrollEvent>) {
    scrollOffset.current = Math.max(0, event.nativeEvent.contentOffset.y);
  }

  const onViewableItemsChanged: NonNullable<FlatListProps<T>['onViewableItemsChanged']> = ({ viewableItems, changed }) => {
    const firstIndex = viewableItems[0]?.index;
    if (firstIndex == null) return;

    const previous = previousViewport.current;
    const offset = scrollOffset.current;
    previousViewport.current = { items: displayedItems, firstIndex, offset };
    if (!previous || previous.items !== displayedItems || offset <= previous.offset || firstIndex <= previous.firstIndex) return;

    const passed = changed.flatMap(({ index, isViewable }) => {
      if (isViewable || index == null || index >= firstIndex || index >= displayedItems.length) return [];
      return [getKey(displayedItems[index])];
    });
    update(passed, 'read');
  };

  return {
    listProps: { ref: list, data: displayedItems, onScroll, scrollEventThrottle: 16, viewabilityConfig, onViewableItemsChanged },
    canMark: history !== null,
    isSeen,
    markSeen: (item: T) => update([getKey(item)], 'read'),
    toggleSeen: (item: T) => update([getKey(item)], isSeen(item) ? 'unread' : 'read'),
    hasSeen: items.some((item) => history?.read.has(getKey(item))),
    hasArchived: items.some((item) => archived?.has(getKey(item))),
    showArchived,
    hideArchived,
    clearSeen: () => {
      update(items.map(getKey), 'archived');
      hideArchived();
    },
    toggleArchived: () => {
      setShowArchived((shown) => !shown);
      scrollToTop(false);
    },
    scrollToTop,
    error,
    retry,
  };
}
