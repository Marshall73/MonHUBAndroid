import Ionicons from '@expo/vector-icons/Ionicons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { MotiView } from 'moti';
import { useEffect, useRef, useState } from 'react';
import { Alert, FlatList, Linking, Pressable, RefreshControl, ScrollView, Text, View } from 'react-native';
import { useReducedMotion } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

import { FeedManager } from './FeedManager';
import { defaultFeeds, fetchArticles, isFeed, relativeDate, type Article, type Feed } from './feeds';

const storageKey = 'rss/feeds';

function ArticleCard({ article, index, reduceMotion }: {
  article: Article;
  index: number;
  reduceMotion: boolean;
}) {
  const timing = { type: 'timing' as const, duration: reduceMotion ? 0 : 260 };

  return (
    <MotiView
      from={reduceMotion ? undefined : { opacity: 0, translateY: 8 }}
      animate={{ opacity: 1, translateY: 0 }}
      transition={{ opacity: timing, translateY: timing }}
      delay={reduceMotion ? 0 : Math.min(index, 5) * 40}
    >
      <Pressable
        accessibilityRole="link"
        accessibilityHint="Ouvre l’article dans le navigateur"
        onPress={() => {
          Linking.openURL(article.url).catch(() => {
            Alert.alert('Ouverture impossible', 'Impossible d’ouvrir cet article dans le navigateur.');
          });
        }}
        className="mb-3 gap-2 rounded-2xl border border-zinc-800 bg-zinc-900 p-4 active:border-blue-500"
      >
        <View className="flex-row flex-wrap items-center gap-x-3 gap-y-1">
          <Text className="overflow-hidden rounded-full bg-blue-500/15 px-2.5 py-1 text-xs font-semibold text-blue-200">
            {article.feed.name}
          </Text>
          <Text className="text-xs text-zinc-400">{relativeDate(article.timestamp)}</Text>
        </View>
        <Text className="text-lg font-bold leading-6 text-zinc-50">{article.title}</Text>
        {article.summary !== '' && (
          <Text className="text-sm leading-5 text-zinc-300" numberOfLines={2}>{article.summary}</Text>
        )}
      </Pressable>
    </MotiView>
  );
}

export default function RssScreen() {
  const [feeds, setFeeds] = useState<Feed[] | null>(null);
  const [stored, setStored] = useState<Record<string, Article[]> | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [managerOpen, setManagerOpen] = useState(false);
  const [storageError, setStorageError] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const saveLock = useRef(false);
  const [refreshing, setRefreshing] = useState(false);
  const [request, setRequest] = useState(0);
  const [storageAttempt, setStorageAttempt] = useState(0);
  const reduceMotion = useReducedMotion();

  useEffect(() => {
    let current = true;

    async function load() {
      const saved = await AsyncStorage.getItem(storageKey);
      if (!current) return;
      if (saved === null) {
        await AsyncStorage.setItem(storageKey, JSON.stringify(defaultFeeds));
        if (current) setFeeds(defaultFeeds);
        return;
      }
      const parsed: unknown = JSON.parse(saved);
      if (!Array.isArray(parsed) || !parsed.every(isFeed)) throw new Error('Sources invalides');
      if (current) setFeeds(parsed);
    }

    load().catch(() => {
      if (current) setStorageError('Impossible de charger vos sources.');
    });
    return () => { current = false; };
  }, [storageAttempt]);

  useEffect(() => {
    if (feeds === null) return;
    const controller = new AbortController();
    const active = feeds.filter((feed) => feed.active);

    Promise.allSettled(active.map((feed) => fetchArticles(feed, controller.signal)))
      .then((results) => {
        if (controller.signal.aborted) return;
        setStored((previous) => Object.fromEntries(active.map((feed, index) => {
          const result = results[index];
          return [feed.url, result.status === 'fulfilled' ? result.value : previous?.[feed.url] ?? []];
        })));
        setRefreshing(false);
      });

    return () => controller.abort();
  }, [feeds, request]);

  async function saveFeeds(next: Feed[]) {
    if (saveLock.current) return false;
    saveLock.current = true;
    setSaving(true);
    setSaveError(null);
    try {
      await AsyncStorage.setItem(storageKey, JSON.stringify(next));
      if (!next.some((feed) => feed.url === selected && feed.active)) setSelected(null);
      setFeeds(next);
      return true;
    } catch {
      setSaveError('Impossible d’enregistrer la modification. Réessayez.');
      return false;
    } finally {
      saveLock.current = false;
      setSaving(false);
    }
  }

  const active = feeds?.filter((feed) => feed.active) ?? [];
  const visibleFeeds = active.filter((feed) => selected === null || feed.url === selected);
  const loading = feeds === null || refreshing || visibleFeeds.some((feed) => stored?.[feed.url] === undefined);
  const articles = visibleFeeds
    .flatMap((feed) => stored?.[feed.url] ?? [])
    .sort((left, right) => (right.timestamp ?? Number.MIN_SAFE_INTEGER) - (left.timestamp ?? Number.MIN_SAFE_INTEGER));

  return (
    <SafeAreaView edges={['top', 'left', 'right']} className="flex-1 bg-zinc-950">
      <View className="mx-auto w-full max-w-xl flex-1 pt-8">
        <View className="mb-4 px-5">
          <View className="flex-row items-center justify-between gap-3">
            <Text accessibilityRole="header" className="flex-1 text-4xl font-extrabold tracking-tight text-zinc-50">
              Flux RSS Perso
            </Text>
            <Pressable
              accessibilityRole="button" accessibilityLabel="Ajouter ou gérer les sources"
              disabled={feeds === null} onPress={() => { setSaveError(null); setManagerOpen(true); }}
              className="h-11 w-11 items-center justify-center rounded-full bg-blue-500/20 disabled:opacity-50"
            >
              <Ionicons name="add" size={26} color="#93C5FD" />
            </Pressable>
          </View>
          {active.length > 0 && (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mt-4 grow-0">
              {[{ url: null, name: 'Tous' }, ...active].map((feed) => {
                const isSelected = feed.url === selected;
                return (
                  <Pressable
                    key={feed.url ?? 'all'} accessibilityRole="button" accessibilityState={{ selected: isSelected }}
                    onPress={() => setSelected(feed.url)}
                    className={`mr-2 min-h-11 justify-center rounded-full border px-4 ${isSelected ? 'border-blue-500/60 bg-blue-500/15' : 'border-zinc-800 bg-zinc-900'}`}
                  >
                    <Text className={`text-sm font-semibold ${isSelected ? 'text-blue-200' : 'text-zinc-300'}`}>
                      {feed.name}
                    </Text>
                  </Pressable>
                );
              })}
            </ScrollView>
          )}
        </View>

        <FlatList
          className="flex-1 px-5"
          data={articles}
          keyExtractor={(article) => JSON.stringify([article.feed.url, article.url])}
          renderItem={({ item, index }) => <ArticleCard article={item} index={index} reduceMotion={reduceMotion} />}
          refreshControl={
            <RefreshControl
              enabled={active.length > 0} refreshing={refreshing} colors={['#3B82F6']}
              onRefresh={() => { setRefreshing(true); setRequest((value) => value + 1); }}
            />
          }
          ListEmptyComponent={storageError ? (
            <View className="items-start gap-2 rounded-2xl border border-red-900 bg-zinc-900 p-4">
              <Text accessibilityLiveRegion="polite" className="text-red-200">{storageError}</Text>
              <Pressable
                accessibilityRole="button" className="min-h-11 justify-center rounded-full bg-blue-500/15 px-4"
                onPress={() => { setStorageError(null); setStorageAttempt((value) => value + 1); }}
              >
                <Text className="font-semibold text-blue-200">Réessayer</Text>
              </Pressable>
            </View>
          ) : loading ? (
            <View accessibilityLabel="Chargement des articles" accessible accessibilityState={{ busy: true }}>
              {[0, 1, 2].map((index) => (
                <View key={index} className="mb-3 gap-3 rounded-2xl border border-zinc-800 bg-zinc-900 p-4">
                  <View className="h-5 w-24 rounded-full bg-zinc-800" />
                  <View className="h-5 w-3/4 rounded bg-zinc-800" />
                  <View className="h-3 w-11/12 rounded bg-zinc-800" />
                  <View className="h-3 w-2/3 rounded bg-zinc-800" />
                </View>
              ))}
            </View>
          ) : (
            <Text className="rounded-2xl border border-zinc-800 bg-zinc-900 p-4 text-zinc-300">
              {active.length === 0
                ? 'Ajoutez ou activez une source avec le bouton +.'
                : 'Aucun article disponible.'}
            </Text>
          )}
        />
      </View>

      {managerOpen && feeds !== null && (
        <FeedManager
          feeds={feeds} saving={saving} saveError={saveError}
          onSave={saveFeeds} onClose={() => setManagerOpen(false)}
        />
      )}
    </SafeAreaView>
  );
}
