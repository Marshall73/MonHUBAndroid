import Ionicons from '@expo/vector-icons/Ionicons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect, useState } from 'react';
import { FlatList, Image, Pressable, RefreshControl, Text, TextInput, View } from 'react-native';
import { useReducedMotion } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

import { FavoriteCinemaModal } from './FavoriteCinemaModal';
import { MovieCard } from './MovieCard';
import { fetchNowPlaying, searchable, tmdbKey, type Movie } from './tmdb';

const cinemaKey = 'cinema/favorite';
const defaultCinema = 'Les Toiles du Lac - Aix-les-Bains';

export default function CinemaScreen() {
  const [cinema, setCinema] = useState<string | null>(null);
  const [cinemaError, setCinemaError] = useState(false);
  const [editingCinema, setEditingCinema] = useState(false);
  const [search, setSearch] = useState('');
  const [movies, setMovies] = useState<Movie[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [request, setRequest] = useState(0);
  const reduceMotion = useReducedMotion();

  useEffect(() => {
    let active = true;
    AsyncStorage.getItem(cinemaKey).then((saved) => {
      if (active) setCinema(saved?.trim() || defaultCinema);
    }).catch(() => {
      if (!active) return;
      setCinema(defaultCinema);
      setCinemaError(true);
    });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    if (!tmdbKey) return;
    const controller = new AbortController();
    const timeout = setTimeout(() => {
      controller.abort();
      setError('TMDB met trop de temps à répondre. Réessayez.');
      setRefreshing(false);
    }, 20000);

    fetchNowPlaying(tmdbKey, controller.signal)
      .then((result) => {
        if (!controller.signal.aborted) setMovies(result);
      })
      .catch((failure: unknown) => {
        if (controller.signal.aborted) return;
        setError(failure instanceof Error ? failure.message : 'Impossible de charger les films.');
        setRefreshing(false);
        controller.abort();
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

  const query = searchable(search);
  const filtered = movies?.filter((movie) =>
    searchable(movie.title).includes(query) || searchable(movie.originalTitle).includes(query));

  return (
    <SafeAreaView edges={['top', 'left', 'right']} className="flex-1 bg-zinc-950">
      <FlatList
        className="mx-auto w-full max-w-xl flex-1 px-5"
        keyboardShouldPersistTaps="handled"
        data={filtered}
        keyExtractor={(movie) => String(movie.id)}
        renderItem={({ item, index }) => (
          <MovieCard movie={item} cinema={cinema ?? defaultCinema} index={index} reduceMotion={reduceMotion} />
        )}
        refreshControl={
          <RefreshControl
            enabled={!!tmdbKey}
            refreshing={refreshing}
            onRefresh={() => { if (tmdbKey) reload(true); }}
            colors={['#3B82F6']}
          />
        }
        ListHeaderComponent={
          <View className="mb-4 gap-4 pt-8">
            <Text accessibilityRole="header" className="text-4xl font-extrabold tracking-tight text-zinc-50">
              Cinéma
            </Text>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Configurer mon cinéma favori"
              disabled={cinema === null}
              onPress={() => setEditingCinema(true)}
              className="min-h-14 flex-row items-center gap-3 rounded-2xl border border-zinc-800 bg-zinc-900 p-3 active:border-blue-500"
            >
              <View className="h-10 w-10 items-center justify-center rounded-xl bg-blue-500/15">
                <Ionicons name="location-outline" color="#93C5FD" size={20} />
              </View>
              <View className="flex-1 gap-1">
                <Text className="text-xs font-semibold text-blue-200">Mon cinéma favori</Text>
                <Text className="text-sm font-semibold text-zinc-50">{cinema ?? 'Chargement…'}</Text>
              </View>
              <Ionicons name="create-outline" color="#A1A1AA" size={20} />
            </Pressable>
            {cinemaError && (
              <Text accessibilityLiveRegion="polite" className="text-sm text-amber-200">
                Cinéma enregistré indisponible. Vous pouvez le configurer à nouveau.
              </Text>
            )}

            <Text accessibilityRole="header" className="text-2xl font-bold tracking-tight text-zinc-50">
              À l’affiche cette semaine
            </Text>
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
                  accessibilityRole="button" accessibilityLabel="Effacer la recherche"
                  onPress={() => setSearch('')}
                  className="h-11 w-11 items-center justify-center"
                >
                  <Ionicons name="close-circle" color="#A1A1AA" size={20} />
                </Pressable>
              )}
            </View>
            {movies !== null && (
              <View className="flex-row items-center gap-3">
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
            )}
            {error && (
              <View className="items-start gap-2 rounded-2xl border border-red-900 bg-zinc-900 p-4">
                <Text accessibilityLiveRegion="polite" className="text-sm leading-5 text-red-200">{error}</Text>
                <Pressable
                  accessibilityRole="button" className="min-h-11 justify-center rounded-full bg-blue-500/15 px-4"
                  onPress={() => reload()}
                >
                  <Text className="font-semibold text-blue-200">Réessayer</Text>
                </Pressable>
              </View>
            )}
          </View>
        }
        ListEmptyComponent={!tmdbKey ? (
          <View className="gap-2 rounded-2xl border border-zinc-800 bg-zinc-900 p-4">
            <Text className="text-base font-bold text-zinc-50">Clé TMDB manquante</Text>
            <Text className="text-sm leading-5 text-zinc-300">
              Ajoutez cette ligne au fichier .env à la racine du projet, puis redémarrez Expo.
            </Text>
            <Text selectable className="text-xs font-semibold text-blue-200">
              EXPO_PUBLIC_TMDB_API_KEY=votre_clé_TMDB
            </Text>
          </View>
        ) : error ? undefined : movies === null ? (
          <View accessible accessibilityLabel="Chargement des films" accessibilityState={{ busy: true }}>
            {[0, 1, 2].map((index) => (
              <View key={index} className="mb-3 gap-3 rounded-2xl border border-zinc-800 bg-zinc-900 p-3">
                <View className="flex-row gap-3">
                  <View className="h-[126px] w-[84px] rounded-xl bg-zinc-800" />
                  <View className="flex-1 gap-3 pt-1">
                    <View className="h-5 w-3/4 rounded bg-zinc-800" />
                    <View className="h-3 w-16 rounded bg-zinc-800" />
                    <View className="h-3 w-5/6 rounded bg-zinc-800" />
                    <View className="h-3 w-2/3 rounded bg-zinc-800" />
                  </View>
                </View>
                <View className="h-11 rounded-xl bg-zinc-800" />
              </View>
            ))}
          </View>
        ) : (
          <Text className="rounded-2xl border border-zinc-800 bg-zinc-900 p-4 text-zinc-300">
            {query ? 'Aucun film ne correspond à votre recherche.' : 'Aucun film à l’affiche pour le moment.'}
          </Text>
        )}
      />
      {editingCinema && cinema !== null && (
        <FavoriteCinemaModal
          cinema={cinema}
          onClose={() => setEditingCinema(false)}
          onSave={async (name) => {
            await AsyncStorage.setItem(cinemaKey, name);
            setCinema(name);
            setCinemaError(false);
          }}
        />
      )}
    </SafeAreaView>
  );
}
