import Ionicons from '@expo/vector-icons/Ionicons';
import { Link, type Href } from 'expo-router';
import { MotiView } from 'moti';
import type { ComponentProps } from 'react';
import { FlatList, Pressable, Text, View } from 'react-native';
import { useReducedMotion } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

import palette from '../../theme.json';

const hubModules = [
  {
    href: '/cinema',
    title: 'Cinéma',
    description: 'Séances Les Toiles du Lac',
    icon: 'film-outline',
  },
  {
    href: '/streaming',
    title: 'Streaming',
    description: 'Films et séries par plateforme',
    icon: 'tv-outline',
  },
  {
    href: '/github',
    title: 'GitHub Trends',
    description: 'Dépôts tendance',
    icon: 'logo-github',
  },
] satisfies {
  href: Href;
  title: string;
  description: string;
  icon: ComponentProps<typeof Ionicons>['name'];
}[];

export default function HubScreen() {
  const reduceMotion = useReducedMotion();
  const timing = { type: 'timing' as const, duration: reduceMotion ? 0 : 160 };

  return (
    <SafeAreaView edges={['top', 'left', 'right']} className="flex-1 bg-canvas">
      <View className="mx-auto w-full max-w-xl flex-1 pt-6">
        <Text accessibilityRole="header" className="mb-5 px-5 text-screen-title font-semibold text-ink">
          Hub
        </Text>
        <FlatList
          className="flex-1 px-5"
          data={hubModules}
          numColumns={2}
          keyExtractor={(module) => module.href}
          renderItem={({ item, index }) => (
            <View className={`mb-3 w-1/2 ${index % 2 === 0 ? 'pr-1.5' : 'pl-1.5'}`}>
              <MotiView
                from={reduceMotion ? undefined : { opacity: 0.85 }}
                animate={{ opacity: 1 }}
                transition={{ opacity: timing }}
                delay={reduceMotion ? 0 : Math.min(index, 3) * 12}
              >
                <Link href={item.href} push asChild>
                  <Pressable
                    accessibilityRole="link"
                    className="min-h-36 justify-between gap-3 rounded-xl border border-line bg-surface p-4 active:bg-raised focus:border-ink web:focus-visible:border-ink"
                  >
                    <View className="flex-row items-start justify-between gap-1">
                      <Ionicons name={item.icon} color={palette.copy} size={24} />
                      <Ionicons name="chevron-forward" color={palette.muted} size={17} />
                    </View>
                    <View>
                      <Text className="text-item-title font-semibold text-ink">{item.title}</Text>
                      <Text className="mt-1 text-sm leading-5 text-muted">{item.description}</Text>
                    </View>
                  </Pressable>
                </Link>
              </MotiView>
            </View>
          )}
        />
      </View>
    </SafeAreaView>
  );
}
