import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, Text, View } from 'react-native';

import { TrailerPreview } from '../../shared/components/TrailerPreview';
import palette from '../../theme.json';
import { fetchMovieTrailer, tmdbKey } from '../streaming/tmdb';

type Lookup = { status: 'loading' | 'error' } | { status: 'ready'; videoId: string | null };

function TrailerLookup({ title, apiKey }: { title: string; apiKey: string }) {
  const [lookup, setLookup] = useState<Lookup>({ status: 'loading' });
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    const timeout = setTimeout(() => {
      controller.abort();
      setLookup({ status: 'error' });
    }, 10000);

    void fetchMovieTrailer(apiKey, title, controller.signal).then((videoId) => {
      if (!controller.signal.aborted) setLookup({ status: 'ready', videoId });
    }).catch(() => {
      if (!controller.signal.aborted) setLookup({ status: 'error' });
    }).finally(() => clearTimeout(timeout));

    return () => {
      clearTimeout(timeout);
      controller.abort();
    };
  }, [apiKey, title, attempt]);

  if (lookup.status === 'ready') {
    return lookup.videoId ? <TrailerPreview videoId={lookup.videoId} /> : null;
  }
  if (lookup.status === 'error') {
    return (
      <Pressable
        accessibilityRole="button"
        onPress={() => {
          setLookup({ status: 'loading' });
          setAttempt((current) => current + 1);
        }}
        className="min-h-11 justify-center rounded-lg border border-transparent px-2 active:bg-raised focus:border-ink"
      >
        <Text className="text-sm font-semibold text-accent">Réessayer la recherche de bande-annonce</Text>
      </Pressable>
    );
  }
  return (
    <View accessible accessibilityState={{ busy: true }} className="flex-row items-center gap-2">
      <ActivityIndicator size="small" color={palette.muted} />
      <Text className="text-sm text-muted">Recherche de la bande-annonce…</Text>
    </View>
  );
}

export function CinemaTrailer({ title, videoId }: { title: string; videoId: string | null }) {
  if (videoId) return <TrailerPreview videoId={videoId} />;
  return tmdbKey ? <TrailerLookup key={title} title={title} apiKey={tmdbKey} /> : null;
}
