const { chromium } = require('playwright');
const fs = require('fs');

(async () => {
  const urlSport = 'https://' + 'www.programme-tv.net/programme/sport.html';
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
    locale: 'fr-FR'
  });
  const page = await context.newPage();

  await page.goto(urlSport, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForTimeout(3000);

  // Accepter les cookies si besoin
  try {
    const btn = page.locator('button:has-text("Accepter"), button:has-text("Continuer sans accepter"), #didomi-notice-agree-button').first();
    if (await btn.isVisible({ timeout: 3000 })) await btn.click();
    await page.waitForTimeout(1500);
  } catch (e) {}

  const events = await page.evaluate(() => {
    const normalizeSport = (rawText) => {
      const t = rawText.toLowerCase();
      if (t.includes('mma') || t.includes('ufc') || t.includes('pfl') || t.includes('bellator') || t.includes('ares') || t.includes('ksW')) return 'MMA';
      if (t.includes('motogp') || t.includes('moto gp') || t.includes('moto2') || t.includes('moto3') || t.includes('grand prix moto')) return 'MotoGP';
      if (t.includes('tennis') || t.includes('atp') || t.includes('wta') || t.includes('roland-garros') || t.includes('davis') || t.includes('wimbledon')) return 'Tennis';
      if (t.includes('jeux olympiques') || t.includes('jo ') || t.includes('olympique')) return 'JO';
      if (t.includes('football') || t.includes('ligue 1') || t.includes('ligue 2') || t.includes('champions league') || t.includes('europa') || t.includes('premier league') || t.includes('liga') || t.includes('serie a') || t.includes('bundesliga') || t.includes('coupe de france') || t.includes('équipe de france')) return 'Foot';
      return null;
    };

    const cards = Array.from(document.querySelectorAll('article, li, [class*="program"], [class*="broadcast"], [class*="event"], [class*="card"]'))
      .filter(el => {
        const txt = el.innerText || '';
        return /\b\d{1,2}[h:]\d{2}\b/.test(txt) && txt.length > 15 && txt.length < 600;
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

      // Cherche le nom de la chaîne (attribut alt/title d'une image de logo TV ou texte dédié)
      const channelImg = card.querySelector('img[alt*="Canal"], img[alt*="beIN"], img[alt*="RMC"], img[alt*="DAZN"], img[alt*="Eurosport"], img[alt*="France"], img[alt*="TF1"], img[alt*="M6"], img[alt*="Équipe"], img[alt]');
      let channel = channelImg?.getAttribute('alt') || channelImg?.getAttribute('title') || '';
      if (!channel) {
        const chLine = lines.find(l => /(canal\+|bein|rmc|dazn|eurosport|france \d|tf1|m6|l'équipe|prime video)/i.test(l));
        channel = chLine || 'Chaîne TV';
      }

      const title = lines.find(l => !l.includes(time) && l !== channel && l.length > 4) || lines.at(0) || '';
      const competition = lines.find(l => l !== title && l !== channel && !l.includes(time) && l.length > 3) || sport;

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