import Ionicons from '@expo/vector-icons/Ionicons';
import { useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, RefreshControl, ScrollView, Text, TextInput, View } from 'react-native';
import { useReducedMotion } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

import { SportCard } from './SportCard';
import { sports, type Sport } from './filters';
import { fetchCatalog, filterEvents, statuses, type Status } from './nuvio';
import { TvFranceList } from './TvFranceList';

const tvFranceView = { id: 'tv-france', label: 'TV France 🇫🇷' } as const;
const views = [...statuses, tvFranceView] as const;
type Catalog = Awaited<ReturnType<typeof fetchCatalog>>;
type CatalogRequest = { skip: number; refresh?: boolean };

function EventsList({ status, sport, query }: { status: Status; sport: Sport; query: string }) {
  const [catalog, setCatalog] = useState<Catalog | null>(null);
  const [request, setRequest] = useState<CatalogRequest | null>({ skip: 0 });
  const [error, setError] = useState<{ skip: number; message: string } | null>(null);
  const reduceMotion = useReducedMotion();
  const catalogSport = status.id === 'channels' ? sports[0] : sport;

  useEffect(() => {
    if (!request) return;
    const controller = new AbortController();
    const { skip } = request;

    fetchCatalog(status, catalogSport, skip, controller.signal)
      .then((result) => {
        if (controller.signal.aborted) return;
        setCatalog((previous) => {
          if (skip === 0 || previous === null) return result;
          const events = new Map(previous.events.map((event) => [event.id, event]));
          for (const event of result.events) events.set(event.id, event);
          return { ...result, events: [...events.values()] };
        });
      })
      .catch((failure: unknown) => {
        if (!controller.signal.aborted) {
          setError({ skip, message: failure instanceof Error ? failure.message : 'Programme indisponible.' });
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) setRequest((current) => current === request ? null : current);
      });

    return () => controller.abort();
  }, [status, catalogSport, request]);

  function load(next: CatalogRequest) {
    setError(null);
    setRequest(next);
  }

  const nextSkip = catalog?.nextSkip ?? null;
  const events = catalog ? filterEvents(catalog.events, sport, query) : undefined;

  return (
    <FlatList
      className="flex-1 px-5"
      keyboardShouldPersistTaps="handled"
      data={events}
      keyExtractor={(event) => event.id}
      renderItem={({ item, index }) => <SportCard event={item} index={index} reduceMotion={reduceMotion} />}
      refreshControl={
        <RefreshControl
          refreshing={request?.refresh === true} onRefresh={() => load({ skip: 0, refresh: true })} colors={['#3B82F6']}
        />
      }
      ListHeaderComponent={error?.skip === 0 ? (
        <View className="mb-3 items-start gap-2 rounded-2xl border border-red-900 bg-zinc-900 p-4">
          <Text accessibilityLiveRegion="polite" className="text-sm leading-5 text-red-200">{error.message}</Text>
          <Pressable
            accessibilityRole="button" onPress={() => load({ skip: 0, refresh: catalog !== null })}
            className="min-h-11 justify-center rounded-full bg-blue-500/15 px-4"
          >
            <Text className="font-semibold text-blue-200">Réessayer</Text>
          </Pressable>
        </View>
      ) : undefined}
      ListEmptyComponent={error ? undefined : catalog === null ? (
        <View accessible accessibilityLabel="Chargement du programme" accessibilityState={{ busy: true }}>
          {[0, 1, 2].map((index) => (
            <View key={index} className="mb-3 flex-row gap-3 rounded-2xl border border-zinc-800 bg-zinc-900 p-3">
              <View className="h-20 w-20 rounded-xl bg-zinc-800" />
              <View className="flex-1 gap-3 pt-1">
                <View className="h-5 w-4/5 rounded bg-zinc-800" />
                <View className="h-5 w-20 rounded-full bg-zinc-800" />
                <View className="h-4 w-3/4 rounded bg-zinc-800" />
              </View>
            </View>
          ))}
        </View>
      ) : (
        <Text className="rounded-2xl border border-zinc-800 bg-zinc-900 p-4 text-zinc-300">
          {query ? 'Aucun résultat pour cette recherche.' : 'Aucun résultat pour ce filtre.'}
        </Text>
      )}
      ListFooterComponent={nextSkip !== null ? (
        <View className="gap-2 pb-5">
          {error && error.skip > 0 && (
            <Text accessibilityLiveRegion="polite" className="text-sm text-red-200">{error.message}</Text>
          )}
          <Pressable
            accessibilityRole="button" disabled={request !== null} onPress={() => load({ skip: nextSkip })}
            className="min-h-11 flex-row items-center justify-center gap-2 rounded-xl bg-blue-500/15 px-4 disabled:opacity-60"
          >
            {!!request?.skip && <ActivityIndicator size="small" color="#93C5FD" />}
            <Text className="font-semibold text-blue-200">
              {error && error.skip > 0 ? 'Réessayer' : 'Charger plus de chaînes'}
            </Text>
          </Pressable>
        </View>
      ) : undefined}
    />
  );
}

export default function SportScreen() {
  const [status, setStatus] = useState<(typeof views)[number]>(tvFranceView);
  const [sport, setSport] = useState<Sport>(sports[0]);
  const [search, setSearch] = useState('');
  const channels = status.id === 'channels';
  const searchLabel = channels ? 'Rechercher une chaîne' : 'Rechercher une équipe ou un événement';

  return (
    <SafeAreaView edges={['top', 'left', 'right']} className="flex-1 bg-zinc-950">
      <View className="mx-auto w-full max-w-xl flex-1 pt-8">
        <View className="mb-4 gap-3 px-5">
          <Text accessibilityRole="header" className="text-4xl font-extrabold tracking-tight text-zinc-50">Sport</Text>
          <View className="flex-row gap-1 rounded-xl border border-zinc-800 bg-zinc-900 p-1">
            {views.map((option) => (
              <Pressable
                key={option.id}
                accessibilityRole="button"
                accessibilityState={{ selected: option.id === status.id }}
                onPress={() => setStatus(option)}
                className={`min-h-11 flex-1 items-center justify-center rounded-lg px-1 py-1.5 ${option.id === status.id ? 'bg-blue-500/20' : ''}`}
              >
                <Text className={`text-center text-sm font-semibold ${option.id === status.id ? 'text-blue-200' : 'text-zinc-300'}`}>
                  {option.label}
                </Text>
              </Pressable>
            ))}
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} className="grow-0">
            {sports.map((option) => (
              <Pressable
                key={option.label}
                accessibilityRole="button"
                accessibilityState={{ selected: option.genre === sport.genre }}
                onPress={() => setSport(option)}
                className={`mr-2 min-h-11 justify-center rounded-full border px-4 ${option.genre === sport.genre ? 'border-blue-500/60 bg-blue-500/15' : 'border-zinc-800 bg-zinc-900'}`}
              >
                <Text className={`text-sm font-semibold ${option.genre === sport.genre ? 'text-blue-200' : 'text-zinc-300'}`}>
                  {option.label}
                </Text>
              </Pressable>
            ))}
          </ScrollView>
          <View className="min-h-12 flex-row items-center gap-2 rounded-xl border border-zinc-800 bg-zinc-900 px-3">
            <Ionicons name="search-outline" color="#A1A1AA" size={19} />
            <TextInput
              accessibilityLabel={searchLabel}
              placeholder={searchLabel}
              placeholderTextColor="#A1A1AA"
              value={search}
              onChangeText={setSearch}
              returnKeyType="search"
              autoCorrect={false}
              className="min-h-12 flex-1 text-zinc-50"
            />
            {search !== '' && (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Effacer la recherche"
                onPress={() => setSearch('')}
                className="h-11 w-11 items-center justify-center"
              >
                <Ionicons name="close-circle" color="#A1A1AA" size={20} />
              </Pressable>
            )}
          </View>
        </View>
        {status.id === 'tv-france' ? (
          <TvFranceList sport={sport} query={search} />
        ) : (
          <EventsList key={`${status.id}/${channels ? '' : sport.genre}`} status={status} sport={sport} query={search} />
        )}
      </View>
    </SafeAreaView>
  );
}
