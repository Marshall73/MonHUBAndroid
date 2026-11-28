import Ionicons from '@expo/vector-icons/Ionicons';
import { MotiView } from 'moti';
import { useEffect, useMemo, useRef, useState } from 'react';
import { FlatList, Pressable, RefreshControl, ScrollView, Text, View } from 'react-native';
import { useReducedMotion } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

import { FeedHistoryActions } from '../../shared/components/FeedHistoryActions';
import { useFeedHistory } from '../../shared/hooks/useFeedHistory';
import palette from '../../theme.json';

import { ArticleReaderModal } from './ArticleReaderModal';
import { FeedManager } from './FeedManager';
import { loadFeedPreferences, saveFeedPreferences } from './feedPreferences';
import { fetchArticles, relativeDate, type Article, type Feed } from './feeds';

function getArticleKey(article: Article) {
  return article.url.split('#', 1)[0];
}

function ArticleCard({ article, index, read, reduceMotion, onOpen, onToggleRead }: {
  article: Article;
  index: number;
  read: boolean;
  reduceMotion: boolean;
  onOpen: () => void;
  onToggleRead?: () => void;
}) {
  const timing = { type: 'timing' as const, duration: reduceMotion ? 0 : 160 };

  return (
    <MotiView
      from={reduceMotion ? undefined : { opacity: 0.85 }}
      animate={{ opacity: 1 }}
      transition={{ opacity: timing }}
      delay={reduceMotion ? 0 : Math.min(index, 3) * 12}
    >
      <View className="mb-3 flex-row items-start rounded-xl border border-line bg-surface pr-2">
        <Pressable
          accessibilityRole="button"
          accessibilityHint="Ouvre l’article dans le lecteur"
          onPress={onOpen}
          className="focus:border-ink web:focus-visible:border-ink flex-1 gap-2 rounded-xl border border-transparent p-4 active:bg-raised"
        >
          <Text className={`text-item-title font-semibold ${read ? 'text-copy' : 'text-ink'}`}>{article.title}</Text>
          <View className="flex-row flex-wrap items-center gap-x-3 gap-y-1">
            <Text className="text-sm font-medium text-copy">{article.feed.name}</Text>
            <Text className="text-xs text-muted">{relativeDate(article.timestamp)}</Text>
            {read && <Text className="text-xs font-medium text-success">Lu</Text>}
          </View>
          {article.summary !== '' && (
            <Text className="text-sm leading-5 text-copy" numberOfLines={2}>{article.summary}</Text>
          )}
        </Pressable>
        {onToggleRead && (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={read ? `Marquer « ${article.title} » comme non lu` : `Marquer « ${article.title} » comme lu`}
            onPress={onToggleRead}
            className="mt-2 h-11 w-11 items-center justify-center rounded-lg border border-transparent active:bg-pressed focus:border-ink web:focus-visible:border-ink"
          >
            <Ionicons name={read ? 'checkmark-circle' : 'checkmark-circle-outline'} size={22} color={read ? palette.success : palette.muted} />
          </Pressable>
        )}
      </View>
    </MotiView>
  );
}

export default function RssScreen() {
  const [feeds, setFeeds] = useState<Feed[] | null>(null);
  const [stored, setStored] = useState<Record<string, Article[]> | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [openArticle, setOpenArticle] = useState<Article | null>(null);
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

    loadFeedPreferences().then((saved) => {
      if (current) setFeeds(saved);
    }).catch(() => {
      if (current) setStorageError('Impossible de charger vos sources.');
    });
    return () => { current = false; };
  }, [storageAttempt]);

  useEffect(() => {
    if (feeds === null) return;
    const controller = new AbortController();
    const active = feeds.filter((feed) => feed.active);
    const activeUrls = new Set(active.map((feed) => feed.url));
    setStored((previous) => previous && Object.fromEntries(
      Object.entries(previous).filter(([url]) => activeUrls.has(url)),
    ));

    void Promise.all(active.map(async (feed) => {
      const articles = await fetchArticles(feed, controller.signal).catch(() => null);
      if (controller.signal.aborted) return;
      setStored((previous) => ({ ...previous, [feed.url]: articles ?? previous?.[feed.url] ?? [] }));
    })).then(() => {
      if (!controller.signal.aborted) setRefreshing(false);
    });

    return () => controller.abort();
  }, [feeds, request]);

  async function saveFeeds(next: Feed[]) {
    if (saveLock.current) return false;
    saveLock.current = true;
    setSaving(true);
    setSaveError(null);
    try {
      await saveFeedPreferences(next);
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
  const articles = useMemo(() => (feeds ?? [])
    .filter((feed) => feed.active && (selected === null || feed.url === selected))
    .flatMap((feed) => stored?.[feed.url] ?? [])
    .sort((left, right) => (right.timestamp ?? Number.MIN_SAFE_INTEGER) - (left.timestamp ?? Number.MIN_SAFE_INTEGER)),
  [feeds, selected, stored]);
  const history = useFeedHistory(articles, getArticleKey, 'rss/article-history');

  return (
    <SafeAreaView edges={['top', 'left', 'right']} className="flex-1 bg-canvas">
      <View className="mx-auto w-full max-w-xl flex-1 pt-6">
        <View className="mb-4 px-5">
          <View className="flex-row items-center justify-between gap-3">
            <Text accessibilityRole="header" className="flex-1 text-screen-title font-semibold text-ink">
              Flux RSS Perso
            </Text>
            <Pressable
              accessibilityRole="button" accessibilityLabel="Ajouter ou gérer les sources"
              disabled={feeds === null} onPress={() => { setSaveError(null); setManagerOpen(true); }}
              className="border border-transparent focus:border-ink web:focus-visible:border-ink active:bg-pressed h-11 w-11 items-center justify-center rounded-lg bg-selection disabled:opacity-50"
            >
              <Ionicons name="add" size={26} color={palette.accent} />
            </Pressable>
          </View>
          {active.length > 0 && (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mt-4 grow-0">
              {[{ url: null, name: 'Tous' }, ...active].map((feed) => {
                const isSelected = feed.url === selected;
                return (
                  <Pressable
                    key={feed.url ?? 'all'} accessibilityRole="button" accessibilityState={{ selected: isSelected }}
                    onPress={() => {
                      if (isSelected) return;
                      history.hideArchived();
                      setSelected(feed.url);
                    }}
                    className={`focus:border-ink web:focus-visible:border-ink active:bg-pressed mr-2 min-h-11 justify-center rounded-lg border px-3 ${isSelected ? 'border-accent bg-selection' : 'border-line bg-chrome'}`}
                  >
                    <Text className={`text-sm font-semibold ${isSelected ? 'text-accent' : 'text-copy'}`}>
                      {feed.name}
                    </Text>
                  </Pressable>
                );
              })}
            </ScrollView>
          )}
          {active.length > 0 && (
            <FeedHistoryActions history={history} clearLabel="Effacer les lus" reduceMotion={reduceMotion} />
          )}
        </View>

        <FlatList
          {...history.listProps}
          className="flex-1 px-5"
          keyExtractor={(article) => JSON.stringify([article.feed.url, article.url])}
          renderItem={({ item, index }) => (
            <ArticleCard
              article={item} index={index} read={history.isSeen(item)} reduceMotion={reduceMotion}
              onOpen={() => {
                history.markSeen(item);
                setOpenArticle(item);
              }}
              onToggleRead={history.canMark ? () => history.toggleSeen(item) : undefined}
            />
          )}
          refreshControl={
            <RefreshControl
              enabled={active.length > 0} refreshing={refreshing} colors={[palette.cobalt]}
              onRefresh={() => { setRefreshing(true); setRequest((value) => value + 1); }}
            />
          }
          ListEmptyComponent={storageError ? (
            <View className="items-start gap-2 rounded-xl border border-error-line bg-error-surface p-4">
              <Text accessibilityLiveRegion="polite" className="text-error">{storageError}</Text>
              <Pressable
                accessibilityRole="button" className="border border-transparent focus:border-ink web:focus-visible:border-ink active:bg-pressed min-h-11 justify-center rounded-lg bg-selection px-4"
                onPress={() => { setStorageError(null); setStorageAttempt((value) => value + 1); }}
              >
                <Text className="font-semibold text-accent">Réessayer</Text>
              </Pressable>
            </View>
          ) : loading ? (
            <View accessibilityLabel="Chargement des articles" accessible accessibilityState={{ busy: true }}>
              {[0, 1, 2].map((index) => (
                <View key={index} className="mb-3 gap-3 rounded-xl border border-line bg-surface p-4">
                  <View className="h-5 w-24 rounded-lg bg-raised" />
                  <View className="h-5 w-3/4 rounded bg-raised" />
                  <View className="h-3 w-11/12 rounded bg-raised" />
                  <View className="h-3 w-2/3 rounded bg-raised" />
                </View>
              ))}
            </View>
          ) : (
            <Text className="rounded-xl border border-line bg-surface p-4 text-copy">
              {active.length === 0
                ? 'Ajoutez ou activez une source avec le bouton +.'
                : history.hasArchived ? 'Tous les articles de ce fil ont été effacés.' : 'Aucun article disponible.'}
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
      {openArticle && <ArticleReaderModal article={openArticle} onClose={() => setOpenArticle(null)} />}
    </SafeAreaView>
  );
}
