import { text } from '../feedXml';
import { matchesSport, searchable, type Sport } from './filters';

const scheduleUrl = 'https://raw.githubusercontent.com/Marshall73/MonHUBAndroid/main/data/sport.json';

export type TvProgram = {
  sport: string;
  time: string;
  status: 'Direct' | 'En cours' | 'Terminé';
  date?: string;
  startAt?: string;
  endAt?: string;
  title: string;
  competition: string;
  channel: string;
};

export type ProgramView = 'live' | 'upcoming' | 'finished';

const parisDate = new Intl.DateTimeFormat('sv-SE', {
  timeZone: 'Europe/Paris',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});

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
    if (status !== 'direct' && status !== 'en cours' && status !== 'termine') continue;
    const date = text(row.date).trim();
    const startAt = text(row.startAt).trim();
    const endAt = text(row.endAt).trim();

    const item: TvProgram = {
      sport,
      time: time.padStart(5, '0'),
      status: status === 'termine' ? 'Terminé' : status === 'en cours' ? 'En cours' : 'Direct',
      date: /^\d{4}-\d{2}-\d{2}$/.test(date) ? date : undefined,
      startAt: startAt || undefined,
      endAt: endAt || undefined,
      title,
      channel,
      competition: text(row.competition).trim(),
    };
    programs.set(programKey(item), item);
  }
  if (data.length > 0 && !hasValidProgram) throw new Error(invalid);
  return [...programs.values()].sort((first, second) => first.time.localeCompare(second.time));
}

export function getProgramStatus(item: TvProgram, now: Date) {
  const start = Date.parse(item.startAt ?? '');
  const end = Date.parse(item.endAt ?? '');

  if (Number.isFinite(start) && Number.isFinite(end) && end > start) {
    if (now.getTime() < start) return 'À venir';
    if (now.getTime() >= end) return 'Terminé';
    return 'Direct';
  }

  return item.status;
}

export function filterPrograms(programs: TvProgram[], sport: Sport, search: string, now: Date, view: ProgramView) {
  const query = searchable(search.trim());
  const today = parisDate.format(now);

  return programs.filter((item) => {
    if (item.date && item.date !== today) return false;

    const start = Date.parse(item.startAt ?? '');
    const end = Date.parse(item.endAt ?? '');
    const hasExactTimes = Number.isFinite(start) &&
      Number.isFinite(end) && end > start;

    let matchesView: boolean;

    if (hasExactTimes) {
      const current = now.getTime();

      matchesView = view === 'live'
        ? current >= start && current < end
        : view === 'upcoming'
          ? current < start
          : current >= end;
    } else {
      // Compatibilité temporaire avec l'ancien JSON, sans horaires exacts.
      const currentMinute = now.getHours() * 60 + now.getMinutes();
      const itemStart = Number(item.time.slice(0, 2)) * 60 + Number(item.time.slice(3));

      matchesView = item.status === 'Terminé'
        ? view === 'finished'
        : view === 'upcoming'
          ? itemStart > currentMinute && item.status !== 'En cours'
          : view === 'live' && (item.status === 'Direct' || itemStart >= currentMinute - 120);
    }

    return matchesView && matchesSport(sport, item.sport) &&
      searchable(`${item.title} ${item.competition} ${item.channel}`).includes(query);
  });
}
