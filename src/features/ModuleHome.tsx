import Ionicons from '@expo/vector-icons/Ionicons';
import { MotiView } from 'moti';
import { useState, type ComponentProps } from 'react';
import { RefreshControl, ScrollView, Text, View } from 'react-native';
import { useReducedMotion } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

type Card = {
  icon: ComponentProps<typeof Ionicons>['name'];
  title: string;
  description: string;
};

type ModuleHomeProps = {
  title: string;
  description: string;
  cards: [Card, Card];
  includeTopInset?: boolean;
};

export function ModuleHome({ title, description, cards, includeTopInset = true }: ModuleHomeProps) {
  const reduceMotion = useReducedMotion();
  const [preview, setPreview] = useState(0);
  const timing = { type: 'timing' as const, duration: reduceMotion ? 0 : 300 };

  return (
    <SafeAreaView
      edges={includeTopInset ? ['top', 'left', 'right'] : ['left', 'right']}
      className="flex-1 bg-zinc-950"
    >
      <ScrollView
        className="flex-1"
        refreshControl={
          <RefreshControl
            refreshing={false}
            onRefresh={() => setPreview((current) => current + 1)}
          />
        }
      >
        <View className="mx-auto w-full max-w-xl px-5 pb-8 pt-8">
          <Text accessibilityRole="header" className="text-4xl font-extrabold tracking-tight text-zinc-50">
            {title}
          </Text>
          <Text className="mt-2 text-base leading-6 text-zinc-400">{description}</Text>
          <Text accessibilityRole="header" className="mb-3 mt-8 text-sm font-semibold text-zinc-300">
            Aperçu du module
          </Text>

          <View className="gap-3" key={preview}>
            {cards.map((card, index) => (
              <MotiView
                key={card.title}
                from={reduceMotion ? undefined : { opacity: 0, translateY: 12 }}
                animate={{ opacity: 1, translateY: 0 }}
                transition={{ opacity: timing, translateY: timing }}
                delay={reduceMotion ? 0 : index * 90}
              >
                <View className="flex-row items-center gap-4 rounded-2xl border border-zinc-800 bg-zinc-900 p-4">
                  <View className="h-11 w-11 items-center justify-center rounded-xl bg-blue-500/15">
                    <Ionicons name={card.icon} color="#93C5FD" size={23} />
                  </View>
                  <View className="flex-1">
                    <Text className="text-base font-semibold text-zinc-50">{card.title}</Text>
                    <Text className="mt-1 text-sm leading-5 text-zinc-400">{card.description}</Text>
                  </View>
                </View>
              </MotiView>
            ))}
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
