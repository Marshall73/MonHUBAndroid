import Ionicons from '@expo/vector-icons/Ionicons';
import { useState } from 'react';
import { Modal, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';

import { categories, sourceUrl, type Category, type TrailerSource } from './feeds';

export function SourceManager({ sources, saving, saveError, onSave, onClose }: {
  sources: TrailerSource[];
  saving: boolean;
  saveError: string | null;
  onSave: (sources: TrailerSource[]) => Promise<boolean>;
  onClose: () => void;
}) {
  const [name, setName] = useState('');
  const [address, setAddress] = useState('');
  const [category, setCategory] = useState<Category>('Films');
  const [error, setError] = useState<string | null>(null);

  async function addSource() {
    const url = sourceUrl(address);
    if (!name.trim() || !url) {
      setError('Saisissez un nom et une adresse complète en HTTP ou HTTPS.');
      return;
    }
    if (sources.some((source) => sourceUrl(source.url) === url)) {
      setError('Cette adresse figure déjà dans vos sources.');
      return;
    }
    setError(null);
    if (await onSave([...sources, { name: name.trim(), category, url }])) {
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
              <View className="flex-row items-center justify-between gap-3">
                <Text accessibilityRole="header" className="text-3xl font-bold text-zinc-50">Sources Trailers</Text>
                <Pressable
                  accessibilityRole="button" accessibilityLabel="Fermer" onPress={onClose}
                  className="h-11 w-11 items-center justify-center rounded-full bg-zinc-900"
                >
                  <Ionicons name="close" color="#D4D4D8" size={22} />
                </Pressable>
              </View>
              <View className="gap-3 rounded-2xl border border-zinc-800 bg-zinc-900 p-4">
                <Text accessibilityRole="header" className="text-lg font-bold text-zinc-50">Ajouter une source</Text>
                <TextInput
                  accessibilityLabel="Nom de la source" placeholder="Nom de la source" placeholderTextColor="#A1A1AA"
                  className="min-h-12 rounded-xl border border-zinc-800 bg-zinc-950 px-3 text-zinc-50"
                  value={name} onChangeText={setName} editable={!saving} maxLength={80}
                />
                <TextInput
                  accessibilityLabel="URL du flux ou du site" placeholder="URL du flux ou du site" placeholderTextColor="#A1A1AA"
                  className="min-h-12 rounded-xl border border-zinc-800 bg-zinc-950 px-3 text-zinc-50"
                  value={address} onChangeText={setAddress} editable={!saving}
                  keyboardType="url" autoCapitalize="none" autoCorrect={false} maxLength={2048}
                />
                <View className="flex-row flex-wrap gap-2">
                  {categories.map((option) => (
                    <Pressable
                      key={option} accessibilityRole="button" accessibilityState={{ selected: category === option }}
                      onPress={() => setCategory(option)} disabled={saving}
                      className={`min-h-11 justify-center rounded-full border px-4 ${category === option ? 'border-blue-500/60 bg-blue-500/15' : 'border-zinc-800 bg-zinc-950'}`}
                    >
                      <Text className={`text-sm font-semibold ${category === option ? 'text-blue-200' : 'text-zinc-300'}`}>
                        {option}
                      </Text>
                    </Pressable>
                  ))}
                </View>
                {error && <Text accessibilityLiveRegion="polite" className="text-sm text-red-300">{error}</Text>}
                <Pressable
                  accessibilityRole="button" disabled={saving} onPress={() => void addSource()}
                  className="min-h-11 items-center justify-center rounded-xl bg-blue-600 disabled:opacity-50"
                >
                  <Text className="font-semibold text-zinc-50">Ajouter</Text>
                </Pressable>
              </View>

              {saveError && <Text accessibilityLiveRegion="polite" className="text-sm text-red-300">{saveError}</Text>}
              <View className="gap-2">
                {sources.length === 0 && <Text className="text-zinc-400">Aucune source enregistrée.</Text>}
                {sources.map((source) => (
                  <View key={source.url} className="flex-row items-center gap-3 rounded-xl border border-zinc-800 bg-zinc-900 p-3">
                    <View className="flex-1 gap-1">
                      <Text className="font-semibold text-zinc-50">{source.name}</Text>
                      <Text className="text-xs text-zinc-400">{source.category}</Text>
                      <Text numberOfLines={1} className="text-xs text-zinc-400">{source.url}</Text>
                    </View>
                    <Pressable
                      accessibilityRole="button" accessibilityLabel={`Supprimer ${source.name}`}
                      disabled={saving}
                      onPress={() => void onSave(sources.filter(({ url }) => url !== source.url))}
                      className="h-11 w-11 items-center justify-center rounded-full bg-red-500/10 disabled:opacity-50"
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
