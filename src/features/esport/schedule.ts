import AsyncStorage from '@react-native-async-storage/async-storage';
import { fetchEsportNewsSchedule } from './esportNews';
import { LIQUIPEDIA, type EsportGame, type EsportTournament } from './games';
import { parseLiquipediaSchedule } from './liquipediaSchedule';

type CalendarSource = 'esportNews' | 'liquipedia';

type Schedule = {
  tournaments: EsportTournament[];
  fetchedAt: number;
  source?: CalendarSource;
};

type GameScheduleState = {
  cache?: Schedule;
  inFlight?: Promise<Schedule>;
  lastRequest: number;
};

const CACHE_DURATION = 30 * 60 * 1000;
const MIN_REQUEST_INTERVAL = 30_000;
const gameSchedules = new Map<EsportGame['id'], GameScheduleState>();

async function fetchLiquipediaSchedule(game: EsportGame, signal: AbortSignal): Promise<EsportTournament[]> {
  const calendarWikitext = game.tierPages.map((page, index) =>
    '<span id="monhub-tier-' + (index + 1) + '"></span>\n{{:' + page + '}}',
  ).join('\n');
  const query =
    '?action=parse&format=json&formatversion=2&prop=text&title=Portal%3ATournaments&text=' +
    encodeURIComponent(calendarWikitext);
  const response = await fetch(LIQUIPEDIA + '/' + game.id + '/api.php' + query, {
    headers: { 'User-Agent': 'MonHUBAndroid/1.0 (https://github.com/Marshall73/MonHUBAndroid)' },
    signal,
  });
  if (!response.ok) throw new Error('Liquipedia est indisponible (' + response.status + ').');

  const result: { parse?: { text?: string } } = await response.json();
  if (typeof result.parse?.text !== 'string') {
    throw new Error('Liquipedia n’a pas renvoyé le calendrier.');
  }
  return parseLiquipediaSchedule(result.parse.text, game);
}

async function fetchWithTimeout(fetchTournaments: (signal: AbortSignal) => Promise<EsportTournament[]>) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15_000);

  try {
    return await fetchTournaments(controller.signal);
  } finally {
    clearTimeout(timeout);
    controller.abort();
  }
}

async function fetchFromSource(game: EsportGame): Promise<Schedule> {
  if ('esportNewsGame' in game) {
    try {
      const tournaments = await fetchWithTimeout((signal) => fetchEsportNewsSchedule(game, signal));
      return { tournaments, fetchedAt: Date.now(), source: 'esportNews' };
    } catch {
      // Les deux calendriers Liquipedia prennent le relais en cas d’échec.
    }
  }
  const tournaments = await fetchWithTimeout((signal) => fetchLiquipediaSchedule(game, signal));
  return { tournaments, fetchedAt: Date.now(), source: 'liquipedia' };
}

async function fetchSchedule(game: EsportGame, state: GameScheduleState, refresh: boolean): Promise<Schedule> {
  // Les clés restent stables pour conserver les calendriers enregistrés.
  const cacheKey = 'esport:' + game.id + ':' + (game.id === 'counterstrike' ? 'schedule' : 'liquipedia') + ':v1';
  if (!state.cache) {
    const stored = await AsyncStorage.getItem(cacheKey).catch(() => null);
    try {
      const cached: Schedule | null = stored ? JSON.parse(stored) : null;
      if (Array.isArray(cached?.tournaments) && Number.isFinite(cached.fetchedAt)) {
        state.cache = { ...cached, source: cached.source ?? 'liquipedia' };
      }
    } catch {
      // Le prochain chargement remplace le cache illisible.
    }
  }

  const now = Date.now();
  if (state.cache && !refresh && now - state.cache.fetchedAt < CACHE_DURATION) return state.cache;
  if (now - state.lastRequest < MIN_REQUEST_INTERVAL) {
    if (state.cache && state.cache.fetchedAt >= state.lastRequest) return state.cache;
    throw new Error('Patientez quelques secondes avant de réessayer.');
  }

  state.lastRequest = now;
  const schedule = await fetchFromSource(game);
  state.cache = schedule;
  await AsyncStorage.setItem(cacheKey, JSON.stringify(schedule)).catch(() => undefined);
  return schedule;
}

export async function loadEsportSchedule(game: EsportGame, refresh = false) {
  const state = gameSchedules.get(game.id) ?? { lastRequest: 0 };
  gameSchedules.set(game.id, state);
  let error: string | null = null;

  try {
    state.inFlight ??= fetchSchedule(game, state, refresh).finally(() => {
      state.inFlight = undefined;
    });
    await state.inFlight;
  } catch (cause) {
    error = cause instanceof Error && cause.name !== 'AbortError' && !(cause instanceof TypeError)
      ? cause.message
      : 'Le calendrier est temporairement indisponible.';
  }

  return {
    tournaments: state.cache?.tournaments ?? [],
    source: state.cache?.source ?? ('esportNewsGame' in game ? 'esportNews' : 'liquipedia'),
    error,
  };
}
