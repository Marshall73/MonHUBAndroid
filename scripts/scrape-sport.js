const { chromium } = require('playwright');
const fs = require('fs');

(async () => {
  const urlSport = 'https://' + 'tv-sports.fr/';
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
    locale: 'fr-FR'
  });
  const page = await context.newPage();

  await page.goto(urlSport, { waitUntil: 'networkidle', timeout: 60000 });
  await page.waitForTimeout(3000);

  try {
    const btn = page.locator('button:has-text("Accepter"), button:has-text("Tout accepter"), button:has-text("Continuer")').first();
    if (await btn.isVisible({ timeout: 2500 })) await btn.click();
    await page.waitForTimeout(1000);
  } catch (e) {}

  // Clique sur "Voir les diffusions terminées" pour récupérer TOUS les matchs de la journée (matin, après-midi, soir)
  try {
    const pastBtn = page.locator('text=Voir les diffusions terminées').first();
    if (await pastBtn.isVisible({ timeout: 3000 })) {
      await pastBtn.click();
      await page.waitForTimeout(1500);
    }
  } catch (e) {}

  // Défile progressivement jusqu'en bas pour charger les 200+ programmes
  await page.evaluate(async () => {
    for (let i = 0; i < 15; i++) {
      window.scrollBy(0, 1500);
      await new Promise(r => setTimeout(r, 300));
    }
  });

  const events = await page.evaluate(() => {
    const normalizeSport = (compLine, fullText) => {
      const c = compLine.toLowerCase();
      if (c.includes('basket') || c.includes('nba') || c.includes('liga endesa') || c.includes('ncaa') || c.includes('euroligue') || c.includes('betclic') || c.includes('pro a') || c.includes('pro b')) return null;
      if (c.includes('football américain') || c.includes('nfl') || c.includes('hockey') || c.includes('nhl') || c.includes('handball') || c.includes('volley') || c.includes('golf') || c.includes('hippisme') || c.includes('patinage') || c.includes('ski') || c.includes('e-sport')) return null;

      if (c.includes('mma') || c.includes('ufc') || c.includes('ksw') || c.includes('pfl') || c.includes('bellator') || c.includes('ares')) return 'MMA';
      if (c.includes('moto gp') || c.includes('motogp') || c.includes('moto2') || c.includes('moto3') || c.includes('motocyclisme')) return 'MotoGP';
      if (c.includes('tennis') || c.includes('atp') || c.includes('wta') || c.includes('billie jean') || c.includes('roland')) return 'Tennis';
      if (c.includes('jeux olympiques') || c.includes('jo ') || c.includes('olympique')) return 'JO';
      if (c.includes('rugby') || c.includes('top 14') || c.includes('championnat des nations')) return 'Rugby';
      if (c.includes('foot') || c.includes('ligue 1') || c.includes('ligue 2') || c.includes('premier league') || c.includes('bundesliga') || c.includes('la liga') || c.includes('serie a') || c.includes('champions') || c.includes('sudamericana')) return 'Foot';
      return null;
    };

    const blocks = Array.from(document.querySelectorAll('li, article, div'))
      .filter(el => {
        const txt = el.innerText || '';
        return /\b\d{1,2}h\d{2}\b/.test(txt) && el.querySelector('h3') && txt.length < 400;
      });

    const leafBlocks = blocks.filter(b => !blocks.some(o => o !== b && b.contains(o)));
    const results = [];
    const seen = new Set();

    for (const block of leafBlocks) {
      const text = block.innerText || '';
      const lines = text.split('\n').map(l => l.trim()).filter(Boolean);

      const isLive = /\b(Direct|En cours|Streaming|Terminé)\b/i.test(text);
      const isExcluded = /\b(Rediffusion|Magazine|Sans diffusion TV|Aucune diffusion TV)\b/i.test(text);
      if (!isLive || isExcluded) continue;

      const compLine = lines.find(l => l.includes('·')) || text;
      const sport = normalizeSport(compLine, text);
      if (!sport) continue;

      const timeMatch = text.match(/\b(\d{1,2})h(\d{2})\b/);
      if (!timeMatch) continue;
      const time = `${timeMatch.at(1).padStart(2, '0')}:${timeMatch.at(2)}`;

      const rawH3 = block.querySelector('h3')?.innerText || '';
      const title = rawH3.replace(/[🔥✨⭐]/g, '').trim();
      if (!title || title.startsWith('▶')) continue;

      const competition = compLine.includes('·') ? compLine.split('·').at(-1).trim() : sport;

      const imgs = Array.from(block.querySelectorAll('img[alt], img[title]'))
        .map(img => (img.getAttribute('alt') || img.getAttribute('title') || '').trim())
        .filter(a => a && a.length > 1 && !a.includes(title) && !/^(Direct|En cours|Streaming)$/i.test(a));

      let channel = imgs.at(-1) || '';
      if (!channel) {
        channel = lines.find(l =>
          !l.includes(title) &&
          !l.includes('·') &&
          !/^\d{1,2}h\d{2}$/.test(l) &&
          !/^(VS|Direct|En cours|Streaming)$/i.test(l) &&
          l.length > 1 && l.length < 35
        ) || 'Chaîne TV';
      }

      const key = `${time}-${title}-${channel}`;
      if (!seen.has(key)) {
        seen.add(key);
        results.push({
          sport,
          time,
          status: /\bEn cours\b/i.test(text) ? 'En cours' : 'Direct',
          title,
          competition,
          channel
        });
      }
    }
    results.sort((a, b) => a.time.localeCompare(b.time));
    return results;
  });

  await browser.close();
  fs.mkdirSync('data', { recursive: true });
  fs.writeFileSync('data/sport.json', JSON.stringify(events, null, 2));
  console.log('Total matchs extraits :', events.length);
})();