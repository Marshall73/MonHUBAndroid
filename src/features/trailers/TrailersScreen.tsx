import Ionicons from '@expo/vector-icons/Ionicons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { FlatList, Pressable, RefreshControl, ScrollView, Text, View } from 'react-native';
import { useReducedMotion } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

import { FeedHistoryActions } from '../../shared/components/FeedHistoryActions';
import { useFeedHistory } from '../../shared/hooks/useFeedHistory';
import palette from '../../theme.json';

import { SourceManager } from './SourceManager';
import { TrailerCard } from './TrailerCard';
import { categories, defaultSources, fetchTrailers, isSource, type Category, type Trailer, type TrailerSource } from './feeds';
import { loadCachedTrailers, saveCachedTrailers } from './trailerCache';

const storageKey = 'trailers/sources';

function getTrailerKey(trailer: Trailer) {
  return trailer.key;
}

export default function TrailersScreen() {
  const [sources, setSources] = useState<TrailerSource[] | null>(null);
  const [entries, setEntries] = useState<Record<string, Trailer[]>>({});
  const [unavailable, setUnavailable] = useState<string[]>([]);
  const [filter, setFilter] = useState<Category | 'Tous'>('Tous');
  const [activeTrailerKey, setActiveTrailerKey] = useState<string | null>(null);
  const [managerOpen, setManagerOpen] = useState(false);
  const [storageError, setStorageError] = useState(false);
  const [storageAttempt, setStorageAttempt] = useState(0);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const saveLock = useRef(false);
  const [refreshing, setRefreshing] = useState(false);
  const [request, setRequest] = useState(0);
  const reduceMotion = useReducedMotion();

  useFocusEffect(useCallback(() => () => setActiveTrailerKey(null), []));

  useEffect(() => {
    let active = true;

    async function load() {
      const stored = await AsyncStorage.getItem(storageKey);
      if (!active) return;
      if (stored === null) {
        await AsyncStorage.setItem(storageKey, JSON.stringify(defaultSources));
        if (active) setSources(defaultSources);
        return;
      }
      const data: unknown = JSON.parse(stored);
      if (!Array.isArray(data) || !data.every(isSource)) throw new Error('Sources invalides');
      setSources(data);
    }

    load().catch(() => { if (active) setStorageError(true); });
    return () => { active = false; };
  }, [storageAttempt]);

  useEffect(() => {
    if (sources === null) return;
    const controller = new AbortController();

    void Promise.all(sources.map(async (source) => {
      const cached = loadCachedTrailers(source).catch(() => null);
      void cached.then((items) => {
        if (controller.signal.aborted || items === null) return;
        setEntries((previous) => previous[source.url] === undefined
          ? { ...previous, [source.url]: items }
          : previous);
      });

      try {
        const items = await fetchTrailers(source, controller.signal);
        if (controller.signal.aborted) return;
        setEntries((previous) => ({ ...previous, [source.url]: items }));
        setUnavailable((previous) => previous.filter((url) => url !== source.url));
        void saveCachedTrailers(source, items).catch(() => undefined);
      } catch {
        await cached;
        if (controller.signal.aborted) return;
        setEntries((previous) => previous[source.url] === undefined
          ? { ...previous, [source.url]: [] }
          : previous);
        setUnavailable((previous) => previous.includes(source.url) ? previous : [...previous, source.url]);
      }
    })).then(() => {
      if (!controller.signal.aborted) setRefreshing(false);
    });

    return () => controller.abort();
  }, [sources, request]);

  async function saveSources(next: TrailerSource[]) {
    if (saveLock.current) return false;
    saveLock.current = true;
    setSaving(true);
    setSaveError(null);
    try {
      await AsyncStorage.setItem(storageKey, JSON.stringify(next));
      setSources(next);
      return true;
    } catch {
      setSaveError('Impossible d’enregistrer les sources. Réessayez.');
      return false;
    } finally {
      saveLock.current = false;
      setSaving(false);
    }
  }

  function refresh() {
    setRefreshing(true);
    setRequest((current) => current + 1);
  }

  const visibleSources = useMemo(() => (sources ?? []).filter(
    (source) => filter === 'Tous' || source.category === filter,
  ), [filter, sources]);
  const failed = visibleSources.filter((source) => unavailable.includes(source.url));
  const loading = sources === null || refreshing || visibleSources.some((source) => entries[source.url] === undefined);
  const trailers = useMemo(() => {
    const byUrl = new Map<string, Trailer>();
    for (const source of visibleSources) {
      for (const trailer of entries[source.url] ?? []) {
        if (!byUrl.has(trailer.key)) byUrl.set(trailer.key, trailer);
      }
    }
    return [...byUrl.values()].sort((left, right) =>
      (right.timestamp ?? Number.MIN_SAFE_INTEGER) - (left.timestamp ?? Number.MIN_SAFE_INTEGER));
  }, [entries, visibleSources]);
  const history = useFeedHistory(trailers, getTrailerKey, 'trailers/watch-history');
  const hasActiveTrailer = history.listProps.data.some((trailer) => trailer.key === activeTrailerKey);

  useEffect(() => {
    if (activeTrailerKey !== null && !hasActiveTrailer) setActiveTrailerKey(null);
  }, [activeTrailerKey, hasActiveTrailer]);

  return (
    <SafeAreaView edges={['top', 'left', 'right']} className="flex-1 bg-canvas">
      <View className="mx-auto w-full max-w-xl flex-1 pt-6">
        <View className="mb-4 px-5">
          <View className="flex-row items-center justify-between gap-3">
            <Text accessibilityRole="header" className="flex-1 text-screen-title font-semibold text-ink">
              Trailers
            </Text>
            <Pressable
              accessibilityRole="button" accessibilityLabel="Ajouter ou gérer les sources"
              disabled={sources === null}
              onPress={() => {
                setActiveTrailerKey(null);
                setSaveError(null);
                setManagerOpen(true);
              }}
              className="border border-transparent focus:border-ink web:focus-visible:border-ink active:bg-pressed h-11 w-11 items-center justify-center rounded-lg bg-selection disabled:opacity-50"
            >
              <Ionicons name="add" size={26} color={palette.accent} />
            </Pressable>
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mt-4 grow-0">
            {(['Tous', ...categories] as const).map((option) => (
              <Pressable
                key={option} accessibilityRole="button" accessibilityState={{ selected: option === filter }}
                onPress={() => {
                  if (option === filter) return;
                  history.hideArchived();
                  setFilter(option);
                }}
                className={`focus:border-ink web:focus-visible:border-ink active:bg-pressed mr-2 min-h-11 justify-center rounded-lg border px-3 ${option === filter ? 'border-accent bg-selection' : 'border-line bg-chrome'}`}
              >
                <Text className={`text-sm font-semibold ${option === filter ? 'text-accent' : 'text-copy'}`}>
                  {option}
                </Text>
              </Pressable>
            ))}
          </ScrollView>
          {!!sources?.length && (
            <FeedHistoryActions history={history} clearLabel="Effacer les vues" reduceMotion={reduceMotion} />
          )}
        </View>

        <FlatList
          {...history.listProps}
          className="flex-1 px-5"
          keyExtractor={getTrailerKey}
          renderItem={({ item, index }) => (
            <TrailerCard
              trailer={item}
              index={index}
              reduceMotion={reduceMotion}
              active={item.key === activeTrailerKey}
              seen={history.isSeen(item)}
              onToggleSeen={history.canMark ? () => history.toggleSeen(item) : undefined}
              onPlay={() => {
                history.markSeen(item);
                if (item.videoId) setActiveTrailerKey(item.key);
              }}
              onClose={() => setActiveTrailerKey((current) => current === item.key ? null : current)}
            />
          )}
          refreshControl={
            <RefreshControl
              enabled={!!sources?.length} refreshing={refreshing} onRefresh={refresh} colors={[palette.cobalt]}
            />
          }
          ListHeaderComponent={failed.length > 0 ? (
            <View className="mb-3 items-start rounded-xl border border-line bg-surface p-3">
              <Text accessibilityLiveRegion="polite" className="text-sm text-copy">
                Actualisation impossible pour {failed.map(({ name }) => name).join(', ')}.
              </Text>
              <Pressable
                accessibilityRole="button" disabled={refreshing} onPress={refresh}
                className="border border-transparent focus:border-ink web:focus-visible:border-ink active:opacity-75 min-h-11 justify-center pr-3 disabled:opacity-50"
              >
                <Text className="font-semibold text-accent">Réessayer</Text>
              </Pressable>
            </View>
          ) : undefined}
          ListEmptyComponent={storageError ? (
            <View className="items-start gap-2 rounded-xl border border-error-line bg-error-surface p-4">
              <Text accessibilityLiveRegion="polite" className="text-error">Impossible de charger vos sources.</Text>
              <Pressable
                accessibilityRole="button" className="border border-transparent focus:border-ink web:focus-visible:border-ink active:bg-pressed min-h-11 justify-center rounded-lg bg-selection px-4"
                onPress={() => { setStorageError(false); setStorageAttempt((attempt) => attempt + 1); }}
              >
                <Text className="font-semibold text-accent">Réessayer</Text>
              </Pressable>
            </View>
          ) : loading ? (
            <View accessible accessibilityLabel="Chargement des vidéos" accessibilityState={{ busy: true }}>
              {[0, 1].map((index) => (
                <View key={index} className="mb-4 overflow-hidden rounded-xl border border-line bg-surface">
                  <View className="aspect-video bg-raised" />
                  <View className="gap-3 p-4">
                    <View className="h-5 w-3/4 rounded bg-raised" />
                    <View className="h-3 w-1/2 rounded bg-raised" />
                  </View>
                </View>
              ))}
            </View>
          ) : failed.length > 0 ? undefined : (
            <Text className="rounded-xl border border-line bg-surface p-4 text-copy">
              {sources?.length === 0
                ? 'Ajoutez une source avec le bouton +.'
                : history.hasArchived ? 'Toutes les bandes-annonces de cette catégorie ont été effacées.'
                  : 'Aucune vidéo disponible dans cette catégorie.'}
            </Text>
          )}
        />
      </View>
      {managerOpen && sources !== null && (
        <SourceManager
          sources={sources} saving={saving} saveError={saveError}
          onSave={saveSources} onClose={() => setManagerOpen(false)}
        />
      )}
    </SafeAreaView>
  );
}
