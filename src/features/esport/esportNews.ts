import { LIQUIPEDIA, type EsportTournament } from './games';

const API_URL = 'https://app-esportnews-production.up.railway.app/api/tournaments';

type EsportNewsTournament = {
  wiki?: unknown;
  name?: unknown;
  pagename?: unknown;
  tier?: unknown;
  begin_at?: unknown;
  end_at?: unknown;
  status?: unknown;
};

function calendarDay(value: unknown): string | undefined {
  if (typeof value !== 'string') return;
  const timestamp = Date.parse(value);
  if (Number.isFinite(timestamp)) return new Date(timestamp).toISOString().slice(0, 10);
}

export async function fetchEsportNewsSchedule(game: string, signal: AbortSignal): Promise<EsportTournament[]> {
  const query = '?game=' + encodeURIComponent(game);
  const calendars = await Promise.all(['', '/upcoming'].map(async (path) => {
    const response = await fetch(API_URL + path + query, { signal });
    if (!response.ok) throw new Error('Esport News est indisponible (' + response.status + ').');
    const data: unknown = await response.json();
    if (!Array.isArray(data)) throw new Error('Le calendrier Esport News est illisible.');
    return data as (EsportNewsTournament | null)[];
  }));

  const tournaments = new Map<string, EsportTournament>();
  for (const row of calendars.flat()) {
    if (row?.wiki !== 'counterstrike' || (row.status !== 'running' && row.status !== 'upcoming')) continue;
    if (row.tier !== 's' && row.tier !== 'a') continue;
    const title = typeof row.name === 'string' ? row.name.trim() : '';
    const path = typeof row.pagename === 'string' ? row.pagename.trim().split('/') : [];
    const start = calendarDay(row.begin_at);
    const end = calendarDay(row.end_at);
    if (!title || !path.length || path.some((part) => !part || part === '.' || part === '..') || !start || !end || start > end) {
      continue;
    }
    const url = LIQUIPEDIA + '/counterstrike/' + path.map(encodeURIComponent).join('/');
    tournaments.set(url, { title, url, start, end, tier: row.tier === 's' ? 'S' : 'A' });
  }
  return [...tournaments.values()].sort((a, b) => a.start.localeCompare(b.start));
}
