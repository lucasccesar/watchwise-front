export function formatSeriesNumber(
  value: number | null | undefined,
  maximumFractionDigits = 1,
): string {
  const safeValue = value == null || !Number.isFinite(value) ? 0 : value;
  return new Intl.NumberFormat('pt-BR', { maximumFractionDigits }).format(safeValue);
}

export function isSeriesWatched(
  watchStatus: string | null | undefined,
  watchedEpisodeCount: number | null | undefined,
  totalEpisodeCount: number | null | undefined,
): boolean {
  if (watchedEpisodeCount != null && totalEpisodeCount != null) {
    return totalEpisodeCount > 0 && watchedEpisodeCount >= totalEpisodeCount;
  }
  if (watchStatus === 'WATCHED') return true;
  return totalEpisodeCount != null && totalEpisodeCount > 0 &&
    watchedEpisodeCount != null && watchedEpisodeCount >= totalEpisodeCount;
}

export interface SeriesWatchActivitySnapshot {
  watchStatus?: string | null;
  watchedEpisodeCount?: number | null;
  playsCount?: number | null;
  latestDiaryEntryId?: string | null;
}

export interface SeriesSeasonProgressSnapshot {
  watchStatus?: string | null;
  watchedEpisodeCount?: number | null;
  totalEpisodeCount?: number | null;
}

export function hasSeriesWatchActivity(
  series: SeriesWatchActivitySnapshot,
  seasons: readonly SeriesWatchActivitySnapshot[] = [],
  episodes: readonly SeriesWatchActivitySnapshot[] = [],
): boolean {
  return [series, ...seasons, ...episodes].some((activity) =>
    activity.watchStatus === 'WATCHED' ||
    activity.watchStatus === 'PARTIALLY_WATCHED' ||
    (activity.watchedEpisodeCount ?? 0) > 0 ||
    (activity.playsCount ?? 0) > 0 ||
    Boolean(activity.latestDiaryEntryId),
  );
}

export function getSeriesWatchProgress(
  watchStatus: string | null | undefined,
  watchedEpisodeCount: number | null | undefined,
  totalEpisodeCount: number | null | undefined,
  seasons: readonly SeriesSeasonProgressSnapshot[] = [],
  watchedEpisodeCountFromEpisodes = 0,
): { watchedEpisodeCount: number; percentage: number } {
  const total = totalEpisodeCount ?? 0;
  const isComplete = (
    status: string | null | undefined,
    watched: number | null | undefined,
    released: number | null | undefined,
  ): boolean =>
    watched != null && released != null
      ? released > 0 && watched >= released
      : status === 'WATCHED';
  const watchedFromSeasons = seasons.reduce((count, season) => {
    const seasonWatched = Math.max(0, season.watchedEpisodeCount ?? 0);
    const seasonTotal = Math.max(0, season.totalEpisodeCount ?? 0);
    const isSeasonComplete = isComplete(
      season.watchStatus, season.watchedEpisodeCount, season.totalEpisodeCount);
    return count + (isSeasonComplete ? Math.max(seasonTotal, seasonWatched) : seasonWatched);
  }, 0);
  const allSeasonsComplete = seasons.length > 0 && seasons.every((season) => {
    const seasonWatched = Math.max(0, season.watchedEpisodeCount ?? 0);
    const seasonTotal = Math.max(0, season.totalEpisodeCount ?? 0);
    return isComplete(season.watchStatus, season.watchedEpisodeCount, season.totalEpisodeCount);
  });
  const observedWatchedCount = Math.max(
    0,
    watchedEpisodeCount ?? 0,
    watchedFromSeasons,
    watchedEpisodeCountFromEpisodes,
  );
  const complete = isComplete(watchStatus, watchedEpisodeCount, totalEpisodeCount)
    || allSeasonsComplete || (total > 0 && observedWatchedCount >= total);
  const watched = complete && total > 0
    ? total
    : total > 0
      ? Math.min(total, observedWatchedCount)
      : observedWatchedCount;
  const percentage = complete
    ? 100
    : total > 0
      ? Math.min(100, Math.round((watched / total) * 100))
      : 0;

  return { watchedEpisodeCount: watched, percentage };
}

export function getReportedSeriesWatchProgress(
  watchedEpisodeCount: number | null | undefined,
  releasedEpisodeCount: number | null | undefined,
): { watchedEpisodeCount: number; percentage: number; totalEpisodeCount: number } | null {
  if (watchedEpisodeCount == null || releasedEpisodeCount == null) return null;
  const totalEpisodeCount = Math.max(0, releasedEpisodeCount);
  const watched = Math.min(totalEpisodeCount, Math.max(0, watchedEpisodeCount));
  return {
    watchedEpisodeCount: watched,
    percentage: totalEpisodeCount > 0 ? Math.min(100, Math.round((watched / totalEpisodeCount) * 100)) : 0,
    totalEpisodeCount,
  };
}
