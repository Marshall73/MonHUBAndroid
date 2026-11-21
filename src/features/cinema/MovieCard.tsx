import Ionicons from '@expo/vector-icons/Ionicons';
import { openBrowserAsync } from 'expo-web-browser';
import { MotiView } from 'moti';
import { Alert, Image, Pressable, Text, View } from 'react-native';

import { showtimesUrl, type Movie } from './tmdb';

const dateFormat = new Intl.DateTimeFormat('fr-FR', { dateStyle: 'long', timeZone: 'UTC' });
const ratingFormat = new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 1 });

export function MovieCard({ movie, cinema, index, reduceMotion }: {
  movie: Movie;
  cinema: string;
  index: number;
  reduceMotion: boolean;
}) {
  const timing = { type: 'timing' as const, duration: reduceMotion ? 0 : 260 };
  const date = /^\d{4}-\d{2}-\d{2}$/.test(movie.releaseDate)
    ? Date.parse(`${movie.releaseDate}T00:00:00Z`) : Number.NaN;

  return (
    <MotiView
      from={reduceMotion ? undefined : { opacity: 0, translateY: 8 }}
      animate={{ opacity: 1, translateY: 0 }}
      transition={{ opacity: timing, translateY: timing }}
      delay={reduceMotion ? 0 : Math.min(index, 5) * 40}
    >
      <View className="mb-3 gap-3 rounded-2xl border border-zinc-800 bg-zinc-900 p-3">
        <View className="flex-row items-start gap-3">
          <View className="h-[126px] w-[84px] items-center justify-center overflow-hidden rounded-xl bg-zinc-800">
            <Ionicons name="film-outline" color="#71717A" size={28} />
            {movie.posterUrl && <Image source={{ uri: movie.posterUrl }} className="absolute h-full w-full" />}
          </View>
          <View className="flex-1 gap-1.5 py-1">
            <Text className="text-lg font-bold leading-6 text-zinc-50">{movie.title}</Text>
            <View className="flex-row items-center gap-1.5">
              <Ionicons name="star" size={14} color="#FBBF24" />
              <Text className="text-xs font-semibold text-amber-200">
                {movie.rating === null ? 'Pas encore noté' : `${ratingFormat.format(movie.rating)}/10`}
              </Text>
            </View>
            <Text className="text-xs text-zinc-400">
              {Number.isFinite(date) ? dateFormat.format(date) : 'Date de sortie inconnue'}
            </Text>
            <Text numberOfLines={3} className="text-sm leading-5 text-zinc-300">
              {movie.synopsis || 'Synopsis indisponible.'}
            </Text>
          </View>
        </View>
        <Pressable
          accessibilityRole="link"
          accessibilityHint="Ouvre une recherche de séances dans le navigateur"
          onPress={() => {
            openBrowserAsync(showtimesUrl(movie.title, cinema)).catch(() => {
              Alert.alert('Ouverture impossible', 'Impossible d’ouvrir la recherche de séances.');
            });
          }}
          className="min-h-11 flex-row items-center justify-between gap-2 rounded-xl bg-blue-500/15 px-3 py-2 active:bg-blue-500/25"
        >
          <Text className="flex-1 text-sm font-semibold text-blue-200">Voir les séances à {cinema}</Text>
          <Ionicons name="open-outline" size={17} color="#93C5FD" />
        </Pressable>
      </View>
    </MotiView>
  );
}
