import { fetchFeedDocument, plainText, readFeedXml, record, text, values, webUrl } from '../feedXml';

export { relativeDate, webUrl } from '../feedXml';

export type Feed = { name: string; url: string; active: boolean };
export type Article = {
  title: string;
  url: string;
  summary: string;
  content: string;
  image: string | null;
  timestamp: number | null;
  feed: Feed;
};

function baseUrl(node: Record<string, unknown>, fallback: string) {
  return webUrl(text(node['@_xml:base']), fallback) ?? fallback;
}

function findImage(items: unknown[], base: string, includeUntyped: boolean) {
  for (const value of items) {
    const item = record(value);
    const type = text(item['@_type']).toLowerCase().trim();
    const medium = text(item['@_medium']).toLowerCase().trim();
    const url = webUrl(text(item['@_url'] ?? item['@_href']), baseUrl(item, base));
    if (url && (type.startsWith('image/') || medium === 'image' ||
      (!type && !medium && (includeUntyped || /\.(?:avif|gif|jpe?g|png|webp)(?:[?#]|$)/i.test(url))))) {
      return url;
    }
  }
  return null;
}

function firstHtmlImage(html: string, base: string) {
  const fragment = html.replace(/<!--[^]*?-->|<(script|style)\b[^>]*>[^]*?<\/\1\s*>/gi, '');
  for (const [tag] of fragment.matchAll(/<img\b(?:[^"'<>]|"[^"]*"|'[^']*')*>/gi)) {
    const attributes = new Map(Array.from(tag.matchAll(/\s(src|data-src)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>\x60]+))/gi),
      ([, name, double, single, bare]) => [name.toLowerCase(), double ?? single ?? bare]));
    const image = webUrl(text(attributes.get('data-src')), base) ?? webUrl(text(attributes.get('src')), base);
    if (image) return image;
  }
  return null;
}

const originalFeeds: Feed[] = [
  { name: 'Frandroid', url: 'https://www.frandroid.com/feed', active: true },
  { name: 'Le Monde Pixels', url: 'https://www.lemonde.fr/pixels/rss_full.xml', active: true },
  { name: 'Numerama', url: 'https://www.numerama.com/feed/', active: true },
];

export const addedFeeds: Feed[] = [
  ['JustGeek', 'https://www.justgeek.fr/feed/'],
  ['Futura', 'https://www.futura-sciences.com/rss/actualites.xml'],
  ['Korben', 'https://korben.info/feed'],
  ['SciencePost', 'https://sciencepost.fr/feed/'],
  ['Phonandroid', 'https://www.phonandroid.com/feed'],
  ['Cowcotland', 'https://feeds.feedburner.com/cowcotland'],
  ['Le Comptoir du Hardware', 'https://www.comptoir-hardware.com/home.xml'],
  ['Tom’s Hardware', 'https://www.tomshardware.fr/feed/'],
  ['GinjFo', 'https://www.ginjfo.com/feed'],
  ['GamersNexus', 'https://gamersnexus.net/rss.xml'],
  ['BHmag', 'https://www.bhmag.fr/feed'],
  ['Jeuxvideo.com', 'https://www.jeuxvideo.com/rss/rss.xml'],
  ['ActuGaming', 'https://www.actugaming.net/feed/'],
  ['Gameblog', 'https://www.gameblog.fr/rssmap/rss_all.xml'],
  ['JeuxActu', 'https://www.jeuxactu.com/rss/ja.rss'],
  ['Sitegeek', 'https://www.sitegeek.fr/feed/'],
  ['Écran Large', 'https://www.ecranlarge.com/feed'],
  ['AlloCiné', 'https://www.allocine.fr/rss/news.xml'],
  ['Pêche.com', 'https://www.peche.com/rss.php'],
  ['Reddit · r/FrancePirate', 'https://www.reddit.com/r/FrancePirate/new/.rss'],
  ['TorrentFreak', 'https://torrentfreak.com/feed/'],
  ['MediaKenny · Préinscriptions jeux', 'https://mediakenny.xyz/prereg_games.xml'],
  ['Nautiljon · Actualités', 'https://www.nautiljon.com/actualite/rss.php'],
  ['Nautiljon · Brèves', 'https://www.nautiljon.com/breves/rss.php'],
].map(([name, url]) => ({ name, url, active: true }));

export const defaultFeeds = [...originalFeeds, ...addedFeeds];

export function feedUrlKey(url: string) {
  const address = new URL(url);
  address.hash = '';
  address.pathname = address.pathname.replace(/\/$/, '');
  return address.href;
}

export function isFeed(value: unknown): value is Feed {
  return typeof value === 'object' && value !== null &&
    'name' in value && typeof value.name === 'string' && !!value.name.trim() &&
    'url' in value && typeof value.url === 'string' && webUrl(value.url) !== null &&
    'active' in value && typeof value.active === 'boolean';
}

export function parseFeed(xml: string, feed: Feed, base = feed.url): Article[] {
  const root = readFeedXml(xml, true);
  const channel = record(root.rss).channel;
  const atomFeed = root.feed ?? root['atom:feed'];
  const atom = atomFeed !== undefined;
  if (!atom && !channel) throw new Error('Format de flux inconnu');

  const container = record(atom ? atomFeed : channel);
  const containerBase = baseUrl(container, base);
  const articles = new Map<string, Article>();

  for (const value of values(atom ? container.entry ?? container['atom:entry'] : container.item)) {
    const entry = record(value);
    const title = plainText(entry.title ?? entry['atom:title']);
    if (!title) continue;

    const entryBase = baseUrl(entry, containerBase);
    const links = values(entry.link ?? entry['atom:link']).map(record);
    const alternate = links.find((link) =>
      link['@_href'] && (link['@_rel'] === undefined || link['@_rel'] === 'alternate'));
    const url = atom
      ? webUrl(text(alternate?.['@_href']), alternate ? baseUrl(alternate, entryBase) : entryBase)
      : webUrl(text(entry.link), entryBase) ??
        (record(entry.guid)['@_isPermaLink'] === 'false' ? null : webUrl(text(entry.guid)));
    if (!url || articles.has(url)) continue;

    const date = Date.parse(text(entry.published ?? entry.pubDate ?? entry['atom:published'] ??
      entry.updated ?? entry['atom:updated'] ?? entry['dc:date'] ?? entry.date));
    const description = entry.description ?? entry.summary ?? entry['atom:summary'];
    const content = [entry['content:encoded'], entry.content ?? entry['atom:content'], description]
      .map(text).find((html) => html.trim()) ?? '';
    const summary = plainText(description) || plainText(content);
    const media = [...values(entry['media:content']), ...values(entry['media:group'])
      .flatMap((group) => values(record(group)['media:content']))];
    const enclosures = [...values(entry.enclosure), ...links.filter((link) => link['@_rel'] === 'enclosure')];
    const image = findImage(media, entryBase, true) ?? findImage(enclosures, entryBase, false) ??
      firstHtmlImage(content, url) ?? firstHtmlImage(text(description), url);

    articles.set(url, { title, url, summary, content, image, timestamp: Number.isFinite(date) ? date : null, feed });
  }

  return [...articles.values()];
}

export async function fetchArticles(feed: Feed, signal: AbortSignal) {
  const document = await fetchFeedDocument(feed.url, signal);
  return parseFeed(document.body, feed, document.url);
}
