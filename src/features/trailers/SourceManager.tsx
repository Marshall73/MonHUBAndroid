import Ionicons from '@expo/vector-icons/Ionicons';
import { useState } from 'react';
import { Modal, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { useReducedMotion } from 'react-native-reanimated';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';

import palette from '../../theme.json';

import { categories, sourceUrl, type Category, type TrailerSource } from './feeds';

export function SourceManager({ sources, saving, saveError, onSave, onClose }: {
  sources: TrailerSource[];
  saving: boolean;
  saveError: string | null;
  onSave: (sources: TrailerSource[]) => Promise<boolean>;
  onClose: () => void;
}) {
  const reduceMotion = useReducedMotion();
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
    <Modal visible animationType={reduceMotion ? 'none' : 'slide'} presentationStyle="fullScreen" onRequestClose={onClose}>
      <SafeAreaProvider>
        <SafeAreaView className="flex-1 bg-canvas">
          <ScrollView className="flex-1" keyboardShouldPersistTaps="handled">
            <View className="mx-auto w-full max-w-xl gap-5 px-5 pb-8 pt-5">
              <View className="flex-row items-center justify-between gap-3">
                <Text accessibilityRole="header" className="text-screen-title font-semibold text-ink">Sources Trailers</Text>
                <Pressable
                  accessibilityRole="button" accessibilityLabel="Fermer" onPress={onClose}
                  className="border border-transparent focus:border-ink web:focus-visible:border-ink active:opacity-75 h-11 w-11 items-center justify-center rounded-lg bg-surface"
                >
                  <Ionicons name="close" color={palette.copy} size={22} />
                </Pressable>
              </View>
              <View className="gap-3 rounded-xl border border-line bg-surface p-4">
                <Text accessibilityRole="header" className="text-section-title font-semibold text-ink">Ajouter une source</Text>
                <TextInput
                  accessibilityLabel="Nom de la source" placeholder="Nom de la source" placeholderTextColor={palette.muted}
                  className="min-h-12 rounded-lg border border-edge bg-chrome px-3 text-base text-ink focus:border-accent web:focus-visible:border-accent"
                  value={name} onChangeText={setName} editable={!saving} maxLength={80}
                />
                <TextInput
                  accessibilityLabel="URL du flux ou du site" placeholder="URL du flux ou du site" placeholderTextColor={palette.muted}
                  className="min-h-12 rounded-lg border border-edge bg-chrome px-3 text-base text-ink focus:border-accent web:focus-visible:border-accent"
                  value={address} onChangeText={setAddress} editable={!saving}
                  keyboardType="url" autoCapitalize="none" autoCorrect={false} maxLength={2048}
                />
                <View className="flex-row flex-wrap gap-2">
                  {categories.map((option) => (
                    <Pressable
                      key={option} accessibilityRole="button" accessibilityState={{ selected: category === option }}
                      onPress={() => setCategory(option)} disabled={saving}
                      className={`focus:border-ink web:focus-visible:border-ink active:bg-pressed min-h-11 justify-center rounded-lg border px-3 ${category === option ? 'border-accent bg-selection' : 'border-line bg-canvas'}`}
                    >
                      <Text className={`text-sm font-semibold ${category === option ? 'text-accent' : 'text-copy'}`}>
                        {option}
                      </Text>
                    </Pressable>
                  ))}
                </View>
                {error && <Text accessibilityLiveRegion="polite" className="text-sm text-error">{error}</Text>}
                <Pressable
                  accessibilityRole="button" disabled={saving} onPress={() => void addSource()}
                  className="border border-transparent focus:border-ink web:focus-visible:border-ink active:opacity-75 min-h-11 items-center justify-center rounded-xl bg-accent disabled:opacity-50"
                >
                  <Text className="font-semibold text-on-accent">Ajouter</Text>
                </Pressable>
              </View>

              {saveError && <Text accessibilityLiveRegion="polite" className="text-sm text-error">{saveError}</Text>}
              <View className="gap-2">
                {sources.length === 0 && <Text className="text-muted">Aucune source enregistrée.</Text>}
                {sources.map((source) => (
                  <View key={source.url} className="flex-row items-center gap-3 rounded-xl border border-line bg-surface p-3">
                    <View className="flex-1 gap-1">
                      <Text className="font-semibold text-ink">{source.name}</Text>
                      <Text className="text-xs text-muted">{source.category}</Text>
                      <Text numberOfLines={1} className="text-xs text-muted">{source.url}</Text>
                    </View>
                    <Pressable
                      accessibilityRole="button" accessibilityLabel={`Supprimer ${source.name}`}
                      disabled={saving}
                      onPress={() => void onSave(sources.filter(({ url }) => url !== source.url))}
                      className="border border-transparent focus:border-ink web:focus-visible:border-ink active:opacity-75 h-11 w-11 items-center justify-center rounded-lg bg-error-surface disabled:opacity-50"
                    >
                      <Ionicons name="trash-outline" color={palette.error} size={19} />
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
