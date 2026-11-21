const { chromium } = require('playwright');
const fs = require('fs');

(async () => {
  const urlSport = 'https://' + 'www.lequipe.fr/tv/';
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
    locale: 'fr-FR'
  });
  const page = await context.newPage();

  await page.goto(urlSport, { waitUntil: 'networkidle', timeout: 60000 });
  await page.waitForTimeout(3000);

  // Accepter ou fermer la bannière cookies Didomi si présente
  try {
    const btn = page.locator('#didomi-notice-agree-button, button:has-text("Accepter et fermer"), button:has-text("Continuer sans accepter")').first();
    if (await btn.isVisible({ timeout: 3000 })) await btn.click();
    await page.waitForTimeout(1500);
  } catch (e) {}

  // Défile un peu pour déclencher le chargement paresseux des programmes de la journée
  await page.evaluate(() => window.scrollBy(0, 1200));
  await page.waitForTimeout(1500);

  const events = await page.evaluate(() => {
    const normalizeSport = (rawText) => {
      const t = rawText.toLowerCase();
      if (t.includes('mma') || t.includes('ufc') || t.includes('pfl') || t.includes('bellator') || t.includes('ares') || t.includes('ksw') || t.includes('arts martiaux')) return 'MMA';
      if (t.includes('motogp') || t.includes('moto gp') || t.includes('moto2') || t.includes('moto3') || t.includes('moto') || t.includes('grand prix')) return 'MotoGP';
      if (t.includes('tennis') || t.includes('atp') || t.includes('wta') || t.includes('roland-garros') || t.includes('davis') || t.includes('wimbledon') || t.includes('us open') || t.includes('open d\'australie')) return 'Tennis';
      if (t.includes('jeux olympiques') || t.includes('jo ') || t.includes('olympique')) return 'JO';
      if (t.includes('football') || t.includes('foot') || t.includes('ligue 1') || t.includes('ligue 2') || t.includes('champions league') || t.includes('europa') || t.includes('premier league') || t.includes('liga') || t.includes('serie a') || t.includes('bundesliga') || t.includes('coupe de france') || t.includes('équipe de france')) return 'Foot';
      return null;
    };

    const cards = Array.from(document.querySelectorAll('article, li, div'))
      .filter(el => {
        const txt = el.innerText || '';
        return /\b\d{1,2}[h:]\d{2}\b/.test(txt) && txt.length > 15 && txt.length < 450;
      });

    const leafCards = cards.filter(c => !cards.some(o => o !== c && c.contains(o)));
    const results = [];
    const seen = new Set();

    for (const card of leafCards) {
      const text = card.innerText || '';
      const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
      const sport = normalizeSport(text);
      if (!sport) continue;

      const timeMatch = text.match(/\b(\d{1,2}[h:]\d{2})\b/);
      const time = timeMatch ? timeMatch.at(0).replace('h', ':') : '';

      const channelImg = card.querySelector('img[alt]');
      let channel = channelImg?.getAttribute('alt') || channelImg?.getAttribute('title') || '';
      if (!channel || channel.length < 2) {
        const chLine = lines.find(l => /(canal\+|bein|rmc|dazn|eurosport|france \d|tf1|m6|l'équipe|prime video|arte|w9|tmc)/i.test(l));
        channel = chLine || 'Chaîne TV';
      }

      const title = lines.find(l => !l.includes(time) && l !== channel && l.length > 4 && !/^(en direct|rediffusion|direct)$/i.test(l)) || '';
      const competition = lines.find(l => l !== title && l !== channel && !l.includes(time) && l.length > 3 && !/^(en direct|rediffusion|direct)$/i.test(l)) || sport;

      const key = `${time}-${title}`;
      if (title && time && !seen.has(key)) {
        seen.add(key);
        results.push({
          sport,
          time,
          title,
          competition,
          channel: channel.replace(/^Logo\s+/i, '').trim()
        });
      }
    }
    return results;
  });

  await browser.close();
  fs.mkdirSync('data', { recursive: true });
  fs.writeFileSync('data/sport.json', JSON.stringify(events, null, 2));
  console.log('Evenements sportifs extraits :', events.length);
})();