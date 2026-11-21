import Ionicons from '@expo/vector-icons/Ionicons';
import { MotiView } from 'moti';
import { useEffect, useState } from 'react';
import {
  Alert, FlatList, Linking, Pressable, RefreshControl, ScrollView, Text, View,
} from 'react-native';
import { useReducedMotion } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

import { fetchRepositories, languages, periods, type Language, type Period, type Repository } from './githubApi';

const languageColors: Record<string, string> = {
  TypeScript: 'bg-blue-400',
  Python: 'bg-yellow-400',
  Rust: 'bg-orange-400',
  Kotlin: 'bg-violet-400',
};
const starCount = new Intl.NumberFormat('fr-FR');

function Filter<T extends string>({ value, selected, label, onSelect }: {
  value: T;
  selected: T;
  label: string;
  onSelect: (value: T) => void;
}) {
  const active = value === selected;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
      className={`mr-2 min-h-11 justify-center rounded-full border px-4 ${active ? 'border-blue-500/60 bg-blue-500/15' : 'border-zinc-800 bg-zinc-900'}`}
      onPress={() => onSelect(value)}
    >
      <Text className={`text-sm font-semibold ${active ? 'text-blue-200' : 'text-zinc-300'}`}>{label}</Text>
    </Pressable>
  );
}

function RepositoryCard({ repository, index, reduceMotion }: {
  repository: Repository;
  index: number;
  reduceMotion: boolean;
}) {
  const timing = { type: 'timing' as const, duration: reduceMotion ? 0 : 260 };
  const language = repository.language;
  const dotColor = !language ? 'bg-zinc-500'
    : Object.hasOwn(languageColors, language) ? languageColors[language] : 'bg-emerald-400';
  const stars = starCount.format(repository.stargazers_count);

  return (
    <MotiView
      from={reduceMotion ? undefined : { opacity: 0, translateY: 8 }}
      animate={{ opacity: 1, translateY: 0 }}
      transition={{ opacity: timing, translateY: timing }}
      delay={reduceMotion ? 0 : Math.min(index, 5) * 40}
    >
      <Pressable
        accessibilityRole="link"
        accessibilityHint="Ouvre le dépôt sur GitHub"
        onPress={() => {
          Linking.openURL(repository.html_url).catch(() => {
            Alert.alert('Ouverture impossible', 'Impossible d’ouvrir ce dépôt dans le navigateur.');
          });
        }}
        className="mb-3 gap-3 rounded-2xl border border-zinc-800 bg-zinc-900 p-4 active:border-blue-500"
      >
        <View className="flex-row items-start gap-3">
          <View className="flex-1">
            <Text className="text-sm text-zinc-400" numberOfLines={1}>{repository.owner.login}</Text>
            <Text className="text-lg font-bold leading-6 text-zinc-50">{repository.name}</Text>
          </View>
          <Ionicons name="open-outline" size={18} color="#A1A1AA" />
        </View>
        <Text className="text-sm leading-5 text-zinc-300" numberOfLines={3}>
          {repository.description || 'Aucune description'}
        </Text>
        <View className="flex-row flex-wrap items-center gap-3">
          <View className="flex-row items-center gap-2 rounded-full bg-zinc-800 px-2.5 py-1">
            <View className={`h-2 w-2 rounded-full ${dotColor}`} />
            <Text className="text-xs font-medium text-zinc-200">{language || 'Non renseigné'}</Text>
          </View>
          <View className="flex-row items-center gap-1.5">
            <Ionicons name="star" size={14} color="#FBBF24" />
            <Text accessibilityLabel={`${stars} étoiles`} className="text-sm font-semibold text-zinc-200">
              {stars}
            </Text>
          </View>
        </View>
      </Pressable>
    </MotiView>
  );
}

function RepositoryList({ period, language }: { period: Period; language: Language }) {
  const [repositories, setRepositories] = useState<Repository[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [request, setRequest] = useState(0);
  const reduceMotion = useReducedMotion();

  useEffect(() => {
    const controller = new AbortController();
    const timeout = setTimeout(() => {
      controller.abort();
      setError('GitHub met trop de temps à répondre. Réessayez.');
      setRefreshing(false);
    }, 15000);

    fetchRepositories(period, language, controller.signal)
      .then((items) => {
        if (!controller.signal.aborted) setRepositories(items);
      })
      .catch((failure: unknown) => {
        if (!controller.signal.aborted) {
          setError(failure instanceof Error && !(failure instanceof SyntaxError)
            ? failure.message
            : 'Impossible de lire la réponse de GitHub. Réessayez.');
        }
      })
      .finally(() => {
        clearTimeout(timeout);
        if (!controller.signal.aborted) setRefreshing(false);
      });

    return () => {
      clearTimeout(timeout);
      controller.abort();
    };
  }, [period, language, request]);

  function reload(pullToRefresh = false) {
    setError(null);
    setRefreshing(pullToRefresh || repositories !== null);
    setRequest((current) => current + 1);
  }

  return (
    <FlatList
      className="mt-4 flex-1 px-5"
      data={repositories ?? undefined}
      keyExtractor={(item) => String(item.id)}
      renderItem={({ item, index }) => (
        <RepositoryCard repository={item} index={index} reduceMotion={reduceMotion} />
      )}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => reload(true)} colors={['#3B82F6']} />}
      ListHeaderComponent={error ? (
        <View className="mb-3 items-start gap-2 rounded-2xl border border-red-900 bg-zinc-900 p-4">
          <Text accessibilityLiveRegion="polite" className="text-sm leading-5 text-red-200">{error}</Text>
          <Pressable
            accessibilityRole="button"
            className="min-h-11 justify-center rounded-full bg-blue-500/15 px-4"
            onPress={() => reload()}
          >
            <Text className="font-semibold text-blue-200">Réessayer</Text>
          </Pressable>
        </View>
      ) : undefined}
      ListEmptyComponent={error ? undefined : repositories === null ? (
        <View accessibilityLabel="Chargement des dépôts" accessible accessibilityState={{ busy: true }}>
          {[0, 1, 2].map((index) => (
            <View key={index} className="mb-3 gap-3 rounded-2xl border border-zinc-800 bg-zinc-900 p-4">
              <View className="h-3 w-24 rounded bg-zinc-800" />
              <View className="h-5 w-1/2 rounded bg-zinc-800" />
              <View className="h-3 w-11/12 rounded bg-zinc-800" />
              <View className="h-5 w-20 rounded-full bg-zinc-800" />
            </View>
          ))}
        </View>
      ) : (
        <Text className="rounded-2xl border border-zinc-800 bg-zinc-900 p-4 text-zinc-300">
          Aucun dépôt pour ces filtres.
        </Text>
      )}
    />
  );
}

export default function GithubScreen() {
  const [period, setPeriod] = useState<Period>('week');
  const [language, setLanguage] = useState<Language>('Tous');

  return (
    <SafeAreaView edges={['left', 'right']} className="flex-1 bg-zinc-950">
      <View className="mx-auto w-full max-w-xl flex-1 pt-8">
        <View className="px-5">
          <Text accessibilityRole="header" className="text-4xl font-extrabold tracking-tight text-zinc-50">
            GitHub Trends
          </Text>
          <Text className="mb-5 mt-2 text-base text-zinc-400">Nouveaux dépôts classés par étoiles.</Text>
          <Text className="mb-1.5 text-xs font-semibold text-zinc-400">Période</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mb-3 grow-0">
            {periods.map(({ value, label }) => (
              <Filter key={value} value={value} label={label} selected={period} onSelect={setPeriod} />
            ))}
          </ScrollView>
          <Text className="mb-1.5 text-xs font-semibold text-zinc-400">Langage</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} className="grow-0">
            {languages.map((value) => (
              <Filter key={value} value={value} label={value} selected={language} onSelect={setLanguage} />
            ))}
          </ScrollView>
        </View>
        <RepositoryList key={`${period}/${language}`} period={period} language={language} />
      </View>
    </SafeAreaView>
  );
}
