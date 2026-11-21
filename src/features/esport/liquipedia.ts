import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  LIQUIPEDIA_ROCKET_LEAGUE,
  parseLiquipediaSchedule,
  type EsportTournament,
} from './liquipediaSchedule';

type Schedule = {
  tournaments: EsportTournament[];
  fetchedAt: number;
};

const CACHE_KEY = 'esport:rocketleague:liquipedia:v1';
const CACHE_DURATION = 30 * 60 * 1000;
const MIN_REQUEST_INTERVAL = 30_000;
const calendarWikitext = [
  '<span id="monhub-tier-s"></span>',
  '{{:S-Tier Tournaments}}',
  '<span id="monhub-tier-a"></span>',
  '{{:A-Tier Tournaments}}',
].join('\n');

let cache: Schedule | undefined;
let inFlight: Promise<Schedule> | undefined;
let lastRequest = 0;

async function fetchSchedule(refresh: boolean): Promise<Schedule> {
  if (!cache) {
    const stored = await AsyncStorage.getItem(CACHE_KEY).catch(() => null);
    try {
      cache = stored ? JSON.parse(stored) as Schedule : undefined;
    } catch {
      // A damaged cache can be replaced by the next request.
    }
  }

  const now = Date.now();
  if (cache && !refresh && now - cache.fetchedAt < CACHE_DURATION) return cache;
  if (now - lastRequest < MIN_REQUEST_INTERVAL) {
    if (cache && cache.fetchedAt >= lastRequest) return cache;
    throw new Error('Patientez quelques secondes avant de réessayer.');
  }

  lastRequest = now;
  const query =
    '?action=parse&format=json&formatversion=2&prop=text&title=Portal%3ATournaments&text=' +
    encodeURIComponent(calendarWikitext);
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15_000);

  try {
    const response = await fetch(LIQUIPEDIA_ROCKET_LEAGUE + '/api.php' + query, {
      headers: { 'User-Agent': 'MonHUBAndroid/1.0 (https://github.com/Marshall73/MonHUBAndroid)' },
      signal: controller.signal,
    });
    if (!response.ok) throw new Error('Liquipedia est indisponible (' + response.status + ').');

    const result: { parse?: { text?: string } } = await response.json();
    if (typeof result.parse?.text !== 'string') {
      throw new Error('Liquipedia n’a pas renvoyé le calendrier.');
    }
    cache = {
      tournaments: parseLiquipediaSchedule(result.parse.text),
      fetchedAt: Date.now(),
    };
    await AsyncStorage.setItem(CACHE_KEY, JSON.stringify(cache)).catch(() => undefined);
    return cache;
  } finally {
    clearTimeout(timeout);
  }
}

export async function loadRocketLeagueSchedule(refresh = false) {
  try {
    inFlight ??= fetchSchedule(refresh).finally(() => {
      inFlight = undefined;
    });
    const schedule = await inFlight;
    return { tournaments: schedule.tournaments, error: null };
  } catch (error) {
    return {
      tournaments: cache?.tournaments ?? [],
      error: error instanceof Error && error.name !== 'AbortError' && !(error instanceof TypeError)
        ? error.message
        : 'Le calendrier Liquipedia est temporairement indisponible.',
    };
  }
}
