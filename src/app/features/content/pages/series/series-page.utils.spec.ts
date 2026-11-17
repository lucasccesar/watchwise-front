import { describe, expect, it } from 'vitest';
import { formatSeriesNumber, getReportedSeriesWatchProgress, getSeriesWatchProgress, hasSeriesWatchActivity, isSeriesWatched } from './series-page.utils';

describe('series page presentation helpers', () => {
  it('formats absent numeric values as zero', () => {
    expect(formatSeriesNumber(null)).toBe('0');
    expect(formatSeriesNumber(undefined, 0)).toBe('0');
  });

  it('keeps localized number formatting for available values', () => {
    expect(formatSeriesNumber(1234, 0)).toBe('1.234');
    expect(formatSeriesNumber(7.95, 1)).toBe('8');
  });

  it('uses reported episode counts when deciding whether a series is complete', () => {
    expect(isSeriesWatched('WATCHED', 0, 10)).toBe(false);
    expect(isSeriesWatched('WATCHED', 10, 10)).toBe(true);
    expect(isSeriesWatched('PARTIALLY_WATCHED', 10, 10)).toBe(true);
    expect(isSeriesWatched('UNWATCHED', 9, 10)).toBe(false);
    expect(isSeriesWatched(null, null, 10)).toBe(false);
    expect(isSeriesWatched(null, 0, 0)).toBe(false);
  });

  it('uses the watched status to fill in a missing total and percentage', () => {
    expect(getSeriesWatchProgress('WATCHED', null, 186)).toEqual({
      watchedEpisodeCount: 186,
      percentage: 100,
    });
    expect(getSeriesWatchProgress('WATCHED', 25, 186)).toEqual({
      watchedEpisodeCount: 25,
      percentage: 13,
    });
    expect(getSeriesWatchProgress('PARTIALLY_WATCHED', 25, 100)).toEqual({
      watchedEpisodeCount: 25,
      percentage: 25,
    });
    expect(getSeriesWatchProgress(null, null, 100)).toEqual({
      watchedEpisodeCount: 0,
      percentage: 0,
    });
  });

  it('does not let a stale watched status override available partial counts', () => {
    expect(getReportedSeriesWatchProgress(17, 18)).toEqual({
      watchedEpisodeCount: 17,
      percentage: 94,
      totalEpisodeCount: 18,
    });
    expect(getSeriesWatchProgress('WATCHED', 5, 10, [
      { watchStatus: 'WATCHED', watchedEpisodeCount: 5, totalEpisodeCount: 10 },
    ])).toEqual({ watchedEpisodeCount: 5, percentage: 50 });
  });

  it('uses the page reported counts as the current series progress', () => {
    expect(getReportedSeriesWatchProgress(18, 18)).toEqual({
      watchedEpisodeCount: 18,
      percentage: 100,
      totalEpisodeCount: 18,
    });
    expect(getReportedSeriesWatchProgress(17, 18)).toEqual({
      watchedEpisodeCount: 17,
      percentage: 94,
      totalEpisodeCount: 18,
    });
    expect(getReportedSeriesWatchProgress(0, 0)).toEqual({
      watchedEpisodeCount: 0,
      percentage: 0,
      totalEpisodeCount: 0,
    });
    expect(getReportedSeriesWatchProgress(null, null)).toBeNull();
  });

  it('detects watched episode activity even when the series summary reports unwatched', () => {
    expect(hasSeriesWatchActivity(
      { watchStatus: 'UNWATCHED', watchedEpisodeCount: 0 },
      [],
      [{ watchStatus: 'WATCHED', watchedEpisodeCount: null }],
    )).toBe(true);
  });

  it('allows a watchlist action only when no series or child has watch activity', () => {
    expect(hasSeriesWatchActivity({ watchStatus: 'UNWATCHED', watchedEpisodeCount: 0 })).toBe(false);
    expect(hasSeriesWatchActivity(
      { watchStatus: 'UNWATCHED', watchedEpisodeCount: 0 },
      [{ watchStatus: 'PARTIALLY_WATCHED', watchedEpisodeCount: 2 }],
    )).toBe(true);
    expect(hasSeriesWatchActivity(
      { watchStatus: 'UNWATCHED', watchedEpisodeCount: 0 },
      [],
      [{ latestDiaryEntryId: 'diary-1' }],
    )).toBe(true);
  });
});
