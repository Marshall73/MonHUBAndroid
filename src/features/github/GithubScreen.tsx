import Ionicons from '@expo/vector-icons/Ionicons';
import { MotiView } from 'moti';
import { useEffect, useState } from 'react';
import {
  Alert, FlatList, Linking, Platform, Pressable, RefreshControl, ScrollView, Text, View,
} from 'react-native';
import { useReducedMotion } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

import palette from '../../theme.json';

import { fetchRepositories, languages, periods, trendingUrl, type Language, type Period, type Repository } from './githubApi';

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
      className={`focus:border-ink web:focus-visible:border-ink active:bg-pressed mr-2 min-h-11 justify-center rounded-lg border px-3 ${active ? 'border-accent bg-selection' : 'border-line bg-chrome'}`}
      onPress={() => onSelect(value)}
    >
      <Text className={`text-sm font-semibold ${active ? 'text-accent' : 'text-copy'}`}>{label}</Text>
    </Pressable>
  );
}

function openGitHub(url: string) {
  Linking.openURL(url).catch(() => {
    Alert.alert('Ouverture impossible', 'Impossible d’ouvrir GitHub dans le navigateur.');
  });
}

function TrendingLink({ period, language }: { period: Period; language: Language }) {
  return (
    <Pressable
      accessibilityRole="link"
      className="min-h-11 justify-center self-start rounded-lg border border-line px-4 active:bg-pressed"
      onPress={() => openGitHub(trendingUrl(period.value, language))}
    >
      <Text className="font-semibold text-accent">Voir le classement sur GitHub</Text>
    </Pressable>
  );
}

function RepositoryCard({ repository, period, index, reduceMotion }: {
  repository: Repository;
  period: Period;
  index: number;
  reduceMotion: boolean;
}) {
  const timing = { type: 'timing' as const, duration: reduceMotion ? 0 : 160 };
  const language = repository.language;
  const totalStars = starCount.format(repository.totalStars);
  const periodStars = starCount.format(repository.periodStars);

  return (
    <MotiView
      from={reduceMotion ? undefined : { opacity: 0.85 }}
      animate={{ opacity: 1 }}
      transition={{ opacity: timing }}
      delay={reduceMotion ? 0 : Math.min(index, 3) * 12}
    >
      <Pressable
        accessibilityRole="link"
        accessibilityHint="Ouvre le dépôt sur GitHub"
        onPress={() => openGitHub(repository.url)}
        className="focus:border-ink web:focus-visible:border-ink mb-3 gap-3 rounded-xl border border-line bg-surface p-4 active:bg-raised"
      >
        <View className="flex-row items-start gap-3">
          <View className="flex-1">
            <Text className="text-item-title font-semibold text-ink">{repository.name}</Text>
            <Text className="text-sm text-muted" numberOfLines={1}>{repository.owner}</Text>
          </View>
          <Ionicons name="open-outline" size={18} color={palette.muted} />
        </View>
        <Text className="text-sm leading-5 text-copy" numberOfLines={3}>
          {repository.description || 'Aucune description'}
        </Text>
        <View className="flex-row flex-wrap items-center justify-between gap-3 border-t border-line pt-2">
          <Text className="text-sm text-muted">{language || 'Non renseigné'}</Text>
          <View className="flex-row items-center gap-1.5">
            <Ionicons name="star" size={14} color={palette.muted} />
            <Text accessibilityLabel={`${totalStars} étoiles au total`} className="text-sm tabular-nums text-copy">
              {totalStars}
            </Text>
          </View>
          <Text
            accessibilityLabel={`${periodStars} étoiles gagnées ${period.starsLabel}`}
            className="text-sm font-semibold tabular-nums text-accent"
          >
            +{periodStars} {period.starsLabel}
          </Text>
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

    fetchRepositories(period.value, language, controller.signal)
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
      keyExtractor={(item) => item.url}
      renderItem={({ item, index }) => (
        <RepositoryCard repository={item} period={period} index={index} reduceMotion={reduceMotion} />
      )}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => reload(true)} colors={[palette.cobalt]} />}
      ListHeaderComponent={error ? (
        <View className="mb-3 items-start gap-2 rounded-xl border border-error-line bg-error-surface p-4">
          <Text accessibilityLiveRegion="polite" className="text-sm leading-5 text-error">{error}</Text>
          <Pressable
            accessibilityRole="button"
            className="border border-transparent focus:border-ink web:focus-visible:border-ink active:bg-pressed min-h-11 justify-center rounded-lg bg-selection px-4"
            onPress={() => reload()}
          >
            <Text className="font-semibold text-accent">Réessayer</Text>
          </Pressable>
          <TrendingLink period={period} language={language} />
        </View>
      ) : undefined}
      ListEmptyComponent={error ? undefined : repositories === null ? (
        <View accessibilityLabel="Chargement des dépôts" accessible accessibilityState={{ busy: true }}>
          {[0, 1, 2].map((index) => (
            <View key={index} className="mb-3 gap-3 rounded-xl border border-line bg-surface p-4">
              <View className="h-3 w-24 rounded bg-raised" />
              <View className="h-5 w-1/2 rounded bg-raised" />
              <View className="h-3 w-11/12 rounded bg-raised" />
              <View className="h-5 w-20 rounded-lg bg-raised" />
            </View>
          ))}
        </View>
      ) : (
        <Text className="rounded-xl border border-line bg-surface p-4 text-copy">
          Aucun dépôt pour ces filtres.
        </Text>
      )}
    />
  );
}

export default function GithubScreen() {
  const [selectedPeriod, setSelectedPeriod] = useState<Period['value']>(periods[0].value);
  const [language, setLanguage] = useState<Language>('Tous');
  const period = periods.find(({ value }) => value === selectedPeriod) ?? periods[0];

  return (
    <SafeAreaView edges={['left', 'right']} className="flex-1 bg-canvas">
      <View className="mx-auto w-full max-w-xl flex-1 pt-6">
        <View className="px-5">
          <Text accessibilityRole="header" className="text-screen-title font-semibold text-ink">
            GitHub Trends
          </Text>
          <Text className="mb-5 mt-2 text-base text-muted">Classement officiel des dépôts tendance.</Text>
          <Text className="mb-1.5 text-xs font-semibold text-muted">Période</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mb-3 grow-0">
            {periods.map(({ value, label }) => (
              <Filter key={value} value={value} label={label} selected={selectedPeriod} onSelect={setSelectedPeriod} />
            ))}
          </ScrollView>
          <Text className="mb-1.5 text-xs font-semibold text-muted">Langage</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} className="grow-0">
            {languages.map((value) => (
              <Filter key={value} value={value} label={value} selected={language} onSelect={setLanguage} />
            ))}
          </ScrollView>
        </View>
        {Platform.OS === 'web' ? (
          <View className="mt-4 px-5">
            <TrendingLink period={period} language={language} />
          </View>
        ) : (
          <RepositoryList key={`${selectedPeriod}/${language}`} period={period} language={language} />
        )}
      </View>
    </SafeAreaView>
  );
}
