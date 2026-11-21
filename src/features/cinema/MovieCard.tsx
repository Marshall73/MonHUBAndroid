import Ionicons from '@expo/vector-icons/Ionicons';
import { openBrowserAsync } from 'expo-web-browser';
import { MotiView } from 'moti';
import { useState } from 'react';
import { Alert, Image, Pressable, Text, View } from 'react-native';

import { cinemaSiteUrl, type Screening } from './program';

export function MovieCard({ movie, index, reduceMotion }: {
  movie: Screening;
  index: number;
  reduceMotion: boolean;
}) {
  const [expanded, setExpanded] = useState(false);
  const [detailsHeight, setDetailsHeight] = useState(0);
  const timing = { type: 'timing' as const, duration: reduceMotion ? 0 : 260 };

  return (
    <MotiView
      from={reduceMotion ? undefined : { opacity: 0, translateY: 8 }}
      animate={{ opacity: 1, translateY: 0 }}
      transition={{ opacity: timing, translateY: timing }}
      delay={reduceMotion ? 0 : Math.min(index, 5) * 40}
    >
      <View className="mb-3 rounded-2xl border border-zinc-800 bg-zinc-900">
        <Pressable
          accessibilityRole="button"
          accessibilityState={{ expanded }}
          accessibilityHint={expanded ? 'Replie la fiche du film' : 'Affiche les détails du film'}
          onPress={() => setExpanded((current) => !current)}
          className="flex-row items-start gap-3 rounded-2xl p-3 active:bg-zinc-800"
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
              <Ionicons name={expanded ? 'chevron-up' : 'chevron-down'} size={17} color="#A1A1AA" />
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

        <View
          className="mx-3 overflow-hidden"
          pointerEvents={expanded ? 'auto' : 'none'}
          accessibilityElementsHidden={!expanded}
          importantForAccessibility={expanded ? 'auto' : 'no-hide-descendants'}
        >
          <MotiView
            animate={{ height: expanded ? detailsHeight : 0, opacity: expanded ? 1 : 0 }}
            transition={{ height: timing, opacity: timing }}
          >
            {/* Mesure le contenu à sa taille réelle pendant l’animation de hauteur. */}
            <View
              className="absolute inset-x-0 top-0 items-start gap-2 border-t border-zinc-800 py-3"
              onLayout={(event) => setDetailsHeight(event.nativeEvent.layout.height)}
            >
              {movie.director !== '' && (
                <Text className="text-sm leading-5 text-zinc-300">
                  <Text className="font-bold text-zinc-50">Réalisation :</Text> {movie.director}
                </Text>
              )}
              {movie.cast !== '' && (
                <Text className="text-sm leading-5 text-zinc-300">
                  <Text className="font-bold text-zinc-50">Casting :</Text> {movie.cast}
                </Text>
              )}
              {movie.synopsis !== '' && (
                <Text className="text-sm leading-6 text-zinc-300">{movie.synopsis}</Text>
              )}
              <Pressable
                accessibilityRole="link"
                disabled={!expanded}
                onPress={() => {
                  openBrowserAsync(movie.link || cinemaSiteUrl).catch(() => {
                    Alert.alert('Ouverture impossible', 'Impossible d’ouvrir le site du cinéma.');
                  });
                }}
                className="min-h-11 flex-row items-center gap-2 rounded-full bg-blue-500/15 px-3 active:bg-blue-500/25"
              >
                <Text className="text-sm font-semibold text-blue-200">Voir sur le site</Text>
                <Ionicons name="open-outline" size={16} color="#93C5FD" />
              </Pressable>
            </View>
          </MotiView>
        </View>
      </View>
    </MotiView>
  );
}
