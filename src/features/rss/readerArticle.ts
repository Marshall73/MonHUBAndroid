import { Readability } from '@mozilla/readability';
import { parseHTML } from 'linkedom/worker';

import { webUrl } from '../feedXml';
import type { Article } from './feeds';

type ReaderBlock = { kind: 'paragraph' | 'heading' | 'quote' | 'list'; text: string };
export type ReaderArticle = { blocks: ReaderBlock[]; image: string | null };

const skippedTags = new Set(['aside', 'footer', 'form', 'header', 'nav', 'noscript', 'script', 'style', 'svg', 'template']);
const blockTags = new Set(['article', 'blockquote', 'div', 'figcaption', 'figure', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
  'hr', 'li', 'main', 'ol', 'p', 'pre', 'section', 'table', 'tr', 'ul']);

function readBlocks(root: Node): ReaderBlock[] {
  const blocks: ReaderBlock[] = [];
  let buffer = '';
  let kind: ReaderBlock['kind'] = 'paragraph';

  function flush() {
    const text = buffer.replace(/\s+/g, ' ').trim();
    if (text) blocks.push({ kind, text });
    buffer = '';
  }

  function visit(node: Node) {
    if (node.nodeType === 3) {
      buffer += node.textContent ?? '';
      return;
    }
    if (node.nodeType !== 1) return;

    const tag = (node as Element).localName.toLowerCase();
    if (skippedTags.has(tag)) return;
    const boundary = blockTags.has(tag) || tag === 'br';
    const previousKind = kind;
    if (boundary) flush();
    if (/^h[1-6]$/.test(tag)) kind = 'heading';
    else if (tag === 'li') kind = 'list';
    else if (tag === 'blockquote') kind = 'quote';

    for (const child of Array.from(node.childNodes)) visit(child);
    if (boundary) flush();
    kind = previousKind;
  }

  for (const child of Array.from(root.childNodes)) visit(child);
  flush();
  return blocks;
}

export function readFeedArticle(article: Article): ReaderArticle | null {
  if (article.content.length <= 600) return null;
  try {
    const { document } = parseHTML('<html><body></body></html>');
    document.body.innerHTML = article.content;
    const blocks = readBlocks(document.body);
    const length = blocks.map((block) => block.text).join(' ').length;
    return length > 600 ? { blocks, image: article.image } : null;
  } catch {
    return null;
  }
}

export function extractReaderArticle(html: string, url: string): ReaderArticle | null {
  const { document } = parseHTML(html);
  if (document.title === 'Client Challenge' && !document.querySelector('article')) return null;

  const articleBase = document.createElement('base');
  const existingBase = document.querySelector('base[href]');
  const base = webUrl(existingBase?.getAttribute('href') ?? '', url) ?? url;
  articleBase.setAttribute('href', base);
  document.head.prepend(articleBase);

  const previewImage = webUrl(
    document.querySelector('meta[property="og:image"], meta[name="twitter:image"]')?.getAttribute('content') ?? '',
    base,
  );
  const article = new Readability<Node>(document, {
    maxElemsToParse: 20_000,
    serializer: (node) => node,
  }).parse();
  if (!article?.content) return null;
  const blocks = readBlocks(article.content);
  if (blocks.length === 0) return null;

  const image = Array.from((article.content as Element).querySelectorAll('img'))
    .map((img) => webUrl(img.getAttribute('src') ?? '', base) ?? webUrl(img.getAttribute('data-src') ?? '', base))
    .find(Boolean);
  return { blocks, image: previewImage ?? image ?? null };
}

export async function fetchReaderArticle(article: Article, signal: AbortSignal): Promise<ReaderArticle> {
  const response = await fetch(article.url, { signal, headers: { Accept: 'text/html,application/xhtml+xml' } });
  if (!response.ok) throw new Error('Page indisponible');
  const html = await response.text();
  if (signal.aborted || html.length > 4_000_000) throw new Error('Page illisible');
  const extracted = extractReaderArticle(html, webUrl(response.url) ?? article.url);
  if (!extracted) throw new Error('Article introuvable dans la page');
  return { ...extracted, image: article.image ?? extracted.image };
}
