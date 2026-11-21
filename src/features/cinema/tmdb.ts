export const tmdbKey = process.env.EXPO_PUBLIC_TMDB_API_KEY?.trim();

export type Movie = {
  id: number;
  title: string;
  originalTitle: string;
  posterUrl: string | null;
  rating: number | null;
  releaseDate: string;
  synopsis: string;
};

function readMovie(value: unknown): Movie | null {
  if (typeof value !== 'object' || value === null) return null;
  const item = value as Record<string, unknown>;
  if (typeof item.id !== 'number' || !Number.isSafeInteger(item.id) ||
      typeof item.title !== 'string' || !item.title.trim()) return null;

  const poster = typeof item.poster_path === 'string' && /^\/[\w-]+\.(jpe?g|png|webp)$/i.test(item.poster_path)
    ? `https://image.tmdb.org/t/p/w342${item.poster_path}` : null;
  const rating = typeof item.vote_average === 'number' && item.vote_average >= 0 &&
    item.vote_average <= 10 && item.vote_count !== 0 ? item.vote_average : null;

  return {
    id: item.id,
    title: item.title,
    originalTitle: typeof item.original_title === 'string' ? item.original_title : item.title,
    posterUrl: poster,
    rating,
    releaseDate: typeof item.release_date === 'string' ? item.release_date : '',
    synopsis: typeof item.overview === 'string' ? item.overview.trim() : '',
  };
}

async function fetchPage(key: string, page: number, signal: AbortSignal) {
  const endpoint = new URL('https://api.themoviedb.org/3/movie/now_playing?language=fr-FR&region=FR');
  const headers: Record<string, string> = { Accept: 'application/json' };
  endpoint.searchParams.set('page', String(page));

  if (key.includes('.')) headers.Authorization = `Bearer ${key}`;
  else endpoint.searchParams.set('api_key', key);

  let response: Response;
  try {
    response = await fetch(endpoint.href, { headers, signal });
  } catch {
    throw new Error('Connexion à TMDB impossible. Vérifiez votre connexion puis réessayez.');
  }
  if (response.status === 401 || response.status === 403) {
    throw new Error('TMDB a refusé la clé. Vérifiez EXPO_PUBLIC_TMDB_API_KEY dans .env et redémarrez Expo.');
  }
  if (!response.ok) throw new Error('TMDB est temporairement indisponible. Réessayez dans un instant.');

  const invalidResponse = 'TMDB a renvoyé une réponse inattendue. Réessayez.';
  const data: unknown = await response.json().catch(() => { throw new Error(invalidResponse); });
  if (typeof data !== 'object' || data === null ||
      !('results' in data) || !Array.isArray(data.results) ||
      !('total_pages' in data) || typeof data.total_pages !== 'number' ||
      !Number.isSafeInteger(data.total_pages) || data.total_pages < 0) {
    throw new Error(invalidResponse);
  }

  const movies = data.results.map(readMovie).filter((movie): movie is Movie => movie !== null);
  if (data.results.length > 0 && movies.length === 0) throw new Error(invalidResponse);
  return { movies, totalPages: Math.min(data.total_pages, 500) };
}

export async function fetchNowPlaying(key: string, signal: AbortSignal) {
  const first = await fetchPage(key, 1, signal);
  const byId = new Map(first.movies.map((movie) => [movie.id, movie]));

  for (let page = 2; page <= first.totalPages; page += 4) {
    const results = await Promise.all(Array.from(
      { length: Math.min(4, first.totalPages - page + 1) },
      (_, index) => fetchPage(key, page + index, signal),
    ));

    for (const result of results) {
      for (const movie of result.movies) {
        if (!byId.has(movie.id)) byId.set(movie.id, movie);
      }
    }
  }

  return [...byId.values()];
}

export function searchable(value: string) {
  return value.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase().trim();
}

export function showtimesUrl(title: string, cinema: string) {
  const query = encodeURIComponent(`séances ${title} ${cinema}`);
  return `https://www.google.com/search?q=${query}`;
}
