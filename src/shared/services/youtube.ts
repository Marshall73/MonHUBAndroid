export function isYouTubeVideoId(value: unknown): value is string {
  return typeof value === 'string' && /^[\w-]{11}$/.test(value);
}
