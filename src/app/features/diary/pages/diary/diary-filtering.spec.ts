import { describe, expect, it } from 'vitest';
import { diarySeriesOptions, filterDiaryEntries, type DiaryFilters, type FilterableDiaryEntry } from './diary-filtering';

const defaults: DiaryFilters = { type: 'all', ratingMin: 1, ratingMax: 10, seriesId: '', dateFrom: '', dateTo: '', theaterOnly: false, sort: 'newest' };
const entry = (id: string, type = 'MOVIE', overrides: Partial<FilterableDiaryEntry> = {}): FilterableDiaryEntry => ({
  id, content: { type, tmdbId: id, seriesTmdbId: type === 'MOVIE' ? null : 'show' },
  card: { title: id }, watchedDate: '2026-10-20', score: 7, watchedInTheater: false, ...overrides,
});
const ids = (entries: FilterableDiaryEntry[], changes: Partial<DiaryFilters> = {}) => filterDiaryEntries(entries, { ...defaults, ...changes }).map(item => item.id);

describe('Diary filtering', () => {
  const types = [entry('movie'), entry('series', 'SERIES'), entry('season', 'SEASON'), entry('episode', 'EPISODE')];
  it.each([
    ['all', ['episode', 'movie', 'season', 'series']], ['movies', ['movie']], ['series', ['series']],
    ['seasons', ['season']], ['episodes', ['episode']],
  ] as const)('matches the exact %s content type', (type, expected) => {
    expect(ids(types, { type })).toEqual(expected);
  });

  it('keeps null scores when the full rating range is selected', () => {
    expect(ids([entry('unrated', 'MOVIE', { score: null }), entry('rated')])).toEqual(['rated', 'unrated']);
  });
  it('includes both score bounds and excludes null scores for a narrowed range', () => {
    const entries = [entry('low', 'MOVIE', { score: 3 }), entry('min', 'MOVIE', { score: 4 }), entry('max', 'MOVIE', { score: 8 }), entry('high', 'MOVIE', { score: 9 }), entry('null', 'MOVIE', { score: null })];
    expect(ids(entries, { ratingMin: 4, ratingMax: 8 })).toEqual(['max', 'min']);
  });
  it('includes both local date bounds and the entire last day', () => {
    const entries = [entry('before', 'MOVIE', { watchedDate: '2026-10-19' }), entry('start', 'MOVIE', { watchedDate: '2026-10-20' }), entry('end', 'MOVIE', { watchedDate: '2026-10-21T23:59:59' }), entry('after', 'MOVIE', { watchedDate: '2026-10-22' })];
    expect(ids(entries, { dateFrom: '2026-10-20', dateTo: '2026-10-21' })).toEqual(['end', 'start']);
  });
  it('supports independent date bounds and excludes unknown dates only when filtering dates', () => {
    const entries = [entry('old', 'MOVIE', { watchedDate: '2026-10-19' }), entry('new'), entry('unknown', 'MOVIE', { watchedDate: '' })];
    expect(ids(entries, { dateFrom: '2026-10-20' })).toEqual(['new']);
    expect(ids(entries, { dateTo: '2026-10-19' })).toEqual(['old']);
    expect(ids(entries)).toEqual(['new', 'old', 'unknown']);
  });
  it('matches only true theater records while preserving all states when disabled', () => {
    const entries = [entry('yes', 'MOVIE', { watchedInTheater: true }), entry('no'), entry('unknown', 'MOVIE', { watchedInTheater: null })];
    expect(ids(entries, { theaterOnly: true })).toEqual(['yes']);
    expect(ids(entries)).toEqual(['no', 'unknown', 'yes']);
  });
  it('matches a series and linked children without matching a movie with the same tmdbId', () => {
    expect(ids([...types, entry('collision', 'MOVIE', { content: { type: 'MOVIE', tmdbId: 'show', seriesTmdbId: 'show' } })], { seriesId: 'show' })).toEqual(['episode', 'season', 'series']);
  });
  it('offers only actual series records with their own titles and removes duplicate IDs', () => {
    expect(diarySeriesOptions([...types, entry('duplicate', 'SERIES')])).toEqual([{ id: 'show', title: 'series' }]);
  });
  it('accepts the tmdbId of an actual SERIES record when seriesTmdbId is absent', () => {
    const show = entry('real', 'SERIES', { content: { type: 'SERIES', tmdbId: 'real', seriesTmdbId: null } });
    expect(ids([show], { seriesId: 'real' })).toEqual(['real']);
    expect(diarySeriesOptions([show])).toEqual([{ id: 'real', title: 'real' }]);
  });
  it('uses genuine parent-series metadata for children without using episode or movie titles', () => {
    const children = [entry('episode-title', 'EPISODE'), entry('film')];
    expect(diarySeriesOptions(children, [
      { seriesTmdbId: 'show', seriesTitle: 'Série real' },
      { seriesTmdbId: 'film', seriesTitle: 'Filme que não é série' },
      { seriesTmdbId: 'unwatched', seriesTitle: 'Outra série' },
    ])).toEqual([{ id: 'show', title: 'Série real' }]);
    expect(diarySeriesOptions(children)).toEqual([]);
  });

  const sortable = [entry('a', 'MOVIE', { watchedDate: '2026-10-19', score: 9 }), entry('b', 'MOVIE', { watchedDate: '2026-10-21', score: 4 }), entry('c', 'MOVIE', { watchedDate: '2026-10-20', score: null })];
  it.each([['newest', ['b', 'c', 'a']], ['oldest', ['a', 'c', 'b']], ['highest', ['a', 'b', 'c']], ['lowest', ['b', 'a', 'c']]] as const)('sorts %s with unrated scores last', (sort, expected) => {
    expect(ids(sortable, { sort })).toEqual(expected);
  });
  it('breaks rating ties by recent local date then ID, independent of input order', () => {
    const entries = [entry('z'), entry('a'), entry('old', 'MOVIE', { watchedDate: '2026-10-19' }), entry('unknown', 'MOVIE', { watchedDate: '' })];
    for (const sort of ['highest', 'lowest'] as const) {
      expect(ids(entries, { sort })).toEqual(['a', 'z', 'old', 'unknown']);
      expect(ids([...entries].reverse(), { sort })).toEqual(['a', 'z', 'old', 'unknown']);
    }
  });
  it('does not mutate the source collection', () => {
    const source = [...sortable];
    ids(source, { sort: 'oldest' });
    expect(source.map(item => item.id)).toEqual(['a', 'b', 'c']);
  });
  it('keeps unknown content in the all view and excludes it from exact type and series menus', () => {
    const unknown = entry('unknown', 'MOVIE', { content: { type: null, tmdbId: '1', seriesTmdbId: null } });
    expect(ids([unknown])).toEqual(['unknown']);
    expect(ids([unknown], { type: 'movies' })).toEqual([]);
    expect(diarySeriesOptions([unknown])).toEqual([]);
  });
});
