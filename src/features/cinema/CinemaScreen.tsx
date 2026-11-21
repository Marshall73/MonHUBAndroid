import Ionicons from '@expo/vector-icons/Ionicons';
import { useEffect, useState } from 'react';
import { FlatList, Pressable, RefreshControl, ScrollView, Text, TextInput, View } from 'react-native';
import { useReducedMotion } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

import { MovieCard } from './MovieCard';
import { fetchProgram, normalizeTitle, screeningKey, type Screening } from './program';

export default function CinemaScreen() {
  const [search, setSearch] = useState('');
  const [selectedCinema, setSelectedCinema] = useState<string | null>(null);
  const [movies, setMovies] = useState<Screening[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [request, setRequest] = useState(0);
  const reduceMotion = useReducedMotion();

  useEffect(() => {
    const controller = new AbortController();
    const timeout = setTimeout(() => {
      controller.abort();
      setError('Le programme met trop de temps à répondre. Réessayez.');
      setRefreshing(false);
    }, 15000);

    fetchProgram(controller.signal)
      .then((result) => {
        if (controller.signal.aborted) return;
        setMovies(result);
        setSelectedCinema((current) => result.some((movie) => movie.cinema === current) ? current : null);
      })
      .catch((failure: unknown) => {
        if (!controller.signal.aborted) {
          setError(failure instanceof Error ? failure.message : 'Impossible de charger le programme.');
        }
      })
      .finally(() => {
        clearTimeout(timeout);
        if (!controller.signal.aborted) setRefreshing(false);
      });

    return () => {
      clearTimeout(timeout);
      controller.abort();
    };
  }, [request]);

  function reload(pullToRefresh = false) {
    setError(null);
    setRefreshing(pullToRefresh || movies !== null);
    setRequest((current) => current + 1);
  }

  const cinemas = [...new Set(movies?.map((movie) => movie.cinema))].sort((a, b) => a.localeCompare(b, 'fr'));
  const query = normalizeTitle(search);
  const filtered = movies?.filter((movie) =>
    (selectedCinema === null || movie.cinema === selectedCinema) && normalizeTitle(movie.title).includes(query));

  return (
    <SafeAreaView edges={['top', 'left', 'right']} className="flex-1 bg-zinc-950">
      <View className="mx-auto w-full max-w-xl flex-1 pt-8">
        <View className="mb-4 gap-3 px-5">
          <Text accessibilityRole="header" className="text-4xl font-extrabold tracking-tight text-zinc-50">
            Cinéma
          </Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} className="grow-0">
            {[null, ...cinemas].map((cinema) => {
              const selected = selectedCinema === cinema;
              return (
                <Pressable
                  key={cinema === null ? 'all' : `cinema:${cinema}`}
                  accessibilityRole="button"
                  accessibilityState={{ selected }}
                  onPress={() => setSelectedCinema(cinema)}
                  className={`mr-2 min-h-11 justify-center rounded-full border px-4 ${selected ? 'border-blue-500/60 bg-blue-500/15' : 'border-zinc-800 bg-zinc-900'}`}
                >
                  <Text className={`text-sm font-semibold ${selected ? 'text-blue-200' : 'text-zinc-300'}`}>
                    {cinema ?? 'Tous'}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>

          <View className="min-h-12 flex-row items-center gap-2 rounded-xl border border-zinc-800 bg-zinc-900 px-3">
            <Ionicons name="search-outline" color="#A1A1AA" size={19} />
            <TextInput
              accessibilityLabel="Rechercher un film"
              placeholder="Rechercher un film"
              placeholderTextColor="#A1A1AA"
              value={search}
              onChangeText={setSearch}
              autoCorrect={false}
              returnKeyType="search"
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

        <FlatList
          className="flex-1 px-5"
          keyboardShouldPersistTaps="handled"
          data={filtered}
          keyExtractor={screeningKey}
          renderItem={({ item, index }) => (
            <MovieCard movie={item} index={index} reduceMotion={reduceMotion} />
          )}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={() => reload(true)} colors={['#3B82F6']} />
          }
          ListHeaderComponent={error ? (
            <View className="mb-3 items-start gap-2 rounded-2xl border border-red-900 bg-zinc-900 p-4">
              <Text accessibilityLiveRegion="polite" className="text-sm leading-5 text-red-200">{error}</Text>
              <Pressable
                accessibilityRole="button"
                className="min-h-11 justify-center rounded-full bg-blue-500/15 px-4"
                onPress={() => reload()}
              >
                <Text className="font-semibold text-blue-200">Réessayer</Text>
              </Pressable>
            </View>
          ) : undefined}
          ListEmptyComponent={error ? undefined : movies === null ? (
            <View accessible accessibilityLabel="Chargement des séances" accessibilityState={{ busy: true }}>
              {[0, 1, 2].map((index) => (
                <View key={index} className="mb-3 flex-row gap-3 rounded-2xl border border-zinc-800 bg-zinc-900 p-3">
                  <View className="aspect-[2/3] w-[84px] rounded-xl bg-zinc-800" />
                  <View className="flex-1 gap-3 pt-1">
                    <View className="h-5 w-3/4 rounded-full bg-zinc-800" />
                    <View className="h-5 w-5/6 rounded bg-zinc-800" />
                    <View className="flex-row gap-2">
                      {[0, 1, 2].map((time) => <View key={time} className="h-8 w-12 rounded-full bg-zinc-800" />)}
                    </View>
                  </View>
                </View>
              ))}
            </View>
          ) : (
            <Text className="rounded-2xl border border-zinc-800 bg-zinc-900 p-4 text-zinc-300">
              {query ? 'Aucun film ne correspond à votre recherche.' : 'Aucun film dans le programme pour le moment.'}
            </Text>
          )}
        />
      </View>
    </SafeAreaView>
  );
}
