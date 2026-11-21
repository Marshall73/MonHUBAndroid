import Ionicons from '@expo/vector-icons/Ionicons';
import { openBrowserAsync } from 'expo-web-browser';
import { MotiView } from 'moti';
import { useState } from 'react';
import { ActivityIndicator, Alert, Image, Pressable, Text, View } from 'react-native';

import { CollapsibleDetails } from '../CollapsibleDetails';
import { mediaUrl, type Media, type MediaType, type Platform } from './tmdb';
import type { DetailState } from './useStreamingMetadata';

export function StreamingCard({ item, type, platform, index, reduceMotion, genres, details, loadDetails }: {
  item: Media;
  type: MediaType;
  platform: Platform;
  index: number;
  reduceMotion: boolean;
  genres: ReadonlyMap<number, string> | undefined;
  details: DetailState | undefined;
  loadDetails: () => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const timing = { type: 'timing' as const, duration: reduceMotion ? 0 : 260 };
  const genreText = item.genreIds.map((id) => genres?.get(id)).filter(Boolean).join(', ');
  const data = details?.status === 'ready' ? details.data : null;
  const runtimeAndGenres = [data?.duration, genreText].filter(Boolean).join(' • ');

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
          accessibilityHint={expanded ? 'Replie la fiche' : 'Affiche les détails'}
          onPress={() => {
            if (!expanded && !details) loadDetails();
            setExpanded((current) => !current);
          }}
          className="flex-row items-start gap-3 rounded-2xl p-3 active:bg-zinc-800"
        >
          <View className="aspect-[2/3] w-[84px] items-center justify-center overflow-hidden rounded-xl bg-zinc-800">
            <Ionicons name={type === 'movie' ? 'film-outline' : 'tv-outline'} size={26} color="#71717A" />
            {item.poster !== '' && (
              <Image source={{ uri: item.poster }} resizeMode="cover" className="absolute inset-0 h-full w-full" />
            )}
          </View>
          <View className="flex-1 gap-2 py-1">
            <View className="flex-row items-start justify-between gap-2">
              <View className={`shrink rounded-full px-2.5 py-1 ${platform.background}`}>
                <Text className={`text-xs font-semibold ${platform.text}`}>
                  {platform.label}
                </Text>
              </View>
              <Ionicons name={expanded ? 'chevron-up' : 'chevron-down'} size={17} color="#A1A1AA" />
            </View>
            <Text className="text-lg font-bold leading-6 text-zinc-50">{item.title}</Text>
            <View className="flex-row flex-wrap items-center gap-3">
              <Text className="text-sm text-zinc-400">{item.year || 'Année inconnue'}</Text>
              <View className="flex-row items-center gap-1.5">
                <Ionicons name="star" size={14} color="#FBBF24" />
                <Text className="text-sm font-semibold text-amber-200">
                  {item.rating === null ? 'Non noté' : `${item.rating.toFixed(1)}/10`}
                </Text>
              </View>
            </View>
            {genreText !== '' && <Text className="text-sm text-zinc-400">{genreText}</Text>}
          </View>
        </Pressable>

        <CollapsibleDetails expanded={expanded} reduceMotion={reduceMotion}>
          {details?.status === 'loading' && (
            <View accessible accessibilityState={{ busy: true }} className="flex-row items-center gap-2">
              <ActivityIndicator size="small" color="#A1A1AA" />
              <Text className="text-xs text-zinc-400">Chargement des détails…</Text>
            </View>
          )}
          {details?.status === 'error' && (
            <View className="self-stretch">
              <Text accessibilityLiveRegion="polite" className="text-sm text-red-200">{details.message}</Text>
              <Pressable
                accessibilityRole="button" disabled={!expanded} onPress={loadDetails}
                className="min-h-11 self-start justify-center pr-3"
              >
                <Text className="text-sm font-semibold text-blue-200">Réessayer</Text>
              </Pressable>
            </View>
          )}
          {runtimeAndGenres !== '' && <Text className="text-sm text-zinc-400">{runtimeAndGenres}</Text>}
          {data?.creators && (
            <Text className="self-stretch text-sm leading-5 text-zinc-300">
              <Text className="font-bold text-zinc-50">{type === 'movie' ? 'Réalisation :' : 'Création :'}</Text> {data.creators}
            </Text>
          )}
          {data?.cast && (
            <Text className="self-stretch text-sm leading-5 text-zinc-300">
              <Text className="font-bold text-zinc-50">Casting :</Text> {data.cast}
            </Text>
          )}
          <Text className="self-stretch text-sm leading-6 text-zinc-300">
            {data?.overview || item.overview || 'Synopsis indisponible.'}
          </Text>
          <Pressable
            accessibilityRole="link"
            disabled={!expanded}
            onPress={() => {
              openBrowserAsync(mediaUrl(type, item.id)).catch(() => {
                Alert.alert('Ouverture impossible', 'Impossible d’ouvrir la fiche TMDB.');
              });
            }}
            className="min-h-11 flex-row items-center gap-2 rounded-full bg-blue-500/15 px-3 active:bg-blue-500/25"
          >
            <Text className="text-sm font-semibold text-blue-200">Voir la fiche TMDB</Text>
            <Ionicons name="open-outline" size={16} color="#93C5FD" />
          </Pressable>
        </CollapsibleDetails>
      </View>
    </MotiView>
  );
}
