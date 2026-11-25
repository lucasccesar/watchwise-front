import '@angular/compiler';
import { HttpClient } from '@angular/common/http';
import { Injector, runInInjectionContext } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { of, Subject, type Observable } from 'rxjs';
import { describe, expect, it, vi } from 'vitest';
import { AuthSessionService } from '../../../../core/session/session.service';
import { ConfirmationDialogService } from '../../../../shared/components/confirmation-dialog/confirmation-dialog.service';
import { ToastNotificationsService } from '../../../../shared/components/toast-notifications/toast-notifications.service';
import { ContentApiService } from '../../../content/data-access/content-api.service';
import { HomeApiService } from '../../../home/data-access/home-api.service';
import { DiaryApiService, type DiaryRecord, type DiaryRecordPage, type DiaryTimelinePage } from '../../data-access/diary-api.service';
import { DiaryComponent } from './diary.component';

class TestDiary extends DiaryComponent {
  state = this.status;
  banner = this.heroBackdropPath;
  totals = this.summary;
  cards = this.visibleReviewEntries;
  historyCards = this.visibleEntries;
  read = this.load;
  nextPage = this.goToPage;
  filterType = this.setTypeFilter;
}

const summary = {
  totalMinutesWatchedMovies: 120, totalMinutesWatchedEpisodes: 40,
  totalMoviesWatched: 2, totalDistinctMoviesWatched: 1, totalEpisodesWatched: 1,
  distinctSeriesWatched: 1, latestWatchedBackdropPath: '/backdrop.jpg',
};

const empty = { page: 1, size: 15, totalElements: 0, totalPages: 0, hasNext: false, content: [] };

const record: DiaryRecord = {
  id: 'review-1', content: { id: 'movie-1', type: 'MOVIE', tmdbId: '1', seriesTmdbId: null,
    seasonNumber: null, episodeNumber: null, runtimeMinutes: null },
  card: null, comment: 'Review visible', score: 8, watchedDate: '2026-10-08',
  createdAt: '2026-10-08T12:00:00', watchedInTheater: false, customPosterUrl: null,
  watchNumber: 1, likesCount: 0, commentsCount: 0, likedByMe: false, watchedWith: [],
};

function setup(reviews = true) {
  const summaryReply = new Subject<typeof summary>();
  const reviewPage = new Subject<DiaryRecordPage>();
  const diaryApi = {
    getReviewsSummary: vi.fn(() => summaryReply),
    getReviewsPage: vi.fn(() => reviewPage),
    getDiaryTimelinePage: vi.fn<() => Observable<DiaryTimelinePage>>(() => of(empty)),
  };
  const homeApi = { getHomeSummary: vi.fn(() => of(summary)) };
  const injector = Injector.create({ providers: [
    { provide: ActivatedRoute, useValue: { snapshot: { data: { mode: reviews ? 'reviews' : 'history' } } } },
    { provide: Router, useValue: { navigateByUrl: vi.fn() } },
    { provide: AuthSessionService, useValue: { user: () => ({ id: 'viewer', username: 'viewer' }) } },
    { provide: HomeApiService, useValue: homeApi },
    { provide: DiaryApiService, useValue: diaryApi },
    { provide: ContentApiService, useValue: {} },
    { provide: ToastNotificationsService, useValue: { error: vi.fn() } },
    { provide: ConfirmationDialogService, useValue: {} },
  ] });
  return { component: runInInjectionContext(injector, () => new TestDiary()), diaryApi, homeApi, summaryReply, reviewPage };
}

describe('Reviews summary', () => {
  it('requests the dedicated endpoint with the encoded user ID', () => {
    const get = vi.fn(() => of(summary));
    const service = new DiaryApiService({ get } as unknown as HttpClient);
    let response: unknown;
    service.getReviewsSummary('viewer/id').subscribe(value => { response = value; });
    expect(get).toHaveBeenCalledExactlyOnceWith('/api/v1/users/viewer%2Fid/summary/diary-reviews');
    expect(response).toEqual(summary);
  });

  it('preserves the totals, backdrop, readiness, cards, pagination and filters', () => {
    const { component, homeApi, diaryApi, summaryReply, reviewPage } = setup();
    expect(diaryApi.getReviewsSummary).toHaveBeenCalledExactlyOnceWith('viewer');
    expect(homeApi.getHomeSummary).not.toHaveBeenCalled();
    expect(diaryApi.getReviewsPage).toHaveBeenCalledExactlyOnceWith('viewer', 1, 15);
    reviewPage.next({ ...empty, totalElements: 16, totalPages: 2, hasNext: true, content: [record] });
    reviewPage.complete();
    expect(component.state()).toBe('loading');
    expect(component.cards()).toHaveLength(0);
    summaryReply.next(summary);
    summaryReply.complete();
    expect(component.state()).toBe('ready');
    expect(component.totals()).toEqual(summary);
    expect(component.banner()).toBe('/backdrop.jpg');
    expect(component.cards().map(card => card.comment)).toEqual(['Review visible']);

    const next = new Subject<DiaryRecordPage>();
    diaryApi.getReviewsPage.mockReturnValue(next);
    component.nextPage(2);
    expect(diaryApi.getReviewsPage).toHaveBeenLastCalledWith('viewer', 2, 15);
    next.next({ ...empty, totalElements: 16, totalPages: 2, page: 2, content: [{ ...record, id: 'review-2' }] });
    expect(component.cards().map(card => card.id)).toEqual(['review-2']);
    component.filterType('series');
    expect(component.cards()).toHaveLength(0);
    expect(diaryApi.getReviewsPage).toHaveBeenLastCalledWith('viewer', 1, 15);
    expect(diaryApi.getReviewsSummary).toHaveBeenCalledTimes(1);
    component.ngOnDestroy();
    expect(next.observed).toBe(false);
  });

  it('uses the dedicated summary for History', () => {
    const { component, homeApi, diaryApi, summaryReply } = setup(false);
    expect(homeApi.getHomeSummary).not.toHaveBeenCalled();
    expect(diaryApi.getReviewsSummary).toHaveBeenCalledExactlyOnceWith('viewer');
    const emptySummary = { totalMinutesWatchedMovies: 0, totalMinutesWatchedEpisodes: 0,
      totalMoviesWatched: 0, totalDistinctMoviesWatched: 0, totalEpisodesWatched: 0,
      distinctSeriesWatched: 0, latestWatchedBackdropPath: null };
    summaryReply.next(emptySummary);
    summaryReply.complete();
    expect(component.totals()).toEqual(emptySummary);
    expect(component.banner()).toBeNull();
    expect(component.historyCards()).toEqual([]);
  });

  it('keeps History entries, page filters and refresh tied to the dedicated summary', () => {
    const { component, homeApi, diaryApi, summaryReply } = setup(false);
    const episode: DiaryRecord = { ...record, id: 'episode-1', content: {
      ...record.content, id: 'episode-content', type: 'EPISODE', tmdbId: null,
      seriesTmdbId: '42', seasonNumber: 1, episodeNumber: 2,
    } };
    const timeline = new Subject<DiaryTimelinePage>();
    diaryApi.getDiaryTimelinePage.mockReturnValue(timeline);
    component.read();
    expect(diaryApi.getDiaryTimelinePage).toHaveBeenLastCalledWith('viewer',
      expect.objectContaining({ page: 1, size: 30, sortBy: 'NEWEST' }));
    timeline.next({ ...empty, size: 30, totalElements: 31, totalPages: 2, hasNext: true,
      content: [record, episode].map(entry => ({ kind: 'PERSISTED_ENTRY' as const, entry })) });
    timeline.complete();
    expect(component.state()).toBe('loading');
    summaryReply.next(summary);
    summaryReply.complete();
    expect(component.totals()).toEqual(summary);
    expect(component.banner()).toBe('/backdrop.jpg');
    expect(component.historyCards().map(item => item.id)).toEqual([record.id, episode.id]);

    const obsolete = new Subject<DiaryTimelinePage>();
    diaryApi.getDiaryTimelinePage.mockReturnValue(obsolete);
    component.nextPage(2);
    expect(diaryApi.getDiaryTimelinePage).toHaveBeenLastCalledWith('viewer', expect.objectContaining({ page: 2 }));
    component.filterType('episodes');
    expect(diaryApi.getDiaryTimelinePage).toHaveBeenLastCalledWith('viewer',
      expect.objectContaining({ page: 1, type: 'EPISODE' }));
    expect(diaryApi.getReviewsSummary).toHaveBeenCalledTimes(2);
    component.read(true);
    expect(diaryApi.getReviewsSummary).toHaveBeenCalledTimes(3);
    component.ngOnDestroy();
    expect(obsolete.observed).toBe(false);
    expect(homeApi.getHomeSummary).not.toHaveBeenCalled();
  });

  it('preserves the History error and cancels its other pending read', () => {
    const { component, diaryApi, summaryReply } = setup(false);
    const timeline = new Subject<DiaryTimelinePage>();
    diaryApi.getDiaryTimelinePage.mockReturnValue(timeline);
    component.read();
    summaryReply.error(new Error('failed'));
    expect(component.state()).toBe('error');
    expect(timeline.observed).toBe(false);
  });


  it('preserves an empty Reviews page and a missing backdrop', () => {
    const { component, summaryReply, reviewPage } = setup();
    summaryReply.next({ ...summary, latestWatchedBackdropPath: null });
    summaryReply.complete();
    reviewPage.next(empty);
    reviewPage.complete();
    expect(component.state()).toBe('ready');
    expect(component.cards()).toHaveLength(0);
    expect(component.banner()).toBeNull();
  });

  it.each(['summaryReply', 'reviewPage'] as const)('keeps the existing error state on %s failure', key => {
    const view = setup();
    view[key].error(new Error('failed'));
    expect(view.component.state()).toBe('error');
    expect(view.summaryReply.observed).toBe(false);
    expect(view.reviewPage.observed).toBe(false);
  });

  it('cancels both pending requests when the component is destroyed', () => {
    const { component, summaryReply, reviewPage } = setup();
    expect(summaryReply.observed).toBe(true);
    expect(reviewPage.observed).toBe(true);
    component.ngOnDestroy();
    expect(summaryReply.observed).toBe(false);
    expect(reviewPage.observed).toBe(false);
  });
});
