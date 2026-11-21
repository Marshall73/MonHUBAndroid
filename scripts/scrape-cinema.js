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
  await page.waitForFunction(() => /\d{1,2}:\d{2}/.test(document.body.innerText), { timeout: 15000 }).catch(() => {});
  await page.waitForTimeout(2000);

  try {
    const btn = page.locator('button:has-text("Accepter"), button:has-text("Tout accepter"), button:has-text("Continuer")').first();
    if (await btn.isVisible({ timeout: 2000 })) await btn.click();
    await page.waitForTimeout(1000);
  } catch (e) {}

  const films = await page.evaluate(() => {
    const timeRegex = /\b\d{1,2}:[0-5]\d\b/g;
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
      const times = Array.from(new Set((card.innerText.match(timeRegex) || []))).sort();
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
          duration: '',
          genre: '',
          director: '',
          cast: '',
          synopsis: ''
        });
      }
    }
    return results;
  });

  for (const film of films) {
    if (!film.link || film.link === 'https://lestoilesdulac.com/horaires/') continue;
    try {
      await page.goto(film.link, { waitUntil: 'domcontentloaded', timeout: 30000 });
      await page.waitForFunction(() => document.body.innerText.includes('Réalisation') || document.body.innerText.includes('min'), { timeout: 8000 }).catch(() => {});
      await page.waitForTimeout(800);

      const details = await page.evaluate(() => {
        const text = document.body.innerText || '';
        const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
        
        const dirLine = lines.find(l => l.match(/^(Réalisation|De)\s*:/i));
        const castLine = lines.find(l => l.match(/^(Casting|Avec)\s*:/i));
        
        const director = dirLine ? dirLine.replace(/^(Réalisation|De)\s*:\s*/i, '').trim() : '';
        const cast = castLine ? castLine.replace(/^(Casting|Avec)\s*:\s*/i, '').trim() : '';

        let duration = '';
        let genre = '';
        const durSpan = Array.from(document.querySelectorAll('span')).find(s => s.children.length === 0 && /^\d+\s*h\s*\d*\s*(min)?$/i.test(s.innerText.trim()));
        if (durSpan) {
          duration = durSpan.innerText.trim();
          const blockText = durSpan.parentElement?.parentElement?.innerText || ''; const genres = ['Comédie dramatique', 'Science fiction', 'Science-fiction', 'Comédie', 'Drame', 'Action', 'Thriller', 'Animation', 'Horreur', 'Épouvante', 'Aventure', 'Documentaire', 'Biopic', 'Policier', 'Romance', 'Fantastique', 'Historique', 'Musical', 'Famille', 'Guerre', 'Western']; genre = genres.filter(g => new RegExp('\\b' + g + '\\b', 'i').test(blockText)).join(', ');
        }
        
        const candidates = Array.from(document.querySelectorAll('p, div, span'))
          .filter(el => el.children.length === 0 || el.tagName === 'P')
          .map(el => el.innerText?.trim() || '')
          .filter(t => t.length > 90 && !t.includes('cookies') && !t.includes('Mentions légales') && !t.includes('© 2026') && !t.includes('Horaires'));
        candidates.sort((a, b) => b.length - a.length);

        return { duration, genre, director, cast, synopsis: candidates.at(0) || '' };
      });
      film.duration = details.duration;
      film.genre = details.genre;
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