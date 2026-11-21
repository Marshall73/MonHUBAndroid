const { chromium } = require('playwright');
const fs = require('fs');

(async () => {
  const results = [];
  const seen = new Set();

  // 1. Lecture directe des lignes de texte de tv-sports.fr/scores-matchs-recents
  try {
    const browser = await chromium.launch({ headless: true });
    const context = await browser.newContext({
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
      locale: 'fr-FR'
    });
    const page = await context.newPage();
    await page.goto('https://' + 'tv-sports.fr/scores-matchs-recents', { waitUntil: 'domcontentloaded', timeout: 45000 });
    await page.waitForTimeout(3000);

    try {
      const btn = page.locator('button:has-text("Accepter"), button:has-text("Tout accepter"), button:has-text("Continuer")').first();
      if (await btn.isVisible({ timeout: 2000 })) await btn.click();
    } catch (e) {}

    // Défile et collecte toutes les lignes de texte visibles
    const allLines = [];
    for (let i = 0; i < 15; i++) {
      const text = await page.evaluate(() => document.body.innerText || '');
      for (const line of text.split('\n')) {
        const clean = line.trim();
        if (clean && !allLines.includes(clean)) allLines.push(clean);
      }
      await page.evaluate(() => window.scrollBy(0, 900));
      await page.waitForTimeout(300);
    }
    await browser.close();

    console.log('Lignes brutes lues sur tv-sports.fr/scores-matchs-recents :', allLines.length);

    // Analyse les lignes pour repérer les scores (ex: ligne "2 - 1" ou "2" puis "1" entre deux équipes)
    let currentSport = 'Foot';
    let currentComp = 'Match récent';

    for (let i = 0; i < allLines.length; i++) {
      const line = allLines.at(i);
      const low = line.toLowerCase();

      if (line.includes('·')) {
        if (low.includes('rugby')) currentSport = 'Rugby';
        else if (low.includes('tennis')) currentSport = 'Tennis';
        else if (low.includes('mma') || low.includes('ufc') || low.includes('ksw')) currentSport = 'MMA';
        else if (low.includes('moto')) currentSport = 'MotoGP';
        else if (low.includes('foot') || low.includes('ligue') || low.includes('premier') || low.includes('liga') || low.includes('serie a') || low.includes('bundesliga')) currentSport = 'Foot';
        else currentSport = 'Autre';
        currentComp = line.split('·').at(-1).trim();
        continue;
      }

      if (currentSport === 'Autre') continue;

      // Cas A : Score sur une seule ligne ("2 - 1" ou "2-1") entre Equipe 1 (i-1) et Equipe 2 (i+1)
      const scoreMatch = line.match(/^(\d{1,3})\s*[-–:]\s*(\d{1,3})$/);
      if (scoreMatch && i > 0 && i + 1 < allLines.length) {
        const teamA = allLines.at(i - 1);
        const teamB = allLines.at(i + 1);
        const score = `${scoreMatch.at(1)} - ${scoreMatch.at(2)}`;
        const key = `${teamA}-${teamB}-${score}`;
        if (teamA.length > 2 && teamB.length > 2 && !seen.has(key)) {
          seen.add(key);
          results.push({
            sport: currentSport,
            date: "Aujourd'hui",
            competition: currentComp,
            match: `${teamA} - ${teamB}`,
            score
          });
        }
      }
    }
  } catch (e) {
    console.error('Erreur Playwright scores:', e.message);
  }

  // 2. Fallback API ESPN si tv-sports.fr n'a rien renvoyé
  if (results.length === 0) {
    const espnEndpoints = [
      { sport: 'Foot', comp: 'Ligue 1', url: 'https://espn.com' },
      { sport: 'Foot', comp: 'Premier League', url: 'https://espn.com' },
      { sport: 'Foot', comp: 'La Liga', url: 'https://espn.com' },
      { sport: 'Foot', comp: 'Serie A', url: 'https://espn.com' },
      { sport: 'Foot', comp: 'Bundesliga', url: 'https://espn.com' },
      { sport: 'MMA', comp: 'UFC', url: 'https://espn.com' },
      { sport: 'Tennis', comp: 'ATP Tour', url: 'https://espn.com' }
    ];

    for (const ep of espnEndpoints) {
      try {
        const res = await fetch(ep.url);
        if (!res.ok) continue;
        const data = await res.json();
        for (const ev of (data.events || [])) {
          const state = ev.status?.type?.state;
          if (state !== 'post' && state !== 'in') continue;
          const comp = ev.competitions?.at(0);
          const home = comp?.competitors?.find(c => c.homeAway === 'home') || comp?.competitors?.at(0);
          const away = comp?.competitors?.find(c => c.homeAway === 'away') || comp?.competitors?.at(1);
          if (!home || !away) continue;

          results.push({
            sport: ep.sport,
            date: state === 'in' ? 'En cours' : "Aujourd'hui",
            competition: ep.comp,
            match: `${home.team?.shortDisplayName || home.athlete?.displayName} - ${away.team?.shortDisplayName || away.athlete?.displayName}`,
            score: `${home.score ?? '0'} - ${away.score ?? '0'}`
          });
        }
      } catch (e) {}
    }
  }

  fs.mkdirSync('data', { recursive: true });
  fs.writeFileSync('data/scores.json', JSON.stringify(results, null, 2));
  console.log('Total scores sauvegardes :', results.length);
})();