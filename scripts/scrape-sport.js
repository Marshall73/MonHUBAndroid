const fs = require('fs');

(async () => {
  const results = [];
  const today = new Date().toISOString().slice(0, 10).replace(/-/g, '');

  // Mapping automatique des compétitions vers leurs diffuseurs officiels en France
  const getFrenchChannel = (sport, comp) => {
    const c = (comp || '').toLowerCase();
    if (sport === 'MMA') return 'RMC Sport / DAZN';
    if (sport === 'MotoGP') return 'Canal+ / Canal+ Sport 360';
    if (sport === 'JO') return 'France TV / Eurosport';
    if (sport === 'Tennis') {
      if (c.includes('roland')) return 'France TV / Prime Video';
      if (c.includes('wimbledon')) return 'beIN Sports';
      return 'Eurosport / Canal+';
    }
    if (sport === 'Foot') {
      if (c.includes('ligue 1')) return 'DAZN / beIN Sports';
      if (c.includes('ligue 2')) return 'beIN Sports';
      if (c.includes('champions') || c.includes('europa') || c.includes('conference')) return 'Canal+';
      if (c.includes('premier league')) return 'Canal+';
      if (c.includes('liga') || c.includes('bundesliga') || c.includes('serie a')) return 'beIN Sports';
      if (c.includes('coupe de france')) return 'beIN Sports / France TV';
      return 'Canal+ / beIN Sports / DAZN';
    }
    return 'Chaîne Sport';
  };

  // Sources API ESPN publiques (zéro anti-bot, fonctionne à 100 % sur GitHub Actions)
  const endpoints = [
    { sport: 'Foot', comp: 'Ligue 1', url: `https://espn.com{today}` },
    { sport: 'Foot', comp: 'Ligue des Champions', url: `https://espn.com{today}` },
    { sport: 'Foot', comp: 'Premier League', url: `https://espn.com{today}` },
    { sport: 'Foot', comp: 'La Liga', url: `https://espn.com{today}` },
    { sport: 'Foot', comp: 'Serie A', url: `https://espn.com{today}` },
    { sport: 'Foot', comp: 'Bundesliga', url: `https://espn.com{today}` },
    { sport: 'MMA', comp: 'UFC', url: `https://espn.com` },
    { sport: 'Tennis', comp: 'ATP Tour', url: `https://espn.com` },
    { sport: 'Tennis', comp: 'WTA Tour', url: `https://espn.com` },
    { sport: 'MotoGP', comp: 'MotoGP', url: `https://espn.com` }
  ];

  for (const ep of endpoints) {
    try {
      const res = await fetch(ep.url);
      if (!res.ok) continue;
      const data = await res.json();
      const events = data.events || [];

      for (const ev of events) {
        const evDate = new Date(ev.date);
        // Garde uniquement les événements d'aujourd'hui ou des 3 prochains jours
        const diffDays = (evDate.getTime() - Date.now()) / (1000 * 3600 * 24);
        if (diffDays < -0.5 || diffDays > 3) continue;

        const time = evDate.toLocaleTimeString('fr-FR', {
          timeZone: 'Europe/Paris',
          hour: '2-digit',
          minute: '2-digit'
        });
        const dayLabel = evDate.toLocaleDateString('fr-FR', {
          timeZone: 'Europe/Paris',
          weekday: 'short',
          day: 'numeric',
          month: 'short'
        });

        results.push({
          sport: ep.sport,
          time,
          date: dayLabel,
          title: ev.name || ev.shortName || 'Événement sportif',
          competition: data.leagues?.at(0)?.name || ep.comp,
          channel: getFrenchChannel(ep.sport, ep.comp)
        });
      }
    } catch (e) {}
  }

  // Tri chronologique
  results.sort((a, b) => a.time.localeCompare(b.time));

  fs.mkdirSync('data', { recursive: true });
  fs.writeFileSync('data/sport.json', JSON.stringify(results, null, 2));
  console.log('Evenements sportifs extraits :', results.length);
})();