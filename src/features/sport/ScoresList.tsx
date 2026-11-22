import { MotiView } from 'moti';
import { ActivityIndicator, FlatList, Image, RefreshControl, Text, View } from 'react-native';
import { useReducedMotion } from 'react-native-reanimated';

import palette from '../../theme.json';
import { searchable } from './filters';
import { fetchFootballScores, type FootballScore } from './scores';
import { SportListError, useSportList } from './useSportList';

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

export function ScoresList({ query }: { query: string }) {
  const { items, error, refreshing, reload } = useSportList(
    fetchFootballScores,
    'Les résultats de football mettent trop de temps à répondre.',
  );
  const reduceMotion = useReducedMotion();
  const normalizedQuery = searchable(query.trim());
  const scores = (items ?? []).filter((item) =>
    searchable([
      item.teams.home.name,
      item.teams.away.name,
      item.league.name,
      item.league.country,
    ].join(' ')).includes(normalizedQuery),
  );

  return (
    <FlatList
      className="flex-1 px-5"
      keyboardShouldPersistTaps="handled"
      data={scores}
      keyExtractor={(item) => String(item.fixtureId)}
      renderItem={({ item, index }) => <ScoreCard item={item} index={index} reduceMotion={reduceMotion} />}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={reload} colors={[palette.cobalt]} />}
      ListHeaderComponent={
        <>
          <Text accessibilityRole="header" className="mb-3 text-section-title font-semibold text-ink">
            Résultats du jour
          </Text>
          {error && <SportListError message={error} onRetry={reload} />}
        </>
      }
      ListEmptyComponent={
        error ? undefined : items === null ? (
          <ActivityIndicator accessibilityLabel="Chargement des résultats" color={palette.cobalt} />
        ) : (
          <Text className="rounded-xl border border-line bg-surface p-4 text-copy">
            {normalizedQuery
              ? 'Aucun résultat ne correspond à cette recherche.'
              : 'Aucun résultat de football publié pour aujourd’hui.'}
          </Text>
        )
      }
    />
  );
}
