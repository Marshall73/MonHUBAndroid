import { parseHTML } from 'linkedom/worker';

export const periods = [
  { value: 'daily', label: 'Aujourd’hui', starsLabel: 'aujourd’hui' },
  { value: 'weekly', label: 'Cette semaine', starsLabel: 'cette semaine' },
  { value: 'monthly', label: 'Ce mois', starsLabel: 'ce mois' },
] as const;

export const languages = ['Tous', 'TypeScript', 'Python', 'Rust', 'Kotlin'] as const;

export type Period = (typeof periods)[number];
export type Language = (typeof languages)[number];

export type Repository = {
  name: string;
  owner: string;
  description: string | null;
  language: string | null;
  totalStars: number;
  periodStars: number;
  url: string;
};

const github = 'https://github.com';
const unreadablePage = 'Impossible de lire le classement GitHub Trending. Réessayez.';

export function trendingUrl(period: Period['value'], language: Language): string {
  const path = language === 'Tous' ? '' : `/${language.toLowerCase()}`;
  return `${github}/trending${path}?since=${period}`;
}

function readStarCount(text: string | undefined): number | null {
  const count = text?.trim().match(/^(\d[\d,]*)(?:\s|$)/)?.[1];
  if (!count) return null;

  const value = Number(count.replace(/,/g, ''));
  return Number.isSafeInteger(value) ? value : null;
}

function readRepository(row: Element): Repository | null {
  const path = row.querySelector('h2 a')?.getAttribute('href');
  const repository = path?.match(/^\/([\w-]+)\/(?!\.{1,2}$)([\w.-]+)$/);
  if (!path || !repository || /\s/.test(path)) return null;

  const totalStars = readStarCount(row.querySelector('a[href$="/stargazers"]')?.textContent ?? undefined);
  const periodStars = readStarCount(row.querySelector('.float-sm-right')?.textContent ?? undefined);
  if (totalStars === null || periodStars === null) return null;

  const [, owner, name] = repository;
  return {
    name,
    owner,
    description: row.querySelector('p')?.textContent?.trim() || null,
    language: row.querySelector('[itemprop="programmingLanguage"]')?.textContent?.trim() || null,
    totalStars,
    periodStars,
    url: `${github}${path}`,
  };
}

export async function fetchRepositories(
  period: Period['value'],
  language: Language,
  signal: AbortSignal,
): Promise<Repository[]> {
  const response = await fetch(trendingUrl(period, language), {
    headers: { Accept: 'text/html', 'Accept-Language': 'en' },
    signal,
  }).catch(() => {
    throw new Error('Connexion à GitHub impossible. Vérifiez votre connexion puis réessayez.');
  });

  if (!response.ok) throw new Error('GitHub Trending est indisponible. Réessayez dans un instant.');

  const html = await response.text();
  if (signal.aborted || html.length > 4_000_000) throw new Error(unreadablePage);

  const { document } = parseHTML(html);
  const results = document.querySelector('main .Box [data-hpc]');
  if (!results) throw new Error(unreadablePage);

  const rows = results.querySelectorAll('article.Box-row');
  if (rows.length === 0 && results.querySelector('.blankslate-heading')) return [];

  const repositories = new Map<string, Repository>();
  for (const row of rows) {
    const repository = readRepository(row);
    if (!repository) continue;

    const key = repository.url.toLowerCase();
    if (!repositories.has(key)) repositories.set(key, repository);
  }

  if (repositories.size === 0) throw new Error(unreadablePage);
  return Array.from(repositories.values());
}
