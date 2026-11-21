import Ionicons from '@expo/vector-icons/Ionicons';
import { MotiView } from 'moti';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Linking, Pressable, RefreshControl, ScrollView, Text, View } from 'react-native';
import { useReducedMotion } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

import { loadRocketLeagueSchedule } from './liquipedia';
import { LIQUIPEDIA_ROCKET_LEAGUE, type EsportTournament } from './liquipediaSchedule';

const dateFormat = new Intl.DateTimeFormat('fr-FR', {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
  timeZone: 'UTC',
});

function openLiquipedia(url: string) {
  Linking.openURL(url).catch(() => {
    Alert.alert('Ouverture impossible', 'Impossible d’ouvrir la page Liquipedia.');
  });
}

function TournamentSection({ title, tournaments, empty }: {
  title: string;
  tournaments: EsportTournament[];
  empty: string;
}) {
  const reduceMotion = useReducedMotion();
  const timing = { type: 'timing' as const, duration: reduceMotion ? 0 : 220 };

  return (
    <View className="mb-5 gap-2">
      <Text accessibilityRole="header" className="text-lg font-bold text-zinc-50">{title}</Text>
      {tournaments.length === 0 && <Text className="text-sm text-zinc-400">{empty}</Text>}
      {tournaments.map((tournament, index) => {
        const start = dateFormat.format(new Date(tournament.start));
        const end = dateFormat.format(new Date(tournament.end));

        return (
          <MotiView
            key={tournament.url}
            from={reduceMotion ? undefined : { opacity: 0, translateY: 8 }}
            animate={{ opacity: 1, translateY: 0 }}
            transition={{ opacity: timing, translateY: timing }}
            delay={reduceMotion ? 0 : Math.min(index, 5) * 40}
          >
            <Pressable
              accessibilityRole="link"
              accessibilityHint="Ouvre la fiche sur Liquipedia"
              onPress={() => openLiquipedia(tournament.url)}
              className="flex-row items-center gap-3 rounded-2xl border border-zinc-800 bg-zinc-900 p-4 active:border-blue-500"
            >
              <View className="flex-1 gap-1">
                <Text className="font-bold text-zinc-50">{tournament.title}</Text>
                <Text className="text-sm text-zinc-400">{start === end ? start : start + ' – ' + end}</Text>
              </View>
              <Text className={tournament.tier === 'S'
                ? 'rounded-lg bg-blue-500/15 px-2 py-1 text-xs font-bold text-blue-300'
                : 'rounded-lg bg-emerald-500/15 px-2 py-1 text-xs font-bold text-emerald-300'}>
                Tier {tournament.tier}
              </Text>
              <Ionicons name="open-outline" size={16} color="#A1A1AA" />
            </Pressable>
          </MotiView>
        );
      })}
    </View>
  );
}

export default function EsportScreen() {
  const [result, setResult] = useState<Awaited<ReturnType<typeof loadRocketLeagueSchedule>> | null>(null);
  const [refreshCount, setRefreshCount] = useState(0);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    let active = true;
    loadRocketLeagueSchedule(refreshCount > 0).then((schedule) => {
      if (!active) return;
      setResult(schedule);
      setRefreshing(false);
    });
    return () => { active = false; };
  }, [refreshCount]);

  function refresh() {
    setRefreshing(true);
    setRefreshCount((count) => count + 1);
  }

  const today = new Date().toISOString().slice(0, 10);
  const ongoing = result?.tournaments.filter(({ start, end }) => start <= today && today <= end) ?? [];
  const upcoming = result?.tournaments.filter(({ start }) => today < start) ?? [];

  return (
    <SafeAreaView edges={['left', 'right']} className="flex-1 bg-zinc-950">
      <ScrollView
        className="mx-auto w-full max-w-xl flex-1"
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor="#3B82F6" colors={['#3B82F6']} />}
      >
        <View className="px-5 pb-8 pt-6">
          <Text accessibilityRole="header" className="text-3xl font-extrabold text-zinc-50">Esport</Text>
          <Text className="mb-5 mt-1 text-zinc-400">Rocket League · Tiers S et A</Text>
          {result === null && !refreshing && <ActivityIndicator accessibilityLabel="Chargement des tournois" color="#3B82F6" />}
          {result?.error && (
            <View accessibilityLiveRegion="polite" className="mb-5 rounded-2xl border border-zinc-800 bg-zinc-900 p-4">
              <Text className="text-zinc-200">{result.error}</Text>
              {result.tournaments.length > 0 && <Text className="mt-1 text-zinc-400">Dernier calendrier enregistré.</Text>}
              <Pressable onPress={refresh} disabled={refreshing} accessibilityRole="button" className="min-h-11 justify-center self-start">
                <Text className="font-semibold text-blue-300">Réessayer</Text>
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
            onPress={() => openLiquipedia(LIQUIPEDIA_ROCKET_LEAGUE + '/Main_Page')}
            className="min-h-11 flex-row items-center gap-2 self-start"
          >
            <Text className="text-sm text-blue-300">Source des données · Liquipedia</Text>
            <Ionicons name="open-outline" size={14} color="#93C5FD" />
          </Pressable>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
