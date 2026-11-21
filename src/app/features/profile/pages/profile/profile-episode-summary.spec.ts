import '@angular/compiler';
import { Injector, runInInjectionContext } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { NEVER, of } from 'rxjs';
import { describe, expect, it, vi } from 'vitest';
import { AuthSessionService } from '../../../../core/session/session.service';
import { DiaryApiService } from '../../../diary/data-access/diary-api.service';
import { ListsApiService } from '../../../lists/data-access/lists-api.service';
import { PicksApiService } from '../../../picks/data-access/picks-api.service';
import { SearchApiService } from '../../../search-content/data-access/search-api.service';
import { WatchlistApiService } from '../../../watchlist/data-access/watchlist-api.service';
import { ContentApiService } from '../../../content/data-access/content-api.service';
import { ProfileApiService } from '../../data-access/profile-api.service';
import { ProfileComponent } from './profile.component';
import { ToastNotificationsService } from '../../../../shared/components/toast-notifications/toast-notifications.service';
import { ConfirmationDialogService } from '../../../../shared/components/confirmation-dialog/confirmation-dialog.service';

function createProfilePage(summary: Record<string, unknown>) {
  const diaryApi = {
    getDiaryPage: vi.fn().mockReturnValue(of({ content: [], page: 1, size: 30, totalElements: 0, totalPages: 0, hasNext: false })),
    getUserReviewsPage: vi.fn().mockReturnValue(of({ content: [] })),
    getAllDiaryEntries: vi.fn().mockReturnValue(of([])),
  };
  const profileApi = { getSummary: vi.fn().mockReturnValue(of(summary)) };
  const injector = Injector.create({ providers: [
    { provide: ActivatedRoute, useValue: { paramMap: NEVER, data: NEVER, snapshot: { paramMap: { get: () => null } } } },
    { provide: AuthSessionService, useValue: { user: () => ({ id: 'viewer' }) } },
    { provide: Router, useValue: {} },
    { provide: ProfileApiService, useValue: profileApi },
    { provide: DiaryApiService, useValue: diaryApi },
    { provide: ListsApiService, useValue: {} },
    { provide: WatchlistApiService, useValue: {} },
    { provide: PicksApiService, useValue: {} },
    { provide: SearchApiService, useValue: {} },
    { provide: ContentApiService, useValue: {} },
    { provide: ToastNotificationsService, useValue: { success: vi.fn(), error: vi.fn() } },
    { provide: ConfirmationDialogService, useValue: {} },
  ] });
  const page = runInInjectionContext(injector, () => new ProfileComponent()) as any;
  page.profile.set({ id: 'viewer', username: 'viewer', name: 'Viewer' });
  page.mode.set('EPISODE');
  page.section.set('profile');
  page.loadSection('viewer');
  return { page, diaryApi, profileApi };
}

describe('Profile episode summary', () => {
  it('renders server episode aggregates and recent series counts without reading the full diary', () => {
    const episodeRatings = {
      totalRatings: 1,
      averageScore: 10,
      distribution: [{ score: 10, count: 1 }],
    };
    const summary = {
      watchTime: { totalMinutesWatched: 100, minutesWatchedLast30Days: 30, totalWatchedCount: 4, watchedCountLast30Days: 1 },
      highlights: null,
      genreCounts: [],
      ratingsSummary: null,
      ratingsDistribution: [],
      episodeRatings,
      recentEpisodes: [],
      recentReviews: [],
      recentActivity: [{
        id: 'series-activity',
        source: 'SERIES_COMPLETION',
        type: 'SERIES',
        timesWatched: 1,
        watchedEpisodeCount: 2,
        activityDate: '2026-11-18T12:00:00',
        content: { id: 'series-content', type: 'SERIES', tmdbId: '1399', seriesTmdbId: null },
        card: {
          contentId: 'series-content', type: 'SERIES', tmdbId: '1399', seriesTmdbId: null,
          title: 'Example Series', posterPath: null, customPosterUrl: null, releaseYear: 2020,
          numberOfEpisodes: 10,
          viewerState: { watchStatus: 'WATCHED', myRating: null, currentRatingVersion: null, lastWatchNumber: 1 },
        },
      }],
      top5: [],
    };
    const { page, diaryApi, profileApi } = createProfilePage(summary);

    expect(profileApi.getSummary).toHaveBeenCalledWith('viewer', 'EPISODE');
    expect(diaryApi.getAllDiaryEntries).not.toHaveBeenCalled();
    expect(page.overviewRatingsSummary()).toEqual(episodeRatings);
    expect(page.overviewRatingsDistribution()).toEqual(episodeRatings.distribution);
    expect(page.recentSeriesItems()).toMatchObject([
      { seriesTmdbId: '1399', watchedEpisodeCount: 2, episodeCount: 2 },
    ]);
  });

  it('keeps the episode chart unavailable if the server does not yet send its summary', () => {
    const summary = {
      watchTime: { totalMinutesWatched: 0, minutesWatchedLast30Days: 0, totalWatchedCount: 0, watchedCountLast30Days: 0 },
      highlights: null,
      genreCounts: [],
      ratingsSummary: null,
      ratingsDistribution: [],
      recentEpisodes: [],
      recentReviews: [],
      recentActivity: [],
      top5: [],
    };
    const { page, diaryApi } = createProfilePage(summary);

    expect(diaryApi.getAllDiaryEntries).not.toHaveBeenCalled();
    expect(page.overviewRatingsSummary()).toBeNull();
    expect(page.overviewRatingsDistribution()).toEqual([]);
  });
});
