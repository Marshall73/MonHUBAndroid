const fs = require('fs');
const zlib = require('zlib');

(async () => {
  // URL officielle du guide XMLTV France quotidien (xmltvfr.fr)
  const xmlUrl = 'https://' + 'xmltvfr.fr/xmltv/xmltv_fr.xml.gz';
  let xmlText = '';

  try {
    const res = await fetch(xmlUrl);
    if (res.ok) {
      const buf = Buffer.from(await res.arrayBuffer());
      xmlText = zlib.gunzipSync(buf).toString('utf-8');
    } else {
      const resPlain = await fetch('https://' + 'xmltvfr.fr/xmltv/xmltv_fr.xml');
      if (resPlain.ok) xmlText = await resPlain.text();
    }
  } catch (e) {
    console.error('Erreur telechargement XMLTV:', e.message);
  }

  if (!xmlText) {
    console.log('XMLTV indisponible');
    return;
  }

  // 1. Associe chaque ID de chaîne à son nom propre (ex: CanalPlus.fr -> Canal+)
  const channels = {};
  const chRegex = /<channel id="([^"]+)">[\s\S]*?<display-name[^>]*>([^<]+)<\/display-name>/g;
  let m;
  while ((m = chRegex.exec(xmlText)) !== null) {
    channels[m[1]] = m[2].trim();
  }

  // 2. Extrait les programmes d'aujourd'hui
  const todayStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const progRegex = /<programme start="(\d{12})[^"]*" stop="(\d{12})[^"]*" channel="([^"]+)">([\s\S]*?)<\/programme>/g;

  const detectSport = (text) => {
    const t = text.toLowerCase();
    if (t.includes('mma') || t.includes('ufc') || t.includes('pfl') || t.includes('ares') || t.includes('ksw') || t.includes('bellator')) return 'MMA';
    if (t.includes('motogp') || t.includes('moto gp') || t.includes('moto2') || t.includes('moto3') || t.includes('grand prix moto')) return 'MotoGP';
    if (t.includes('tennis') || t.includes('atp') || t.includes('wta') || t.includes('roland-garros') || t.includes('wimbledon') || t.includes('coupe davis')) return 'Tennis';
    if (t.includes('jeux olympiques') || t.includes('jo ') || t.includes('olympique')) return 'JO';
    if (t.includes('football') || t.includes('ligue 1') || t.includes('ligue 2') || t.includes('champions league') || t.includes('europa league') || t.includes('premier league') || t.includes('liga') || t.includes('serie a') || t.includes('bundesliga') || t.includes('coupe de france')) return 'Foot';
    if (t.includes('rugby') || t.includes('top 14') || t.includes('six nations') || t.includes('champions cup')) return 'Rugby';
    return null;
  };

  const results = [];
  const seen = new Set();

  while ((m = progRegex.exec(xmlText)) !== null) {
    const startRaw = m[1]; // YYYYMMDDHHMM
    if (!startRaw.startsWith(todayStr)) continue;

    const chId = m[3];
    const body = m[4];
    const channelName = channels[chId] || chId;

    const titleMatch = body.match(/<title[^>]*>([^<]+)<\/title>/);
    const subTitleMatch = body.match(/<sub-title[^>]*>([^<]+)<\/sub-title>/);
    const catMatch = body.match(/<category[^>]*>([^<]+)<\/category>/);

    const title = titleMatch ? titleMatch[1].trim() : '';
    const subTitle = subTitleMatch ? subTitleMatch[1].trim() : '';
    const category = catMatch ? catMatch[1].trim() : '';

    const fullText = `${title} ${subTitle} ${category} ${channelName}`;
    const sport = detectSport(fullText);
    if (!sport) continue;

    const hour = startRaw.slice(8, 10);
    const min = startRaw.slice(10, 12);
    const time = `${hour}:${min}`;

    const key = `${time}-${channelName}-${title}`;
    if (!seen.has(key)) {
      seen.add(key);
      results.push({
        sport,
        time,
        title: subTitle ? `${title} - ${subTitle}` : title,
        competition: category || sport,
        channel: channelName
      });
    }
  }

  results.sort((a, b) => a.time.localeCompare(b.time));
  fs.mkdirSync('data', { recursive: true });
  fs.writeFileSync('data/sport.json', JSON.stringify(results, null, 2));
  console.log('Programmes TV Sport FR extraits :', results.length);
})();