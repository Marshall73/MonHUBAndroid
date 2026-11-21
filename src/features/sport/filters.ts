export const sports = [
  { genre: '', label: 'Tous' },
  { genre: 'Football', label: 'Foot', aliases: /\b(?:foot(?:ball)?|ligue [12]|premier league)\b/ },
  { genre: 'MMA', label: 'MMA', aliases: /\b(?:mma|ufc|bellator|pfl)\b/ },
  { genre: 'Motorsport', label: 'MotoGP', aliases: /\b(?:motorsport|motor sports|motogp|moto gp|moto[23]|formula 1|formule 1|f1)\b/ },
  { genre: 'Tennis', label: 'Tennis', aliases: /\b(?:tennis|atp|wta|roland.garros|wimbledon)\b/ },
  { genre: 'Rugby', label: 'Rugby', aliases: /\b(?:rugby|top 14|six nations)\b/ },
  { genre: 'Olympics', label: 'JO', aliases: /\b(?:jo|jeux olympiques|olympics|olympic games)\b/ },
] as const;

export type Sport = (typeof sports)[number];

export function searchable(value: string) {
  return value.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase();
}

export function matchesSport(sport: Sport, ...metadata: string[]) {
  return !('aliases' in sport) || sport.aliases.test(searchable(metadata.join(' ')));
}
