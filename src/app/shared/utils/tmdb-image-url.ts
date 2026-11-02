export function tmdbImageUrl(path: string | null | undefined, size: 'w342' | 'w500' | 'w780' | 'w1280' | 'w1920'): string | null {
  const imagePath = path?.trim();
  if (!imagePath) return null;
  if (/^https?:\/\//i.test(imagePath)) return imagePath;

  const filename = imagePath.replace(/^\/+/, '');
  return filename ? `https://image.tmdb.org/t/p/${size}/${filename}` : null;
}
