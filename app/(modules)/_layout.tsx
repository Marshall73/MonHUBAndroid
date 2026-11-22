import Ionicons from '@expo/vector-icons/Ionicons';
import { Slot, useRouter } from 'expo-router';
import { Pressable, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import palette from '../../src/theme.json';

export default function ModulesLayout() {
  const router = useRouter();

  return (
    <SafeAreaView edges={['top', 'bottom']} className="flex-1 bg-canvas">
      <SafeAreaView edges={['left', 'right']} className="border-b border-line bg-chrome">
        <View className="mx-auto w-full max-w-xl items-start px-5">
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Retour au Hub"
            onPress={() => {
              if (router.canGoBack()) router.back();
              else router.replace('/hub');
            }}
            className="-ml-2 min-h-12 flex-row items-center gap-2 rounded-lg border border-transparent px-2 active:bg-raised focus:border-ink web:focus-visible:border-ink"
          >
            <Ionicons name="arrow-back" size={20} color={palette.accent} />
            <Text className="text-sm font-semibold text-accent">Hub</Text>
          </Pressable>
        </View>
      </SafeAreaView>
      <Slot />
    </SafeAreaView>
  );
}
