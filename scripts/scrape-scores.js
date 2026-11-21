const { chromium } = require('playwright');
const fs = require('fs');

(async () => {
  const urlScores = 'https://' + 'tv-sports.fr/scores-matchs-recents';
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
    locale: 'fr-FR'
  });
  const page = await context.newPage();

  await page.goto(urlScores, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForSelector('h3, article, li', { timeout: 15000 }).catch(() => {});
  await page.waitForTimeout(3000);

  try {
    const btn = page.locator('button:has-text("Accepter"), button:has-text("Tout accepter"), button:has-text("Continuer")').first();
    if (await btn.isVisible({ timeout: 2500 })) await btn.click();
    await page.waitForTimeout(1000);
  } catch (e) {}

  const extractVisibleScores = () => page.evaluate(() => {
    const normalizeSport = (text) => {
      const c = text.toLowerCase();
      if (c.includes('basket') || c.includes('nba') || c.includes('euroligue') || c.includes('betclic') || c.includes('ncaa') || c.includes('liga endesa')) return null;
      if (c.includes('hockey') || c.includes('nhl') || c.includes('handball') || c.includes('volley') || c.includes('golf') || c.includes('nfl')) return null;

      if (c.includes('mma') || c.includes('ufc') || c.includes('ksw') || c.includes('pfl') || c.includes('bellator') || c.includes('ares')) return 'MMA';
      if (c.includes('moto gp') || c.includes('motogp') || c.includes('moto2') || c.includes('moto3') || c.includes('motocyclisme')) return 'MotoGP';
      if (c.includes('tennis') || c.includes('atp') || c.includes('wta') || c.includes('billie jean') || c.includes('roland')) return 'Tennis';
      if (c.includes('jeux olympiques') || c.includes('jo ') || c.includes('olympique')) return 'JO';
      if (c.includes('rugby') || c.includes('top 14') || c.includes('championnat des nations') || c.includes('six nations') || c.includes('pro d2')) return 'Rugby';
      if (c.includes('foot') || c.includes('ligue 1') || c.includes('ligue 2') || c.includes('premier league') || c.includes('bundesliga') || c.includes('la liga') || c.includes('serie a') || c.includes('champions') || c.includes('nations league') || c.includes('coupe')) return 'Foot';
      return null;
    };

    const blocks = Array.from(document.querySelectorAll('li, article, div'))
      .filter(el => {
        const txt = el.innerText || '';
        return (el.querySelector('h3') || /\b\d{1,3}\s*[-–:]\s*\d{1,3}\b/.test(txt)) && txt.length > 10 && txt.length < 400;
      });

    const leafBlocks = blocks.filter(b => !blocks.some(o => o !== b && b.contains(o)));
    const items = [];

    for (const block of leafBlocks) {
      const text = block.innerText || '';
      const lines = text.split('\n').map(l => l.trim()).filter(Boolean);

      const sport = normalizeSport(text);
      if (!sport) continue;

      // Cherche un score au format "2 - 1" OU deux nombres isolés sur des lignes séparées (ex: Equipe A / 2 / Equipe B / 1)
      let score = '';
      const inlineScore = text.match(/\b(\d{1,3}\s*[-–:]\s*\d{1,3})\b/);
      if (inlineScore) {
        score = inlineScore.at(1).replace(/\s+/g, ' ').trim();
      } else {
        const numLines = lines.filter(l => /^\d{1,3}$/.test(l));
        if (numLines.length >= 2) {
          score = `${numLines.at(0)} - ${numLines.at(1)}`;
        }
      }
      if (!score) continue;

      const compLine = lines.find(l => l.includes('·')) || '';
      const competition = compLine ? compLine.split('·').at(-1).trim() : sport;

      const cleanLines = lines.filter(l =>
        !l.includes('·') &&
        l !== score &&
        !/^\d{1,3}$/.test(l) &&
        !/^(Terminé|Score final|FT|Final|En cours|Direct)$/i.test(l) &&
        !/^\d{1,2}\/\d{1,2}(\/\d{2,4})?$/.test(l) &&
        !/^\d{1,2}h\d{2}$/.test(l)
      );

      let matchTitle = '';
      const h3 = block.querySelector('h3')?.innerText?.replace(/[🔥✨⭐▶]/g, '').trim();
      if (h3 && h3.length > 3) {
        matchTitle = h3;
      } else if (cleanLines.length >= 2) {
        matchTitle = `${cleanLines.at(0)} - ${cleanLines.at(1)}`;
      } else if (cleanLines.length === 1) {
        matchTitle = cleanLines.at(0);
      }

      if (!matchTitle || matchTitle.startsWith('▶')) continue;

      const dateMatch = text.match(/\b(\d{1,2}\/\d{1,2}(?:\/\d{2,4})?)\b/);
      const date = dateMatch ? dateMatch.at(1) : "Aujourd'hui";

      items.push({
        sport,
        date,
        competition,
        match: matchTitle,
        score
      });
    }
    return items;
  });

  const collected = new Map();
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.waitForTimeout(500);

  for (let step = 0; step < 25; step++) {
    const batch = await extractVisibleScores();
    for (const item of batch) {
      const key = `${item.match}-${item.score}`;
      if (!collected.has(key)) collected.set(key, item);
    }
    const atBottom = await page.evaluate(() => {
      window.scrollBy(0, 800);
      return window.innerHeight + window.scrollY >= document.body.scrollHeight - 50;
    });
    await page.waitForTimeout(350);
    if (atBottom && step > 4) break;
  }

  const finalScores = Array.from(collected.values());
  await browser.close();
  fs.mkdirSync('data', { recursive: true });
  fs.writeFileSync('data/scores.json', JSON.stringify(finalScores, null, 2));
  console.log('Scores recents extraits :', finalScores.length);
})();