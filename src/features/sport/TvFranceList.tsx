import { MotiView } from 'moti';
import { FlatList, RefreshControl, Text, View } from 'react-native';
import { useReducedMotion } from 'react-native-reanimated';

import palette from '../../theme.json';

import { searchable, type Sport } from './filters';
import {
  fetchTvSchedule,
  filterPrograms,
  getProgramStatus,
  programKey,
  type ProgramView,
  type TvProgram,
} from './tvFrance';
import { SportListError, useSportList } from './useSportList';

const emptyMessages: Record<ProgramView, string> = {
  live: 'Aucun programme ne correspond aux filtres.',
  upcoming: 'Aucun match à venir pour ces filtres.',
  finished: 'Aucun match terminé pour ces filtres.',
};

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
          <View className="gap-1 border-t border-line pt-2">
            {hasChannel ? (
              <Text className="text-sm font-semibold text-copy">{item.channel}</Text>
            ) : (
              <Text className="text-sm text-muted">Chaîne non renseignée</Text>
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
  const { items, error, refreshing, reload } = useSportList(
    fetchTvSchedule,
    'Le programme TV France met trop de temps à répondre.',
  );
  const reduceMotion = useReducedMotion();
  const programs = items ? filterPrograms(items, sport, query, now, view) : [];

  return (
    <FlatList
      className="flex-1 px-5"
      keyboardShouldPersistTaps="handled"
      data={programs}
      keyExtractor={programKey}
      renderItem={({ item, index }) => (
        <ProgramCard item={item} index={index} reduceMotion={reduceMotion} now={now} />
      )}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={reload} colors={[palette.cobalt]} />}
      ListHeaderComponent={error ? <SportListError message={error} onRetry={reload} /> : undefined}
      ListEmptyComponent={
        error ? undefined : items === null ? (
          <View accessible accessibilityLabel="Chargement du programme TV France" accessibilityState={{ busy: true }}>
            {[0, 1, 2].map((index) => (
              <View key={index} className="mb-3 gap-3 rounded-xl border border-line bg-surface p-4">
                <View className="h-5 w-24 rounded bg-raised" />
                <View className="h-5 w-4/5 rounded bg-raised" />
                <View className="h-7 w-28 rounded-lg bg-raised" />
              </View>
            ))}
          </View>
        ) : (
          <Text className="rounded-xl border border-line bg-surface p-4 text-copy">
            {items.length === 0
              ? 'Aucun programme TV France publié pour le moment.'
              : emptyMessages[view]}
          </Text>
        )
      }
    />
  );
}
