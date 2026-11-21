const { chromium } = require('playwright');
const fs = require('fs');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
    locale: 'fr-FR'
  });
  const page = await context.newPage();

  await page.goto('https://lestoilesdulac.com/horaires/', { waitUntil: 'networkidle', timeout: 60000 });
  await page.waitForTimeout(3000);

  try {
    const btn = page.locator('button:has-text("Accepter"), button:has-text("Tout accepter"), button:has-text("Continuer")').first();
    if (await btn.isVisible({ timeout: 2000 })) await btn.click();
    await page.waitForTimeout(1500);
  } catch (e) {}

  // 1. Récupère la liste des films, horaires et liens vers leurs fiches
  const films = await page.evaluate(() => {
    const timeRegex = /\b(?\d|2[0-3]):[0-5]\d\b/g;
    const allElements = Array.from(document.querySelectorAll('div, article, section, li'));
    const movieCards = allElements.filter(el => {
      const hasImg = el.querySelector('img');
      const text = el.innerText || '';
      const times = text.match(timeRegex);
      return hasImg && times && times.length >= 1 && text.length < 1500 && text.length > 15;
    });
    const leafCards = movieCards.filter(card => !movieCards.some(other => other !== card && card.contains(other)));

    const results = [];
    const seen = new Set();

    for (const card of leafCards) {
      const lines = card.innerText.split('\n').map(l => l.trim()).filter(Boolean);
      const times = Array.from(new Set((card.innerText.match(timeRegex) || [])));
      const title = lines.find(l => !l.match(/^\d{1,2}:\d{2}$/) && l.length > 2 && !['VF', 'VOST', 'VOSTFR', '2D', '3D', 'Achat rapide'].includes(l));
      const poster = card.querySelector('img')?.src || '';
      const link = card.querySelector('a[href*="/film"], a[href*="/movie"], a')?.href || '';

      if (title && times.length > 0 && !seen.has(title)) {
        seen.add(title);
        results.push({
          cinema: 'Les Toiles du Lac - Aix-les-Bains',
          title,
          poster,
          times,
          link,
          director: '',
          cast: '',
          synopsis: ''
        });
      }
    }
    return results;
  });

  // 2. Visite chaque fiche film pour extraire Réalisation, Casting et Synopsis
  for (const film of films) {
    if (!film.link || film.link === 'https://lestoilesdulac.com/horaires/') continue;
    try {
      await page.goto(film.link, { waitUntil: 'domcontentloaded', timeout: 20000 });
      await page.waitForTimeout(1200);
      const details = await page.evaluate(() => {
        const text = document.body.innerText || '';
        const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
        
        const dirLine = lines.find(l => l.match(/^(Réalisation|De)\s*:/i));
        const castLine = lines.find(l => l.match(/^(Casting|Avec)\s*:/i));
        
        const director = dirLine ? dirLine.replace(/^(Réalisation|De)\s*:\s*/i, '').trim() : '';
        const cast = castLine ? castLine.replace(/^(Casting|Avec)\s*:\s*/i, '').trim() : '';
        
        // Le synopsis est généralement le paragraphe le plus long de la page
        const paragraphs = Array.from(document.querySelectorAll('p, [class*="synopsis"], [class*="description"]'))
          .map(p => p.innerText?.trim() || '')
          .filter(t => t.length > 80 && !t.includes('cookies') && !t.includes('Mentions légales'));
        paragraphs.sort((a, b) => b.length - a.length);

        return { director, cast, synopsis: paragraphs[0] || '' };
      });
      film.director = details.director;
      film.cast = details.cast;
      film.synopsis = details.synopsis;
    } catch (e) {}
  }

  await browser.close();
  fs.mkdirSync('data', { recursive: true });
  fs.writeFileSync('data/cinema.json', JSON.stringify(films, null, 2));
  console.log('Films enrichis :', films.length);
})();