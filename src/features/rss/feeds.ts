import { fetchFeedDocument, plainText, readFeedXml, record, text, values, webUrl } from '../feedXml';

export { relativeDate, webUrl } from '../feedXml';

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

export function isFeed(value: unknown): value is Feed {
  return typeof value === 'object' && value !== null &&
    'name' in value && typeof value.name === 'string' && !!value.name.trim() &&
    'url' in value && typeof value.url === 'string' && webUrl(value.url) !== null &&
    'active' in value && typeof value.active === 'boolean';
}

export function parseFeed(xml: string, feed: Feed, base = feed.url): Article[] {
  const root = readFeedXml(xml);
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
  const document = await fetchFeedDocument(feed.url, signal);
  return parseFeed(document.body, feed, document.url);
}
