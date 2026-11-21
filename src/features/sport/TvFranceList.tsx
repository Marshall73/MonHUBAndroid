import { MotiView } from 'moti';
import { useEffect, useState } from 'react';
import { FlatList, Image, Pressable, RefreshControl, Text, View } from 'react-native';
import { useReducedMotion } from 'react-native-reanimated';

import { searchable, type Sport } from './filters';
import {
  fetchFootballScores,
  type FootballScore,
} from './scores';
import {
  fetchTvSchedule,
  filterPrograms,
  programKey,
  type ProgramView,
  type TvProgram,
} from './tvFrance';

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

function Team({ name, logo }: { name: string; logo: string }) {
  return (
    <View className="min-w-0 flex-1 items-center gap-2">
      {logo ? (
        <Image
          source={{ uri: logo }}
          resizeMode="contain"
          className="h-9 w-9"
          accessibilityLabel={`Logo ${name}`}
        />
      ) : (
        <View className="h-9 w-9 rounded-full bg-zinc-800" />
      )}
      <Text numberOfLines={2} className="text-center text-sm font-semibold text-zinc-100">
        {name}
      </Text>
    </View>
  );
}

function ScoreCard({
  item,
  index,
  reduceMotion,
}: {
  item: FootballScore;
  index: number;
  reduceMotion: boolean;
}) {
  const timing = { type: 'timing' as const, duration: reduceMotion ? 0 : 260 };
  const homeScore = item.goals.home ?? '-';
  const awayScore = item.goals.away ?? '-';

  return (
    <MotiView
      from={reduceMotion ? undefined : { opacity: 0, translateY: 8 }}
      animate={{ opacity: 1, translateY: 0 }}
      transition={{ opacity: timing, translateY: timing }}
      delay={reduceMotion ? 0 : Math.min(index, 5) * 35}
    >
      <View className="mb-3 gap-3 rounded-2xl border border-zinc-800 bg-zinc-900 p-4">
        <View className="flex-row items-center justify-between gap-2">
          <View className="min-w-0 flex-1 flex-row items-center gap-2">
            {item.league.logo ? (
              <Image
                source={{ uri: item.league.logo }}
                resizeMode="contain"
                className="h-5 w-5"
                accessibilityLabel={`Logo ${item.league.name}`}
              />
            ) : null}
            <Text numberOfLines={1} className="flex-1 text-xs font-semibold text-zinc-400">
              {item.league.name}
            </Text>
          </View>
          <Text className="text-xs font-medium text-zinc-500">{item.time}</Text>
        </View>

        <View className="flex-row items-center gap-2">
          <Team name={item.teams.home.name} logo={item.teams.home.logo} />
          <View className="min-w-16 items-center">
            <Text className="text-2xl font-extrabold tabular-nums text-zinc-50">
              {homeScore} - {awayScore}
            </Text>
            <Text className="text-[10px] font-bold uppercase tracking-wider text-emerald-400">
              {item.status.short === 'PEN' ? 'TAB' : 'Terminé'}
            </Text>
            {item.status.short === 'PEN' &&
              item.score.penalty.home !== null &&
              item.score.penalty.away !== null && (
                <Text className="text-xs text-zinc-400">
                  Tirs au but : {item.score.penalty.home} - {item.score.penalty.away}
                </Text>
              )}
          </View>
          <Team name={item.teams.away.name} logo={item.teams.away.logo} />
        </View>

        {item.league.round ? (
          <Text className="text-center text-xs text-zinc-500">{item.league.round}</Text>
        ) : null}
      </View>
    </MotiView>
  );
}

function ProgramCard({
  item,
  index,
  reduceMotion,
}: {
  item: TvProgram;
  index: number;
  reduceMotion: boolean;
}) {
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
          {competition !== item.sport && (
            <Text className="text-sm font-medium text-zinc-400">{item.sport}</Text>
          )}
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

export function TvFranceList({
  sport,
  query,
  now,
  view,
}: {
  sport: Sport;
  query: string;
  now: Date;
  view: ProgramView;
}) {
  const [programs, setPrograms] = useState<TvProgram[] | null>(null);
  const [scores, setScores] = useState<FootballScore[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [scoreError, setScoreError] = useState<string | null>(null);
  const [request, setRequest] = useState<{ refresh: boolean } | null>({ refresh: false });
  const reduceMotion = useReducedMotion();

  useEffect(() => {
    if (!request) return;

    const controller = new AbortController();
    const timeout = setTimeout(() => {
      controller.abort();
      setError('Le programme TV France ou les résultats mettent trop de temps à répondre.');
      setScoreError('Les résultats de football mettent trop de temps à répondre.');
      setRequest((current) => current === request ? null : current);
    }, 15000);

    Promise.allSettled([
      fetchTvSchedule(controller.signal),
      fetchFootballScores(controller.signal),
    ]).then(([tvResult, scoreResult]) => {
      if (controller.signal.aborted) return;

      if (tvResult.status === 'fulfilled') {
        setPrograms(tvResult.value);
        setError(null);
      } else {
        setError(
          tvResult.reason instanceof Error
            ? tvResult.reason.message
            : 'Programme TV France indisponible.',
        );
      }

      if (scoreResult.status === 'fulfilled') {
        setScores(scoreResult.value);
        setScoreError(null);
      } else {
        setScoreError(
          scoreResult.reason instanceof Error
            ? scoreResult.reason.message
            : 'Résultats de football indisponibles.',
        );
      }

      setRequest((current) => current === request ? null : current);
    });

    return () => {
      clearTimeout(timeout);
      controller.abort();
    };
  }, [request]);

  function load(refresh: boolean) {
    setError(null);
    setScoreError(null);
    setRequest({ refresh });
  }

  const filteredPrograms = programs
    ? filterPrograms(programs, sport, query, now, view)
    : [];

  const showScores = view === 'finished' &&
    (sport.genre === '' || sport.genre === 'Football');

  const normalizedQuery = searchable(query.trim());
  const filteredScores = (scores ?? []).filter((item) =>
    searchable([
      item.teams.home.name,
      item.teams.away.name,
      item.league.name,
      item.league.country,
    ].join(' ')).includes(normalizedQuery),
  );

  const showScoreSection = showScores && filteredScores.length > 0;

  return (
    <FlatList
      className="flex-1 px-5"
      keyboardShouldPersistTaps="handled"
      data={filteredPrograms}
      keyExtractor={programKey}
      renderItem={({ item, index }) => (
        <ProgramCard item={item} index={index} reduceMotion={reduceMotion} />
      )}
      refreshControl={
        <RefreshControl
          refreshing={request?.refresh === true}
          onRefresh={() => load(true)}
          colors={['#3B82F6']}
        />
      }
      ListHeaderComponent={
        <View>
          {scoreError && showScores ? (
            <View className="mb-3 items-start gap-2 rounded-2xl border border-red-900 bg-zinc-900 p-4">
              <Text accessibilityLiveRegion="polite" className="text-sm text-red-200">
                {scoreError}
              </Text>
              <Pressable
                accessibilityRole="button"
                onPress={() => load(programs !== null)}
                className="min-h-11 justify-center rounded-full bg-blue-500/15 px-4"
              >
                <Text className="font-semibold text-blue-200">Réessayer</Text>
              </Pressable>
            </View>
          ) : null}

          {showScores ? (
            <View>
              <Text className="mb-3 mt-1 text-lg font-extrabold text-zinc-50">
                Résultats du jour
              </Text>
              {scores === null && !scoreError ? (
                <View className="mb-3 rounded-2xl border border-zinc-800 bg-zinc-900 p-4">
                  <Text className="text-sm text-zinc-400">Chargement des résultats...</Text>
                </View>
              ) : null}
              {filteredScores.map((item, index) => (
                <ScoreCard
                  key={item.fixtureId}
                  item={item}
                  index={index}
                  reduceMotion={reduceMotion}
                />
              ))}
              {scores !== null && filteredScores.length === 0 ? (
                <Text className="mb-3 rounded-2xl border border-zinc-800 bg-zinc-900 p-4 text-zinc-300">
                  {normalizedQuery
                    ? 'Aucun résultat ne correspond à cette recherche.'
                    : 'Aucun résultat de football publié pour aujourd’hui.'}
                </Text>
              ) : null}
            </View>
          ) : null}

          {error ? (
            <View className="mb-3 items-start gap-2 rounded-2xl border border-red-900 bg-zinc-900 p-4">
              <Text accessibilityLiveRegion="polite" className="text-sm text-red-200">
                {error}
              </Text>
              <Pressable
                accessibilityRole="button"
                onPress={() => load(programs !== null)}
                className="min-h-11 justify-center rounded-full bg-blue-500/15 px-4"
              >
                <Text className="font-semibold text-blue-200">Réessayer</Text>
              </Pressable>
            </View>
          ) : null}

          {showScoreSection && filteredPrograms.length > 0 ? (
            <Text className="mb-3 mt-2 text-lg font-extrabold text-zinc-50">
              Programmes TV terminés
            </Text>
          ) : null}
        </View>
      }
      ListEmptyComponent={
        programs === null ? (
          <View accessible accessibilityLabel="Chargement du programme TV France" accessibilityState={{ busy: true }}>
            {[0, 1, 2].map((index) => (
              <View key={index} className="mb-3 gap-3 rounded-2xl border border-zinc-800 bg-zinc-900 p-4">
                <View className="h-5 w-24 rounded bg-zinc-800" />
                <View className="h-5 w-4/5 rounded bg-zinc-800" />
                <View className="h-7 w-28 rounded-lg bg-zinc-800" />
              </View>
            ))}
          </View>
        ) : error || showScoreSection ? undefined : (
          <Text className="rounded-2xl border border-zinc-800 bg-zinc-900 p-4 text-zinc-300">
            {programs.length === 0
              ? 'Aucun programme TV France publié pour le moment.'
              : emptyMessages[view]}
          </Text>
        )
      }
    />
  );
}
