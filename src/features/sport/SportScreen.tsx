import Ionicons from '@expo/vector-icons/Ionicons';
import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { AppState, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { sports, type Sport } from './filters';
import { TvFranceList } from './TvFranceList';

const timeFilters = [
  { recentOnly: true, label: 'À venir / En cours' },
  { recentOnly: false, label: 'Toute la journée' },
] as const;

const searchLabel = 'Équipe, combattant, compétition ou chaîne';

export default function SportScreen() {
  const [sport, setSport] = useState<Sport>(sports[0]);
  const [recentOnly, setRecentOnly] = useState(true);
  const [search, setSearch] = useState('');
  const [now, setNow] = useState(() => new Date());

  useFocusEffect(useCallback(() => {
    if (!recentOnly) return;
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
  }, [recentOnly]));

  return (
    <SafeAreaView edges={['top', 'left', 'right']} className="flex-1 bg-zinc-950">
      <View className="mx-auto w-full max-w-xl flex-1 pt-8">
        <View className="mb-4 gap-3 px-5">
          <Text accessibilityRole="header" className="text-4xl font-extrabold tracking-tight text-zinc-50">Sport</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} className="grow-0">
            {sports.map((option) => (
              <Pressable
                key={option.label}
                accessibilityRole="button"
                accessibilityState={{ selected: option.genre === sport.genre }}
                onPress={() => setSport(option)}
                className={`mr-2 min-h-11 justify-center rounded-full border px-4 ${option.genre === sport.genre ? 'border-blue-500/60 bg-blue-500/15' : 'border-zinc-800 bg-zinc-900'}`}
              >
                <Text className={`text-sm font-semibold ${option.genre === sport.genre ? 'text-blue-200' : 'text-zinc-300'}`}>
                  {option.label}
                </Text>
              </Pressable>
            ))}
          </ScrollView>

          <View className="flex-row gap-1 self-start rounded-xl border border-zinc-800 bg-zinc-900 p-1">
            {timeFilters.map((option) => (
              <Pressable
                key={option.label}
                accessibilityRole="button"
                accessibilityState={{ selected: recentOnly === option.recentOnly }}
                onPress={() => setRecentOnly(option.recentOnly)}
                className={`min-h-11 shrink justify-center rounded-lg px-3 ${recentOnly === option.recentOnly ? 'bg-blue-500/20' : ''}`}
              >
                <Text className={`text-center text-sm font-semibold ${recentOnly === option.recentOnly ? 'text-blue-200' : 'text-zinc-300'}`}>
                  {option.label}
                </Text>
              </Pressable>
            ))}
          </View>

          <View className="min-h-12 flex-row items-center gap-2 rounded-xl border border-zinc-800 bg-zinc-900 px-3">
            <Ionicons name="search-outline" color="#A1A1AA" size={19} />
            <TextInput
              accessibilityLabel={searchLabel}
              placeholder={searchLabel}
              placeholderTextColor="#A1A1AA"
              value={search}
              onChangeText={setSearch}
              returnKeyType="search"
              autoCorrect={false}
              className="min-h-12 flex-1 text-zinc-50"
            />
            {search !== '' && (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Effacer la recherche"
                onPress={() => setSearch('')}
                className="h-11 w-11 items-center justify-center"
              >
                <Ionicons name="close-circle" color="#A1A1AA" size={20} />
              </Pressable>
            )}
          </View>
        </View>
        <TvFranceList sport={sport} query={search} now={recentOnly ? now : undefined} />
      </View>
    </SafeAreaView>
  );
}
