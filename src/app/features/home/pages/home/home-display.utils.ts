export interface HomeContentRouteTarget {
  type: string | null;
  tmdbId?: string | null;
  seriesTmdbId?: string | null;
  seasonNumber?: number | null;
  episodeNumber?: number | null;
}

/** Formats the caller's local calendar date without consulting the API or clock. */
export function formatHomeHeroDate(date: Date): string {
  const formatted = new Intl.DateTimeFormat('pt-BR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  }).format(date);
  return formatted.charAt(0).toLocaleUpperCase('pt-BR') + formatted.slice(1);
}

export function homeContentRoute(
  content: HomeContentRouteTarget | null | undefined,
): (string | number)[] | null {
  if (!content) return null;
  if (content.type === 'MOVIE') {
    return content.tmdbId ? ['/content/movie', content.tmdbId] : null;
  }
  const seriesId = content.seriesTmdbId || (content.type !== 'EPISODE' ? content.tmdbId : null);
  if (!seriesId) return null;
  if (content.type === 'EPISODE' && content.seasonNumber != null && content.episodeNumber != null) {
    return ['/content/series', seriesId, 'season', content.seasonNumber, 'episode', content.episodeNumber];
  }
  return ['/content/series', seriesId];
}
