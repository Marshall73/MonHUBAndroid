import { useState } from 'react';
import { Modal, Pressable, Text, TextInput, View } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';

export function FavoriteCinemaModal({ cinema, onClose, onSave }: {
  cinema: string;
  onClose: () => void;
  onSave: (name: string) => Promise<void>;
}) {
  const [name, setName] = useState(cinema);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(false);

  async function save() {
    if (!name.trim() || saving) return;
    setSaving(true);
    setError(false);
    try {
      await onSave(name.trim());
      onClose();
    } catch {
      setError(true);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal transparent visible animationType="fade" onRequestClose={() => { if (!saving) onClose(); }}>
      <SafeAreaProvider>
        <SafeAreaView className="flex-1 items-center justify-center bg-black/70 px-5">
          <View className="w-full max-w-sm gap-4 rounded-2xl border border-zinc-800 bg-zinc-900 p-5">
            <Text accessibilityRole="header" className="text-xl font-bold text-zinc-50">Mon cinéma favori</Text>
            <Text className="text-sm leading-5 text-zinc-400">
              Indiquez le nom du cinéma et sa ville pour affiner la recherche de séances.
            </Text>
            <TextInput
              value={name}
              onChangeText={setName}
              editable={!saving}
              accessibilityLabel="Nom du cinéma et ville"
              placeholder="Nom du cinéma et ville"
              placeholderTextColor="#A1A1AA"
              maxLength={120}
              returnKeyType="done"
              onSubmitEditing={() => void save()}
              className="min-h-12 rounded-xl border border-zinc-800 bg-zinc-950 px-3 text-zinc-50"
            />
            {error && (
              <Text accessibilityLiveRegion="polite" className="text-sm text-red-300">
                Impossible d’enregistrer le cinéma. Réessayez.
              </Text>
            )}
            <View className="flex-row justify-end gap-2">
              <Pressable
                accessibilityRole="button" onPress={onClose} disabled={saving}
                className="min-h-11 justify-center rounded-xl px-3 disabled:opacity-50"
              >
                <Text className="font-semibold text-zinc-300">Annuler</Text>
              </Pressable>
              <Pressable
                accessibilityRole="button" disabled={saving || !name.trim()} onPress={() => void save()}
                className="min-h-11 justify-center rounded-xl bg-blue-600 px-3 disabled:opacity-50"
              >
                <Text className="font-semibold text-zinc-50">{saving ? 'Enregistrement…' : 'Enregistrer'}</Text>
              </Pressable>
            </View>
          </View>
        </SafeAreaView>
      </SafeAreaProvider>
    </Modal>
  );
}
