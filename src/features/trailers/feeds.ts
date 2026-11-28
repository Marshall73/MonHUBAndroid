import { isYouTubeVideoId } from '../../shared/services/youtube';
import { fetchFeedDocument, plainText, readFeedXml, record, text, values, webUrl } from '../feedXml';
import { parseYouTubeChannel } from './youtubeChannel';

export const categories = ['Films', 'Jeux Vidéo'] as const;
export type Category = (typeof categories)[number];
export type TrailerSource = { name: string; category: Category; url: string };
export type Trailer = {
  key: string;
  title: string;
  timestamp: number | null;
  url: string;
  videoId: string | null;
  thumbnail: string | null;
  channel: string;
  source: TrailerSource;
};

const channelIdPattern = /^UC[\w-]{22}$/;

function channelFeed(id: string) {
  return `https://www.youtube.com/feeds/videos.xml?channel_id=${id}`;
}

export const defaultSources: TrailerSource[] = [
  { name: 'FilmsActu', category: 'Films', url: channelFeed('UC_i8X3p8oZNaik8X513Zn1Q') },
  { name: 'PlayStation France', category: 'Jeux Vidéo', url: channelFeed('UC6X0-dNIk9_t8gFnavqN12g') },
  { name: 'Xbox France', category: 'Jeux Vidéo', url: channelFeed('UClTIAyddbuw6LwmZ-pISXBA') },
  { name: 'IGN France', category: 'Jeux Vidéo', url: channelFeed('UC6DfGA8KPPd_2NB1NBaQy1g') },
];

function isYouTube(host: string) {
  return host === 'youtube.com' || host.endsWith('.youtube.com');
}

function youtubeChannelId(url: URL) {
  if (!isYouTube(url.hostname)) return null;
  const id = url.pathname === '/feeds/videos.xml'
    ? url.searchParams.get('channel_id')
    : url.pathname.match(/^\/channel\/(UC[\w-]{22})(?:\/|$)/)?.[1];
  return id && channelIdPattern.test(id) ? id : null;
}

export function sourceUrl(value: string) {
  const address = webUrl(value);
  if (!address) return null;
  const url = new URL(address);
  url.hash = '';
  const id = youtubeChannelId(url);
  return id ? channelFeed(id) : url.href;
}

export function isSource(value: unknown): value is TrailerSource {
  const { name, category, url } = record(value);
  return typeof name === 'string' && !!name.trim() &&
    (category === 'Films' || category === 'Jeux Vidéo') &&
    typeof url === 'string' && sourceUrl(url) !== null;
}

function youtubeId(address: string | null) {
  if (!address) return '';
  const url = new URL(address);
  let id: string | null | undefined;
  if (url.hostname === 'youtu.be') {
    id = url.pathname.split('/')[1];
  } else if (isYouTube(url.hostname) || url.hostname === 'www.youtube-nocookie.com') {
    id = url.pathname === '/watch'
      ? url.searchParams.get('v')
      : url.pathname.match(/^\/(?:embed|shorts|live)\/([\w-]{11})(?:\/|$)/)?.[1];
  }
  return isYouTubeVideoId(id) ? id : '';
}

function discoverFeed(html: string, base: string) {
  for (const tag of html.matchAll(/<link\b[^>]*>/gi)) {
    const attributes = Object.fromEntries(Array.from(
      tag[0].matchAll(/([\w:-]+)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/g),
      ([, key, double, single, bare]) => [key.toLowerCase(), double ?? single ?? bare],
    ));
    if (!attributes.rel?.toLowerCase().split(/\s+/).includes('alternate')) continue;
    if (!/^application\/(?:rss|atom)\+xml(?:\s*;|$)/i.test(attributes.type ?? '')) continue;
    const address = webUrl(text(attributes.href), base);
    if (address) return sourceUrl(address);
  }
  return null;
}

export function parseTrailers(xml: string, source: TrailerSource, base = source.url): Trailer[] {
  const root = readFeedXml(xml);
  const atom = root.feed !== undefined;
  const channel = record(root.rss).channel;
  if (!atom && channel === undefined) throw new Error('Flux vidéo introuvable');

  const feed = record(atom ? root.feed : channel);
  const feedBase = webUrl(text(feed['@_base']), base) ?? base;
  const items = new Map<string, Trailer>();

  for (const value of values(atom ? feed.entry : feed.item)) {
    const entry = record(value);
    const title = plainText(entry.title);
    if (!title) continue;
    const entryBase = webUrl(text(entry['@_base']), feedBase) ?? feedBase;
    const links = values(entry.link).map(record);
    const alternate = links.find((link) => link['@_href'] && (link['@_rel'] === undefined || link['@_rel'] === 'alternate'));
    const alternateBase = webUrl(text(alternate?.['@_base']), entryBase) ?? entryBase;
    const link = atom ? webUrl(text(alternate?.['@_href']), alternateBase) : webUrl(text(entry.link), entryBase);
    const group = record(entry.group);
    const attachments = [
      ...values(entry.enclosure).map(record),
      ...links.filter((link) => link['@_rel'] === 'enclosure'),
      ...values(group.content).map(record),
      ...values(entry.content).map(record),
    ];

    const nativeId = text(entry.videoId).trim();
    let id = isYouTubeVideoId(nativeId) ? nativeId : youtubeId(link);
    if (!id) {
      const content = [entry.description, entry.summary, entry.encoded, entry.content].map(text).join(' ');
      for (const match of content.matchAll(/(?:https?:)?\/\/(?:[\w-]+\.)?(?:youtube(?:-nocookie)?\.com|youtu\.be)\/[^\s"'<>]+/gi)) {
        id = youtubeId(webUrl(match[0], entryBase));
        if (id) break;
      }
    }

    const video = attachments.find((item) =>
      text(item['@_type']).toLowerCase().startsWith('video/') || item['@_medium'] === 'video');
    const url = id
      ? `https://www.youtube.com/watch?v=${id}`
      : webUrl(text(video?.['@_url'] ?? video?.['@_href']), entryBase);
    if (!url || items.has(url)) continue;

    const image = record(values(group.thumbnail ?? entry.thumbnail)[0]);
    const timestamp = Date.parse(text(entry.published ?? entry.pubDate ?? entry.updated ?? entry.date));
    items.set(url, {
      key: url,
      title,
      timestamp: Number.isFinite(timestamp) ? timestamp : null,
      url,
      videoId: id || null,
      thumbnail: id ? `https://i.ytimg.com/vi/${id}/hqdefault.jpg` : webUrl(text(image['@_url']), entryBase),
      channel: plainText(record(entry.author).name) || plainText(feed.title) || source.name,
      source,
    });
  }
  return [...items.values()];
}

export async function fetchTrailers(source: TrailerSource, signal: AbortSignal) {
  const channelId = youtubeChannelId(new URL(source.url));
  if (channelId) return fetchYouTubeTrailers(channelId, source, signal);

  const document = await fetchFeedDocument(source.url, signal);
  if (!/^\s*(?:<!doctype\s+html\b|<html\b)/i.test(document.body)) {
    return parseTrailers(document.body, source, document.url);
  }
  const discovered = discoverFeed(document.body, document.url);
  if (!discovered || discovered === document.url) throw new Error('Aucun flux RSS ou Atom annoncé par ce site');

  const discoveredChannel = youtubeChannelId(new URL(discovered));
  if (discoveredChannel) return fetchYouTubeTrailers(discoveredChannel, source, signal);

  const feed = await fetchFeedDocument(discovered, signal);
  return parseTrailers(feed.body, source, feed.url);
}

async function fetchYouTubeTrailers(channelId: string, source: TrailerSource, signal: AbortSignal) {
  try {
    const feed = await fetchFeedDocument(channelFeed(channelId), signal, 5000);
    return parseTrailers(feed.body, source, feed.url);
  } catch (error) {
    if (signal.aborted) throw error;
  }

  const page = await fetchFeedDocument(`https://www.youtube.com/channel/${channelId}/videos?hl=en`, signal);
  return parseYouTubeChannel(page.body, source);
}
