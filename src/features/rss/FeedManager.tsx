import Ionicons from '@expo/vector-icons/Ionicons';
import { useState } from 'react';
import { Modal, Pressable, ScrollView, Switch, Text, TextInput, View } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';

import { webUrl, type Feed } from './feeds';

export function FeedManager({ feeds, saving, saveError, onSave, onClose }: {
  feeds: Feed[];
  saving: boolean;
  saveError: string | null;
  onSave: (feeds: Feed[]) => Promise<boolean>;
  onClose: () => void;
}) {
  const [name, setName] = useState('');
  const [address, setAddress] = useState('');
  const [inputError, setInputError] = useState<string | null>(null);

  async function addFeed() {
    const url = webUrl(address);
    if (!name.trim() || !url) {
      setInputError('Saisissez un nom et une URL complète en HTTP ou HTTPS.');
      return;
    }
    if (feeds.some((feed) => webUrl(feed.url) === url)) {
      setInputError('Ce flux figure déjà dans vos sources.');
      return;
    }
    setInputError(null);
    if (await onSave([...feeds, { name: name.trim(), url, active: true }])) {
      setName('');
      setAddress('');
    }
  }

  return (
    <Modal visible animationType="slide" presentationStyle="fullScreen" onRequestClose={onClose}>
      <SafeAreaProvider>
        <SafeAreaView className="flex-1 bg-zinc-950">
          <ScrollView className="flex-1" keyboardShouldPersistTaps="handled">
            <View className="mx-auto w-full max-w-xl gap-5 px-5 pb-8 pt-5">
              <View className="flex-row items-center justify-between">
                <Text accessibilityRole="header" className="text-3xl font-bold text-zinc-50">Mes sources</Text>
                <Pressable
                  accessibilityRole="button" accessibilityLabel="Fermer"
                  onPress={onClose}
                  className="h-11 w-11 items-center justify-center rounded-full bg-zinc-900"
                >
                  <Ionicons name="close" color="#D4D4D8" size={22} />
                </Pressable>
              </View>

              <View className="gap-3 rounded-2xl border border-zinc-800 bg-zinc-900 p-4">
                <Text accessibilityRole="header" className="text-lg font-bold text-zinc-50">Ajouter un flux</Text>
                <TextInput
                  accessibilityLabel="Nom du flux" placeholder="Nom du flux" placeholderTextColor="#A1A1AA"
                  className="min-h-12 rounded-xl border border-zinc-800 bg-zinc-950 px-3 text-zinc-50"
                  value={name} onChangeText={setName} editable={!saving} maxLength={80}
                />
                <TextInput
                  accessibilityLabel="URL du flux RSS" placeholder="https://site.fr/flux.xml" placeholderTextColor="#A1A1AA"
                  className="min-h-12 rounded-xl border border-zinc-800 bg-zinc-950 px-3 text-zinc-50"
                  autoCapitalize="none" autoCorrect={false} keyboardType="url"
                  value={address} onChangeText={setAddress} editable={!saving} maxLength={2048}
                />
                {inputError && <Text accessibilityLiveRegion="polite" className="text-sm text-red-300">{inputError}</Text>}
                <Pressable
                  accessibilityRole="button" disabled={saving} onPress={() => void addFeed()}
                  className="min-h-11 items-center justify-center rounded-xl bg-blue-600 disabled:opacity-50"
                >
                  <Text className="font-semibold text-zinc-50">Ajouter</Text>
                </Pressable>
              </View>

              {saveError && <Text accessibilityLiveRegion="polite" className="text-sm text-red-300">{saveError}</Text>}

              <View className="gap-2">
                {feeds.length === 0 && <Text className="text-zinc-400">Aucune source enregistrée.</Text>}
                {feeds.map((feed) => (
                  <View key={feed.url} className="flex-row items-center gap-2 rounded-xl border border-zinc-800 bg-zinc-900 p-3">
                    <View className="flex-1">
                      <Text className="font-semibold text-zinc-50">{feed.name}</Text>
                      <Text numberOfLines={1} className="mt-1 text-xs text-zinc-400">{feed.url}</Text>
                    </View>
                    <Switch
                      accessibilityLabel={`Activer le flux ${feed.name}`}
                      value={feed.active} disabled={saving}
                      trackColor={{ true: '#3B82F6', false: '#52525B' }}
                      onValueChange={(active) => void onSave(feeds.map((item) =>
                        item.url === feed.url ? { ...item, active } : item))}
                    />
                    <Pressable
                      accessibilityRole="button" accessibilityLabel={`Supprimer ${feed.name}`}
                      disabled={saving}
                      onPress={() => void onSave(feeds.filter((item) => item.url !== feed.url))}
                      className="h-11 w-11 items-center justify-center rounded-full bg-red-500/10"
                    >
                      <Ionicons name="trash-outline" color="#FCA5A5" size={19} />
                    </Pressable>
                  </View>
                ))}
              </View>
            </View>
          </ScrollView>
        </SafeAreaView>
      </SafeAreaProvider>
    </Modal>
  );
}
