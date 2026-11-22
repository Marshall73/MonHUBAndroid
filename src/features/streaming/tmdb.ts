import { isYouTubeVideoId } from '../../shared/services/youtube';

export const tmdbKey = process.env.EXPO_PUBLIC_TMDB_API_KEY?.trim();

export const mediaTypes = [
  { value: 'movie', label: 'Films' },
  { value: 'tv', label: 'Séries' },
] as const;

export const periods = [
  { days: 7, label: '7 jours', votes: { movie: 2, tv: 1 } },
  { days: 14, label: '14 jours', votes: { movie: 5, tv: 3 } },
  { days: 30, label: '30 jours', votes: { movie: 10, tv: 5 } },
  { days: null, label: 'Top Populaire' },
] as const;

export const platforms = [
  { id: '8|119|337|381|350', label: 'Toutes', background: 'bg-blue-500/15', text: 'text-blue-200' },
  { id: '8', label: 'Netflix', background: 'bg-red-500/15', text: 'text-red-200' },
  { id: '119', label: 'Prime Video', background: 'bg-sky-500/15', text: 'text-sky-200' },
  { id: '337', label: 'Disney+', background: 'bg-indigo-500/20', text: 'text-indigo-200' },
  { id: '381', label: 'Canal+', background: 'bg-amber-500/15', text: 'text-amber-200' },
  { id: '350', label: 'Apple TV+', background: 'bg-emerald-500/15', text: 'text-emerald-200' },
] as const;

export type MediaType = (typeof mediaTypes)[number]['value'];
export type Period = (typeof periods)[number];
export type Platform = (typeof platforms)[number];
export type Media = {
  id: number;
  title: string;
  year: string;
  rating: number | null;
  poster: string;
  overview: string;
  genreIds: number[];
};

export type MediaDetails = {
  duration: string;
  creators: string;
  cast: string;
  overview: string;
  trailerVideoId: string | null;
};

const invalidResponse = 'TMDB a renvoyé une réponse inattendue. Réessayez.';

function record(value: unknown): Record<string, unknown> {
  return typeof value === 'object' && value !== null ? value as Record<string, unknown> : {};
}

function readMedia(value: unknown, type: MediaType): Media | null {
  const item = record(value);
  const title = type === 'movie' ? item.title : item.name;
  if (typeof item.id !== 'number' || !Number.isSafeInteger(item.id) || item.id <= 0 ||
      typeof title !== 'string' || !title.trim()) return null;

  const date = type === 'movie' ? item.release_date : item.first_air_date;
  return {
    id: item.id,
    title: title.trim(),
    year: typeof date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(date) ? date.slice(0, 4) : '',
    rating: typeof item.vote_average === 'number' && item.vote_average >= 0 && item.vote_average <= 10
      ? item.vote_average : null,
    poster: typeof item.poster_path === 'string' && /^\/[\w-]+\.(jpe?g|png|webp)$/i.test(item.poster_path)
      ? `https://image.tmdb.org/t/p/w500${item.poster_path}` : '',
    overview: typeof item.overview === 'string' ? item.overview.trim() : '',
    genreIds: Array.isArray(item.genre_ids) ? item.genre_ids.filter((id) => Number.isSafeInteger(id)) : [],
  };
}

export function mediaUrl(type: MediaType, id: number) {
  return `https://www.themoviedb.org/${type}/${id}?language=fr-FR`;
}

const frenchDay = new Intl.DateTimeFormat('fr-FR', {
  timeZone: 'Europe/Paris',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});

export async function fetchCatalog(
  key: string,
  type: MediaType,
  platform: Platform,
  period: Period,
  page: number,
  signal: AbortSignal,
  asOf = new Date(),
) {
  const url = new URL(`https://api.themoviedb.org/3/discover/${type}`);
  url.searchParams.set('watch_region', 'FR');
  url.searchParams.set('with_watch_monetization_types', 'flatrate');
  url.searchParams.set('with_watch_providers', platform.id);
  url.searchParams.set('sort_by', 'popularity.desc');
  url.searchParams.set('page', String(page));

  if (period.days !== null) {
    const { year, month, day } = Object.fromEntries(
      frenchDay.formatToParts(asOf).map(({ type, value }) => [type, value]),
    );
    const today = `${year}-${month}-${day}`;
    const start = new Date(`${today}T00:00:00Z`);
    start.setUTCDate(start.getUTCDate() - period.days);

    const dateField = type === 'movie' ? 'primary_release_date' : 'first_air_date';
    url.searchParams.set(`${dateField}.gte`, start.toISOString().slice(0, 10));
    url.searchParams.set(`${dateField}.lte`, today);
    url.searchParams.set('vote_count.gte', String(period.votes[type]));
  }

  const data = record(await requestTmdb(url, key, signal));
  if (!Array.isArray(data.results) || typeof data.total_pages !== 'number' ||
      !Number.isSafeInteger(data.total_pages) || data.total_pages < 0) throw new Error(invalidResponse);

  const items = data.results.map((item) => readMedia(item, type)).filter((item): item is Media => item !== null);
  if (data.results.length && !items.length) throw new Error(invalidResponse);
  return { items, page, totalPages: Math.min(data.total_pages, 500) };
}

async function requestTmdb(url: URL, key: string, signal: AbortSignal): Promise<unknown> {
  url.searchParams.set('language', 'fr-FR');
  const headers: Record<string, string> = { Accept: 'application/json' };
  if (key.includes('.')) headers.Authorization = `Bearer ${key}`;
  else url.searchParams.set('api_key', key);

  const response = await fetch(url.href, { headers, signal }).catch(() => {
    throw new Error('Connexion à TMDB impossible. Vérifiez votre connexion puis réessayez.');
  });
  if (response.status === 401 || response.status === 403) {
    throw new Error('TMDB a refusé la clé. Vérifiez EXPO_PUBLIC_TMDB_API_KEY dans .env puis redémarrez Expo.');
  }
  if (response.status === 429) throw new Error('TMDB limite les requêtes. Réessayez dans un instant.');
  if (!response.ok) throw new Error('TMDB est temporairement indisponible. Réessayez dans un instant.');

  return response.json().catch(() => { throw new Error(invalidResponse); });
}

export async function fetchGenres(key: string, type: MediaType, signal: AbortSignal) {
  const url = new URL(`https://api.themoviedb.org/3/genre/${type}/list`);
  const { genres } = record(await requestTmdb(url, key, signal));
  if (!Array.isArray(genres)) throw new Error(invalidResponse);

  const names = new Map<number, string>();
  for (const value of genres) {
    const { id, name } = record(value);
    if (typeof id === 'number' && Number.isSafeInteger(id) && typeof name === 'string' && name.trim()) {
      names.set(id, name.trim());
    }
  }
  if (genres.length && !names.size) throw new Error(invalidResponse);
  return names;
}

function formatRuntime(value: unknown) {
  if (typeof value !== 'number' || !Number.isSafeInteger(value) || value <= 0) return '';
  const hours = Math.floor(value / 60);
  const minutes = value % 60;
  return [hours ? `${hours}h` : '', minutes ? `${minutes}min` : ''].filter(Boolean).join(' ');
}

function formatCount(value: unknown, label: string) {
  if (typeof value !== 'number' || !Number.isSafeInteger(value) || value < 0) return '';
  return `${value} ${label}${value === 1 ? '' : 's'}`;
}

function personNames(people: Record<string, unknown>[]) {
  const names = people.map(({ name }) => typeof name === 'string' ? name.trim() : '').filter(Boolean);
  return [...new Set(names)].join(', ');
}

export async function fetchMediaDetails(key: string, type: MediaType, id: number, signal: AbortSignal): Promise<MediaDetails> {
  const url = new URL(`https://api.themoviedb.org/3/${type}/${id}`);
  url.searchParams.set('append_to_response', 'credits,videos');
  const data = record(await requestTmdb(url, key, signal));
  if (data.id !== id) throw new Error(invalidResponse);

  const { cast, crew } = record(data.credits);
  const creators = type === 'movie'
    ? (Array.isArray(crew) ? crew.map(record).filter(({ job }) => job === 'Director') : [])
    : (Array.isArray(data.created_by) ? data.created_by.map(record) : []);
  const duration = type === 'movie' ? formatRuntime(data.runtime) : [
    formatCount(data.number_of_seasons, 'saison'),
    formatCount(data.number_of_episodes, 'épisode'),
  ].filter(Boolean).join(' • ');

  return {
    duration,
    creators: personNames(creators),
    cast: personNames(Array.isArray(cast) ? cast.slice(0, 5).map(record) : []),
    overview: typeof data.overview === 'string' ? data.overview.trim() : '',
    trailerVideoId: readTrailerVideoId(data.videos),
  };
}

function readTrailerVideoId(value: unknown): string | null {
  const { results } = record(value);
  if (!Array.isArray(results)) return null;
  const videos = results.map(record).filter((video) =>
    video.site === 'YouTube' && video.type === 'Trailer' && isYouTubeVideoId(video.key),
  );
  const trailer = videos.find((video) => video.official === true) ?? videos[0];
  return isYouTubeVideoId(trailer?.key) ? trailer.key : null;
}

export async function fetchMovieTrailer(key: string, title: string, signal: AbortSignal): Promise<string | null> {
  const url = new URL('https://api.themoviedb.org/3/search/movie');
  url.searchParams.set('query', title);
  const { results } = record(await requestTmdb(url, key, signal));
  if (!Array.isArray(results)) throw new Error(invalidResponse);
  const normalize = (value: string) => value.normalize('NFC').trim().toLocaleLowerCase('fr-FR');
  const target = normalize(title);
  const candidates = results.map(record).filter((movie) =>
    [movie.title, movie.original_title].some((name) => typeof name === 'string' && normalize(name) === target),
  );
  const id = candidates.length === 1 ? candidates[0].id : undefined;
  if (typeof id !== 'number' || !Number.isSafeInteger(id) || id <= 0) return null;
  const videosUrl = new URL(`https://api.themoviedb.org/3/movie/${id}/videos`);
  return readTrailerVideoId(await requestTmdb(videosUrl, key, signal));
}
