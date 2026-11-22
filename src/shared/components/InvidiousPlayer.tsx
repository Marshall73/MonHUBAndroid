import Ionicons from '@expo/vector-icons/Ionicons';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Linking, Pressable, Text, View } from 'react-native';
import { WebView } from 'react-native-webview';

import palette from '../../theme.json';
import { getInvidiousInstances } from '../services/invidious';

type Status = 'loading' | 'ready' | 'error';

function VideoFrame({ instance, videoId }: { instance: string; videoId: string }) {
  const [status, setStatus] = useState<Status>('loading');
  const uri = `${instance}/embed/${encodeURIComponent(videoId)}?autoplay=1&local=true&dark_mode=true`;

  useEffect(() => {
    if (status !== 'loading') return;
    const timeout = setTimeout(() => setStatus('error'), 15000);
    return () => clearTimeout(timeout);
  }, [status]);

  const fail = () => setStatus('error');

  return (
    <View className="aspect-video overflow-hidden bg-media">
      {status === 'error' ? (
        <View className="flex-1 items-center justify-center px-4">
          <Text accessibilityLiveRegion="polite" className="text-center text-sm text-copy">
            La vidéo ne se charge pas. Changez de serveur ou utilisez le lecteur externe.
          </Text>
        </View>
      ) : (
        <WebView
          source={{ uri }}
          originWhitelist={['*']}
          onShouldStartLoadWithRequest={({ url }) => {
            try {
              return new URL(url).origin === instance;
            } catch {
              return false;
            }
          }}
          mixedContentMode="never"
          setSupportMultipleWindows={false}
          thirdPartyCookiesEnabled={false}
          allowsFullscreenVideo
          mediaPlaybackRequiresUserAction={false}
          onLoad={() => setStatus((current) => current === 'loading' ? 'ready' : current)}
          onError={fail}
          onHttpError={({ nativeEvent }) => {
            if (nativeEvent.url.split('?')[0] === uri.split('?')[0]) fail();
          }}
          onRenderProcessGone={fail}
        />
      )}
      {status === 'loading' && (
        <View pointerEvents="none" className="absolute inset-0 items-center justify-center bg-media">
          <ActivityIndicator color={palette.accent} accessibilityLabel="Chargement de la vidéo" />
        </View>
      )}
    </View>
  );
}

const actionClass = 'min-h-11 flex-row items-center gap-2 rounded-lg border border-transparent px-2 active:bg-raised focus:border-ink';

export function InvidiousPlayer({ videoId, onClose }: { videoId: string; onClose: () => void }) {
  const [instances, setInstances] = useState<readonly string[]>([]);
  const [serverIndex, setServerIndex] = useState(0);

  useEffect(() => {
    let mounted = true;
    void getInvidiousInstances().then((uris) => {
      if (mounted) setInstances(uris);
    });
    return () => { mounted = false; };
  }, []);

  const instance = instances[serverIndex];
  return (
    <View className="self-stretch">
      {instance ? (
        <VideoFrame key={`${instance}/${videoId}`} instance={instance} videoId={videoId} />
      ) : (
        <View className="aspect-video items-center justify-center bg-media">
          <ActivityIndicator color={palette.accent} accessibilityLabel="Recherche d’un serveur Invidious" />
        </View>
      )}
      <View className="flex-row flex-wrap items-center gap-x-2 border-b border-line px-2">
        <Pressable
          accessibilityRole="button"
          disabled={instances.length < 2}
          className={`${actionClass} disabled:opacity-50`}
          onPress={() => setServerIndex((current) => (current + 1) % instances.length)}
        >
          <Ionicons name="swap-horizontal-outline" size={17} color={palette.accent} />
          <Text className="text-sm font-semibold text-accent">Changer de serveur</Text>
        </Pressable>
        <Pressable
          accessibilityRole="link"
          className={actionClass}
          onPress={() => {
            Linking.openURL(`https://youtube.com/watch?v=${encodeURIComponent(videoId)}`)
              .then(onClose)
              .catch(() => Alert.alert('Lecture indisponible', 'Impossible d’ouvrir le lecteur externe.'));
          }}
        >
          <Ionicons name="open-outline" size={16} color={palette.accent} />
          <Text className="text-sm font-semibold text-accent">Lecteur externe</Text>
        </Pressable>
        <Pressable accessibilityRole="button" onPress={onClose} className={actionClass}>
          <Ionicons name="close-outline" size={18} color={palette.copy} />
          <Text className="text-sm font-semibold text-copy">Fermer le lecteur</Text>
        </Pressable>
      </View>
    </View>
  );
}
