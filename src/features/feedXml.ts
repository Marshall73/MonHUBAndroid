import { XMLParser, XMLValidator } from 'fast-xml-parser';

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

export function record(value: unknown): Record<string, unknown> {
  return value !== null && typeof value === 'object' ? value as Record<string, unknown> : {};
}

export function text(value: unknown) {
  const contents = typeof value === 'string' ? value : record(value)['#text'];
  if (typeof contents !== 'string') return '';
  const cdata = contents.match(/^<!\[CDATA\[([\s\S]*)\]\]>$/);
  return cdata ? cdata[1] : decodeEntities(contents);
}

export function plainText(value: unknown) {
  const stripped = text(value)
    .replace(/<!--[^]*?-->/g, '')
    .replace(/<(script|style)\b[^>]*>[^]*?<\/\1\s*>/gi, '')
    .replace(/<\/?[a-z][^>]*>/gi, ' ');
  return decodeEntities(stripped).replace(/\s+/g, ' ').trim();
}

export function values(value: unknown): unknown[] {
  return Array.isArray(value) ? value : value === undefined ? [] : [value];
}

export function relativeDate(timestamp: number | null, now = Date.now()) {
  if (timestamp === null) return 'Date inconnue';
  const minutes = Math.max(0, Math.floor((now - timestamp) / 60000));
  if (minutes < 1) return 'À l’instant';
  if (minutes < 60) return `Il y a ${minutes} min`;
  if (minutes < 1440) return `Il y a ${Math.floor(minutes / 60)}h`;
  return `Il y a ${Math.floor(minutes / 1440)} j`;
}

export function readFeedXml(xml: string) {
  if (/<!DOCTYPE\b/i.test(xml) || XMLValidator.validate(xml) !== true) throw new Error('XML invalide');
  return record(parser.parse(xml));
}

export async function fetchFeedDocument(url: string, signal: AbortSignal) {
  const controller = new AbortController();
  const cancel = () => controller.abort();
  if (signal.aborted) cancel();
  signal.addEventListener('abort', cancel, { once: true });
  const timeout = setTimeout(cancel, 12000);

  try {
    const response = await fetch(url, { signal: controller.signal });
    if (!response.ok) throw new Error('Flux indisponible');
    const body = await response.text();
    if (controller.signal.aborted || body.length > 4_000_000) throw new Error('Flux indisponible');
    return { body, url: webUrl(response.url) ?? url };
  } finally {
    clearTimeout(timeout);
    signal.removeEventListener('abort', cancel);
  }
}
