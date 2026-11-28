import { isYouTubeVideoId } from '../../shared/services/youtube';
import { record, text, values } from '../feedXml';
import type { Trailer, TrailerSource } from './feeds';

const unitsInSeconds = {
  second: 1, minute: 60, hour: 3600, day: 86400, week: 604800, month: 2629800, year: 31557600,
};

function parsePublishedTime(label: string, now: number) {
  const age = label.trim().match(/^(?:Streamed |Premiered )?(\d+) (second|minute|hour|day|week|month|year)s? ago$/i);
  return age ? now - Number(age[1]) * unitsInSeconds[age[2].toLowerCase() as keyof typeof unitsInSeconds] * 1000 : null;
}

function youtubeText(value: unknown) {
  const node = record(value);
  return text(node.simpleText ?? node.content) || values(node.runs).map((run) => text(record(run).text)).join('');
}

export function parseYouTubeChannel(html: string, source: TrailerSource, now = Date.now()): Trailer[] {
  const data = html.match(/(?:var\s+ytInitialData|window\["ytInitialData"\])\s*=\s*(\{[\s\S]*?\})\s*;?\s*<\/script>/)?.[1];
  if (!data) throw new Error('Page YouTube illisible');

  const payload = record(JSON.parse(data));
  const metadata = record(record(payload.metadata).channelMetadataRenderer);
  const contents = record(payload.contents);
  const tabs = record(contents.twoColumnBrowseResultsRenderer).tabs;
  const tab = values(tabs).map((entry) => record(record(entry).tabRenderer)).find((entry) => entry.selected === true);
  const grid = record(record(tab?.content).richGridRenderer);
  if (!Array.isArray(grid.contents)) throw new Error('Onglet Vidéos introuvable');

  const trailers = new Map<string, Trailer>();
  for (const row of grid.contents) {
    const card = record(record(record(row).richItemRenderer).content);
    const modern = record(card.lockupViewModel);
    const legacy = record(card.videoRenderer);
    const videoId = modern.contentType === 'LOCKUP_CONTENT_TYPE_VIDEO' ? modern.contentId : legacy.videoId;
    if (!isYouTubeVideoId(videoId) || trailers.has(videoId)) continue;

    const info = record(record(modern.metadata).lockupMetadataViewModel);
    const title = youtubeText(info.title ?? legacy.title).trim();
    if (!title) continue;

    const rows = values(record(record(info.metadata).contentMetadataViewModel).metadataRows);
    const dates = rows.flatMap((row) => values(record(row).metadataParts).map((part) => text(record(part).accessibilityLabel)));
    dates.push(youtubeText(legacy.publishedTimeText));
    const timestamp = dates.map((label) => parsePublishedTime(label, now)).find((date) => date !== null) ?? null;
    const url = `https://www.youtube.com/watch?v=${videoId}`;
    trailers.set(videoId, {
      key: url, url, videoId, title, timestamp, source,
      channel: text(metadata.title) || source.name,
      thumbnail: `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`,
    });
  }

  if (!trailers.size && grid.contents.length) throw new Error('Vidéos YouTube illisibles');
  return [...trailers.values()];
}
