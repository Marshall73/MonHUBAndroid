import { text } from '../feedXml';
import { matchesSport, searchable, type Sport } from './filters';

const scheduleUrl = 'https://raw.githubusercontent.com/Marshall73/MonHUBAndroid/main/data/sport.json';

export type TvProgram = {
  sport: string;
  time: string;
  status: 'Direct' | 'En cours';
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
  let hasValidProgram = false;
  for (const value of data) {
    if (typeof value !== 'object' || value === null) continue;
    const row = value as Record<string, unknown>;
    const sport = text(row.sport).trim();
    const time = text(row.time).trim();
    const title = text(row.title).trim();
    const channel = text(row.channel).trim();
    if (!sport || !title || !/^(?:[01]?\d|2[0-3]):[0-5]\d$/.test(time)) continue;
    hasValidProgram = true;

    const status = searchable(text(row.status).trim());
    if (status !== 'direct' && status !== 'en cours') continue;

    const item: TvProgram = {
      sport,
      time: time.padStart(5, '0'),
      status: status === 'en cours' ? 'En cours' : 'Direct',
      title,
      channel,
      competition: text(row.competition).trim(),
    };
    programs.set(programKey(item), item);
  }
  if (data.length > 0 && !hasValidProgram) throw new Error(invalid);
  return [...programs.values()].sort((first, second) => first.time.localeCompare(second.time));
}

export function filterPrograms(programs: TvProgram[], sport: Sport, search: string, now?: Date) {
  const query = searchable(search.trim());
  const cutoff = now ? now.getHours() * 60 + now.getMinutes() - 120 : 0;
  return programs.filter((item) => {
    const start = Number(item.time.slice(0, 2)) * 60 + Number(item.time.slice(3));
    return start >= cutoff && matchesSport(sport, item.sport) &&
      searchable(`${item.title} ${item.competition} ${item.channel}`).includes(query);
  });
}
