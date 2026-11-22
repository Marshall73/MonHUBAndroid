import Ionicons from '@expo/vector-icons/Ionicons';
import { openBrowserAsync } from 'expo-web-browser';
import { MotiView } from 'moti';
import { useState } from 'react';
import { ActivityIndicator, Alert, Image, Pressable, Text, View } from 'react-native';

import { TrailerPreview } from '../../shared/components/TrailerPreview';
import palette from '../../theme.json';

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
  const timing = { type: 'timing' as const, duration: reduceMotion ? 0 : 160 };
  const genreText = item.genreIds.map((id) => genres?.get(id)).filter(Boolean).join(', ');
  const data = details?.status === 'ready' ? details.data : null;
  const runtimeAndGenres = [data?.duration, genreText].filter(Boolean).join(', ');

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
          accessibilityHint={expanded ? 'Replie la fiche' : 'Affiche les détails'}
          onPress={() => {
            if (!expanded && !details) loadDetails();
            setExpanded((current) => !current);
          }}
          className="border border-transparent focus:border-ink web:focus-visible:border-ink flex-row items-start gap-3 rounded-xl p-3 active:bg-raised"
        >
          <View className="aspect-[2/3] w-[84px] items-center justify-center overflow-hidden rounded-xl bg-raised">
            <Ionicons name={type === 'movie' ? 'film-outline' : 'tv-outline'} size={26} color={palette.muted} />
            {item.poster !== '' && (
              <Image source={{ uri: item.poster }} resizeMode="cover" className="absolute inset-0 h-full w-full" />
            )}
          </View>
          <View className="min-w-0 flex-1 gap-2 py-1">
            <View className="flex-row items-start justify-between gap-2">
              <Text className="min-w-0 flex-1 text-item-title font-semibold text-ink">{item.title}</Text>
              <Ionicons name={expanded ? 'chevron-up' : 'chevron-down'} size={17} color={palette.muted} />
            </View>
            <Text className="text-sm font-medium text-copy">{platform.label}</Text>
            <View className="flex-row flex-wrap items-center gap-3">
              <Text className="text-sm text-muted">{item.year || 'Année inconnue'}</Text>
              <View className="flex-row items-center gap-1.5">
                <Ionicons name="star" size={14} color={palette.muted} />
                <Text className="text-sm font-semibold tabular-nums text-copy">
                  {item.rating === null ? 'Non noté' : `${item.rating.toFixed(1)}/10`}
                </Text>
              </View>
            </View>
            {genreText !== '' && <Text className="text-sm text-muted">{genreText}</Text>}
          </View>
        </Pressable>

        <CollapsibleDetails expanded={expanded} reduceMotion={reduceMotion}>
          {details?.status === 'loading' && (
            <View accessible accessibilityState={{ busy: true }} className="flex-row items-center gap-2">
              <ActivityIndicator size="small" color={palette.muted} />
              <Text className="text-xs text-muted">Chargement des détails…</Text>
            </View>
          )}
          {details?.status === 'error' && (
            <View className="self-stretch">
              <Text accessibilityLiveRegion="polite" className="text-sm text-error">{details.message}</Text>
              <Pressable
                accessibilityRole="button" disabled={!expanded} onPress={loadDetails}
                className="border border-transparent focus:border-ink web:focus-visible:border-ink active:opacity-75 min-h-11 self-start justify-center pr-3"
              >
                <Text className="text-sm font-semibold text-accent">Réessayer</Text>
              </Pressable>
            </View>
          )}
          {runtimeAndGenres !== '' && <Text className="text-sm text-muted">{runtimeAndGenres}</Text>}
          {data?.creators && (
            <Text className="self-stretch text-sm leading-5 text-copy">
              <Text className="font-bold text-ink">{type === 'movie' ? 'Réalisation :' : 'Création :'}</Text> {data.creators}
            </Text>
          )}
          {data?.cast && (
            <Text className="self-stretch text-sm leading-5 text-copy">
              <Text className="font-bold text-ink">Casting :</Text> {data.cast}
            </Text>
          )}
          <Text className="self-stretch text-sm leading-6 text-copy">
            {data?.overview || item.overview || 'Synopsis indisponible.'}
          </Text>
          {expanded && data?.trailerVideoId && <TrailerPreview videoId={data.trailerVideoId} />}
          <Pressable
            accessibilityRole="link"
            disabled={!expanded}
            onPress={() => {
              openBrowserAsync(mediaUrl(type, item.id)).catch(() => {
                Alert.alert('Ouverture impossible', 'Impossible d’ouvrir la fiche TMDB.');
              });
            }}
            className="border border-transparent focus:border-ink web:focus-visible:border-ink min-h-11 flex-row items-center gap-2 rounded-lg bg-selection px-3 active:bg-pressed"
          >
            <Text className="text-sm font-semibold text-accent">Voir la fiche TMDB</Text>
            <Ionicons name="open-outline" size={16} color={palette.accent} />
          </Pressable>
        </CollapsibleDetails>
      </View>
    </MotiView>
  );
}
