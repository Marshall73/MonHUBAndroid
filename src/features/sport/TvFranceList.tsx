import { MotiView } from 'moti';
import { useEffect, useState } from 'react';
import { FlatList, Pressable, RefreshControl, Text, View } from 'react-native';
import { useReducedMotion } from 'react-native-reanimated';

import { searchable, type Sport } from './filters';
import { fetchTvSchedule, filterPrograms, programKey, type ProgramView, type TvProgram } from './tvFrance';

const emptyMessages: Record<ProgramView, string> = {
  live: 'Aucun programme ne correspond aux filtres.',
  upcoming: 'Aucun match à venir pour ces filtres.',
  finished: 'Aucun match terminé pour ces filtres.',
};

function channelColors(channel: string) {
  const name = searchable(channel);
  if (name.includes('canal+')) return 'bg-violet-500/25 text-violet-200';
  if (name.includes('bein')) return 'bg-fuchsia-500/25 text-fuchsia-200';
  if (name.includes('eurosport')) return 'bg-sky-500/25 text-sky-200';
  if (name.includes('rmc')) return 'bg-red-500/25 text-red-200';
  if (name.includes('equipe')) return 'bg-emerald-500/25 text-emerald-200';
  if (name.includes('ligue 1+')) return 'bg-indigo-500/25 text-indigo-200';
  return 'bg-blue-500/25 text-blue-200';
}

function ProgramCard({ item, index, reduceMotion }: { item: TvProgram; index: number; reduceMotion: boolean }) {
  const timing = { type: 'timing' as const, duration: reduceMotion ? 0 : 260 };
  const competition = item.competition || item.sport;
  const finished = item.status === 'Terminé';
  const normalizedTitle = searchable(item.title).replace(/[^\p{L}\p{N}]/gu, '');
  const normalizedChannel = searchable(item.channel).replace(/[^\p{L}\p{N}]/gu, '');
  const hasChannel = normalizedChannel !== '' && normalizedChannel !== 'chainetv' &&
    normalizedChannel !== normalizedTitle;

  return (
    <MotiView
      from={reduceMotion ? undefined : { opacity: 0, translateY: 8 }}
      animate={{ opacity: 1, translateY: 0 }}
      transition={{ opacity: timing, translateY: timing }}
      delay={reduceMotion ? 0 : Math.min(index, 5) * 40}
    >
      <View className="mb-3 gap-2 rounded-2xl border border-zinc-800 bg-zinc-900 p-4">
        <View className="flex-row flex-wrap items-center gap-x-3 gap-y-1">
          <Text className="text-lg font-extrabold text-zinc-50">{item.time}</Text>
          {competition !== item.sport && <Text className="text-sm font-medium text-zinc-400">{item.sport}</Text>}
        </View>
        <Text className="text-base font-bold leading-6 text-zinc-50">{item.title}</Text>
        <View className="flex-row flex-wrap items-center gap-x-2 gap-y-1">
          <Text className="text-sm text-zinc-400">{competition}</Text>
          <View className={`flex-row items-center gap-1.5 rounded-full px-2 py-1 ${finished ? 'bg-zinc-800' : 'bg-emerald-500/15'}`}>
            <View className={`h-1.5 w-1.5 rounded-full ${finished ? 'bg-zinc-400' : 'bg-emerald-400'}`} />
            <Text className={`text-xs font-semibold ${finished ? 'text-zinc-300' : 'text-emerald-200'}`}>
              {item.status}
            </Text>
          </View>
        </View>
        {hasChannel ? (
          <Text className={`overflow-hidden self-start rounded-xl px-3 py-2 text-base font-extrabold ${channelColors(item.channel)}`}>
            {item.channel}
          </Text>
        ) : (
          <Text className="text-sm text-zinc-400">Chaîne non renseignée</Text>
        )}
      </View>
    </MotiView>
  );
}

export function TvFranceList({ sport, query, now, view }: {
  sport: Sport;
  query: string;
  now: Date;
  view: ProgramView;
}) {
  const [programs, setPrograms] = useState<TvProgram[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [request, setRequest] = useState<{ refresh: boolean } | null>({ refresh: false });
  const reduceMotion = useReducedMotion();

  useEffect(() => {
    if (!request) return;
    const controller = new AbortController();
    const timeout = setTimeout(() => {
      controller.abort();
      setError('Le programme TV France met trop de temps à répondre.');
      setRequest((current) => current === request ? null : current);
    }, 15000);

    fetchTvSchedule(controller.signal)
      .then((result) => { if (!controller.signal.aborted) setPrograms(result); })
      .catch((failure: unknown) => {
        if (!controller.signal.aborted) {
          setError(failure instanceof Error ? failure.message : 'Programme TV France indisponible.');
        }
      })
      .finally(() => {
        clearTimeout(timeout);
        if (!controller.signal.aborted) setRequest((current) => current === request ? null : current);
      });

    return () => {
      clearTimeout(timeout);
      controller.abort();
    };
  }, [request]);

  function load(refresh: boolean) {
    setError(null);
    setRequest({ refresh });
  }

  return (
    <FlatList
      className="flex-1 px-5"
      keyboardShouldPersistTaps="handled"
      data={programs ? filterPrograms(programs, sport, query, now, view) : undefined}
      keyExtractor={programKey}
      renderItem={({ item, index }) => <ProgramCard item={item} index={index} reduceMotion={reduceMotion} />}
      refreshControl={<RefreshControl refreshing={request?.refresh === true} onRefresh={() => load(true)} colors={['#3B82F6']} />}
      ListHeaderComponent={error ? (
        <View className="mb-3 items-start gap-2 rounded-2xl border border-red-900 bg-zinc-900 p-4">
          <Text accessibilityLiveRegion="polite" className="text-sm text-red-200">{error}</Text>
          <Pressable
            accessibilityRole="button" onPress={() => load(programs !== null)}
            className="min-h-11 justify-center rounded-full bg-blue-500/15 px-4"
          >
            <Text className="font-semibold text-blue-200">Réessayer</Text>
          </Pressable>
        </View>
      ) : undefined}
      ListEmptyComponent={error ? undefined : programs === null ? (
        <View accessible accessibilityLabel="Chargement du programme TV France" accessibilityState={{ busy: true }}>
          {[0, 1, 2].map((index) => (
            <View key={index} className="mb-3 gap-3 rounded-2xl border border-zinc-800 bg-zinc-900 p-4">
              <View className="h-5 w-24 rounded bg-zinc-800" />
              <View className="h-5 w-4/5 rounded bg-zinc-800" />
              <View className="h-7 w-28 rounded-lg bg-zinc-800" />
            </View>
          ))}
        </View>
      ) : (
        <Text className="rounded-2xl border border-zinc-800 bg-zinc-900 p-4 text-zinc-300">
          {programs.length === 0 ? 'Aucun programme TV France publié pour le moment.' : emptyMessages[view]}
        </Text>
      )}
    />
  );
}
