export const LIQUIPEDIA = 'https://liquipedia.net';
export const ESPORT_NEWS = 'https://www.esportnews.fr/tournois';

export const esportGames = [
  {
    id: 'rocketleague',
    name: 'Rocket League',
    tiers: ['S', 'A'],
    tierPages: ['S-Tier Tournaments', 'A-Tier Tournaments'],
  },
  {
    id: 'counterstrike',
    name: 'CS2',
    tiers: ['S', 'A'],
    tierPages: ['S-Tier Tournaments', 'A-Tier Tournaments'],
    esportNewsGame: 'csgo',
  },
  {
    id: 'trackmania',
    name: 'Trackmania',
    tiers: ['1', '2'],
    tierPages: ['Tier 1 Tournaments', 'Tier 2 Tournaments'],
  },
] as const;

export type EsportGame = (typeof esportGames)[number];

export type EsportTournament = {
  title: string;
  url: string;
  tier: EsportGame['tiers'][number];
  start: string;
  end: string;
};
