const { chromium } = require('playwright');
const fs = require('fs');

(async () => {
  const base = 'https://' + 'tv-sports.fr';
  const sportPages = [
    { sport: 'Foot', url: `${base}/foot/` },
    { sport: 'MMA', url: `${base}/mma/` },
    { sport: 'MotoGP', url: `${base}/moto-gp/` },
    { sport: 'Tennis', url: `${base}/tennis/` },
    { sport: 'Rugby', url: `${base}/rugby/` }
  ];

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
    locale: 'fr-FR'
  });
  const page = await context.newPage();

  const allEvents = [];
  const seen = new Set();

  for (const target of sportPages) {
    try {
      await page.goto(target.url, { waitUntil: 'networkidle', timeout: 45000 });
      await page.waitForTimeout(2000);

      // Fermer la bannière cookies au premier passage
      try {
        const cookieBtn = page.locator('button:has-text("Accepter"), button:has-text("Tout accepter"), button:has-text("Continuer")').first();
        if (await cookieBtn.isVisible({ timeout: 1500 })) await cookieBtn.click();
      } catch (e) {}

      // Cliquer sur "Voir les diffusions terminées" pour récupérer aussi les matchs de la journée déjà joués
      try {
        const pastBtn = page.locator('button:has-text("Voir les diffusions terminées"), a:has-text("Voir les diffusions terminées")').first();
        if (await pastBtn.isVisible({ timeout: 2000 })) {
          await pastBtn.click();
          await page.waitForTimeout(1000);
        }
      } catch (e) {}

      // Défile pour charger toute la grille de la journée
      await page.evaluate(async () => {
        for (let i = 0; i < 6; i++) {
          window.scrollBy(0, 1500);
          await new Promise(r => setTimeout(r, 300));
        }
      });

      const pageEvents = await page.evaluate((sportName) => {
        const blocks = Array.from(document.querySelectorAll('li, article, div'))
          .filter(el => {
            const txt = el.innerText || '';
            return /\b\d{1,2}h\d{2}\b/.test(txt) && el.querySelector('h3') && txt.length < 400;
          });

        const leafBlocks = blocks.filter(b => !blocks.some(o => o !== b && b.contains(o)));
        const items = [];

        for (const block of leafBlocks) {
          const text = block.innerText || '';
          const lines = text.split('\n').map(l => l.trim()).filter(Boolean);

          // Garde Direct, En cours, Streaming direct (exclut Rediffusion, Magazine et Sans diffusion TV)
          const isLive = /\b(Direct|En cours|Streaming)\b/i.test(text);
          const isExcluded = /\b(Rediffusion|Magazine|Sans diffusion TV|Aucune diffusion TV)\b/i.test(text);
          if (!isLive || isExcluded) continue;

          const timeMatch = text.match(/\b(\d{1,2})h(\d{2})\b/);
          if (!timeMatch) continue;
          const time = `${timeMatch.at(1).padStart(2, '0')}:${timeMatch.at(2)}`;

          const rawH3 = block.querySelector('h3')?.innerText || '';
          const title = rawH3.replace(/[🔥✨⭐]/g, '').trim();
          if (!title || title.startsWith('▶')) continue;

          const compLine = lines.find(l => l.includes('·')) || sportName;
          const competition = compLine.split('·').at(-1)?.trim() || sportName;

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

          items.push({
            sport: sportName,
            time,
            status: /\bEn cours\b/i.test(text) ? 'En cours' : 'Direct',
            title,
            competition,
            channel
          });
        }
        return items;
      }, target.sport);

      for (const ev of pageEvents) {
        const key = `${ev.sport}-${ev.time}-${ev.title}-${ev.channel}`;
        if (!seen.has(key)) {
          seen.add(key);
          allEvents.push(ev);
        }
      }
    } catch (e) {
      console.warn(`Erreur sur ${target.url}:`, e.message);
    }
  }

  await browser.close();
  allEvents.sort((a, b) => a.time.localeCompare(b.time));

  fs.mkdirSync('data', { recursive: true });
  fs.writeFileSync('data/sport.json', JSON.stringify(allEvents, null, 2));
  console.log('Total matchs en Direct extraits :', allEvents.length);
})();