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

  // Accepter les cookies si besoin
  try {
    const btn = page.locator('button:has-text("Accepter"), button:has-text("Tout accepter"), button:has-text("Continuer")').first();
    if (await btn.isVisible({ timeout: 2500 })) await btn.click();
    await page.waitForTimeout(1000);
  } catch (e) {}

  // Défile pour charger toute la liste de la journée
  await page.evaluate(async () => {
    for (let i = 0; i < 6; i++) {
      window.scrollBy(0, 1500);
      await new Promise(r => setTimeout(r, 400));
    }
  });

  const events = await page.evaluate(() => {
    const normalizeSport = (rawText) => {
      const t = rawText.toLowerCase();
      if (t.includes('mma') || t.includes('ufc') || t.includes('ksw') || t.includes('pfl') || t.includes('bellator') || t.includes('ares')) return 'MMA';
      if (t.includes('moto gp') || t.includes('motogp') || t.includes('moto2') || t.includes('moto3') || t.includes('motocyclisme')) return 'MotoGP';
      if (t.includes('tennis') || t.includes('atp') || t.includes('wta') || t.includes('billie jean') || t.includes('roland')) return 'Tennis';
      if (t.includes('jeux olympiques') || t.includes('jo ') || t.includes('olympique')) return 'JO';
      if (t.includes('rugby') || t.includes('top 14') || t.includes('championnat des nations')) return 'Rugby';
      if (t.includes('foot') || t.includes('ligue 1') || t.includes('ligue 2') || t.includes('premier league') || t.includes('bundesliga') || t.includes('liga') || t.includes('serie a') || t.includes('champions')) return 'Foot';
      return null;
    };

    // Chaque programme sur tv-sports.fr est dans un bloc contenant l'heure (ex: 20h15), un h3 (titre) et le badge Direct
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

      // Ne garde QUE le Direct (ou En cours / Streaming direct), ignore Rediffusion, Magazine et Sans diffusion TV
      const isLive = /\b(Direct|En cours|Streaming)\b/i.test(text);
      const isExcluded = /\b(Rediffusion|Magazine|Sans diffusion TV|Aucune diffusion TV)\b/i.test(text);
      if (!isLive || isExcluded) continue;

      const sport = normalizeSport(text);
      if (!sport) continue;

      const timeMatch = text.match(/\b(\d{1,2})h(\d{2})\b/);
      if (!timeMatch) continue;
      const time = `${timeMatch.at(1).padStart(2, '0')}:${timeMatch.at(2)}`;

      const title = (block.querySelector('h3')?.innerText || '').replace(/[🔥✨⭐]/g, '').trim();
      if (!title) continue;

      // Compétition (ligne contenant · ex: "⚽ Foot · Ligue 1")
      const compLine = lines.find(l => l.includes('·')) || sport;
      const competition = compLine.split('·').at(-1)?.trim() || sport;

      // La chaîne TV est généralement la dernière ligne du bloc (ex: "Ligue 1+", "beIN SPORTS 1", "TF1", "Canal+ Foot")
      const channel = lines.at(-1) || 'Chaîne TV';

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
    return results;
  });

  await browser.close();
  fs.mkdirSync('data', { recursive: true });
  fs.writeFileSync('data/sport.json', JSON.stringify(events, null, 2));
  console.log('Matchs en Direct extraits depuis tv-sports.fr :', events.length);
})();