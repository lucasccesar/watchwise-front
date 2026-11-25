import '@angular/compiler';
import { Injector, runInInjectionContext, signal } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { Router } from '@angular/router';
import { of, throwError } from 'rxjs';
import { describe, expect, it, vi } from 'vitest';
import { AuthSessionService } from '../../../../core/session/session.service';
import {
  TrendingApiService,
  TrendingCard,
  TrendingResponse,
  TrendingType,
} from '../../data-access/trending-api.service';
import { ToastNotificationsService } from '../../../../shared/components/toast-notifications/toast-notifications.service';
import { ContentApiService } from '../../../content/data-access/content-api.service';
import { TrendingComponent } from './trending.component';
import type { PostWatchRatingTarget } from '../../../../shared/components/post-watch-rating-flow/post-watch-rating-flow.component';
import type { SeriesBulkWatchSubmission } from '../../../../shared/components/series-bulk-watch-dialog/series-bulk-watch-dialog.component';

const movie = (index: number): TrendingCard => ({
  tmdbId: String(index),
  contentId: null,
  type: 'MOVIE',
  title: `Movie ${index}`,
  posterUrl: null,
  backdropPath: null,
  year: 2026,
  genres: [],
  tmdbVoteAverage: null,
  popularity: null,
  runtimeMinutes: null,
  numberOfSeasons: null,
  viewerState: null,
  previewStatus: 'AVAILABLE',
});

const initial: TrendingResponse = {
  movies: Array.from({ length: 12 }, (_, index) => movie(index + 1)),
  series: [],
  moviesPage: { page: 1, size: 12, totalPages: 2, totalResults: 25, hasNext: true },
  seriesPage: { page: 1, size: 12, totalPages: 0, totalResults: 0, hasNext: false },
};

function read(component: TrendingComponent) {
  return component as unknown as {
    section(type: TrendingType): { cards: TrendingCard[]; visibleCount: number };
    toggleMore(type: TrendingType): void;
    status(): string;
    view(): 'grid' | 'list';
    period(): 'day' | 'week';
  };
}

function createTrending(api: TrendingApiService, session: AuthSessionService, router: Router) {
  const injector = Injector.create({ providers: [
    { provide: ToastNotificationsService, useValue: { success: vi.fn(), error: vi.fn() } },
  ] });
  return runInInjectionContext(injector, () => new TrendingComponent(api, {} as ContentApiService, session, router));
}

describe('TrendingComponent', () => {
  it('replaces the initial 12 cards with the expanded first page', () => {
    const expanded: TrendingResponse = {
      ...initial,
      movies: Array.from({ length: 20 }, (_, index) => movie(index + 1)),
      moviesPage: { page: 1, size: 21, totalPages: 2, totalResults: 25, hasNext: true },
    };
    const api = {
      getTrending: vi.fn().mockReturnValue(of(initial)),
      getSection: vi.fn().mockReturnValue(of(expanded)),
    };
    const component = createTrending(
      api as unknown as TrendingApiService,
      {} as AuthSessionService,
      {} as Router,
    );

    component.ngOnInit();
    read(component).toggleMore('MOVIE');

    expect(api.getTrending).toHaveBeenCalledWith('week');
    expect(api.getSection).toHaveBeenCalledWith('MOVIE', 'week', 1);
    expect(read(component).section('MOVIE').cards).toHaveLength(20);
    expect(read(component).section('MOVIE').visibleCount).toBe(20);
  });

  it('clears the session and redirects when the API returns 401', () => {
    const session = { clear: vi.fn() };
    const router = { navigateByUrl: vi.fn().mockResolvedValue(true) };
    const api = {
      getTrending: vi
        .fn()
        .mockReturnValue(throwError(() => new HttpErrorResponse({ status: 401 }))),
    };
    const component = createTrending(
      api as unknown as TrendingApiService,
      session as unknown as AuthSessionService,
      router as unknown as Router,
    );

    component.ngOnInit();

    expect(session.clear).toHaveBeenCalledOnce();
    expect(router.navigateByUrl).toHaveBeenCalledWith('/login');
  });

  it('uses the completion descriptor ID for a new series reference after bulk watch', () => {
    const card: TrendingCard = {
      ...movie(1396),
      type: 'SERIES',
      contentId: null,
      title: 'Breaking Bad',
    };
    const contentId = 'local-series-id';
    const ratingTarget = signal<PostWatchRatingTarget | null>(null);
    const component = Object.assign(Object.create(TrendingComponent.prototype), {
      watchDialogCard: signal(card),
      watchDialogSaving: signal(false),
      watchDialogRewatch: signal(false),
      contentApi: {
        createBulkSeriesDiaryEntry: vi.fn().mockReturnValue(of({
          completions: [{ contentId, content: { type: 'SERIES' } }],
        })),
      },
      cardActionRequests: new Set(),
      updateCardViewerState: vi.fn(),
      toasts: { success: vi.fn(), error: vi.fn() },
      copy: { watchAgainSuccess: 'Assistida novamente', markWatchedSuccess: 'Assistida' },
      closeWatchedDialog: vi.fn(),
      postWatchRatingTarget: ratingTarget,
      cardTitle: vi.fn(() => 'Breaking Bad'),
      footerCopy: { series: 'Série' },
      listDialogOpener: signal(null),
    }) as unknown as { saveSeriesWatchedCard(submission: SeriesBulkWatchSubmission): void };

    component.saveSeriesWatchedCard({ watchedDate: '2026-11-14' });

    expect(ratingTarget()?.contentId).toBe(contentId);
  });
});
