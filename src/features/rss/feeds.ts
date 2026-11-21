import { XMLParser, XMLValidator } from 'fast-xml-parser';

export type Feed = { name: string; url: string; active: boolean };
export type Article = {
  title: string;
  url: string;
  summary: string;
  timestamp: number | null;
  feed: Feed;
};

export const defaultFeeds: Feed[] = [
  { name: 'Frandroid', url: 'https://www.frandroid.com/feed', active: true },
  { name: 'Le Monde Pixels', url: 'https://www.lemonde.fr/pixels/rss_full.xml', active: true },
  { name: 'Numerama', url: 'https://www.numerama.com/feed/', active: true },
];

export function webUrl(value: string, base?: string) {
  if (!value.trim()) return null;
  try {
    const url = new URL(value.trim(), base);
    return (url.protocol === 'http:' || url.protocol === 'https:') &&
      url.hostname && !url.username && !url.password ? url.href : null;
  } catch {
    return null;
  }
}

export function isFeed(value: unknown): value is Feed {
  return typeof value === 'object' && value !== null &&
    'name' in value && typeof value.name === 'string' && !!value.name.trim() &&
    'url' in value && typeof value.url === 'string' && webUrl(value.url) !== null &&
    'active' in value && typeof value.active === 'boolean';
}

const parser = new XMLParser({
  ignoreAttributes: false,
  removeNSPrefix: true,
  parseTagValue: false,
  processEntities: false,
  stopNodes: ['*.description', '*.summary', '*.content', '*.encoded'],
});

const entities: Record<string, string> = {
  amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ',
  rsquo: '’', lsquo: '‘', ldquo: '“', rdquo: '”', laquo: '«', raquo: '»',
  hellip: '…', ndash: '–', mdash: '—', eacute: 'é', egrave: 'è',
  ecirc: 'ê', agrave: 'à', ccedil: 'ç', ocirc: 'ô', ugrave: 'ù', oelig: 'œ',
};

function decodeEntities(value: string) {
  return value.replace(/&(#x[\da-f]+|#\d+|[a-z]+);/gi, (match, entity: string) => {
    if (entity[0] !== '#') return Object.hasOwn(entities, entity) ? entities[entity] : match;
    const code = entity[1].toLowerCase() === 'x' ? parseInt(entity.slice(2), 16) : Number(entity.slice(1));
    return code > 0 && code <= 0x10ffff ? String.fromCodePoint(code) : match;
  });
}

function record(value: unknown): Record<string, unknown> {
  return value !== null && typeof value === 'object' ? value as Record<string, unknown> : {};
}

function text(value: unknown) {
  const contents = typeof value === 'string' ? value : record(value)['#text'];
  if (typeof contents !== 'string') return '';
  const cdata = contents.match(/^<!\[CDATA\[([\s\S]*)\]\]>$/);
  return cdata ? cdata[1] : decodeEntities(contents);
}

function plainText(value: unknown) {
  const stripped = text(value)
    .replace(/<!--[^]*?-->/g, '')
    .replace(/<(script|style)\b[^>]*>[^]*?<\/\1\s*>/gi, '')
    .replace(/<\/?[a-z][^>]*>/gi, ' ');
  return decodeEntities(stripped).replace(/\s+/g, ' ').trim();
}

function values(value: unknown): unknown[] {
  return Array.isArray(value) ? value : value === undefined ? [] : [value];
}

export function parseFeed(xml: string, feed: Feed, base = feed.url): Article[] {
  if (/<!DOCTYPE\b/i.test(xml) || XMLValidator.validate(xml) !== true) {
    throw new Error('XML invalide');
  }

  const root = record(parser.parse(xml));
  const channel = record(root.rss).channel;
  const atom = root.feed !== undefined;
  if (!atom && !channel) throw new Error('Format de flux inconnu');

  const container = record(atom ? root.feed : channel);
  const containerBase = webUrl(text(container['@_base']), base) ?? base;
  const articles = new Map<string, Article>();

  for (const value of values(atom ? container.entry : container.item)) {
    const entry = record(value);
    const title = plainText(entry.title);
    if (!title) continue;

    const entryBase = webUrl(text(entry['@_base']), containerBase) ?? containerBase;
    const links = values(entry.link).map(record);
    const alternate = links.find((link) =>
      link['@_href'] && (link['@_rel'] === undefined || link['@_rel'] === 'alternate'));
    const url = atom
      ? webUrl(text(alternate?.['@_href']), webUrl(text(alternate?.['@_base']), entryBase) ?? entryBase)
      : webUrl(text(entry.link), entryBase) ??
        (record(entry.guid)['@_isPermaLink'] === 'false' ? null : webUrl(text(entry.guid)));
    if (!url || articles.has(url)) continue;

    const date = Date.parse(text(entry.published ?? entry.pubDate ?? entry.updated ?? entry.date));
    const summary = [entry.summary, entry.description, entry.encoded, entry.content]
      .map(plainText).find(Boolean) ?? '';

    articles.set(url, { title, url, summary, timestamp: Number.isFinite(date) ? date : null, feed });
  }

  return [...articles.values()];
}

export async function fetchArticles(feed: Feed, signal: AbortSignal) {
  const controller = new AbortController();
  const cancel = () => controller.abort();
  if (signal.aborted) cancel();
  signal.addEventListener('abort', cancel, { once: true });
  const timeout = setTimeout(cancel, 12000);

  try {
    const response = await fetch(feed.url, { signal: controller.signal });
    if (!response.ok) throw new Error('Flux indisponible');
    const xml = await response.text();
    if (controller.signal.aborted || xml.length > 4_000_000) throw new Error('Flux indisponible');
    return parseFeed(xml, feed, webUrl(response.url) ?? feed.url);
  } finally {
    clearTimeout(timeout);
    signal.removeEventListener('abort', cancel);
  }
}

export function relativeDate(timestamp: number | null, now = Date.now()) {
  if (timestamp === null) return 'Date inconnue';
  const minutes = Math.max(0, Math.floor((now - timestamp) / 60000));
  if (minutes < 1) return 'À l’instant';
  if (minutes < 60) return `Il y a ${minutes} min`;
  if (minutes < 1440) return `Il y a ${Math.floor(minutes / 60)}h`;
  return `Il y a ${Math.floor(minutes / 1440)} j`;
}
