import Ionicons from '@expo/vector-icons/Ionicons';
import { Tabs } from 'expo-router';
import type { ComponentProps } from 'react';
import { Text, View } from 'react-native';

const tabs = [
  { name: 'index', title: 'Sport', icon: 'football-outline' },
  { name: 'cinema', title: 'Cinéma', icon: 'film-outline' },
  { name: 'rss', title: 'RSS', icon: 'logo-rss' },
  { name: 'hub', title: 'Hub', icon: 'grid-outline' },
] satisfies { name: string; title: string; icon: ComponentProps<typeof Ionicons>['name'] }[];

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: '#93C5FD',
        tabBarInactiveTintColor: '#A1A1AA',
        tabBarBackground: () => (
          <View className="absolute inset-0 border-t border-zinc-800 bg-zinc-950" />
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
                className={`h-7 w-10 items-center justify-center rounded-full ${focused ? 'bg-blue-500/20' : ''}`}
              >
                <Ionicons name={icon} size={20} color={typeof color === 'string' ? color : undefined} />
              </View>
            ),
            tabBarLabel: ({ focused }) => (
              <Text
                numberOfLines={1}
                className={`text-[10px] font-semibold ${focused ? 'text-blue-300' : 'text-zinc-400'}`}
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
