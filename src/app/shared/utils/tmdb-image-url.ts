export type TmdbImageSize = 'w92' | 'w154' | 'w185' | 'w342' | 'w500' | 'w780' | 'w1280' | 'w1920';

export function tmdbImageUrl(path: string | null | undefined, size: TmdbImageSize): string | null {
  const imagePath = path?.trim();
  if (!imagePath) return null;
  if (/^https?:\/\//i.test(imagePath)) {
    return imagePath
      .replaceAll('w{size}', size)
      .replace(/(\/t\/p\/)w\d+(?=\/)/, `$1${size}`);
  }

  const filename = imagePath.replace(/^\/+/, '');
  return filename ? `https://image.tmdb.org/t/p/${size}/${filename}` : null;
}
