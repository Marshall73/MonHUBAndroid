const { chromium } = require('playwright');
const fs = require('fs');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
    locale: 'fr-FR'
  });
  const page = await context.newPage();

  // 1. Espionne les requêtes API internes du site pendant le chargement
  const apiPayloads = [];
  page.on('response', async (res) => {
    const url = res.url();
    if (res.request().resourceType() === 'xhr' || res.request().resourceType() === 'fetch') {
      try {
        const json = await res.json();
        apiPayloads.push({ url, json });
      } catch (e) {}
    }
  });

  await page.goto('https://lestoilesdulac.com/horaires/', { waitUntil: 'networkidle', timeout: 60000 });
  await page.waitForTimeout(4000);

  // Accepter les cookies si une bannière bloque l'affichage
  try {
    const btn = page.locator('button:has-text("Accepter"), button:has-text("Tout accepter"), button:has-text("Continuer")').first();
    if (await btn.isVisible({ timeout: 2000 })) await btn.click();
    await page.waitForTimeout(2000);
  } catch (e) {}

  // 2. Analyse générique du DOM (remonte depuis chaque horaire HH:MM vers sa carte film)
  const films = await page.evaluate(() => {
    const timeRegex = /\b([01]?\d|2[0-3]):[0-5]\d\b/g;
    const allElements = Array.from(document.querySelectorAll('div, article, section, li'));
    
    // Trouve les conteneurs qui ont une image (affiche) ET au moins un horaire
    const movieCards = allElements.filter(el => {
      const hasImg = el.querySelector('img');
      const text = el.innerText || '';
      const times = text.match(timeRegex);
      return hasImg && times && times.length >= 1 && text.length < 1500 && text.length > 15;
    });

    // Garde uniquement les cartes les plus précises (qui ne contiennent pas d'autres cartes)
    const leafCards = movieCards.filter(card => !movieCards.some(other => other !== card && card.contains(other)));

    const results = [];
    const seen = new Set();

    for (const card of leafCards) {
      const lines = card.innerText.split('\n').map(l => l.trim()).filter(Boolean);
      const times = Array.from(new Set((card.innerText.match(timeRegex) || [])));
      // Le titre est généralement la première ligne textuelle qui n'est pas une heure ni un tag court (VF/VOST)
      const title = lines.find(l => !l.match(/^\d{1,2}:\d{2}$/) && l.length > 2 && !['VF', 'VOST', 'VOSTFR', '2D', '3D', 'Achat rapide'].includes(l));
      const poster = card.querySelector('img')?.src || '';

      if (title && times.length > 0 && !seen.has(title)) {
        seen.add(title);
        results.push({
          cinema: 'Les Toiles du Lac - Aix-les-Bains',
          title,
          poster,
          times
        });
      }
    }
    return results;
  });

  await browser.close();
  fs.mkdirSync('data', { recursive: true });
  fs.writeFileSync('data/cinema.json', JSON.stringify(films, null, 2));
  console.log('Films extraits :', films.length);
  if (films.length === 0) {
    console.log('URLs API detectees :', apiPayloads.map(p => p.url));
  }
})();