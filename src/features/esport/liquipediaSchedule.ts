import { LIQUIPEDIA, type EsportGame, type EsportTournament } from './games';

const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const entities: Record<string, string> = {
  amp: '&', apos: "'", quot: '"', lt: '<', gt: '>', nbsp: ' ', ndash: '–', mdash: '—', shy: '',
};

function decodeEntities(value: string): string {
  return value.replace(/&(#x[\da-f]+|#\d+|[a-z]+);/gi, (entity, code: string) => {
    if (code[0] !== '#') return entities[code] ?? entity;
    const point = /^#x/i.test(code) ? parseInt(code.slice(2), 16) : Number(code.slice(1));
    return point <= 0x10ffff ? String.fromCodePoint(point) : entity;
  });
}

function plainText(html: string): string {
  return decodeEntities(html.replace(/<[^>]*>/g, '')).replace(/\s+/g, ' ').trim();
}

function calendarDay(year: number, month: number, day: number): string | undefined {
  const date = new Date(Date.UTC(year, month, day));
  if (date.getUTCMonth() === month && date.getUTCDate() === day) {
    return date.toISOString().slice(0, 10);
  }
}

function parseDateRange(value: string): Pick<EsportTournament, 'start' | 'end'> | undefined {
  const match = value.match(/^([A-Z][a-z]{2}) (\d{1,2})(?:, (\d{4}))?(?:\s*[-–—]\s*(?:([A-Z][a-z]{2}) )?(\d{1,2}))?, (\d{4})$/);
  if (!match) return;

  const [, firstMonth, firstDay, firstYear, lastMonth, lastDay, year] = match;
  const startMonth = months.indexOf(firstMonth);
  const endMonth = lastMonth ? months.indexOf(lastMonth) : startMonth;
  const endYear = Number(year);
  const startYear = firstYear ? Number(firstYear) : endYear - Number(startMonth > endMonth);
  const start = calendarDay(startYear, startMonth, Number(firstDay));
  const end = calendarDay(endYear, endMonth, Number(lastDay ?? firstDay));
  if (start && end && start <= end) return { start, end };
}

function getTournamentLink(cells: string[], game: EsportGame): Pick<EsportTournament, 'title' | 'url'> | undefined {
  for (const cell of cells.slice().reverse()) {
    for (const link of cell.matchAll(/<a\b[^>]*\bhref="(\/[^"#?]+)"[^>]*>([\s\S]*?)<\/a>/gi)) {
      if (!link[1].startsWith('/' + game.id + '/')) continue;
      const title = plainText(link[2]);
      if (title) return { title, url: LIQUIPEDIA + decodeEntities(link[1]) };
    }
  }
}

function parseTier(html: string, tier: EsportTournament['tier'], game: EsportGame): EsportTournament[] {
  const rows = html.includes('divRow')
    ? html.split(/<div\b[^>]*\bclass="[^"]*\bdivRow\b[^"]*"[^>]*>/i).slice(1)
    : Array.from(html.matchAll(/<tr\b[^>]*>([\s\S]*?)<\/tr>/gi), (row) => row[1]);
  const tournaments: EsportTournament[] = [];
  let foundCalendarDate = false;

  for (const row of rows) {
    const cells = row.includes('divCell')
      ? row.split(/<div\b[^>]*\bclass="[^"]*\bdivCell\b[^"]*"[^>]*>/i).slice(1)
      : Array.from(row.matchAll(/<td\b[^>]*>([\s\S]*?)<\/td>/gi), (cell) => cell[1]);
    const labels = cells.map(plainText);
    const dateIndex = labels.findIndex((label) => parseDateRange(label) !== undefined);
    if (dateIndex < 1) continue;
    if (game.id === 'counterstrike' && !cells[0].includes('href="/counterstrike/Counter-Strike_2"')) continue;

    const dates = parseDateRange(labels[dateIndex]);
    const link = getTournamentLink(cells.slice(0, dateIndex), game);
    if (!dates || !link) continue;
    foundCalendarDate = true;
    if (/\b(cancelled|canceled|postponed)\b/i.test(labels.slice(dateIndex).join(' '))) continue;
    tournaments.push({ ...link, ...dates, tier });
  }

  if (!foundCalendarDate) throw new Error('Le calendrier Liquipedia est illisible.');
  return tournaments;
}

export function parseLiquipediaSchedule(html: string, game: EsportGame): EsportTournament[] {
  const [, firstTier, secondTier] = html.split(/<span\s+id="monhub-tier-[12]"\s*><\/span>/i);
  if (!firstTier || !secondTier) throw new Error('Le calendrier Liquipedia est incomplet.');
  const tournaments = new Map<string, EsportTournament>();
  for (const item of [...parseTier(firstTier, game.tiers[0], game), ...parseTier(secondTier, game.tiers[1], game)]) {
    if (!tournaments.has(item.url)) tournaments.set(item.url, item);
  }
  return [...tournaments.values()].sort((a, b) => a.start.localeCompare(b.start));
}
