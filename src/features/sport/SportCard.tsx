import Ionicons from '@expo/vector-icons/Ionicons';
import { MotiView } from 'moti';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Image, Pressable, Text, View } from 'react-native';

import { CollapsibleDetails } from '../CollapsibleDetails';
import { displayRelease, fetchBroadcasters, type SportEvent } from './nuvio';

type Broadcasters = { names: string[] } | { error: string };

export function SportCard({ event, index, reduceMotion }: {
  event: SportEvent;
  index: number;
  reduceMotion: boolean;
}) {
  const [expanded, setExpanded] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const [broadcasters, setBroadcasters] = useState<Broadcasters | null>(null);
  const timing = { type: 'timing' as const, duration: reduceMotion ? 0 : 260 };
  const release = displayRelease(event.releaseInfo);

  useEffect(() => {
    if (attempt === 0) return;
    const controller = new AbortController();
    fetchBroadcasters(event.id, controller.signal)
      .then((names) => {
        if (!controller.signal.aborted) setBroadcasters({ names });
      })
      .catch((error: unknown) => {
        if (!controller.signal.aborted) {
          setBroadcasters({ error: error instanceof Error ? error.message : 'Diffuseurs indisponibles.' });
        }
      });
    return () => controller.abort();
  }, [attempt, event.id]);

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
          accessibilityHint={expanded ? 'Masque les diffuseurs' : 'Affiche les diffuseurs'}
          onPress={() => {
            if (!attempt) setAttempt(1);
            setExpanded((value) => !value);
          }}
          className="flex-row items-start gap-3 rounded-2xl p-3 active:bg-zinc-800"
        >
          <View className="h-20 w-20 items-center justify-center overflow-hidden rounded-xl bg-zinc-800">
            <Ionicons name="trophy-outline" color="#71717A" size={24} />
            {event.poster !== '' && (
              <Image source={{ uri: event.poster }} resizeMode="contain" className="absolute inset-0 h-full w-full" />
            )}
          </View>
          <View className="flex-1 gap-2">
            <View className="flex-row items-start justify-between gap-2">
              <Text className="flex-1 text-base font-bold leading-6 text-zinc-50">{event.name}</Text>
              <Ionicons name={expanded ? 'chevron-up' : 'chevron-down'} color="#A1A1AA" size={17} />
            </View>
            {release !== '' && (
              <View className={`self-start rounded-full px-2.5 py-1 ${release === 'En direct' ? 'bg-emerald-500/15' : 'bg-blue-500/15'}`}>
                <Text className={`text-xs font-semibold ${release === 'En direct' ? 'text-emerald-200' : 'text-blue-200'}`}>
                  {release}
                </Text>
              </View>
            )}
            {event.description !== '' && (
              <Text numberOfLines={4} className="text-sm leading-5 text-zinc-300">{event.description}</Text>
            )}
          </View>
        </Pressable>

        <CollapsibleDetails expanded={expanded} reduceMotion={reduceMotion}>
          <Text className="text-sm font-semibold text-zinc-50">Diffuseurs signalés par Nuvio</Text>
          {broadcasters === null ? (
            <View accessible accessibilityState={{ busy: true }} className="flex-row items-center gap-2">
              <ActivityIndicator size="small" color="#93C5FD" />
              <Text className="text-xs text-zinc-400">Chargement des diffuseurs…</Text>
            </View>
          ) : 'error' in broadcasters ? (
            <View className="self-stretch">
              <Text accessibilityLiveRegion="polite" className="text-sm text-red-200">{broadcasters.error}</Text>
              <Pressable
                accessibilityRole="button"
                disabled={!expanded}
                onPress={() => {
                  setBroadcasters(null);
                  setAttempt((value) => value + 1);
                }}
                className="min-h-11 self-start justify-center pr-3"
              >
                <Text className="text-sm font-semibold text-blue-200">Réessayer</Text>
              </Pressable>
            </View>
          ) : broadcasters.names.length ? (
            <View className="flex-row flex-wrap gap-2">
              {broadcasters.names.map((name) => (
                <View key={name} className="max-w-full rounded-xl border border-blue-500/30 bg-blue-500/15 px-3 py-1.5">
                  <Text className="text-sm font-medium text-blue-200">{name}</Text>
                </View>
              ))}
            </View>
          ) : (
            <Text className="text-sm text-zinc-400">Aucun diffuseur signalé pour le moment.</Text>
          )}
        </CollapsibleDetails>
      </View>
    </MotiView>
  );
}
