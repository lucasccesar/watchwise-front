export type DiaryTypeFilter = 'all' | 'movies' | 'series' | 'seasons' | 'episodes';
export type DiarySort = 'newest' | 'oldest' | 'highest' | 'lowest';

export interface FilterableDiaryEntry {
  id: string;
  content: { type: string | null; tmdbId: string | null; seriesTmdbId: string | null };
  card?: { title: string | null } | null;
  watchedDate: string;
  score: number | null;
  watchedInTheater: boolean | null;
}

export interface DiaryFilters {
  type: DiaryTypeFilter;
  ratingMin: number;
  ratingMax: number;
  seriesId: string;
  dateFrom: string;
  dateTo: string;
  theaterOnly: boolean;
  sort: DiarySort;
}

export function filterDiaryEntries<T extends FilterableDiaryEntry>(entries: readonly T[], filters: DiaryFilters): T[] {
  const types = { movies: 'MOVIE', series: 'SERIES', seasons: 'SEASON', episodes: 'EPISODE' };
  const ratingApplied = filters.ratingMin > 1 || filters.ratingMax < 10;
  return entries.filter(entry => {
    const type = entry.content.type?.toUpperCase();
    if (filters.type !== 'all' && type !== types[filters.type]) return false;
    if (ratingApplied && (entry.score === null || entry.score < filters.ratingMin || entry.score > filters.ratingMax)) return false;
    if (filters.theaterOnly && entry.watchedInTheater !== true) return false;
    const seriesId = type === 'SERIES' ? entry.content.seriesTmdbId || entry.content.tmdbId
      : type === 'SEASON' || type === 'EPISODE' ? entry.content.seriesTmdbId : null;
    if (filters.seriesId && seriesId !== filters.seriesId) return false;
    const day = localDiaryDay(entry.watchedDate);
    if ((filters.dateFrom || filters.dateTo) && !day) return false;
    if (filters.dateFrom && day < filters.dateFrom) return false;
    if (filters.dateTo && day > filters.dateTo) return false;
    return true;
  }).sort((a, b) => {
    if (filters.sort === 'highest' || filters.sort === 'lowest') {
      if (a.score === null && b.score !== null) return 1;
      if (b.score === null && a.score !== null) return -1;
      const scoreDiff = (a.score ?? 0) - (b.score ?? 0);
      if (scoreDiff) return filters.sort === 'highest' ? -scoreDiff : scoreDiff;
    }
    const aDay = localDiaryDay(a.watchedDate);
    const bDay = localDiaryDay(b.watchedDate);
    if (!aDay && bDay) return 1;
    if (!bDay && aDay) return -1;
    const dateDiff = aDay.localeCompare(bDay);
    if (dateDiff) return filters.sort === 'oldest' ? dateDiff : -dateDiff;
    return a.id.localeCompare(b.id);
  });
}

export function diarySeriesOptions(
  entries: readonly FilterableDiaryEntry[],
  knownSeries: readonly { seriesTmdbId: string | null; seriesTitle: string | null }[] = [],
): Array<{ id: string; title: string }> {
  const options = new Map<string, string>();
  const linkedIds = new Set<string>();
  for (const entry of entries) {
    const type = entry.content.type?.toUpperCase();
    if (type !== 'SERIES' && type !== 'SEASON' && type !== 'EPISODE') continue;
    if (entry.content.seriesTmdbId) linkedIds.add(entry.content.seriesTmdbId);
    if (type !== 'SERIES') continue;
    const id = entry.content.seriesTmdbId || entry.content.tmdbId;
    const title = entry.card?.title;
    if (id && title && !options.has(id)) options.set(id, title);
  }
  for (const { seriesTmdbId: id, seriesTitle: title } of knownSeries) {
    if (id && title && linkedIds.has(id) && !options.has(id)) options.set(id, title);
  }
  return [...options].map(([id, title]) => ({ id, title })).sort((a, b) => a.title.localeCompare(b.title, 'pt-BR'));
}

/** Date-only API values represent local calendar days, not UTC midnight. */
export function localDiaryDay(value: string): string {
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return '';
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}
