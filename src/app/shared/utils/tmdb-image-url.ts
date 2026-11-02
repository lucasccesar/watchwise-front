export function tmdbImageUrl(path: string | null | undefined, size: 'w342' | 'w500' | 'w780' | 'w1280' | 'w1920'): string | null {
  if (!path?.trim()) return null;
  if (/^https?:\/\//i.test(path)) return path;
  return `https://image.tmdb.org/t/p/${size}${path.startsWith('/') ? path : `/${path}`}`;
}
