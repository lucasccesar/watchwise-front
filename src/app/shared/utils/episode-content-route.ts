export interface EpisodeContentRouteTarget {
  seriesTmdbId?: string | null;
  seasonNumber?: number | null;
  episodeNumber?: number | null;
}

export function episodeContentRoute(target: EpisodeContentRouteTarget): string[] | null {
  const { seriesTmdbId, seasonNumber, episodeNumber } = target;
  if (!seriesTmdbId || seasonNumber == null || episodeNumber == null) return null;
  return ['/content/series', seriesTmdbId, 'season', String(seasonNumber), 'episode', String(episodeNumber)];
}

export function episodeContentNavigationState(contentId: string | null | undefined): { contentId: string } | undefined {
  return contentId?.trim() ? { contentId } : undefined;
}
