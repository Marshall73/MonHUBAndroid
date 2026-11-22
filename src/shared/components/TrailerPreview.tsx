import Ionicons from '@expo/vector-icons/Ionicons';
import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { Pressable, Text } from 'react-native';

import palette from '../../theme.json';
import { InvidiousPlayer } from './InvidiousPlayer';

export function TrailerPreview({ videoId }: { videoId: string }) {
  const [playing, setPlaying] = useState(false);
  useFocusEffect(useCallback(() => () => setPlaying(false), []));

  if (playing) return <InvidiousPlayer videoId={videoId} onClose={() => setPlaying(false)} />;

  return (
    <Pressable
      accessibilityRole="button"
      onPress={() => setPlaying(true)}
      className="min-h-11 flex-row items-center gap-2 rounded-lg border border-transparent bg-selection px-3 active:bg-pressed focus:border-ink"
    >
      <Ionicons name="play-outline" size={17} color={palette.accent} />
      <Text className="text-sm font-semibold text-accent">Voir la bande-annonce</Text>
    </Pressable>
  );
}
