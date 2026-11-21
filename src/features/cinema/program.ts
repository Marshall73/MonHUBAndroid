export const programUrl = 'https://raw.githubusercontent.com/Marshall73/MonHUBAndroid/main/data/cinema.json';
export const cinemaSiteUrl = 'https://lestoilesdulac.com';

export type Screening = {
  cinema: string;
  title: string;
  poster: string;
  times: string[];
  duration: string;
  genre: string;
  director: string;
  cast: string;
  synopsis: string;
  link: string;
};

type ProgramEntry = Pick<Screening, 'cinema' | 'title' | 'poster' | 'times'> &
  Partial<Record<'duration' | 'genre' | 'director' | 'cast' | 'synopsis' | 'link', unknown>>;

function optionalText(value: unknown) {
  return typeof value === 'string' ? value.trim() : '';
}

function webUrl(value: string, allowHttp = false) {
  try {
    const url = new URL(value);
    const allowedProtocol = url.protocol === 'https:' || (allowHttp && url.protocol === 'http:');
    return allowedProtocol && !url.username && !url.password ? url.href : '';
  } catch {
    return '';
  }
}

function isProgramEntry(value: unknown): value is ProgramEntry {
  return typeof value === 'object' && value !== null &&
    'cinema' in value && typeof value.cinema === 'string' && !!value.cinema.trim() &&
    'title' in value && typeof value.title === 'string' && !!value.title.trim() &&
    'poster' in value && typeof value.poster === 'string' &&
    'times' in value && Array.isArray(value.times) && value.times.every((time) => typeof time === 'string');
}

export function normalizeTitle(value: string) {
  return value.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase().trim();
}

export function screeningKey(item: Pick<Screening, 'cinema' | 'title'>) {
  return JSON.stringify([item.cinema, item.title]);
}

export async function fetchProgram(signal: AbortSignal): Promise<Screening[]> {
  const response = await fetch(programUrl, { signal, cache: 'no-store' }).catch(() => {
    throw new Error('Impossible de joindre le programme. Vérifiez votre connexion puis réessayez.');
  });
  if (!response.ok) throw new Error('Le programme est indisponible. Réessayez dans un instant.');

  const invalid = 'Le fichier de programmation est illisible. Réessayez dans un instant.';
  const data: unknown = await response.json().catch(() => { throw new Error(invalid); });
  if (!Array.isArray(data) || !data.every(isProgramEntry)) throw new Error(invalid);

  const films = new Map<string, Screening>();

  for (const item of data) {
    const cinema = item.cinema.trim();
    const title = item.title.trim();
    const key = screeningKey({ cinema, title });
    const existing = films.get(key);
    const times = new Set(existing?.times);

    for (const time of item.times) {
      const value = time.trim();
      if (/^(?:[01]?\d|2[0-3]):[0-5]\d$/.test(value)) times.add(value.padStart(5, '0'));
    }

    films.set(key, {
      cinema,
      title,
      poster: existing?.poster || webUrl(item.poster),
      times: [...times].sort(),
      duration: existing?.duration || optionalText(item.duration),
      genre: existing?.genre || optionalText(item.genre),
      director: existing?.director || optionalText(item.director),
      cast: existing?.cast || optionalText(item.cast),
      synopsis: existing?.synopsis || optionalText(item.synopsis),
      link: existing?.link || webUrl(optionalText(item.link), true),
    });
  }

  return [...films.values()];
}
