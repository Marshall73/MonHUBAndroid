const fs = require('node:fs');
const path = require('node:path');

const API_URL = 'https://v3.football.api-sports.io/fixtures';
const TIMEZONE = 'Europe/Paris';

const LEAGUES = new Set([
  2, 3, 848, 61, 62, 66, 39, 140,
  135, 78, 94, 88, 1, 4, 5
]);

const FINISHED_STATUSES = new Set([
  'FT', 'AET', 'PEN', 'AWD', 'WO'
]);

function parisDate() {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).formatToParts(new Date());

  const values = Object.fromEntries(parts.map(p => [p.type, p.value]));
  return `${values.year}-${values.month}-${values.day}`;
}

function shiftDate(date, days) {
  const d = new Date(`${date}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

async function fetchFixtures(date, key) {
  const url = new URL(API_URL);
  url.searchParams.set('date', date);
  url.searchParams.set('timezone', TIMEZONE);

  console.log(`Récupération des matchs du ${date}...`);

  const response = await fetch(url, {
    headers: { 'x-apisports-key': key }
  });

  const json = await response.json();

  if (!response.ok) {
    throw new Error(`Erreur HTTP ${response.status} pour ${date}`);
  }

  if (json.errors && Object.keys(json.errors).length > 0) {
    throw new Error(`Erreur API pour ${date} : ${JSON.stringify(json.errors)}`);
  }

  if (!Array.isArray(json.response)) {
    throw new Error(`Réponse API invalide pour ${date}`);
  }

  console.log(`${json.response.length} matchs reçus.`);
  return json.response;
}

function normalizeFixture(item) {
  const fixture = item.fixture;
  const league = item.league;
  const status = fixture.status;

  return {
    fixtureId: fixture.id,
    date: fixture.date,
    timestamp: fixture.timestamp,
    time: new Intl.DateTimeFormat('fr-FR', {
      timeZone: TIMEZONE,
      hour: '2-digit',
      minute: '2-digit'
    }).format(new Date(fixture.date)),
    status: {
      short: status.short,
      long: status.long,
      elapsed: status.elapsed
    },
    league: {
      id: league.id,
      name: league.name,
      country: league.country,
      logo: league.logo,
      round: league.round
    },
    teams: {
      home: {
        id: item.teams.home.id,
        name: item.teams.home.name,
        logo: item.teams.home.logo
      },
      away: {
        id: item.teams.away.id,
        name: item.teams.away.name,
        logo: item.teams.away.logo
      }
    },
    goals: {
      home: item.goals.home,
      away: item.goals.away
    },
    score: {
      halftime: item.score.halftime,
      fulltime: item.score.fulltime,
      extratime: item.score.extratime,
      penalty: item.score.penalty
    }
  };
}

async function main() {
  const key = process.env.API_FOOTBALL_KEY;

  if (!key) {
    throw new Error('La variable API_FOOTBALL_KEY est absente.');
  }

  const today = parisDate();
  const dates = [today];

  const allFixtures = [];

  for (const date of dates) {
    const fixtures = await fetchFixtures(date, key);
    allFixtures.push(...fixtures);
  }

  const matches = allFixtures
    .filter(item =>
      LEAGUES.has(item.league?.id) &&
      FINISHED_STATUSES.has(item.fixture?.status?.short)
    )
    .map(normalizeFixture)
    .sort((a, b) => b.timestamp - a.timestamp);

  const output = {
    updatedAt: new Date().toISOString(),
    timezone: TIMEZONE,
    source: 'API-Football',
    count: matches.length,
    matches
  };

  const destination = path.join(__dirname, '..', 'data', 'scores.json');
  const temporary = `${destination}.tmp`;

  fs.writeFileSync(temporary, JSON.stringify(output, null, 2) + '\n');
  fs.renameSync(temporary, destination);

  console.log('');
  console.log(`Matchs terminés retenus : ${matches.length}`);
  console.log(`Fichier créé : ${destination}`);
}

main().catch(error => {
  console.error('ÉCHEC DU SCRAPER :', error.message);
  process.exitCode = 1;
});
