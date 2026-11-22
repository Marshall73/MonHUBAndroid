import Ionicons from '@expo/vector-icons/Ionicons';
import { Tabs } from 'expo-router';
import type { ComponentProps } from 'react';
import { Text, View } from 'react-native';

import palette from '../../src/theme.json';

const tabs = [
  { name: 'index', title: 'RSS', icon: 'newspaper-outline' },
  { name: 'sport', title: 'Sport', icon: 'trophy-outline' },
  { name: 'trailers', title: 'Trailers', icon: 'play-circle-outline' },
  { name: 'hub', title: 'Hub', icon: 'grid-outline' },
] satisfies { name: string; title: string; icon: ComponentProps<typeof Ionicons>['name'] }[];

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: palette.accent,
        tabBarInactiveTintColor: palette.muted,
        tabBarBackground: () => (
          <View className="absolute inset-0 border-t border-edge bg-chrome" />
        ),
        tabBarLabelPosition: 'below-icon',
      }}
    >
      {tabs.map(({ name, title, icon }) => (
        <Tabs.Screen
          key={name}
          name={name}
          options={{
            title,
            tabBarIcon: ({ color, focused }) => (
              <View
                className={`h-7 w-10 items-center justify-center border-t-2 ${focused ? 'border-accent' : 'border-transparent'}`}
              >
                <Ionicons name={icon} size={20} color={typeof color === 'string' ? color : undefined} />
              </View>
            ),
            tabBarLabel: ({ focused }) => (
              <Text
                numberOfLines={1}
                className={`text-xs font-medium ${focused ? 'text-accent' : 'text-muted'}`}
              >
                {title}
              </Text>
            ),
          }}
        />
      ))}
    </Tabs>
  );
}
