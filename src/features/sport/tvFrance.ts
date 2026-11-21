import { text } from '../feedXml';
import { matchesSport, searchable, type Sport } from './filters';

const scheduleUrl = 'https://raw.githubusercontent.com/Marshall73/MonHUBAndroid/main/data/sport.json';

export type TvProgram = {
  sport: string;
  time: string;
  title: string;
  competition: string;
  channel: string;
};

export function programKey(program: TvProgram) {
  return JSON.stringify([program.time, program.channel, program.title]);
}

export async function fetchTvSchedule(signal: AbortSignal): Promise<TvProgram[]> {
  const response = await fetch(scheduleUrl, { signal, cache: 'no-store' }).catch(() => {
    throw new Error('Impossible de joindre le programme TV France. Vérifiez votre connexion.');
  });
  if (!response.ok) throw new Error('Le programme TV France est temporairement indisponible.');

  const invalid = 'Le fichier du programme TV France est illisible.';
  const data: unknown = await response.json().catch(() => { throw new Error(invalid); });
  if (!Array.isArray(data)) throw new Error(invalid);

  const programs = new Map<string, TvProgram>();
  for (const value of data) {
    if (typeof value !== 'object' || value === null) continue;
    const row = value as Record<string, unknown>;
    const sport = text(row.sport).trim();
    const time = text(row.time).trim();
    const title = text(row.title).trim();
    const channel = text(row.channel).trim();
    if (!sport || !title || !channel || !/^(?:[01]?\d|2[0-3]):[0-5]\d$/.test(time)) continue;

    const item = { sport, time: time.padStart(5, '0'), title, channel, competition: text(row.competition).trim() };
    programs.set(programKey(item), item);
  }
  if (data.length > 0 && programs.size === 0) throw new Error(invalid);
  return [...programs.values()].sort((first, second) => first.time.localeCompare(second.time));
}

export function filterPrograms(programs: TvProgram[], sport: Sport, search: string) {
  const query = searchable(search.trim());
  return programs.filter((item) => matchesSport(sport, item.sport) &&
    searchable(`${item.title} ${item.competition} ${item.channel}`).includes(query));
}
