import '@angular/compiler';
import { signal } from '@angular/core';
import { of, Subscription } from 'rxjs';
import { describe, expect, it, vi } from 'vitest';
import { SeasonComponent } from './season.component';

function createSeasonComponent(completions: unknown[]) {
  const pageRefreshPending = signal(false);
  const api = {
    createBulkSeriesDiaryEntry: vi.fn().mockReturnValue(of({ events: [], completions })),
    setContentRating: vi.fn(),
    createContentReview: vi.fn(),
  };
  const component = Object.assign(Object.create(SeasonComponent.prototype), {
    api,
    requests: new Subscription(),
    actionPending: signal(false),
    page: signal({ details: { title: 'Temporada 1' } }),
    bulkWatchSeason: signal(null),
    watchDialogOpen: signal(true),
    watchDateMode: signal('today'),
    watchDate: signal('2026-11-16'),
    tmdbId: signal('series-1'),
    seasonNumber: signal(1),
    seasonHistoryConfirmOpen: signal(false),
    ratingPromptSeason: signal(null),
    ratingDialogOpen: signal(false),
    ratingTarget: signal(null),
    ratingReviewLoading: signal(false),
    completedSeasonPassNumber: signal(null),
    seasonName: () => 'Temporada 1',
    bulkWatchEpisodeCount: () => 18,
    reload: vi.fn(() => pageRefreshPending.set(true)),
  });
  return { component, api, pageRefreshPending };
}

describe('season bulk watch completion flow', () => {
  it('uses viewer release counts for season cards when catalog counts disagree', () => {
    const { component } = createSeasonComponent([]);
    const season = {
      airedEpisodeCount: 10,
      episodeCount: 12,
      viewerState: {
        watchStatus: 'WATCHED',
        watchedEpisodeCount: 5,
        releasedEpisodeCount: 5,
      },
    } as never;
    const seasonActions = component as unknown as {
      seasonItemEpisodeCount: (item: never) => number;
      seasonItemIsWatched: (item: never) => boolean;
    };

    expect(seasonActions.seasonItemEpisodeCount(season)).toBe(5);
    expect(seasonActions.seasonItemIsWatched(season)).toBe(true);
  });

  it('falls back to WATCHED when a season card has no watched count', () => {
    const { component } = createSeasonComponent([]);
    const season = {
      airedEpisodeCount: 5,
      viewerState: {
        watchStatus: 'WATCHED',
        watchedEpisodeCount: null,
        releasedEpisodeCount: 5,
      },
    } as never;
    const seasonActions = component as unknown as {
      seasonItemIsWatched: (item: never) => boolean;
    };

    expect(seasonActions.seasonItemIsWatched(season)).toBe(true);
  });

  it('uses the completed pass number instead of the stale card pass when rating', () => {
    const { component } = createSeasonComponent([]);
    const season = {
      seasonNumber: 1,
      contentId: 'season-content-1',
      viewerState: { lastWatchNumber: 1, playsCount: 1, myRating: null },
    } as never;
    const controls = component as unknown as {
      ratingPromptSeason: ReturnType<typeof signal>;
      completedSeasonPassNumber: ReturnType<typeof signal>;
      openRating: ReturnType<typeof vi.fn>;
      seasonReviewPassNumber: (target: never) => number | null;
    };
    controls.openRating = vi.fn();
    controls.ratingPromptSeason.set({
      title: 'Temporada 1',
      seriesTmdbId: 'series-1',
      target: season,
      watchNumber: 2,
    });

    component.confirmSeasonRating();

    expect(controls.openRating).toHaveBeenCalledOnce();
    expect(controls.completedSeasonPassNumber()).toBe(2);
    expect(controls.seasonReviewPassNumber(season)).toBe(2);
  });

  it('refreshes the page without offering a rating when the server reports no completed pass', () => {
    const { component, api, pageRefreshPending } = createSeasonComponent([]);

    component.saveBulkWatch();

    expect(api.createBulkSeriesDiaryEntry).toHaveBeenCalledOnce();
    expect(component.ratingPromptSeason()).toBeNull();
    expect(component.reload).toHaveBeenCalledOnce();
    expect(pageRefreshPending()).toBe(true);
    expect(api.setContentRating).not.toHaveBeenCalled();
    expect(api.createContentReview).not.toHaveBeenCalled();
  });

  it('dismisses a pass rating prompt without writing an opinion while the page refresh is pending', () => {
    const completion = {
      contentId: 'season-content-1',
      content: { type: 'SEASON', tmdbId: null, seriesTmdbId: 'series-1', seasonNumber: 1 },
      pass: { watchNumber: 2, anchorDiaryEntryId: 'episode-entry-1', completedOn: '2026-11-16', orderedAt: '2026-11-16T00:00:00Z' },
    };
    const { component, api, pageRefreshPending } = createSeasonComponent([completion]);

    component.saveBulkWatch();
    expect(component.ratingPromptSeason().watchNumber).toBe(2);
    expect(pageRefreshPending()).toBe(true);

    component.closeDialog();

    expect(component.ratingPromptSeason()).toBeNull();
    expect(component.reload).toHaveBeenCalledOnce();
    expect(api.createBulkSeriesDiaryEntry).toHaveBeenCalledOnce();
    expect(api.setContentRating).not.toHaveBeenCalled();
    expect(api.createContentReview).not.toHaveBeenCalled();
  });
});
