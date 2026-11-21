import { matchesSport, searchable, type Sport } from './filters';

const baseUrl = 'https://nuviosports.xyz/eyJ0aW1lem9uZSI6IkV1cm9wZS9QYXJpcyIsImxhbmd1YWdlcyI6IkZyZW5jaCIsInNwb3J0cyI6ImZvb3RiYWxsLG1vdG9yc3BvcnQscnVnYnksbW1hLHRlbm5pcyJ9';

export const statuses = [
  { id: 'live', catalog: 'nuvio_sports_live', label: 'En Direct' },
  { id: 'upcoming', catalog: 'nuvio_sports_upcoming', label: 'À Venir' },
  { id: 'channels', catalog: 'nuvio_sports_networks', label: 'Chaînes TV' },
] as const;

export type Status = (typeof statuses)[number];
export type SportEvent = {
  id: string;
  name: string;
  poster: string;
  description: string;
  releaseInfo: string;
  genres: string[];
};

const invalidResponse = 'Nuvio Sports a renvoyé une réponse inattendue. Réessayez.';
const limit = 100;

function record(value: unknown): Record<string, unknown> {
  return typeof value === 'object' && value !== null ? value as Record<string, unknown> : {};
}

function text(value: unknown) {
  return typeof value === 'string' ? value.trim() : '';
}

async function fetchSports(path: string, signal: AbortSignal) {
  const controller = new AbortController();
  const cancel = () => controller.abort();
  if (signal.aborted) cancel();
  signal.addEventListener('abort', cancel, { once: true });

  let timedOut = false;
  const timeout = setTimeout(() => {
    timedOut = true;
    cancel();
  }, 15000);
  try {
    const response = await fetch(`${baseUrl}/${path}`, {
      headers: { Accept: 'application/json' },
      signal: controller.signal,
    }).catch(() => { throw new Error('Connexion à Nuvio Sports impossible. Vérifiez votre connexion.'); });
    if (!response.ok) throw new Error('Nuvio Sports est temporairement indisponible.');
    return record(await response.json().catch(() => { throw new Error(invalidResponse); }));
  } catch (error) {
    if (timedOut) throw new Error('Nuvio Sports met trop de temps à répondre.');
    throw error;
  } finally {
    clearTimeout(timeout);
    signal.removeEventListener('abort', cancel);
  }
}

export async function fetchCatalog(status: Status, sport: Sport, skip: number, signal: AbortSignal) {
  const channels = status.id === 'channels';
  const genre = !channels && sport.genre !== 'Olympics' ? sport.genre : '';
  const extra = channels && skip > 0 ? `/skip=${skip}` : genre ? `/genre=${encodeURIComponent(genre)}` : '';
  const data = await fetchSports(`catalog/tv/${status.catalog}${extra}.json`, signal);
  if (!Array.isArray(data.metas)) throw new Error(invalidResponse);

  const events = new Map<string, SportEvent>();
  for (const value of data.metas) {
    const item = record(value);
    const id = text(item.id);
    const name = text(item.name);
    if (!id || !name || events.has(id)) continue;
    const poster = text(item.poster);
    events.set(id, {
      id,
      name,
      poster: /^https:\/\/[^\s]+$/i.test(poster) ? poster : '',
      description: text(item.description),
      releaseInfo: text(item.releaseInfo),
      genres: Array.isArray(item.genres) ? item.genres.map(text).filter(Boolean) : [],
    });
  }
  if (data.metas.length && !events.size) throw new Error(invalidResponse);
  return {
    events: [...events.values()],
    nextSkip: channels && data.metas.length >= limit ? skip + data.metas.length : null,
  };
}

export function filterEvents(events: SportEvent[], sport: Sport, search: string) {
  const query = searchable(search.trim());
  return events.filter((event) => {
    const content = searchable(`${event.name}\n${event.description}\n${event.genres.join(' ')}`);
    const matchesSearch = !query || content.includes(query) ||
      (query === 'psg' && /paris[ -]saint[ -]germain/.test(content));
    return matchesSport(sport, ...event.genres, event.name, event.description) && matchesSearch;
  });
}

export function displayRelease(value: string) {
  if (value.toUpperCase() === 'LIVE') return 'En direct';
  const match = value.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)\s*\(Europe\/Paris\)$/i);
  if (!match) return value;
  const [, hour, minute, half] = match;
  const hours = Number(hour) % 12 + (half.toUpperCase() === 'PM' ? 12 : 0);
  return `${String(hours).padStart(2, '0')}:${minute}`;
}

function broadcasterLabel(value: unknown) {
  const { name, title, description } = record(value);
  const label = text(name);
  if (/^(?:tip|note):|support us|donation|donate|faire un don/i.test(label)) return '';

  const lines = `${text(title)}\n${text(description)}`.split(/\r?\n/);
  for (const line of lines) {
    const marker = line.lastIndexOf('📺');
    if (marker < 0) continue;
    const channel = line.slice(marker + '📺'.length).split(/\s+\|\s+/).at(-1)?.trim();
    if (channel && !/^(?:quality|qualité)\s*:/i.test(channel)) {
      return channel.replace(/\s*\[[^\]]+\]$/, '').replace(/\p{Regional_Indicator}/gu, '').trim();
    }
  }

  const named = label.replace(/^⚡\s*/, '');
  if (named && !/^(?:direct stream|stream|live|embed)(?:\s*\d+)?$/i.test(named)) return named;
  const firstLine = lines.find((line) => line.trim());
  return firstLine && !/^(?:direct stream|quality|qualité)\b/i.test(firstLine) ? firstLine.trim() : '';
}

export async function fetchBroadcasters(id: string, signal: AbortSignal) {
  const data = await fetchSports(`stream/tv/${encodeURIComponent(id)}.json`, signal);
  if (!Array.isArray(data.streams)) throw new Error(invalidResponse);

  const names = new Map<string, string>();
  for (const entry of data.streams) {
    const name = broadcasterLabel(entry);
    const key = name.toLocaleLowerCase('fr-FR');
    if (name && !names.has(key)) names.set(key, name);
  }
  return [...names.values()];
}
