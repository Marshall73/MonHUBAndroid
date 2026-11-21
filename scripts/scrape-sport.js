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

  page.on('console', msg => {
    if (msg.type() === 'log' && msg.text().startsWith('[DEBUG COMP]')) {
      console.log(msg.text());
    }
  });

  const response = await page.goto(urlSport, { waitUntil: 'domcontentloaded', timeout: 60000 })
    .catch(async error => {
      await browser.close();
      throw error;
    });
  if (!response?.ok()) {
    const status = response?.status();
    console.error(`[LIGUES] Erreurs HTTP : ${status ? 1 : 0}`);
    await browser.close();
    throw new Error(status ? `Programme TV-Sports inaccessible : HTTP ${status}` : 'Aucune réponse de TV-Sports');
  }
  // Les cartes streaming peuvent n'avoir que <time datetime> et un état publié par TV-Sports.
  const leagueMatches = await page.evaluate(() => {
    const matches = new Map();
    const parisDate = new Intl.DateTimeFormat('sv-SE', { timeZone: 'Europe/Paris' });
    const parisTime = new Intl.DateTimeFormat('fr-FR', {
      timeZone: 'Europe/Paris', hour: '2-digit', minute: '2-digit'
    });
    const hasTimestamp = value => value && /T\d{2}:\d{2}.*(?:Z|[+-]\d{2}:\d{2})$/.test(value) &&
      Number.isFinite(Date.parse(value));
    const now = Date.now();

    for (const row of document.querySelectorAll('li.schedule-item[data-is-match="1"]')) {
      const link = row.querySelector('h3 a[href]');
      const match = link?.pathname.match(/-(serie-a|la-liga)-e(\d+)\/?$/);
      if (!match || !link.textContent.trim()) continue;
      if (['replay', 'show'].includes(row.dataset.scheduleType)) continue;

      const [, league, id] = match;
      const competition = league === 'serie-a' ? 'Serie A' : 'La Liga';
      const title = link.textContent.trim();
      const timingSelector = '[data-starts-at][data-ends-at]';
      const timing = row.matches(timingSelector) ? row : row.querySelector(timingSelector);
      const startAt = [timing?.dataset.startsAt, row.querySelector('time[datetime]')?.dateTime]
        .find(hasTimestamp);
      const publishedEnd = timing?.dataset.endsAt;
      const endAt = startAt && hasTimestamp(publishedEnd) && Date.parse(publishedEnd) > Date.parse(startAt)
        ? publishedEnd : undefined;
      const start = Date.parse(startAt);
      const statusLabel = row.querySelector('.schedule-status')?.textContent.trim() ?? '';
      const finished = row.dataset.isPast === '1' || row.dataset.scheduleSection === 'past' ||
        /^terminé/i.test(statusLabel) || (endAt && now >= Date.parse(endAt));
      const live = row.dataset.isLive === '1' || row.dataset.scheduleSection === 'current' ||
        /^en cours/i.test(statusLabel) || (endAt && now >= start);
      const status = finished ? 'Terminé' : live ? 'En cours' : 'Direct';

      const channels = [];
      for (const item of row.querySelectorAll('.schedule-channel__item')) {
        const country = item.dataset.channelCountry ??
          item.querySelector('[data-channel-country]')?.dataset.channelCountry ?? row.dataset.channelCountry;
        if (country !== 'FR') continue;
        const channel = item.querySelector('.schedule-channel__name')?.textContent.trim() ||
          item.querySelector('img.channel-logo[alt]')?.alt.trim() ||
          item.querySelector('[title]')?.getAttribute('title')?.trim() || item.textContent.trim();
        if (channel) channels.push(channel);
      }

      const fixtureKey = `${league}-${id}`;
      const fixture = matches.get(fixtureKey) ?? { competition, rows: [] };
      const date = startAt ? parisDate.format(start) : undefined;
      const time = startAt ? parisTime.format(start) : undefined;
      fixture.rows.push({ sport: 'Foot', time, status, date, startAt, endAt, title, competition, channels });
      matches.set(fixtureKey, fixture);
    }

    return [...matches.values()];
  });

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
      if (c.includes('bundesliga 2')) return null;

      const footballKeywords = [
        'ligue 1',
        'coupe de france',
        'premier league', 'fa cup', 'carabao cup',
        'la liga', 'copa del rey',
        'serie a', 'coppa italia',
        'bundesliga', 'dfb-pokal', 'liga portugal',
        'champions league', 'ligue des champions',
        'europa league', 'conference league',
        'copa libertadores', 'copa sudamericana',
        'championnat du monde des clubs', 'coupe du monde',
        'euro masculin', 'africa cup of nations',
        'coupe d afrique', 'can ', 'copa america'
      ];

      if (footballKeywords.some(keyword => c.includes(keyword))) return 'Foot';
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

      const scheduleItem = block.closest('li.schedule-item, article');
      const schedule = block.closest('[data-schedule-type]');
      const scheduleType = schedule?.getAttribute('data-schedule-type');

      const timing = scheduleItem?.querySelector('[data-starts-at][data-ends-at]') ??
        block.querySelector('[data-starts-at][data-ends-at]') ??
        schedule?.querySelector('[data-starts-at][data-ends-at]');

      const startAt = timing?.getAttribute('data-starts-at') || '';
      const endAt = timing?.getAttribute('data-ends-at') || '';

      if (!startAt || !endAt ||
          !Number.isFinite(Date.parse(startAt)) ||
          !Number.isFinite(Date.parse(endAt)) ||
          Date.parse(endAt) <= Date.parse(startAt)) continue;

      const finished = schedule?.getAttribute('data-is-past') === '1' ||
        schedule?.getAttribute('data-schedule-section') === 'past' ||
        lines.some(line => /^terminé(?:e)?$/i.test(line));
      const isLive = scheduleType
        ? ['live', 'streaming', 'show'].includes(scheduleType) || finished
        : /\b(Direct|En cours|Streaming)\b/i.test(text) || finished;
      const isExcluded = /\b(Rediffusion|Magazine|Sans diffusion TV|Aucune diffusion TV)\b/i.test(text);
      const compLine = lines.find(l => l.includes('·')) || text;

      if (/foot|football|⚽/i.test(text + ' ' + compLine)) {
        console.log('[DEBUG COMP] ' + JSON.stringify({
          text,
          compLine,
          scheduleType,
          isLive,
          isExcluded,
          startAt,
          endAt
        }));
      }

      if (!isLive || isExcluded) continue;

      const sport = normalizeSport(compLine);
      if (!sport) continue;

      const timeMatch = startAt.match(/T(\d{2}):(\d{2})/);
      if (!timeMatch) continue;
      const time = `${timeMatch[1]}:${timeMatch[2]}`;

      const rawH3 = block.querySelector('h3')?.innerText || '';
      const title = rawH3.replace(/[🔥✨⭐]/g, '').trim();
      if (!title || title.startsWith('▶')) continue;

      const competition = compLine.includes('·') ? compLine.split('·').at(-1).trim() : sport;
      if (/^(Serie A|La Liga)$/i.test(competition)) continue;

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
        date: startAt.slice(0, 10),
        startAt,
        endAt,
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


  let addedLeagueMatches = 0;
  let addedLeagueBroadcasts = 0;
  let duplicateRows = 0;
  let missingStart = 0;
  let missingEnd = 0;
  let missingChannel = 0;
  const matchesByLeague = { 'Serie A': 0, 'La Liga': 0 };

  for (const { competition, rows } of leagueMatches) {
    matchesByLeague[competition]++;
    const broadcasts = new Map();
    const hasStart = rows.some(row => row.startAt);
    const hasChannel = rows.some(row => row.channels.length);
    duplicateRows += rows.length - 1;
    if (!hasStart) missingStart++;
    if (hasStart && !rows.some(row => row.endAt)) missingEnd++;
    if (!hasChannel) missingChannel++;

    for (const { channels, ...event } of rows) {
      if (!event.startAt) continue;
      for (const channel of channels) {
        const key = channel.toLocaleLowerCase('fr-FR');
        const previous = broadcasts.get(key);
        if (!previous || (!previous.endAt && event.endAt)) {
          broadcasts.set(key, { ...event, channel });
        }
      }
    }

    if (broadcasts.size) addedLeagueMatches++;
    for (const event of broadcasts.values()) {
      collected.set(`${event.time}-${event.title}-${event.channel}`, event);
      addedLeagueBroadcasts++;
    }
  }

  console.log('[LIGUES]', {
    'Serie A détectés': matchesByLeague['Serie A'],
    'La Liga détectés': matchesByLeague['La Liga'],
    'Matchs ajoutés': addedLeagueMatches,
    'Diffusions ajoutées': addedLeagueBroadcasts,
    'Doublons de match ignorés': duplicateRows,
    'Matchs sans horaire de début': missingStart,
    'Matchs sans horaire de fin': missingEnd,
    'Matchs sans chaîne française': missingChannel,
    'Erreurs HTTP': 0
  });

  const finalEvents = Array.from(collected.values()).sort((a, b) => a.time.localeCompare(b.time));

  await browser.close();
  if (!finalEvents.length) throw new Error('Aucun programme TV-Sports extrait');

  fs.mkdirSync('data', { recursive: true });
  fs.writeFileSync('data/sport.json', JSON.stringify(finalEvents, null, 2));
  console.log('Total matchs captures palier par palier :', finalEvents.length);
})();
