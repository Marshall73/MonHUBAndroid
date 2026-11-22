import Ionicons from '@expo/vector-icons/Ionicons';
import { MotiView } from 'moti';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Linking, Pressable, RefreshControl, ScrollView, Text, View } from 'react-native';
import { useReducedMotion } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

import palette from '../../theme.json';

import { ESPORT_NEWS, LIQUIPEDIA, esportGames, type EsportGame, type EsportTournament } from './games';
import { loadEsportSchedule } from './schedule';

const dateFormat = new Intl.DateTimeFormat('fr-FR', {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
  timeZone: 'UTC',
});

function openPage(url: string) {
  Linking.openURL(url).catch(() => {
    Alert.alert('Ouverture impossible', 'Impossible d’ouvrir cette page.');
  });
}

function TournamentSection({ title, tournaments, empty }: {
  title: string;
  tournaments: EsportTournament[];
  empty: string;
}) {
  const reduceMotion = useReducedMotion();
  const timing = { type: 'timing' as const, duration: reduceMotion ? 0 : 160 };

  return (
    <View className="mb-5 gap-2">
      <Text accessibilityRole="header" className="text-section-title font-semibold text-ink">{title}</Text>
      {tournaments.length === 0 && <Text className="text-sm text-muted">{empty}</Text>}
      {tournaments.map((tournament, index) => {
        const start = dateFormat.format(new Date(tournament.start));
        const end = dateFormat.format(new Date(tournament.end));

        return (
          <MotiView
            key={tournament.url}
            from={reduceMotion ? undefined : { opacity: 0.85 }}
            animate={{ opacity: 1 }}
            transition={{ opacity: timing }}
            delay={reduceMotion ? 0 : Math.min(index, 3) * 12}
          >
            <Pressable
              accessibilityRole="link"
              accessibilityHint="Ouvre la fiche sur Liquipedia"
              onPress={() => openPage(tournament.url)}
              className="focus:border-ink web:focus-visible:border-ink flex-row items-center gap-3 rounded-xl border border-line bg-surface p-4 active:bg-raised"
            >
              <View className="min-w-0 flex-1 gap-1">
                <Text className="text-base font-semibold text-ink">{tournament.title}</Text>
                <Text className="text-sm text-muted">{start === end ? start : start + ' – ' + end}</Text>
              </View>
              <Text className="text-xs font-medium text-muted">
                Tier {tournament.tier}
              </Text>
              <Ionicons name="open-outline" size={16} color={palette.muted} />
            </Pressable>
          </MotiView>
        );
      })}
    </View>
  );
}

function GameSchedule({ game }: { game: EsportGame }) {
  const [result, setResult] = useState<Awaited<ReturnType<typeof loadEsportSchedule>> | null>(null);
  const [refreshCount, setRefreshCount] = useState(0);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    let active = true;
    loadEsportSchedule(game, refreshCount > 0).then((schedule) => {
      if (!active) return;
      setResult(schedule);
      setRefreshing(false);
    });
    return () => { active = false; };
  }, [game, refreshCount]);

  function refresh() {
    setRefreshing(true);
    setRefreshCount((count) => count + 1);
  }

  const today = new Date().toISOString().slice(0, 10);
  const ongoing = result?.tournaments.filter(({ start, end }) => start <= today && today <= end) ?? [];
  const upcoming = result?.tournaments.filter(({ start }) => today < start) ?? [];
  const fromEsportNews = result ? result.source === 'esportNews' : 'esportNewsGame' in game;

  return (
    <ScrollView
      className="flex-1"
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={palette.cobalt} colors={[palette.cobalt]} />}
    >
      <View className="px-5 pb-8 pt-4">
        {result === null && !refreshing && <ActivityIndicator accessibilityLabel="Chargement des tournois" color={palette.cobalt} />}
        {result?.error && (
          <View accessibilityLiveRegion="polite" className="mb-5 rounded-xl border border-error-line bg-error-surface p-4">
            <Text className="text-error">{result.error}</Text>
            {result.tournaments.length > 0 && <Text className="mt-1 text-muted">Dernier calendrier enregistré.</Text>}
            <Pressable onPress={refresh} disabled={refreshing} accessibilityRole="button" className="border border-transparent focus:border-ink web:focus-visible:border-ink active:opacity-75 min-h-11 justify-center self-start">
              <Text className="font-semibold text-accent">Réessayer</Text>
            </Pressable>
          </View>
        )}
        {result && (!result.error || result.tournaments.length > 0) && (
          <>
            <TournamentSection title="En cours" tournaments={ongoing} empty="Aucun tournoi en cours." />
            <TournamentSection title="À venir" tournaments={upcoming} empty="Aucun tournoi annoncé." />
          </>
        )}
        <Pressable
          accessibilityRole="link"
          onPress={() => openPage(fromEsportNews ? ESPORT_NEWS : LIQUIPEDIA + '/' + game.id + '/Main_Page')}
          className="border border-transparent focus:border-ink web:focus-visible:border-ink active:opacity-75 min-h-11 flex-row items-center gap-2 self-start"
        >
          <Text className="shrink text-sm text-accent">
            {fromEsportNews ? 'Esport News (données Liquipedia)' : 'Source des données (Liquipedia)'}
          </Text>
          <Ionicons name="open-outline" size={14} color={palette.accent} />
        </Pressable>
      </View>
    </ScrollView>
  );
}

export default function EsportScreen() {
  const [selectedGame, setSelectedGame] = useState<EsportGame>(esportGames[0]);

  return (
    <SafeAreaView edges={['left', 'right']} className="flex-1 bg-canvas">
      <View className="mx-auto w-full max-w-xl flex-1">
        <View className="gap-3 px-5 pt-6">
          <Text accessibilityRole="header" className="text-screen-title font-semibold text-ink">Esport</Text>
          <View accessibilityRole="tablist" className="flex-row flex-wrap gap-2">
            {esportGames.map((game) => {
              const selected = game.id === selectedGame.id;
              return (
                <Pressable
                  key={game.id}
                  accessibilityRole="tab"
                  accessibilityState={{ selected }}
                  onPress={() => setSelectedGame(game)}
                  className={`min-h-11 justify-center rounded-lg border px-3 active:bg-pressed focus:border-ink web:focus-visible:border-ink ${selected ? 'border-accent bg-selection' : 'border-line bg-chrome'}`}
                >
                  <Text className={selected ? 'text-sm font-semibold text-accent' : 'text-sm font-semibold text-copy'}>
                    {game.name}
                  </Text>
                </Pressable>
              );
            })}
          </View>
          <Text className="text-sm text-muted">Tiers {selectedGame.tiers[0]} et {selectedGame.tiers[1]}</Text>
        </View>
        <GameSchedule key={selectedGame.id} game={selectedGame} />
      </View>
    </SafeAreaView>
  );
}
