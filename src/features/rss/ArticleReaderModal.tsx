import Ionicons from '@expo/vector-icons/Ionicons';
import { openBrowserAsync } from 'expo-web-browser';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Image, Modal, Pressable, ScrollView, Text, View } from 'react-native';
import { useReducedMotion } from 'react-native-reanimated';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { WebView } from 'react-native-webview';

import palette from '../../theme.json';
import { webUrl } from '../feedXml';
import type { Article } from './feeds';
import { fetchReaderArticle, readFeedArticle, type ReaderArticle } from './readerArticle';

const progressWidths = [
  'w-0', 'w-1/12', 'w-2/12', 'w-3/12', 'w-4/12', 'w-5/12', 'w-6/12',
  'w-7/12', 'w-8/12', 'w-9/12', 'w-10/12', 'w-11/12', 'w-full',
];
const articleDate = new Intl.DateTimeFormat('fr-FR', { dateStyle: 'long' });

type ReaderState =
  | { status: 'loading' }
  | { status: 'ready'; article: ReaderArticle }
  | { status: 'error' };

function ArticleWebPage({ url }: { url: string }) {
  const [pageUrl, setPageUrl] = useState(url);
  const [progress, setProgress] = useState(0);
  const percent = Math.round(progress * 100);

  return (
    <View className="flex-1 bg-[#090D16]">
      {progress < 1 && (
        <View
          accessibilityRole="progressbar"
          accessibilityLabel="Chargement de la page web"
          accessibilityValue={{ min: 0, max: 100, now: percent }}
          className="h-1 bg-raised"
        >
          <View className={`h-full bg-accent ${progressWidths[Math.round(progress * 12)]}`} />
        </View>
      )}
      <WebView
        source={{ uri: pageUrl }}
        originWhitelist={['*']}
        onShouldStartLoadWithRequest={({ url: destination }) => destination === 'about:blank' || webUrl(destination) !== null}
        onOpenWindow={({ nativeEvent }) => {
          const target = webUrl(nativeEvent.targetUrl);
          if (target) setPageUrl(target);
        }}
        mixedContentMode="never"
        onLoadStart={() => setProgress(0)}
        onLoadProgress={({ nativeEvent }) => setProgress(nativeEvent.progress)}
        onLoadEnd={() => setProgress(1)}
      />
    </View>
  );
}

const barButton = 'min-h-11 justify-center rounded-lg border border-transparent px-2 active:bg-raised focus:border-accent';

export function ArticleReaderModal({ article, onClose }: { article: Article; onClose: () => void }) {
  const reduceMotion = useReducedMotion();
  const [mode, setMode] = useState<'reader' | 'web'>('reader');
  const [feedContent] = useState(() => readFeedArticle(article));
  const [state, setState] = useState<ReaderState>({ status: 'loading' });
  const [attempt, setAttempt] = useState(0);
  const content = feedContent ?? (state.status === 'ready' ? state.article : null);
  const image = content?.image ?? article.image;

  useEffect(() => {
    if (feedContent) return;
    const controller = new AbortController();
    const timeout = setTimeout(() => {
      controller.abort();
      setState({ status: 'error' });
    }, 12000);

    void fetchReaderArticle(article, controller.signal).then((result) => {
      if (!controller.signal.aborted) setState({ status: 'ready', article: result });
    }).catch(() => {
      if (!controller.signal.aborted) setState({ status: 'error' });
    }).finally(() => clearTimeout(timeout));

    return () => {
      clearTimeout(timeout);
      controller.abort();
    };
  }, [article, attempt, feedContent]);

  return (
    <Modal visible presentationStyle="fullScreen" animationType={reduceMotion ? 'none' : 'slide'} onRequestClose={onClose}>
      <SafeAreaProvider>
        <SafeAreaView className="flex-1 bg-[#090D16]">
          <View className="flex-row flex-wrap items-center justify-between gap-x-1 border-b border-line bg-[#090D16] px-3">
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Fermer l’article"
              onPress={onClose}
              className={`${barButton} flex-row items-center gap-1`}
            >
              <Ionicons name="close" size={20} color={palette.copy} />
              <Text className="text-sm font-semibold text-copy">Fermer</Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              onPress={() => setMode(mode === 'reader' ? 'web' : 'reader')}
              className={`${barButton} bg-selection`}
            >
              <Text className="text-sm font-semibold text-accent">{mode === 'reader' ? 'Page Web' : 'Mode Lecture'}</Text>
            </Pressable>
            <Pressable
              accessibilityRole="link"
              onPress={() => {
                void openBrowserAsync(article.url).catch(() =>
                  Alert.alert('Ouverture impossible', 'Impossible d’ouvrir cet article dans le navigateur.'));
              }}
              className={barButton}
            >
              <Text className="text-xs font-medium text-muted">Navigateur externe</Text>
            </Pressable>
          </View>
          {mode === 'web' ? <ArticleWebPage url={article.url} /> : (
            <ScrollView className="flex-1">
              <View className="mx-auto w-full max-w-2xl gap-5 px-5 pb-10 pt-6">
                <View className="gap-2">
                  <Text accessibilityRole="header" className="text-screen-title font-bold text-ink">{article.title}</Text>
                  <View className="flex-row flex-wrap gap-x-3 gap-y-1">
                    <Text className="text-sm font-semibold text-[#E2E8F0]">{article.feed.name}</Text>
                    {article.timestamp !== null && (
                      <Text className="text-sm text-muted">{articleDate.format(article.timestamp)}</Text>
                    )}
                  </View>
                </View>
                {image && <Image source={{ uri: image }} resizeMode="cover" className="aspect-video w-full rounded-xl bg-raised" />}
                {content ? content.blocks.map((block, index) => (
                  <Text
                    key={index}
                    selectable
                    accessibilityRole={block.kind === 'heading' ? 'header' : undefined}
                    className={`leading-7 text-[#E2E8F0] ${block.kind === 'heading' ? 'text-xl font-semibold' : 'text-base'} ${block.kind === 'quote' ? 'border-l-2 border-edge pl-3' : ''}`}
                  >
                    {block.kind === 'list' ? '• ' : ''}{block.text}
                  </Text>
                )) : state.status === 'error' ? (
                  <View className="items-start gap-3">
                    {article.summary !== '' && <Text className="text-base leading-7 text-[#E2E8F0]">{article.summary}</Text>}
                    <Text accessibilityLiveRegion="polite" className="text-sm text-error">
                      Impossible d’extraire l’article. Tu peux ouvrir la page web ci-dessus.
                    </Text>
                    <Pressable
                      accessibilityRole="button"
                      onPress={() => { setState({ status: 'loading' }); setAttempt((current) => current + 1); }}
                      className={`${barButton} bg-selection`}
                    >
                      <Text className="text-sm font-semibold text-accent">Réessayer</Text>
                    </Pressable>
                  </View>
                ) : (
                  <View className="flex-row items-center gap-2" accessible accessibilityState={{ busy: true }}>
                    <ActivityIndicator color={palette.accent} />
                    <Text className="text-sm text-muted">Chargement de l’article…</Text>
                  </View>
                )}
              </View>
            </ScrollView>
          )}
        </SafeAreaView>
      </SafeAreaProvider>
    </Modal>
  );
}
