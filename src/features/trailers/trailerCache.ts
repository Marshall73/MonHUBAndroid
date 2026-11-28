import AsyncStorage from '@react-native-async-storage/async-storage';

import { isYouTubeVideoId } from '../../shared/services/youtube';
import { record, webUrl } from '../feedXml';
import type { Trailer, TrailerSource } from './feeds';

type CachedTrailer = Omit<Trailer, 'source'>;

function cacheKey(source: TrailerSource) {
  return `trailers/feed-cache-v1/${encodeURIComponent(source.url)}`;
}

function isCachedTrailer(value: unknown): value is CachedTrailer {
  const { key, url, title, timestamp, videoId, thumbnail, channel } = record(value);
  return typeof url === 'string' && key === url && webUrl(url) !== null &&
    typeof title === 'string' && typeof channel === 'string' &&
    (timestamp === null || (typeof timestamp === 'number' && Number.isFinite(timestamp))) &&
    (videoId === null || isYouTubeVideoId(videoId)) &&
    (thumbnail === null || (typeof thumbnail === 'string' && webUrl(thumbnail) !== null));
}

export async function loadCachedTrailers(source: TrailerSource): Promise<Trailer[] | null> {
  const stored = await AsyncStorage.getItem(cacheKey(source));
  const data: unknown = stored === null ? null : JSON.parse(stored);
  return Array.isArray(data) ? data.filter(isCachedTrailer).map((trailer) => ({ ...trailer, source })) : null;
}

export async function saveCachedTrailers(source: TrailerSource, trailers: Trailer[]): Promise<void> {
  const entries = [...trailers].sort((left, right) =>
    (right.timestamp ?? Number.MIN_SAFE_INTEGER) - (left.timestamp ?? Number.MIN_SAFE_INTEGER),
  ).slice(0, 30).map(({ source: _source, ...trailer }) => trailer);
  await AsyncStorage.setItem(cacheKey(source), JSON.stringify(entries));
}
