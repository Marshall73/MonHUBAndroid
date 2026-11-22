import Ionicons from '@expo/vector-icons/Ionicons';
import { openBrowserAsync } from 'expo-web-browser';
import { MotiView } from 'moti';
import { useState } from 'react';
import { Alert, Image, Pressable, Text, View } from 'react-native';

import palette from '../../theme.json';

import { CollapsibleDetails } from '../CollapsibleDetails';
import { cinemaSiteUrl, type Screening } from './program';

export function MovieCard({ movie, index, reduceMotion }: {
  movie: Screening;
  index: number;
  reduceMotion: boolean;
}) {
  const [expanded, setExpanded] = useState(false);
  const timing = { type: 'timing' as const, duration: reduceMotion ? 0 : 160 };
  const metadata = [movie.duration, movie.genre].filter(Boolean).join(', ');

  return (
    <MotiView
      from={reduceMotion ? undefined : { opacity: 0.85 }}
      animate={{ opacity: 1 }}
      transition={{ opacity: timing }}
      delay={reduceMotion ? 0 : Math.min(index, 3) * 12}
    >
      <View className="mb-3 rounded-xl border border-line bg-surface">
        <Pressable
          accessibilityRole="button"
          accessibilityState={{ expanded }}
          accessibilityHint={expanded ? 'Replie la fiche du film' : 'Affiche les détails du film'}
          onPress={() => setExpanded((current) => !current)}
          className="border border-transparent focus:border-ink web:focus-visible:border-ink flex-row items-start gap-3 rounded-xl p-3 active:bg-raised"
        >
          <View className="aspect-[2/3] w-[84px] items-center justify-center overflow-hidden rounded-xl bg-raised">
            <Ionicons name="film-outline" color={palette.muted} size={28} />
            {movie.poster !== '' && (
              <Image source={{ uri: movie.poster }} resizeMode="cover" className="absolute inset-0 h-full w-full" />
            )}
          </View>
          <View className="min-w-0 flex-1 gap-2">
            <View className="flex-row items-start justify-between gap-2">
              <Text className="min-w-0 flex-1 text-item-title font-semibold text-ink">{movie.title}</Text>
              <Ionicons name={expanded ? 'chevron-up' : 'chevron-down'} size={17} color={palette.muted} />
            </View>
            <Text className="text-sm font-medium text-copy">{movie.cinema}</Text>
            {metadata !== '' && <Text className="text-sm text-muted">{metadata}</Text>}
            {movie.times.length > 0 ? (
              <View className="flex-row flex-wrap gap-1.5">
                {movie.times.map((time) => (
                  <View key={time} className="min-h-8 justify-center rounded-md bg-raised px-2.5">
                    <Text className="text-sm font-semibold tabular-nums text-ink">{time}</Text>
                  </View>
                ))}
              </View>
            ) : (
              <Text className="text-sm text-muted">Horaires sur le site du cinéma</Text>
            )}
          </View>
        </Pressable>

        <CollapsibleDetails expanded={expanded} reduceMotion={reduceMotion}>
          {movie.director !== '' && (
            <Text className="text-sm leading-5 text-copy">
              <Text className="font-bold text-ink">Réalisation :</Text> {movie.director}
            </Text>
          )}
          {movie.cast !== '' && (
            <Text className="text-sm leading-5 text-copy">
              <Text className="font-bold text-ink">Casting :</Text> {movie.cast}
            </Text>
          )}
          {movie.synopsis !== '' && (
            <Text className="text-sm leading-6 text-copy">{movie.synopsis}</Text>
          )}
          <Pressable
            accessibilityRole="link"
            disabled={!expanded}
            onPress={() => {
              openBrowserAsync(movie.link || cinemaSiteUrl).catch(() => {
                Alert.alert('Ouverture impossible', 'Impossible d’ouvrir le site du cinéma.');
              });
            }}
            className="border border-transparent focus:border-ink web:focus-visible:border-ink min-h-11 flex-row items-center gap-2 rounded-lg bg-selection px-3 active:bg-pressed"
          >
            <Text className="text-sm font-semibold text-accent">Voir sur le site</Text>
            <Ionicons name="open-outline" size={16} color={palette.accent} />
          </Pressable>
        </CollapsibleDetails>
      </View>
    </MotiView>
  );
}
