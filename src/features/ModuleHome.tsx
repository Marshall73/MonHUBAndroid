import Ionicons from '@expo/vector-icons/Ionicons';
import { MotiView } from 'moti';
import { useState, type ComponentProps } from 'react';
import { RefreshControl, ScrollView, Text, View } from 'react-native';
import { useReducedMotion } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

import palette from '../theme.json';

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
  const timing = { type: 'timing' as const, duration: reduceMotion ? 0 : 160 };

  return (
    <SafeAreaView
      edges={includeTopInset ? ['top', 'left', 'right'] : ['left', 'right']}
      className="flex-1 bg-canvas"
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
          <Text accessibilityRole="header" className="text-screen-title font-semibold text-ink">
            {title}
          </Text>
          <Text className="mt-2 text-base leading-6 text-muted">{description}</Text>
          <Text accessibilityRole="header" className="mb-3 mt-8 text-sm font-semibold text-copy">
            Aperçu du module
          </Text>

          <View className="gap-3" key={preview}>
            {cards.map((card, index) => (
              <MotiView
                key={card.title}
                from={reduceMotion ? undefined : { opacity: 0.85 }}
                animate={{ opacity: 1 }}
                transition={{ opacity: timing }}
                delay={reduceMotion ? 0 : Math.min(index, 3) * 12}
              >
                <View className="flex-row items-center gap-4 rounded-xl border border-line bg-surface p-4">
                  <Ionicons name={card.icon} color={palette.copy} size={23} />
                  <View className="flex-1">
                    <Text className="text-base font-semibold text-ink">{card.title}</Text>
                    <Text className="mt-1 text-sm leading-5 text-muted">{card.description}</Text>
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
