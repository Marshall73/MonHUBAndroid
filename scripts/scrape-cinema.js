const { chromium } = require('playwright');
const fs = require('fs');

(async () => {
  const urlCinema = 'https://' + 'lestoilesdulac' + '.com/horaires/';
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
    locale: 'fr-FR'
  });
  const page = await context.newPage();

  await page.goto(urlCinema, { waitUntil: 'networkidle', timeout: 60000 });
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
    if (!film.link || film.link === urlCinema) continue;

    try {
      await page.goto(film.link, {
        waitUntil: 'domcontentloaded',
        timeout: 30000
      });

      await page.waitForFunction(() => {
        const text = document.body.innerText || '';
        return (
          text.includes('Réalisation') ||
          text.includes('Casting') ||
          /\d+\s*h\s*\d+\s*min/i.test(text)
        );
      }, { timeout: 15000 }).catch(() => {});

      const details = await page.evaluate(() => {
        const text = document.body.innerText || '';
        const lines = text.split('\n').map(l => l.trim()).filter(Boolean);

        const dirLine = lines.find(l => /^(Réalisation|De)\s*:/i.test(l));
        const director = dirLine ? dirLine.replace(/^(Réalisation|De)\s*:\s*/i, '').trim() : '';

        const castLine = lines.find(l => /^(Casting|Avec)\s*:/i.test(l));
        const cast = castLine ? castLine.replace(/^(Casting|Avec)\s*:\s*/i, '').trim() : '';

        let duration = '';
        const durSpan = Array.from(document.querySelectorAll('span'))
          .find(s => s.children.length === 0 && /^\d+\s*h\s*\d*\s*(min)?$/i.test(s.innerText.trim()));

        if (durSpan) duration = durSpan.innerText.trim();

        // GENRES : méthode 1 - JSON-LD
        let genre = '';
        const normalizeGenres = value => {
          if (!value) return '';
          if (Array.isArray(value)) return value.map(v => typeof v === 'string' ? v : v.name || '').filter(Boolean).join(', ');
          if (typeof value === 'string') return value;
          if (typeof value === 'object') return value.name || '';
          return '';
        };

        const scripts = document.querySelectorAll('script[type="application/ld+json"]');
        for (const script of scripts) {
          try {
            const data = JSON.parse(script.textContent);
            const objects = Array.isArray(data) ? data : [data];
            for (const obj of objects) {
              const candidates = [obj, ...(obj['@graph'] || [])];
              for (const item of candidates) {
                const found = normalizeGenres(item.genre);
                if (found) { genre = found; break; }
              }
              if (genre) break;
            }
          } catch (e) {}
          if (genre) break;
        }

        // GENRES : méthode 2 - métadonnées HTML
        if (!genre) {
          const metas = ['meta[property="video:tag"]', 'meta[property="article:tag"]', 'meta[name="keywords"]'];
          for (const selector of metas) {
            const values = Array.from(document.querySelectorAll(selector)).map(el => el.content || '').filter(Boolean);
            if (values.length) {
              const value = values.join(', ');
              if (/comédie|drame|action|aventure|thriller|animation|science-fiction|fantastique|horreur|documentaire/i.test(value)) {
                genre = value;
                break;
              }
            }
          }
        }

        // GENRES : méthode 3 - champs explicitement nommés
        if (!genre) {
          const genreLine = lines.find(line => /^Genres?\s*:\s*\S+/i.test(line));
          if (genreLine) genre = genreLine.replace(/^Genres?\s*:\s*/i, '').trim();
        }

        // GENRES : méthode 4 - éléments HTML voisins du libellé
        if (!genre) {
          const labels = Array.from(document.querySelectorAll('dt, strong, b, span, p, div, li'));
          for (const el of labels) {
            const label = el.innerText?.trim() || '';
            if (/^Genres?\s*:?\s*$/i.test(label)) {
              const next = el.nextElementSibling;
              const parent = el.parentElement;
              genre = next?.innerText?.trim() || parent?.innerText?.replace(label, '').trim() || '';
              if (genre && genre.length < 150) break;
              genre = '';
            }
          }
        }

        // GENRES : méthode 5 - proximité de la durée
        if (!genre && durSpan) {
          const parent = durSpan.parentElement;
          const blockText = [
            parent?.innerText || '',
            parent?.parentElement?.innerText || '',
            parent?.parentElement?.parentElement?.innerText || ''
          ].join(' ');

          const knownGenres = [
            'Comédie dramatique', 'Science-fiction', 'Science fiction', 'Comédie', 'Drame',
            'Action', 'Thriller', 'Animation', 'Horreur', 'Épouvante', 'Aventure',
            'Documentaire', 'Biopic', 'Policier', 'Romance', 'Fantastique',
            'Historique', 'Musical', 'Famille', 'Guerre', 'Western'
          ];

          genre = knownGenres
            .filter(g => blockText.toLowerCase().includes(g.toLowerCase()))
            .join(', ');
        }

        // Synopsis
        const candidates = Array.from(document.querySelectorAll('p, div, span'))
          .filter(el => el.children.length === 0 || el.tagName === 'P')
          .map(el => el.innerText?.trim() || '')
          .filter(t => t.length > 90 && !t.includes('cookies') && !t.includes('Mentions légales') && !t.includes('© 2026') && !t.includes('Horaires'));

        candidates.sort((a, b) => b.length - a.length);

        return {
          duration,
          genre,
          director,
          cast,
          synopsis: candidates.at(0) || ''
        };
      });

      film.duration = details.duration;
      film.genre = details.genre;
      film.director = details.director;
      film.cast = details.cast;
      film.synopsis = details.synopsis;

      console.log(`${film.title} | Genre trouvé : ${film.genre || 'NON TROUVÉ'}`);
    } catch (e) {
      console.warn(`Erreur pour ${film.title} :`, e.message);
    }
  }

  await browser.close();
  fs.mkdirSync('data', { recursive: true });
  fs.writeFileSync('data/cinema.json', JSON.stringify(films, null, 2));
  console.log('Films enrichis :', films.length);
})();