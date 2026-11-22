import { useEffect, useState } from 'react';
import { Pressable, Text, View } from 'react-native';

export function useSportList<T>(fetchItems: (signal: AbortSignal) => Promise<T[]>, timeoutMessage: string) {
  const [items, setItems] = useState<T[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [request, setRequest] = useState<{ refresh: boolean } | null>({ refresh: false });

  useEffect(() => {
    if (!request) return;
    const controller = new AbortController();
    const timeout = setTimeout(() => {
      controller.abort();
      setError(timeoutMessage);
      setRequest(null);
    }, 15000);

    void fetchItems(controller.signal).then((result) => {
      if (!controller.signal.aborted) setItems(result);
    }).catch((cause: unknown) => {
      if (!controller.signal.aborted) {
        setError(cause instanceof Error ? cause.message : 'Impossible de charger les données.');
      }
    }).finally(() => {
      clearTimeout(timeout);
      if (!controller.signal.aborted) setRequest(null);
    });

    return () => {
      clearTimeout(timeout);
      controller.abort();
    };
  }, [fetchItems, request, timeoutMessage]);

  function reload() {
    setError(null);
    setRequest({ refresh: true });
  }

  return { items, error, refreshing: request?.refresh === true, reload };
}

export function SportListError({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <View className="mb-3 items-start gap-2 rounded-xl border border-error-line bg-error-surface p-4">
      <Text accessibilityLiveRegion="polite" className="text-sm text-error">{message}</Text>
      <Pressable
        accessibilityRole="button"
        onPress={onRetry}
        className="min-h-11 justify-center rounded-lg border border-transparent bg-selection px-4 active:bg-pressed focus:border-ink"
      >
        <Text className="font-semibold text-accent">Réessayer</Text>
      </Pressable>
    </View>
  );
}
