export const periods = [
  { value: 'today', label: 'Aujourd’hui' },
  { value: 'week', label: 'Cette semaine' },
  { value: 'month', label: 'Ce mois' },
] as const;

export const languages = ['Tous', 'TypeScript', 'Python', 'Rust', 'Kotlin'] as const;

export type Period = (typeof periods)[number]['value'];
export type Language = (typeof languages)[number];

export type Repository = {
  id: number;
  name: string;
  owner: { login: string };
  description: string | null;
  language: string | null;
  stargazers_count: number;
  html_url: string;
};

function isRepository(value: unknown): value is Repository {
  return (
    typeof value === 'object' && value !== null &&
    'id' in value && Number.isSafeInteger(value.id) &&
    'name' in value && typeof value.name === 'string' &&
    'owner' in value && typeof value.owner === 'object' && value.owner !== null &&
    'login' in value.owner && typeof value.owner.login === 'string' &&
    'description' in value && (value.description === null || typeof value.description === 'string') &&
    'language' in value && (value.language === null || typeof value.language === 'string') &&
    'stargazers_count' in value && typeof value.stargazers_count === 'number' &&
    Number.isSafeInteger(value.stargazers_count) && value.stargazers_count >= 0 &&
    'html_url' in value && typeof value.html_url === 'string' &&
    /^https:\/\/github\.com\/[\w-]+\/(?!\.{1,2}$)[\w.-]+$/.test(value.html_url) &&
    !/\s/.test(value.html_url)
  );
}

export async function fetchRepositories(
  period: Period,
  language: Language,
  signal: AbortSignal,
  now = new Date(),
): Promise<Repository[]> {
  const start = new Date(now);
  if (period === 'week') {
    start.setTime(start.getTime() - 7 * 24 * 60 * 60 * 1000);
  } else {
    if (period === 'month') start.setDate(1);
    start.setHours(0, 0, 0, 0);
  }

  const timestamp = start.toISOString().replace(/\.\d{3}Z$/, 'Z');
  const query = `created:>=${timestamp}${language === 'Tous' ? '' : ` language:${language}`}`;
  // shortcut: les 30 premiers dépôts suffisent au classement initial, ajouter la pagination si nécessaire.
  const url = `https://api.github.com/search/repositories?q=${encodeURIComponent(query)}&sort=stars&order=desc&per_page=30`;
  const response = await fetch(url, {
    headers: { Accept: 'application/vnd.github+json' },
    signal,
  }).catch(() => {
    throw new Error('Connexion à GitHub impossible. Vérifiez votre connexion puis réessayez.');
  });

  if (response.status === 429 || (response.status === 403 && response.headers.get('x-ratelimit-remaining') === '0')) {
    throw new Error('Limite de recherches GitHub atteinte. Réessayez dans un instant.');
  }
  if (!response.ok) throw new Error('GitHub ne répond pas à la recherche. Réessayez dans un instant.');

  const data: unknown = await response.json();
  if (typeof data !== 'object' || data === null || !('items' in data) ||
      !Array.isArray(data.items) || !data.items.every(isRepository)) {
    throw new Error('GitHub a renvoyé une réponse inattendue. Réessayez.');
  }
  return data.items;
}
