import Ionicons from '@expo/vector-icons/Ionicons';
import { Pressable, Text, View } from 'react-native';

import palette from '../../theme.json';
import type { useFeedHistory } from '../hooks/useFeedHistory';

type HistoryActions = Pick<ReturnType<typeof useFeedHistory>,
  'hasSeen' | 'hasArchived' | 'showArchived' | 'clearSeen' | 'toggleArchived' | 'scrollToTop' | 'error' | 'retry'>;

export function FeedHistoryActions({ history, clearLabel, reduceMotion }: {
  history: HistoryActions;
  clearLabel: string;
  reduceMotion: boolean;
}) {
  return (
    <View className="mt-2 gap-2">
      <View className="flex-row items-start justify-between gap-2">
        <View className="flex-1 flex-row flex-wrap gap-2">
          <Pressable
            accessibilityRole="button"
            disabled={!history.hasSeen}
            onPress={history.clearSeen}
            className="min-h-11 flex-row items-center gap-2 rounded-lg border border-line px-3 active:bg-pressed disabled:opacity-50 focus:border-ink web:focus-visible:border-ink"
          >
            <Ionicons name="trash-outline" size={18} color={palette.copy} />
            <Text className="text-sm font-semibold text-copy">{clearLabel}</Text>
          </Pressable>
          {history.hasArchived && (
            <Pressable
              accessibilityRole="button"
              accessibilityState={{ selected: history.showArchived }}
              onPress={history.toggleArchived}
              className="min-h-11 justify-center rounded-lg border border-line px-3 active:bg-pressed focus:border-ink web:focus-visible:border-ink"
            >
              <Text className="text-sm font-semibold text-copy">
                {history.showArchived ? 'Masquer les effacés' : 'Afficher les effacés'}
              </Text>
            </Pressable>
          )}
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Remonter en haut du fil"
          onPress={() => history.scrollToTop(!reduceMotion)}
          className="h-11 w-11 items-center justify-center rounded-lg border border-transparent bg-selection active:bg-pressed focus:border-ink web:focus-visible:border-ink"
        >
          <Ionicons name="arrow-up" size={22} color={palette.accent} />
        </Pressable>
      </View>
      {history.error && (
        <View className="flex-row items-center gap-2 rounded-lg border border-error-line bg-error-surface px-3">
          <Text accessibilityLiveRegion="polite" className="flex-1 text-sm text-error">
            {history.error === 'load' ? 'Impossible de charger l’historique.' : 'Impossible d’enregistrer l’historique.'}
          </Text>
          <Pressable accessibilityRole="button" onPress={history.retry} className="min-h-11 justify-center px-2">
            <Text className="text-sm font-semibold text-accent">Réessayer</Text>
          </Pressable>
        </View>
      )}
    </View>
  );
}
