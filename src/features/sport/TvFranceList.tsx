import { MotiView } from 'moti';
import { useEffect, useState } from 'react';
import { FlatList, Image, Pressable, RefreshControl, Text, View } from 'react-native';
import { useReducedMotion } from 'react-native-reanimated';

import palette from '../../theme.json';

import { searchable, type Sport } from './filters';
import {
  fetchFootballScores,
  type FootballScore,
} from './scores';
import {
  fetchTvSchedule,
  filterPrograms,
  getProgramStatus,
  programKey,
  type ProgramView,
  type TvProgram,
} from './tvFrance';

const emptyMessages: Record<ProgramView, string> = {
  live: 'Aucun programme ne correspond aux filtres.',
  upcoming: 'Aucun match à venir pour ces filtres.',
  finished: 'Aucun match terminé pour ces filtres.',
};

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
        <View className="h-9 w-9 rounded-lg bg-raised" />
      )}
      <Text numberOfLines={2} className="text-center text-sm font-semibold text-ink">
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
  const timing = { type: 'timing' as const, duration: reduceMotion ? 0 : 160 };
  const homeScore = item.goals.home ?? '-';
  const awayScore = item.goals.away ?? '-';

  return (
    <MotiView
      from={reduceMotion ? undefined : { opacity: 0.85 }}
      animate={{ opacity: 1 }}
      transition={{ opacity: timing }}
      delay={reduceMotion ? 0 : Math.min(index, 3) * 12}
    >
      <View className="mb-3 gap-3 rounded-xl border border-line bg-surface p-4">
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
            <Text numberOfLines={1} className="flex-1 text-xs font-semibold text-muted">
              {item.league.name}
            </Text>
          </View>
          <Text className="text-xs font-medium text-muted">{item.time}</Text>
        </View>

        <View className="flex-row items-center gap-2">
          <Team name={item.teams.home.name} logo={item.teams.home.logo} />
          <View className="min-w-16 items-center">
            <Text className="text-2xl font-extrabold tabular-nums text-ink">
              {homeScore} - {awayScore}
            </Text>
            <Text className="text-xs font-medium text-muted">
              {item.status.short === 'PEN' ? 'Tirs au but' : 'Terminé'}
            </Text>
            {item.status.short === 'PEN' &&
              item.score.penalty.home !== null &&
              item.score.penalty.away !== null && (
                <Text className="text-xs text-muted">
                  Tirs au but : {item.score.penalty.home} - {item.score.penalty.away}
                </Text>
              )}
          </View>
          <Team name={item.teams.away.name} logo={item.teams.away.logo} />
        </View>

        {item.league.round ? (
          <Text className="text-center text-xs text-muted">{item.league.round}</Text>
        ) : null}
      </View>
    </MotiView>
  );
}

function ProgramCard({
  item,
  index,
  reduceMotion,
  now,
}: {
  item: TvProgram;
  index: number;
  reduceMotion: boolean;
  now: Date;
}) {
  const timing = { type: 'timing' as const, duration: reduceMotion ? 0 : 160 };
  const competition = item.competition || item.sport;
  const status = getProgramStatus(item, now);
  const finished = status === 'Terminé';
  const upcoming = status === 'À venir';
  const normalizedTitle = searchable(item.title).replace(/[^\p{L}\p{N}]/gu, '');
  const normalizedChannel = searchable(item.channel).replace(/[^\p{L}\p{N}]/gu, '');
  const hasChannel = normalizedChannel !== '' && normalizedChannel !== 'chainetv' &&
    normalizedChannel !== normalizedTitle;

  return (
    <MotiView
      from={reduceMotion ? undefined : { opacity: 0.85 }}
      animate={{ opacity: 1 }}
      transition={{ opacity: timing }}
      delay={reduceMotion ? 0 : Math.min(index, 3) * 12}
    >
      <View className="mb-3 flex-row items-start rounded-xl border border-line bg-surface">
        <View className="w-20 items-center px-2 py-4">
          <Text className="text-item-title font-semibold tabular-nums text-ink">{item.time}</Text>
        </View>
        <View className="min-w-0 flex-1 gap-2 border-l border-line py-3 pl-3 pr-4">
          <Text className="text-item-title font-semibold text-ink">{item.title}</Text>
          <Text className="text-sm text-muted">{competition}</Text>
          {competition !== item.sport && (
            <Text className="text-sm text-muted">{item.sport}</Text>
          )}
          <View className="flex-row flex-wrap items-baseline gap-x-3 gap-y-1 border-t border-line pt-2">
            {hasChannel ? (
              <Text className="shrink text-sm font-semibold text-copy">{item.channel}</Text>
            ) : (
              <Text className="shrink text-sm text-muted">Chaîne non renseignée</Text>
            )}
            <Text className={`text-xs font-medium ${finished || upcoming ? 'text-muted' : 'text-success'}`}>
              {status}
            </Text>
          </View>
        </View>
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
        <ProgramCard item={item} index={index} reduceMotion={reduceMotion} now={now} />
      )}
      refreshControl={
        <RefreshControl
          refreshing={request?.refresh === true}
          onRefresh={() => load(true)}
          colors={[palette.cobalt]}
        />
      }
      ListHeaderComponent={
        <View>
          {scoreError && showScores ? (
            <View className="mb-3 items-start gap-2 rounded-xl border border-error-line bg-error-surface p-4">
              <Text accessibilityLiveRegion="polite" className="text-sm text-error">
                {scoreError}
              </Text>
              <Pressable
                accessibilityRole="button"
                onPress={() => load(programs !== null)}
                className="border border-transparent focus:border-ink web:focus-visible:border-ink active:bg-pressed min-h-11 justify-center rounded-lg bg-selection px-4"
              >
                <Text className="font-semibold text-accent">Réessayer</Text>
              </Pressable>
            </View>
          ) : null}

          {showScores ? (
            <View>
              <Text className="mb-3 mt-1 text-section-title font-semibold text-ink">
                Résultats du jour
              </Text>
              {scores === null && !scoreError ? (
                <View className="mb-3 rounded-xl border border-line bg-surface p-4">
                  <Text className="text-sm text-muted">Chargement des résultats...</Text>
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
                <Text className="mb-3 rounded-xl border border-line bg-surface p-4 text-copy">
                  {normalizedQuery
                    ? 'Aucun résultat ne correspond à cette recherche.'
                    : 'Aucun résultat de football publié pour aujourd’hui.'}
                </Text>
              ) : null}
            </View>
          ) : null}

          {error ? (
            <View className="mb-3 items-start gap-2 rounded-xl border border-error-line bg-error-surface p-4">
              <Text accessibilityLiveRegion="polite" className="text-sm text-error">
                {error}
              </Text>
              <Pressable
                accessibilityRole="button"
                onPress={() => load(programs !== null)}
                className="border border-transparent focus:border-ink web:focus-visible:border-ink active:bg-pressed min-h-11 justify-center rounded-lg bg-selection px-4"
              >
                <Text className="font-semibold text-accent">Réessayer</Text>
              </Pressable>
            </View>
          ) : null}

          {showScoreSection && filteredPrograms.length > 0 ? (
            <Text className="mb-3 mt-2 text-section-title font-semibold text-ink">
              Programmes TV terminés
            </Text>
          ) : null}
        </View>
      }
      ListEmptyComponent={
        programs === null ? (
          <View accessible accessibilityLabel="Chargement du programme TV France" accessibilityState={{ busy: true }}>
            {[0, 1, 2].map((index) => (
              <View key={index} className="mb-3 gap-3 rounded-xl border border-line bg-surface p-4">
                <View className="h-5 w-24 rounded bg-raised" />
                <View className="h-5 w-4/5 rounded bg-raised" />
                <View className="h-7 w-28 rounded-lg bg-raised" />
              </View>
            ))}
          </View>
        ) : error || showScoreSection ? undefined : (
          <Text className="rounded-xl border border-line bg-surface p-4 text-copy">
            {programs.length === 0
              ? 'Aucun programme TV France publié pour le moment.'
              : emptyMessages[view]}
          </Text>
        )
      }
    />
  );
}
