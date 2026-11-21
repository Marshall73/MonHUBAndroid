import Ionicons from '@expo/vector-icons/Ionicons';
import { openBrowserAsync } from 'expo-web-browser';
import { MotiView } from 'moti';
import { Alert, Image, Pressable, Text, View } from 'react-native';

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
  const timing = { type: 'timing' as const, duration: reduceMotion ? 0 : 260 };
  const caption = (
    <View className="gap-2 p-4">
      <Text className="text-lg font-bold leading-6 text-zinc-50">{trailer.title}</Text>
      <View className="flex-row flex-wrap items-center gap-x-3 gap-y-1">
        <Text className="text-sm font-semibold text-blue-200">{trailer.channel}</Text>
        <Text className="text-xs text-zinc-400">{relativeDate(trailer.timestamp)}</Text>
      </View>
    </View>
  );

  return (
    <MotiView
      from={reduceMotion ? undefined : { opacity: 0, translateY: 8 }}
      animate={{ opacity: 1, translateY: 0 }}
      transition={{ opacity: timing, translateY: timing }}
      delay={reduceMotion ? 0 : Math.min(index, 5) * 40}
    >
      <View className="mb-4 overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-900">
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
            className="active:opacity-80"
          >
            <View className="aspect-video items-center justify-center bg-zinc-800">
              {trailer.thumbnail && (
                <Image source={{ uri: trailer.thumbnail }} resizeMode="cover" className="absolute inset-0 h-full w-full" />
              )}
              <View className="h-14 w-14 items-center justify-center rounded-full border border-white/25 bg-black/70">
                <Ionicons name="play" size={24} color="#FAFAFA" />
              </View>
            </View>
            {caption}
          </Pressable>
        )}
      </View>
    </MotiView>
  );
}
