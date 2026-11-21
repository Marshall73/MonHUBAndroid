import Ionicons from '@expo/vector-icons/Ionicons';
import { Link, type Href } from 'expo-router';
import { MotiView } from 'moti';
import type { ComponentProps } from 'react';
import { FlatList, Pressable, Text, View } from 'react-native';
import { useReducedMotion } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

const hubModules = [
  {
    href: '/streaming',
    title: 'Streaming',
    description: 'Films et séries par plateforme',
    icon: 'tv-outline',
  },
  {
    href: '/trailers',
    title: 'Trailers',
    description: 'Bandes-annonces et jeux vidéo',
    icon: 'play-circle-outline',
  },
  {
    href: '/github',
    title: 'GitHub',
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
  const timing = { type: 'timing' as const, duration: reduceMotion ? 0 : 260 };

  return (
    <SafeAreaView edges={['top', 'left', 'right']} className="flex-1 bg-zinc-950">
      <View className="mx-auto w-full max-w-xl flex-1 pt-8">
        <Text accessibilityRole="header" className="mb-5 px-5 text-4xl font-extrabold tracking-tight text-zinc-50">
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
                from={reduceMotion ? undefined : { opacity: 0, translateY: 10 }}
                animate={{ opacity: 1, translateY: 0 }}
                transition={{ opacity: timing, translateY: timing }}
                delay={reduceMotion ? 0 : Math.min(index, 5) * 55}
              >
                <Link href={item.href} push asChild>
                  <Pressable
                    accessibilityRole="link"
                    className="min-h-40 justify-between gap-3 rounded-2xl border border-zinc-800 bg-zinc-900 p-4 active:border-blue-500"
                  >
                    <View className="flex-row items-start justify-between gap-1">
                      <View className="h-10 w-10 items-center justify-center rounded-xl bg-blue-500/15">
                        <Ionicons name={item.icon} color="#93C5FD" size={21} />
                      </View>
                      <Ionicons name="chevron-forward" color="#A1A1AA" size={16} />
                    </View>
                    <View>
                      <Text className="text-base font-bold text-zinc-50">{item.title}</Text>
                      <Text className="mt-1 text-xs leading-4 text-zinc-400">{item.description}</Text>
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
