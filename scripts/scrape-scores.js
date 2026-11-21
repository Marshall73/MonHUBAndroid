const fs = require('fs');

(async () => {
  const apiKey = process.env.API_FOOTBALL_KEY;
  if (!apiKey) {
    console.error('Erreur : variable API_FOOTBALL_KEY manquante.');
    process.exit(1);
  }

  // Date du jour au format YYYY-MM-DD (fuseau Paris)
  const todayParis = new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Paris' }).format(new Date());

  // IDs officiels API-Football des grandes compétitions (pour filtrer les championnats majeurs)
  const majorLeagues = new Set([
    2,   // UEFA Champions League
    3,   // UEFA Europa League
    848, // UEFA Conference League
    61,  // Ligue 1 (France)
    62,  // Ligue 2 (France)
    66,  // Coupe de France
    39,  // Premier League (Angleterre)
    140, // La Liga (Espagne)
    135, // Serie A (Italie)
    78,  // Bundesliga (Allemagne)
    94,  // Primeira Liga (Portugal)
    88,  // Eredivisie (Pays-Bas)
    1,   // Coupe du Monde
    4,   // Euro
    5    // UEFA Nations League
  ]);

  const apiUrl = 'https://' + 'v3.football.api-sports.io/fixtures?date=' + todayParis + '&timezone=Europe/Paris';
  const res = await fetch(apiUrl, {
      'x-apisports-key': apiKey
    }
  });

  if (!res.ok) {
    console.error('Erreur HTTP API-Football:', res.status);
    process.exit(1);
  }

  const json = await res.json();
  const fixtures = json.response || [];
  console.log(`Matchs totaux trouves le ${todayParis} :`, fixtures.length);

  const results = [];

  for (const item of fixtures) {
    const leagueId = item.league?.id;
    if (!majorLeagues.has(leagueId)) continue;

    const shortStatus = item.fixture?.status?.short; // FT, AET, PEN, 1H, 2H, HT, NS...
    // Ne garde que les matchs terminés ou en cours
    if (!['FT', 'AET', 'PEN', '1H', '2H', 'HT', 'ET', 'BT', 'P', 'LIVE'].includes(shortStatus)) continue;

    const homeName = item.teams?.home?.name || 'Domicile';
    const awayName = item.teams?.away?.name || 'Extérieur';
    const homeGoals = item.goals?.home ?? 0;
    const awayGoals = item.goals?.away ?? 0;

    const isLive = ['1H', '2H', 'HT', 'ET', 'BT', 'P', 'LIVE'].includes(shortStatus);
    const elapsed = item.fixture?.status?.elapsed;

    results.push({
      sport: 'Foot',
      date: isLive ? `En cours (${elapsed || ''}')` : 'Terminé',
      competition: item.league?.name || 'Football',
      match: `${homeName} - ${awayName}`,
      score: `${homeGoals} - ${awayGoals}`,
      homeLogo: item.teams?.home?.logo || '',
      awayLogo: item.teams?.away?.logo || ''
    });
  }

  fs.mkdirSync('data', { recursive: true });
  fs.writeFileSync('data/scores.json', JSON.stringify(results, null, 2));
  console.log('Scores majeurs sauvegardes dans data/scores.json :', results.length);
})();