import Ionicons from '@expo/vector-icons/Ionicons';
import { openBrowserAsync } from 'expo-web-browser';
import { MotiView } from 'moti';
import { Alert, Image, Pressable, Text, View } from 'react-native';

import palette from '../../theme.json';

import { relativeDate } from '../feedXml';
import type { Trailer } from './feeds';
import { TrailerPlayer } from './TrailerPlayer';

export function TrailerCard({ trailer, index, reduceMotion, active, onPlay, onClose }: {
  trailer: Trailer;
  index: number;
  reduceMotion: boolean;
  active: boolean;
  onPlay: () => void;
  onClose: () => void;
}) {
  const timing = { type: 'timing' as const, duration: reduceMotion ? 0 : 160 };
  const caption = (
    <View className="gap-2 p-4">
      <Text className="text-item-title font-semibold text-ink">{trailer.title}</Text>
      <View className="flex-row flex-wrap items-center gap-x-3 gap-y-1">
        <Text className="text-sm font-medium text-copy">{trailer.channel}</Text>
        <Text className="text-xs text-muted">{relativeDate(trailer.timestamp)}</Text>
      </View>
    </View>
  );

  return (
    <MotiView
      from={reduceMotion ? undefined : { opacity: 0.85 }}
      animate={{ opacity: 1 }}
      transition={{ opacity: timing }}
      delay={reduceMotion ? 0 : Math.min(index, 3) * 12}
    >
      <View className="mb-4 overflow-hidden rounded-xl border border-line bg-surface">
        {active && trailer.videoId ? (
          <>
            <TrailerPlayer videoId={trailer.videoId} url={trailer.url} onClose={onClose} />
            {caption}
          </>
        ) : (
          <Pressable
            accessibilityRole="button"
            accessibilityHint={trailer.videoId ? 'Lit la vidéo dans Trailers' : 'Ouvre la vidéo dans le navigateur intégré'}
            onPress={() => {
              if (trailer.videoId) {
                onPlay();
                return;
              }
              openBrowserAsync(trailer.url).catch(() => {
                Alert.alert('Lecture indisponible', 'Impossible d’ouvrir cette vidéo.');
              });
            }}
            className="border border-transparent focus:border-ink web:focus-visible:border-ink active:opacity-80"
          >
            <View className="aspect-video items-center justify-center bg-raised">
              {trailer.thumbnail && (
                <Image source={{ uri: trailer.thumbnail }} resizeMode="cover" className="absolute inset-0 h-full w-full" />
              )}
              <View className="h-14 w-14 items-center justify-center rounded-xl border border-ink/40 bg-scrim/75">
                <Ionicons name="play" size={24} color={palette.ink} />
              </View>
            </View>
            {caption}
          </Pressable>
        )}
      </View>
    </MotiView>
  );
}
