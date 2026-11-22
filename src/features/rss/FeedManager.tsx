import Ionicons from '@expo/vector-icons/Ionicons';
import { useState } from 'react';
import { Modal, Pressable, ScrollView, Switch, Text, TextInput, View } from 'react-native';
import { useReducedMotion } from 'react-native-reanimated';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';

import palette from '../../theme.json';

import { feedUrlKey, webUrl, type Feed } from './feeds';

export function FeedManager({ feeds, saving, saveError, onSave, onClose }: {
  feeds: Feed[];
  saving: boolean;
  saveError: string | null;
  onSave: (feeds: Feed[]) => Promise<boolean>;
  onClose: () => void;
}) {
  const reduceMotion = useReducedMotion();
  const [name, setName] = useState('');
  const [address, setAddress] = useState('');
  const [inputError, setInputError] = useState<string | null>(null);

  async function addFeed() {
    const url = webUrl(address);
    if (!name.trim() || !url) {
      setInputError('Saisissez un nom et une URL complète en HTTP ou HTTPS.');
      return;
    }
    if (feeds.some((feed) => feedUrlKey(feed.url) === feedUrlKey(url))) {
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
    <Modal visible animationType={reduceMotion ? 'none' : 'slide'} presentationStyle="fullScreen" onRequestClose={onClose}>
      <SafeAreaProvider>
        <SafeAreaView className="flex-1 bg-canvas">
          <ScrollView className="flex-1" keyboardShouldPersistTaps="handled">
            <View className="mx-auto w-full max-w-xl gap-5 px-5 pb-8 pt-5">
              <View className="flex-row items-center justify-between">
                <Text accessibilityRole="header" className="text-screen-title font-semibold text-ink">Mes sources</Text>
                <Pressable
                  accessibilityRole="button" accessibilityLabel="Fermer"
                  onPress={onClose}
                  className="border border-transparent focus:border-ink web:focus-visible:border-ink active:opacity-75 h-11 w-11 items-center justify-center rounded-lg bg-surface"
                >
                  <Ionicons name="close" color={palette.copy} size={22} />
                </Pressable>
              </View>

              <View className="gap-3 rounded-xl border border-line bg-surface p-4">
                <Text accessibilityRole="header" className="text-section-title font-semibold text-ink">Ajouter un flux</Text>
                <TextInput
                  accessibilityLabel="Nom du flux" placeholder="Nom du flux" placeholderTextColor={palette.muted}
                  className="min-h-12 rounded-lg border border-edge bg-chrome px-3 text-base text-ink focus:border-accent web:focus-visible:border-accent"
                  value={name} onChangeText={setName} editable={!saving} maxLength={80}
                />
                <TextInput
                  accessibilityLabel="URL du flux RSS" placeholder="https://site.fr/flux.xml" placeholderTextColor={palette.muted}
                  className="min-h-12 rounded-lg border border-edge bg-chrome px-3 text-base text-ink focus:border-accent web:focus-visible:border-accent"
                  autoCapitalize="none" autoCorrect={false} keyboardType="url"
                  value={address} onChangeText={setAddress} editable={!saving} maxLength={2048}
                />
                {inputError && <Text accessibilityLiveRegion="polite" className="text-sm text-error">{inputError}</Text>}
                <Pressable
                  accessibilityRole="button" disabled={saving} onPress={() => void addFeed()}
                  className="border border-transparent focus:border-ink web:focus-visible:border-ink active:opacity-75 min-h-11 items-center justify-center rounded-xl bg-accent disabled:opacity-50"
                >
                  <Text className="font-semibold text-on-accent">Ajouter</Text>
                </Pressable>
              </View>

              {saveError && <Text accessibilityLiveRegion="polite" className="text-sm text-error">{saveError}</Text>}

              <View className="gap-2">
                {feeds.length === 0 && <Text className="text-muted">Aucune source enregistrée.</Text>}
                {feeds.map((feed) => (
                  <View key={feed.url} className="flex-row items-center gap-2 rounded-xl border border-line bg-surface p-3">
                    <View className="flex-1">
                      <Text className="font-semibold text-ink">{feed.name}</Text>
                      <Text numberOfLines={1} className="mt-1 text-xs text-muted">{feed.url}</Text>
                    </View>
                    <Switch
                      accessibilityLabel={`Activer le flux ${feed.name}`}
                      value={feed.active} disabled={saving}
                      trackColor={{ true: palette.cobalt, false: palette.edge }}
                      onValueChange={(active) => void onSave(feeds.map((item) =>
                        item.url === feed.url ? { ...item, active } : item))}
                    />
                    <Pressable
                      accessibilityRole="button" accessibilityLabel={`Supprimer ${feed.name}`}
                      disabled={saving}
                      onPress={() => void onSave(feeds.filter((item) => item.url !== feed.url))}
                      className="border border-transparent focus:border-ink web:focus-visible:border-ink active:opacity-75 h-11 w-11 items-center justify-center rounded-lg bg-error-surface"
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
