import Ionicons from '@expo/vector-icons/Ionicons';
import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { AppState, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import palette from '../../theme.json';

import { sports, type Sport } from './filters';
import { TvFranceList } from './TvFranceList';
import type { ProgramView } from './tvFrance';

const timeFilters = [
  { id: 'live', label: 'En cours' },
  { id: 'upcoming', label: 'À venir' },
  { id: 'finished', label: 'Terminé' },
] as const;

const searchLabel = 'Équipe, combattant, compétition ou chaîne';

export default function SportScreen() {
  const [sport, setSport] = useState<Sport>(sports[0]);
  const [view, setView] = useState<ProgramView>('live');
  const [search, setSearch] = useState('');
  const [now, setNow] = useState(() => new Date());

  useFocusEffect(useCallback(() => {
    let timeout: ReturnType<typeof setTimeout>;
    function updateTime() {
      clearTimeout(timeout);
      const current = new Date();
      setNow(current);
      timeout = setTimeout(updateTime, 60000 - current.getTime() % 60000);
    }

    updateTime();
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') updateTime();
    });
    return () => {
      clearTimeout(timeout);
      subscription.remove();
    };
  }, []));

  return (
    <SafeAreaView edges={['top', 'left', 'right']} className="flex-1 bg-canvas">
      <View className="mx-auto w-full max-w-xl flex-1 pt-6">
        <View className="mb-4 gap-3 px-5">
          <Text accessibilityRole="header" className="text-screen-title font-semibold text-ink">Sport</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} className="grow-0">
            {sports.map((option) => (
              <Pressable
                key={option.label}
                accessibilityRole="button"
                accessibilityState={{ selected: option.genre === sport.genre }}
                onPress={() => setSport(option)}
                className={`focus:border-ink web:focus-visible:border-ink active:bg-pressed mr-2 min-h-11 justify-center rounded-lg border px-3 ${option.genre === sport.genre ? 'border-accent bg-selection' : 'border-line bg-chrome'}`}
              >
                <Text className={`text-sm font-semibold ${option.genre === sport.genre ? 'text-accent' : 'text-copy'}`}>
                  {option.label}
                </Text>
              </Pressable>
            ))}
          </ScrollView>

          <View className="flex-row gap-1 self-start rounded-xl border border-line bg-chrome p-1">
            {timeFilters.map((option) => (
              <Pressable
                key={option.label}
                accessibilityRole="button"
                accessibilityState={{ selected: view === option.id }}
                onPress={() => setView(option.id)}
                className={`border border-transparent focus:border-ink web:focus-visible:border-ink active:bg-pressed min-h-11 shrink justify-center rounded-lg px-3 ${view === option.id ? 'bg-selection' : ''}`}
              >
                <Text className={`text-center text-sm font-semibold ${view === option.id ? 'text-accent' : 'text-copy'}`}>
                  {option.label}
                </Text>
              </Pressable>
            ))}
          </View>

          <View className="min-h-12 flex-row items-center gap-2 rounded-lg border border-edge bg-chrome px-3">
            <Ionicons name="search-outline" color={palette.muted} size={19} />
            <TextInput
              accessibilityLabel={searchLabel}
              placeholder={searchLabel}
              placeholderTextColor={palette.muted}
              value={search}
              onChangeText={setSearch}
              returnKeyType="search"
              autoCorrect={false}
              className="min-h-12 min-w-0 flex-1 border-b border-transparent text-base text-ink focus:border-accent web:focus-visible:border-accent"
            />
            {search !== '' && (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Effacer la recherche"
                onPress={() => setSearch('')}
                className="border border-transparent focus:border-ink web:focus-visible:border-ink active:opacity-75 h-11 w-11 items-center justify-center"
              >
                <Ionicons name="close-circle" color={palette.muted} size={20} />
              </Pressable>
            )}
          </View>
        </View>
        <TvFranceList sport={sport} query={search} now={now} view={view} />
      </View>
    </SafeAreaView>
  );
}
