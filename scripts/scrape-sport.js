const { chromium } = require('playwright');
const fs = require('fs');

(async () => {
  const urlSport = 'https://tv-sports.fr/?passes=1';
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
    locale: 'fr-FR'
  });
  const page = await context.newPage();

  await page.goto(urlSport, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForTimeout(2500);

  try {
    const btn = page.locator('button:has-text("Accepter"), button:has-text("Tout accepter"), button:has-text("Continuer")').first();
    if (await btn.isVisible({ timeout: 2500 })) await btn.click();
    await page.waitForTimeout(1000);
  } catch (e) {}

  for (const label of ['Rediffusions', 'Magazines', 'Sans diffusion TV']) {
    try {
      const filterEl = page.locator(`label:has-text("${label}"), button:has-text("${label}")`).first();
      if (await filterEl.isVisible({ timeout: 1500 })) {
        await filterEl.click();
        await page.waitForTimeout(400);
      }
    } catch (e) {}
  }

  // Fonction d'extraction appelée à chaque cran de défilement pour contourner la virtualisation DOM
  const extractVisible = () => page.evaluate(() => {
    const today = new Intl.DateTimeFormat('sv-SE', {
      timeZone: 'Europe/Paris',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(new Date());
    const normalizeSport = (compLine) => {
      const c = compLine.toLowerCase();
      if (c.includes('basket') || c.includes('nba') || c.includes('liga endesa') || c.includes('ncaa') || c.includes('euroligue') || c.includes('betclic') || c.includes('pro a') || c.includes('pro b')) return null;
      if (c.includes('football américain') || c.includes('nfl') || c.includes('hockey') || c.includes('nhl') || c.includes('handball') || c.includes('volley') || c.includes('golf') || c.includes('hippisme') || c.includes('patinage') || c.includes('ski') || c.includes('e-sport') || c.includes('billard') || c.includes('fléchettes') || c.includes('voile') || c.includes('équitation') || c.includes('equitation')) return null;

      if (c.includes('mma') || c.includes('ufc') || c.includes('ksw') || c.includes('pfl') || c.includes('bellator') || c.includes('ares') || c.includes('arts martiaux')) return 'MMA';
      if (c.includes('moto gp') || c.includes('motogp') || c.includes('moto2') || c.includes('moto3') || c.includes('motocyclisme')) return 'MotoGP';
      if (c.includes('tennis') || c.includes('atp') || c.includes('wta') || c.includes('billie jean') || c.includes('roland') || c.includes('wimbledon')) return 'Tennis';
      if (c.includes('jeux olympiques') || c.includes('jo ') || c.includes('olympique')) return 'JO';
      if (c.includes('rugby') || c.includes('top 14') || c.includes('championnat des nations') || c.includes('six nations') || c.includes('pro d2')) return 'Rugby';
      if (c.includes('foot') || c.includes('ligue 1') || c.includes('ligue 2') || c.includes('ligue 3') || c.includes('premier league') || c.includes('bundesliga') || c.includes('la liga') || c.includes('serie a') || c.includes('champions') || c.includes('sudamericana') || c.includes('eredivisie') || c.includes('süper lig')) return 'Foot';
      return null;
    };

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

      const schedule = block.closest('[data-schedule-type]');
      const scheduleType = schedule?.getAttribute('data-schedule-type');
      const finished = schedule?.getAttribute('data-is-past') === '1' ||
        schedule?.getAttribute('data-schedule-section') === 'past' ||
        lines.some(line => /^terminé(?:e)?$/i.test(line));
      const isLive = scheduleType
        ? scheduleType === 'live' || scheduleType === 'streaming'
        : /\b(Direct|En cours|Streaming)\b/i.test(text) || finished;
      const isExcluded = /\b(Rediffusion|Magazine|Sans diffusion TV|Aucune diffusion TV)\b/i.test(text);
      if (!isLive || isExcluded) continue;

      const compLine = lines.find(l => l.includes('·')) || text;
      const sport = normalizeSport(compLine);
      if (!sport) continue;

      const timeMatch = text.match(/\b(\d{1,2})h(\d{2})\b/);
      if (!timeMatch) continue;
      const time = `${timeMatch.at(1).padStart(2, '0')}:${timeMatch.at(2)}`;

      const rawH3 = block.querySelector('h3')?.innerText || '';
      const title = rawH3.replace(/[🔥✨⭐]/g, '').trim();
      if (!title || title.startsWith('▶')) continue;

      const competition = compLine.includes('·') ? compLine.split('·').at(-1).trim() : sport;

      const imgs = Array.from(block.querySelectorAll('img[alt], img[title]'))
        .map(img => (img.getAttribute('alt') || img.getAttribute('title') || '').trim())
        .filter(a => a && a.length > 1 && !a.includes(title) && !/^(Direct|En cours|Streaming|Terminé)$/i.test(a));

      let channel = imgs.at(-1) || '';
      if (!channel) {
        channel = lines.find(l =>
          !l.includes(title) &&
          !l.includes('·') &&
          !/^\d{1,2}h\d{2}$/.test(l) &&
          !/^(VS|Direct|En cours|Streaming|Terminé)$/i.test(l) &&
          l.length > 1 && l.length < 35
        ) || 'Chaîne TV';
      }

      items.push({
        sport,
        time,
        status: finished ? 'Terminé' : /\bEn cours\b/i.test(text) ? 'En cours' : 'Direct',
        date: (block.querySelector('[data-starts-at]') ?? schedule?.querySelector('[data-starts-at]'))
          ?.getAttribute('data-starts-at')?.slice(0, 10) || today,
        title,
        competition,
        channel
      });
    }
    return items;
  });

  // Capture du haut jusqu'en bas palier par palier
  const collected = new Map();
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.waitForTimeout(500);

  for (let step = 0; step < 30; step++) {
    const batch = await extractVisible();
    for (const ev of batch) {
      const key = `${ev.time}-${ev.title}-${ev.channel}`;
      if (!collected.has(key) || ev.status === 'Terminé') collected.set(key, ev);
    }
    const atBottom = await page.evaluate(() => {
      window.scrollBy(0, 800);
      return window.innerHeight + window.scrollY >= document.body.scrollHeight - 50;
    });
    await page.waitForTimeout(350);
    if (atBottom && step > 5) break;
  }

  const finalEvents = Array.from(collected.values()).sort((a, b) => a.time.localeCompare(b.time));

  await browser.close();
  fs.mkdirSync('data', { recursive: true });
  fs.writeFileSync('data/sport.json', JSON.stringify(finalEvents, null, 2));
  console.log('Total matchs captures palier par palier :', finalEvents.length);
})();
