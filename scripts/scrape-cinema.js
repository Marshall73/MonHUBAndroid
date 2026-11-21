const { chromium } = require('playwright');
const fs = require('fs');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  await page.goto('https://lestoilesdulac.com/horaires/', { waitUntil: 'networkidle', timeout: 60000 });
  await page.waitForTimeout(3000);

  const films = await page.evaluate(() => {
    const timeRegex = /\b([01]?\d|2[0-3]):[0-5]\d\b/g;
    const blocks = Array.from(document.querySelectorAll('article, .film-item, [class*="movie"], [class*="film"], [class*="seance"], li'))
      .filter(el => el.querySelector('h1, h2, h3, h4, .title') && timeRegex.test(el.innerText));

    const unique = new Map();
    for (const el of blocks) {
      const title = el.querySelector('h1, h2, h3, h4, .title')?.innerText?.trim();
      if (!title || unique.has(title)) continue;
      const poster = el.querySelector('img')?.src || '';
      const times = Array.from(new Set(el.innerText.match(timeRegex) || []));
      if (times.length > 0) {
        unique.set(title, {
          cinema: 'Les Toiles du Lac - Aix-les-Bains',
          title,
          poster,
          times
        });
      }
    }
    return Array.from(unique.values());
  });

  await browser.close();
  fs.mkdirSync('data', { recursive: true });
  fs.writeFileSync('data/cinema.json', JSON.stringify(films, null, 2));
  console.log('Films trouves :', films.length);
})();