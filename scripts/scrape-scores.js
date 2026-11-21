const fs = require('fs');

(async () => {
  const results = [];

  // 1. API ESPN publique sans paramètre de date (renvoie toujours la dernière journée complète)
  const espnEndpoints = [
    { sport: 'Foot', comp: 'Ligue 1', url: 'https://espn.com' },
    { sport: 'Foot', comp: 'Ligue des Champions', url: 'https://espn.com' },
    { sport: 'Foot', comp: 'Europa League', url: 'https://espn.com' },
    { sport: 'Foot', comp: 'Premier League', url: 'https://espn.com' },
    { sport: 'Foot', comp: 'La Liga', url: 'https://espn.com' },
    { sport: 'Foot', comp: 'Serie A', url: 'https://espn.com' },
    { sport: 'Foot', comp: 'Bundesliga', url: 'https://espn.com' },
    { sport: 'MMA', comp: 'UFC', url: 'https://espn.com' },
    { sport: 'Tennis', comp: 'ATP Tour', url: 'https://espn.com' },
    { sport: 'Tennis', comp: 'WTA Tour', url: 'https://espn.com' }
  ];

  for (const ep of espnEndpoints) {
    try {
      const res = await fetch(ep.url);
      console.log(ep.comp, 'HTTP:', res.status);
      if (!res.ok) continue;
      const data = await res.json();
      const events = data.events || [];
      console.log(ep.comp, 'Events bruts:', events.length);

      for (const ev of events) {
        const comp = ev.competitions?.at(0);
        if (!comp) continue;

        const state = ev.status?.type?.state; // 'post' = terminé, 'in' = en cours
        if (state !== 'post' && state !== 'in') continue;

        const competitors = comp.competitors || [];
        if (competitors.length < 2) continue;

        const home = competitors.find(c => c.homeAway === 'home') || competitors.at(0);
        const away = competitors.find(c => c.homeAway === 'away') || competitors.at(1);

        const homeName = home.team?.shortDisplayName || home.athlete?.displayName || 'Équipe 1';
        const awayName = away.team?.shortDisplayName || away.athlete?.displayName || 'Équipe 2';
        const homeScore = home.score ?? '0';
        const awayScore = away.score ?? '0';

        const evDate = new Date(ev.date);
        const dateLabel = evDate.toLocaleDateString('fr-FR', {
          timeZone: 'Europe/Paris',
          day: '2-digit',
          month: '2-digit'
        });

        results.push({
          sport: ep.sport,
          date: state === 'in' ? 'En cours' : dateLabel,
          competition: data.leagues?.at(0)?.name || ep.comp,
          match: `${homeName} - ${awayName}`,
          score: `${homeScore} - ${awayScore}`
        });
      }
    } catch (e) {
      console.error('Erreur', ep.comp, e.message);
    }
  }

  fs.mkdirSync('data', { recursive: true });
  fs.writeFileSync('data/scores.json', JSON.stringify(results, null, 2));
  console.log('Total scores sauvegardes :', results.length);
})();