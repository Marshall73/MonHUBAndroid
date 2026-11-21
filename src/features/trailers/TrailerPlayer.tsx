import Ionicons from '@expo/vector-icons/Ionicons';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Linking, Pressable, Text, View } from 'react-native';
import YoutubePlayer from 'react-native-youtube-iframe';

export function TrailerPlayer({ videoId, url, onClose }: {
  videoId: string;
  url: string;
  onClose: () => void;
}) {
  const [width, setWidth] = useState(0);
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');

  useEffect(() => {
    if (width <= 0 || status !== 'loading') return;
    const timeout = setTimeout(() => setStatus((current) => current === 'loading' ? 'error' : current), 15000);
    return () => clearTimeout(timeout);
  }, [status, width]);

  const fail = () => setStatus('error');

  return (
    <>
      <View
        onLayout={(event) => setWidth(event.nativeEvent.layout.width)}
        className="aspect-video overflow-hidden bg-black"
      >
        {status === 'error' ? (
          <View className="flex-1 items-center justify-center px-4">
            <Text accessibilityLiveRegion="polite" className="text-center text-sm text-zinc-300">
              Cette vidéo ne peut pas être lue dans l’application.
            </Text>
          </View>
        ) : width > 0 && (
          <YoutubePlayer
            height={width * 9 / 16}
            width={width}
            videoId={videoId}
            play={true}
            onReady={() => setStatus((current) => current === 'error' ? current : 'ready')}
            onError={fail}
            webViewProps={{ onError: fail, onHttpError: fail }}
          />
        )}
        {status === 'loading' && (
          <View pointerEvents="none" className="absolute inset-0 items-center justify-center">
            <ActivityIndicator color="#93C5FD" accessibilityLabel="Chargement de la vidéo" />
          </View>
        )}
      </View>
      <View className="flex-row flex-wrap items-center gap-x-4 border-b border-zinc-800 px-4">
        <Pressable
          accessibilityRole="button" onPress={onClose}
          className="min-h-11 flex-row items-center gap-1.5 active:opacity-60"
        >
          <Ionicons name="close-outline" size={18} color="#D4D4D8" />
          <Text className="text-sm font-semibold text-zinc-300">Fermer le lecteur</Text>
        </Pressable>
        {status === 'error' && (
          <Pressable
            accessibilityRole="link"
            onPress={() => {
              Linking.openURL(url).then(onClose).catch(() => {
                Alert.alert('Lecture indisponible', 'Impossible d’ouvrir cette vidéo sur YouTube.');
              });
            }}
            className="min-h-11 flex-row items-center gap-1.5 active:opacity-60"
          >
            <Text className="text-sm font-semibold text-blue-200">Ouvrir sur YouTube</Text>
            <Ionicons name="open-outline" size={15} color="#93C5FD" />
          </Pressable>
        )}
      </View>
    </>
  );
}
