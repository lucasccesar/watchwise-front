import '@angular/compiler';
import { firstValueFrom, type Observable, of, throwError } from 'rxjs';
import { describe, expect, it, vi } from 'vitest';
import { type IndividualSeriesProgress } from '../../../diary/data-access/diary-api.service';
import { SeriesComponent } from './series.component';

describe('individual series progress', () => {
  const record = { watchedEpisodeCount: 2, totalEpisodeCount: 5, totalReleasedEpisodeCount: 5,
    watchedPercentage: 40, remainingEpisodeCount: 3, lastWatchedDate: '2024-03-02',
    lastWatchedSeasonNumber: 2, seasonProgress: [] };

  function component(response: Observable<IndividualSeriesProgress | null> = of(record), authenticated = true) {
    const diaryApi = { getMySeriesProgress: vi.fn(() => response), getSeriesInProgress: vi.fn(() => of({ content: [] })) };
    const series = Object.assign(Object.create(SeriesComponent.prototype), {
      diaryApi, session: { user: () => authenticated ? { id: 'viewer' } : null },
    });
    return { series, diaryApi };
  }

  it.each([[3, 1], [25, 1], [105, 100], [105, 101]])(
    'uses the same lookup for volume %s and position %s', async () => {
      const { series, diaryApi } = component();
      expect(await firstValueFrom(series.getSeriesProgressRecord('198200001'))).toEqual(record);
      expect(diaryApi.getMySeriesProgress).toHaveBeenCalledExactlyOnceWith('198200001');
      expect(diaryApi.getSeriesInProgress).not.toHaveBeenCalled();
    });

  it('preserves fallback both for missing session and failed or empty progress', async () => {
    const guest = component(of(record), false);
    expect(await firstValueFrom(guest.series.getSeriesProgressRecord('198200001'))).toBeNull();
    expect(guest.diaryApi.getMySeriesProgress).not.toHaveBeenCalled();
    for (const response of [of(null), throwError(() => new Error('request failed'))]) {
      expect(await firstValueFrom(component(response).series.getSeriesProgressRecord('198200001'))).toBeNull();
    }
  });

  it('uses authoritative detail counts and completes an incomplete detail with the historic record', () => {
    const { series } = component();
    series.progressRecord = () => record;
    const page = { viewerState: { watchStatus: 'NOT_WATCHED', watchedEpisodeCount: null, releasedEpisodeCount: null },
      details: { seasons: [], numberOfEpisodes: 5 }, sections: { seasons: [], episodes: [], recentEpisodes: [] } };
    expect(series.calculateWatchProgress(page)).toMatchObject({ watchedEpisodeCount: 2, percentage: 40, totalEpisodeCount: 5 });
    expect(series.seriesLastWatchedDate(page)).toBe('2024-03-02');
    expect(series.calculateWatchProgress({ ...page, viewerState: { watchedEpisodeCount: 3, releasedEpisodeCount: 5 } }))
      .toMatchObject({ watchedEpisodeCount: 3, percentage: 60, totalEpisodeCount: 5 });
  });

  it('keeps the batch count aligned with reliable detail and falls back when estimates are absent', () => {
    const { series } = component();
    let detail = { watchedEpisodeCount: 3, releasedEpisodeCount: 5 } as {
      watchedEpisodeCount: number | null; releasedEpisodeCount: number | null;
    };
    let saved: IndividualSeriesProgress | null = { ...record, remainingEpisodeCount: 8 };
    const page = { viewerState: {}, details: { seasons: [], numberOfEpisodes: 5 },
      sections: { seasons: [], episodes: [], recentEpisodes: [] } };
    series.page = () => ({ ...page, viewerState: detail });
    series.progressRecord = () => saved;
    series.ratingTarget = () => ({ type: 'SERIES' });
    series.remainingEpisodes = () => series.calculateRemainingEpisodes();
    series.watchProgress = () => series.calculateWatchProgress(series.page());

    expect(series.bulkEpisodeCount()).toBe(2);
    detail = { watchedEpisodeCount: null, releasedEpisodeCount: null };
    saved = record;
    expect(series.bulkEpisodeCount()).toBe(3);
    saved = { ...record, remainingEpisodeCount: null, totalEpisodeCount: null,
      totalReleasedEpisodeCount: null, watchedPercentage: null };
    expect(series.bulkEpisodeCount()).toBe(3);
    saved = null;
    expect(series.bulkEpisodeCount()).toBe(5);
  });
});
