import { useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, Image, Pressable, RefreshControl, ScrollView, Text, View } from 'react-native';
import { useReducedMotion } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

import { StreamingCard } from './StreamingCard';
import { fetchCatalog, mediaTypes, periods, platforms, tmdbKey, type MediaType, type Period, type Platform } from './tmdb';
import { useStreamingMetadata, type DetailState } from './useStreamingMetadata';

type Request = { page: number; refresh?: boolean; asOf: Date };
type Catalog = Awaited<ReturnType<typeof fetchCatalog>> & { asOf: Date };

function FilterChip({ label, selected, onPress }: { label: string; selected: boolean; onPress: () => void }) {
  return (
    <Pressable
      accessibilityRole="button" accessibilityState={{ selected }} onPress={onPress}
      className={`mr-2 min-h-11 items-center justify-center rounded-full border px-4 ${selected ? 'border-blue-500/60 bg-blue-500/15' : 'border-zinc-800 bg-zinc-900'}`}
    >
      <Text className={`text-sm font-semibold ${selected ? 'text-blue-200' : 'text-zinc-300'}`}>{label}</Text>
    </Pressable>
  );
}

function CatalogList({ apiKey, type, platform, period, genres, details, loadDetails }: {
  apiKey: string;
  type: MediaType;
  platform: Platform;
  period: Period;
  genres: ReadonlyMap<number, string> | undefined;
  details: Record<number, DetailState | undefined> | undefined;
  loadDetails: (id: number) => void;
}) {
  const [catalog, setCatalog] = useState<Catalog | null>(null);
  const [request, setRequest] = useState<Request | null>(() => ({ page: 1, asOf: new Date() }));
  const [error, setError] = useState<{ message: string; page: number } | null>(null);
  const reduceMotion = useReducedMotion();

  useEffect(() => {
    if (!request) return;
    const controller = new AbortController();
    const { page, asOf } = request;
    const timeout = setTimeout(() => {
      controller.abort();
      setError({ page, message: 'TMDB met trop de temps à répondre. Réessayez.' });
      setRequest((current) => current === request ? null : current);
    }, 15000);

    fetchCatalog(apiKey, type, platform, period, page, controller.signal, asOf)
      .then((result) => {
        if (controller.signal.aborted) return;
        setCatalog((previous) => {
          const items = new Map((page === 1 ? [] : previous?.items ?? []).map((item) => [item.id, item]));
          for (const item of result.items) items.set(item.id, item);
          return { ...result, items: [...items.values()], asOf };
        });
      })
      .catch((failure: unknown) => {
        if (!controller.signal.aborted) {
          setError({ page, message: failure instanceof Error ? failure.message : 'Impossible de charger le catalogue.' });
        }
      })
      .finally(() => {
        clearTimeout(timeout);
        if (!controller.signal.aborted) setRequest((current) => current === request ? null : current);
      });

    return () => {
      clearTimeout(timeout);
      controller.abort();
    };
  }, [apiKey, type, platform, period, request]);

  function load(next: Omit<Request, 'asOf'>) {
    setError(null);
    const asOf = next.page > 1 && catalog ? catalog.asOf : new Date();
    setRequest({ ...next, asOf });
  }

  const nextPage = catalog && catalog.page < catalog.totalPages ? catalog.page + 1 : null;

  return (
    <FlatList
      className="flex-1 px-5"
      data={catalog?.items}
      keyExtractor={(item) => String(item.id)}
      renderItem={({ item, index }) => (
        <StreamingCard
          item={item}
          type={type}
          platform={platform}
          index={index}
          reduceMotion={reduceMotion}
          genres={genres}
          details={details?.[item.id]}
          loadDetails={() => loadDetails(item.id)}
        />
      )}
      refreshControl={
        <RefreshControl
          refreshing={request?.refresh === true}
          onRefresh={() => load({ page: 1, refresh: true })}
          colors={['#3B82F6']}
        />
      }
      ListHeaderComponent={error?.page === 1 ? (
        <View className="mb-3 items-start gap-2 rounded-2xl border border-red-900 bg-zinc-900 p-4">
          <Text accessibilityLiveRegion="polite" className="text-sm leading-5 text-red-200">{error.message}</Text>
          <Pressable
            accessibilityRole="button" onPress={() => load({ page: 1, refresh: catalog !== null })}
            className="min-h-11 justify-center rounded-full bg-blue-500/15 px-4"
          >
            <Text className="font-semibold text-blue-200">Réessayer</Text>
          </Pressable>
        </View>
      ) : undefined}
      ListEmptyComponent={error ? undefined : catalog === null ? (
        <View accessible accessibilityLabel="Chargement du catalogue" accessibilityState={{ busy: true }}>
          {[0, 1, 2].map((index) => (
            <View key={index} className="mb-3 flex-row gap-3 rounded-2xl border border-zinc-800 bg-zinc-900 p-3">
              <View className="aspect-[2/3] w-[84px] rounded-xl bg-zinc-800" />
              <View className="flex-1 gap-3 pt-2">
                <View className="h-5 w-20 rounded-full bg-zinc-800" />
                <View className="h-5 w-4/5 rounded bg-zinc-800" />
                <View className="h-4 w-24 rounded bg-zinc-800" />
              </View>
            </View>
          ))}
        </View>
      ) : (
        <Text className="rounded-2xl border border-zinc-800 bg-zinc-900 p-4 text-zinc-300">
          Aucun titre disponible pour ces filtres.
        </Text>
      )}
      ListFooterComponent={catalog ? (
        <View className="gap-3 pb-5">
          {error && error.page > 1 && (
            <Text accessibilityLiveRegion="polite" className="text-sm text-red-200">{error.message}</Text>
          )}
          {nextPage !== null && (
            <Pressable
              accessibilityRole="button" accessibilityState={{ busy: (request?.page ?? 0) > 1 }}
              disabled={request !== null} onPress={() => load({ page: nextPage })}
              className="min-h-11 flex-row items-center justify-center gap-2 rounded-xl bg-blue-500/15 px-4 disabled:opacity-60"
            >
              {(request?.page ?? 0) > 1 && <ActivityIndicator size="small" color="#93C5FD" />}
              <Text className="font-semibold text-blue-200">
                {error && error.page > 1 ? 'Réessayer la page suivante' : 'Charger plus'}
              </Text>
            </Pressable>
          )}
          <View className="flex-row items-center gap-3 px-1">
            <Image
              source={require('./tmdb-logo.png')}
              resizeMode="contain"
              accessibilityLabel="TMDB"
              className="h-4 w-20"
            />
            <Text className="flex-1 text-xs leading-4 text-zinc-400">
              This product uses the TMDB API but is not endorsed or certified by TMDB.
            </Text>
          </View>
        </View>
      ) : undefined}
    />
  );
}

export default function StreamingScreen() {
  const { genres, details, loadDetails } = useStreamingMetadata(tmdbKey);
  const [type, setType] = useState<MediaType>('movie');
  const [platform, setPlatform] = useState<Platform>(platforms[0]);
  const [period, setPeriod] = useState<Period>(periods[2]);

  return (
    <SafeAreaView edges={['left', 'right']} className="flex-1 bg-zinc-950">
      <View className="mx-auto w-full max-w-xl flex-1 pt-8">
        <View className="mb-4 gap-3 px-5">
          <Text accessibilityRole="header" className="text-4xl font-extrabold tracking-tight text-zinc-50">
            Streaming
          </Text>
          <View className="flex-row gap-1 rounded-xl border border-zinc-800 bg-zinc-900 p-1">
            {mediaTypes.map(({ value, label }) => (
              <Pressable
                key={value} accessibilityRole="button" accessibilityState={{ selected: value === type }}
                onPress={() => setType(value)}
                className={`min-h-11 flex-1 items-center justify-center rounded-lg ${value === type ? 'bg-blue-500/20' : ''}`}
              >
                <Text className={`text-sm font-semibold ${value === type ? 'text-blue-200' : 'text-zinc-300'}`}>
                  {label}
                </Text>
              </Pressable>
            ))}
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} className="grow-0">
            {platforms.map((option) => (
              <FilterChip
                key={option.id}
                label={option.label}
                selected={option.id === platform.id}
                onPress={() => setPlatform(option)}
              />
            ))}
          </ScrollView>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} className="grow-0">
            {periods.map((option) => (
              <FilterChip
                key={option.label}
                label={option.label}
                selected={option.days === period.days}
                onPress={() => setPeriod(option)}
              />
            ))}
          </ScrollView>
        </View>

        {tmdbKey ? (
          <CatalogList
            key={`${type}/${platform.id}/${period.days ?? 'top'}`}
            apiKey={tmdbKey}
            type={type}
            platform={platform}
            period={period}
            genres={genres[type]}
            details={details[type]}
            loadDetails={(id) => loadDetails(type, id)}
          />
        ) : (
          <View className="mx-5 gap-2 rounded-2xl border border-zinc-800 bg-zinc-900 p-4">
            <Text className="font-bold text-zinc-50">Clé TMDB manquante</Text>
            <Text className="text-sm leading-5 text-zinc-300">
              Ajoutez cette ligne au fichier .env à la racine du projet, puis redémarrez Expo.
            </Text>
            <Text selectable className="text-xs font-semibold text-blue-200">
              EXPO_PUBLIC_TMDB_API_KEY=votre_clé_TMDB
            </Text>
          </View>
        )}
      </View>
    </SafeAreaView>
  );
}
