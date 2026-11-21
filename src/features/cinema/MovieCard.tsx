import Ionicons from '@expo/vector-icons/Ionicons';
import { openBrowserAsync } from 'expo-web-browser';
import { MotiView } from 'moti';
import { Alert, Image, Pressable, Text, View } from 'react-native';

import { bookingUrl, type Screening } from './program';

export function MovieCard({ movie, index, reduceMotion }: {
  movie: Screening;
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
        accessibilityHint="Ouvre les horaires et la réservation sur le site des Toiles du Lac"
        onPress={() => {
          openBrowserAsync(bookingUrl).catch(() => {
            Alert.alert('Ouverture impossible', 'Impossible d’ouvrir la page des horaires.');
          });
        }}
        className="mb-3 flex-row items-start gap-3 rounded-2xl border border-zinc-800 bg-zinc-900 p-3 active:border-blue-500"
      >
        <View className="aspect-[2/3] w-[84px] items-center justify-center overflow-hidden rounded-xl bg-zinc-800">
          <Ionicons name="film-outline" color="#71717A" size={28} />
          {movie.poster !== '' && (
            <Image source={{ uri: movie.poster }} resizeMode="cover" className="absolute inset-0 h-full w-full" />
          )}
        </View>
        <View className="flex-1 gap-2">
          <View className="flex-row items-start justify-between gap-2">
            <Text className="shrink rounded-full bg-zinc-800 px-2.5 py-1 text-xs font-medium text-zinc-300">
              {movie.cinema}
            </Text>
            <Ionicons name="open-outline" size={17} color="#A1A1AA" />
          </View>
          <Text className="text-lg font-bold leading-6 text-zinc-50">{movie.title}</Text>
          {movie.times.length > 0 ? (
            <View className="flex-row flex-wrap gap-1.5">
              {movie.times.map((time) => (
                <View key={time} className="min-h-8 justify-center rounded-full bg-blue-500/15 px-2.5">
                  <Text className="text-sm font-semibold text-blue-200">{time}</Text>
                </View>
              ))}
            </View>
          ) : (
            <Text className="text-sm text-zinc-400">Horaires sur le site du cinéma</Text>
          )}
        </View>
      </Pressable>
    </MotiView>
  );
}
