import AsyncStorage from '@react-native-async-storage/async-storage';

import { addedFeeds, defaultFeeds, feedUrlKey, isFeed, type Feed } from './feeds';

const storageKey = 'rss/feeds';

function isFeedList(value: unknown): value is Feed[] {
  return Array.isArray(value) && value.every(isFeed);
}

export async function saveFeedPreferences(feeds: Feed[]) {
  await AsyncStorage.setItem(storageKey, JSON.stringify({ version: 1, feeds }));
}

export async function loadFeedPreferences(): Promise<Feed[]> {
  const stored = await AsyncStorage.getItem(storageKey);
  if (stored === null) {
    await saveFeedPreferences(defaultFeeds);
    return defaultFeeds;
  }

  const parsed: unknown = JSON.parse(stored);
  if (parsed && typeof parsed === 'object' &&
    'version' in parsed && parsed.version === 1 && 'feeds' in parsed && isFeedList(parsed.feeds)) {
    return parsed.feeds;
  }
  if (!isFeedList(parsed)) throw new Error('Sources invalides');

  const existing = new Set(parsed.map(({ url }) => feedUrlKey(url)));
  const feeds = [...parsed, ...addedFeeds.filter(({ url }) => !existing.has(feedUrlKey(url)))];
  await saveFeedPreferences(feeds);
  return feeds;
}
