export type ScoreSide = {
  home: number | null;
  away: number | null;
};

export type FootballScore = {
  fixtureId: number;
  date: string;
  timestamp: number;
  time: string;
  status: {
    short: string;
    long: string;
    elapsed: number | null;
  };
  league: {
    id: number;
    name: string;
    country: string;
    logo: string;
    round: string;
  };
  teams: {
    home: { id: number; name: string; logo: string };
    away: { id: number; name: string; logo: string };
  };
  goals: ScoreSide;
  score: {
    halftime: ScoreSide;
    fulltime: ScoreSide;
    extratime: ScoreSide;
    penalty: ScoreSide;
  };
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function numberOrNull(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function readSide(value: unknown): ScoreSide {
  if (!isRecord(value)) return { home: null, away: null };
  return {
    home: numberOrNull(value.home),
    away: numberOrNull(value.away),
  };
}

function readFixture(value: unknown): FootballScore | null {
  if (!isRecord(value)) return null;

  const status = value.status;
  const league = value.league;
  const teams = value.teams;
  const score = value.score;

  if (!isRecord(status) || !isRecord(league) ||
      !isRecord(teams) || !isRecord(teams.home) ||
      !isRecord(teams.away) || !isRecord(score)) return null;

  const home = teams.home;
  const away = teams.away;
  const statusShort = typeof status.short === 'string' ? status.short : '';

  if (typeof value.fixtureId !== 'number' ||
      typeof value.date !== 'string' ||
      typeof value.timestamp !== 'number' ||
      typeof league.id !== 'number' ||
      typeof league.name !== 'string' ||
      typeof home.name !== 'string' ||
      typeof away.name !== 'string' ||
      !['FT', 'AET', 'PEN', 'AWD', 'WO'].includes(statusShort)) {
    return null;
  }

  const date = new Date(value.date);
  if (Number.isNaN(date.getTime())) return null;

  const formatTime = new Intl.DateTimeFormat('fr-FR', {
    timeZone: 'Europe/Paris',
    hour: '2-digit',
    minute: '2-digit',
  });

  return {
    fixtureId: value.fixtureId,
    date: value.date,
    timestamp: value.timestamp,
    time: formatTime.format(date),
    status: {
      short: statusShort,
      long: typeof status.long === 'string' ? status.long : '',
      elapsed: numberOrNull(status.elapsed),
    },
    league: {
      id: league.id,
      name: league.name,
      country: typeof league.country === 'string' ? league.country : '',
      logo: typeof league.logo === 'string' ? league.logo : '',
      round: typeof league.round === 'string' ? league.round : '',
    },
    teams: {
      home: {
        id: typeof home.id === 'number' ? home.id : 0,
        name: home.name,
        logo: typeof home.logo === 'string' ? home.logo : '',
      },
      away: {
        id: typeof away.id === 'number' ? away.id : 0,
        name: away.name,
        logo: typeof away.logo === 'string' ? away.logo : '',
      },
    },
    goals: readSide(value.goals),
    score: {
      halftime: readSide(score.halftime),
      fulltime: readSide(score.fulltime),
      extratime: readSide(score.extratime),
      penalty: readSide(score.penalty),
    },
  };
}

const scoresUrl =
  'https://raw.githubusercontent.com/Marshall73/MonHUBAndroid/main/data/scores.json';

const parisDate = new Intl.DateTimeFormat('sv-SE', {
  timeZone: 'Europe/Paris',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});

export async function fetchFootballScores(
  signal: AbortSignal,
): Promise<FootballScore[]> {
  const response = await fetch(scoresUrl, {
    signal,
    cache: 'no-store',
  }).catch(() => {
    throw new Error('Impossible de récupérer les résultats de football.');
  });

  if (!response.ok) {
    throw new Error('Les résultats de football sont temporairement indisponibles.');
  }

  const data: unknown = await response.json().catch(() => {
    throw new Error('Le fichier des résultats de football est illisible.');
  });

  if (!isRecord(data) || !Array.isArray(data.matches)) {
    throw new Error('Le format du fichier des résultats est invalide.');
  }

  const today = parisDate.format(new Date());

  return data.matches
    .map(readFixture)
    .filter((match): match is FootballScore => {
      return match !== null && parisDate.format(new Date(match.date)) === today;
    })
    .sort((a, b) => b.timestamp - a.timestamp);
}
