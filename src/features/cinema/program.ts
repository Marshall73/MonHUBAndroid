export const programUrl = 'https://raw.githubusercontent.com/Marshall73/MonHUBAndroid/main/data/cinema.json';
export const bookingUrl = 'https://lestoilesdulac.com/horaires/';

export type Screening = {
  cinema: string;
  title: string;
  poster: string;
  times: string[];
};

function httpsPoster(value: string) {
  try {
    const url = new URL(value);
    return url.protocol === 'https:' && !url.username && !url.password ? url.href : '';
  } catch {
    return '';
  }
}

function isScreening(value: unknown): value is Screening {
  return typeof value === 'object' && value !== null &&
    'cinema' in value && typeof value.cinema === 'string' && !!value.cinema.trim() &&
    'title' in value && typeof value.title === 'string' && !!value.title.trim() &&
    'poster' in value && typeof value.poster === 'string' &&
    'times' in value && Array.isArray(value.times) && value.times.every((time) => typeof time === 'string');
}

export function normalizeTitle(value: string) {
  return value.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase().trim();
}

export function screeningKey(item: Screening) {
  return JSON.stringify([item.cinema, item.title]);
}

export async function fetchProgram(signal: AbortSignal): Promise<Screening[]> {
  const response = await fetch(programUrl, { signal, cache: 'no-store' }).catch(() => {
    throw new Error('Impossible de joindre le programme. Vérifiez votre connexion puis réessayez.');
  });
  if (!response.ok) throw new Error('Le programme est indisponible. Réessayez dans un instant.');

  const invalid = 'Le fichier de programmation est illisible. Réessayez dans un instant.';
  const data: unknown = await response.json().catch(() => { throw new Error(invalid); });
  if (!Array.isArray(data) || !data.every(isScreening)) throw new Error(invalid);

  const films = new Map<string, Screening>();

  for (const item of data) {
    const film = { cinema: item.cinema.trim(), title: item.title.trim(), poster: httpsPoster(item.poster), times: [] as string[] };
    const key = screeningKey(film);
    const existing = films.get(key);

    for (const time of item.times) {
      const value = time.trim();
      if (/^(?:[01]?\d|2[0-3]):[0-5]\d$/.test(value)) film.times.push(value.padStart(5, '0'));
    }

    film.poster = existing?.poster || film.poster;
    film.times = [...new Set([...(existing?.times ?? []), ...film.times])].sort();
    films.set(key, film);
  }

  return [...films.values()];
}
