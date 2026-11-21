import Ionicons from '@expo/vector-icons/Ionicons';
import { Slot, useRouter } from 'expo-router';
import { Pressable, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function ModulesLayout() {
  const router = useRouter();

  return (
    <SafeAreaView edges={['top', 'bottom']} className="flex-1 bg-zinc-950">
      <SafeAreaView edges={['left', 'right']} className="border-b border-zinc-800">
        <View className="mx-auto w-full max-w-xl items-start px-5">
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Retour au Hub"
            onPress={() => {
              if (router.canGoBack()) router.back();
              else router.replace('/hub');
            }}
            className="min-h-12 flex-row items-center gap-2 active:opacity-60"
          >
            <Ionicons name="arrow-back" size={20} color="#93C5FD" />
            <Text className="text-sm font-semibold text-blue-300">Hub</Text>
          </Pressable>
        </View>
      </SafeAreaView>
      <Slot />
    </SafeAreaView>
  );
}
