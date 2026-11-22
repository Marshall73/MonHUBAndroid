import AsyncStorage from '@react-native-async-storage/async-storage';

const directoryUrl = 'https://api.invidious.io/instances.json?sort_by=health';
const officialListUrl = 'https://raw.githubusercontent.com/iv-org/documentation/master/docs/instances.md';
const fallbackUris = ['https://nadeko.net', 'https://yewtu.be', 'https://nerdvpn.de'];
const cacheKey = 'invidious/instances-v1';
const cacheDuration = 60 * 60 * 1000;

type Cache = { expiresAt: number; uris: string[] };
let cache: Cache | undefined;
let pending: Promise<readonly string[]> | undefined;

function httpsOrigins(values: unknown[]): string[] {
  const origins = new Set<string>();
  for (const value of values) {
    if (typeof value !== 'string') continue;
    try {
      const url = new URL(value);
      if (url.protocol === 'https:' && !url.username && !url.password) origins.add(url.origin);
    } catch {
      // Ignore malformed entries in the directory or cache.
    }
  }
  return [...origins];
}

async function readDirectory<T>(url: string, read: (response: Response) => Promise<T>) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 3000);
  try {
    const response = await fetch(url, { signal: controller.signal });
    return response.ok ? await read(response) : null;
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

async function discoverInstances() {
  const data: unknown = await readDirectory(directoryUrl, (response) => response.json());
  const ranked = httpsOrigins(Array.isArray(data) ? data.map((entry) => entry?.[1]?.uri) : []);
  if (ranked.length) return ranked;

  const markdown = await readDirectory(officialListUrl, (response) => response.text());
  const publicList = markdown?.split(/^## List of public Invidious Instances[^\n]*\n/m)[1]?.split(/^#{2,3} /m)[0] ?? '';
  const listed = httpsOrigins(Array.from(publicList.matchAll(/^\* \[[^\]]+\]\((https:\/\/[^)]+)\)/gm), ([, uri]) => uri));

  const checks = await Promise.all(listed.map(async (uri) => {
    const start = Date.now();
    const stats = await readDirectory(`${uri}/api/v1/stats`, (response) => response.json());
    return { uri, time: stats?.software?.name === 'invidious' ? Date.now() - start : Infinity };
  }));
  return checks.sort((a, b) => a.time - b.time).map(({ uri }) => uri);
}

async function loadInstances(): Promise<readonly string[]> {
  try {
    const stored = await AsyncStorage.getItem(cacheKey);
    const parsed = stored ? JSON.parse(stored) : null;
    if (typeof parsed?.expiresAt === 'number' && parsed.expiresAt > Date.now() && Array.isArray(parsed.uris)) {
      const uris = httpsOrigins(parsed.uris);
      if (uris.length) {
        cache = { expiresAt: parsed.expiresAt, uris };
        return uris;
      }
    }
  } catch {
    // Discovery still works when local storage is unavailable.
  }

  const discovered = await discoverInstances();
  cache = { expiresAt: Date.now() + cacheDuration, uris: httpsOrigins([...discovered, ...fallbackUris]) };
  void AsyncStorage.setItem(cacheKey, JSON.stringify(cache)).catch(() => {});
  return cache.uris;
}

export function getInvidiousInstances(): Promise<readonly string[]> {
  if (cache && cache.expiresAt > Date.now()) return Promise.resolve(cache.uris);
  pending ??= loadInstances().finally(() => { pending = undefined; });
  return pending;
}
