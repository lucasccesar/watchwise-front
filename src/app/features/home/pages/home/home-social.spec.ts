import '@angular/compiler';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injector, runInInjectionContext } from '@angular/core';
import { Router } from '@angular/router';
import { of, Subject, throwError } from 'rxjs';
import { describe, expect, it, vi } from 'vitest';
import { AuthSessionService } from '../../../../core/session/session.service';
import { AppShellStateService } from '../../../../core/ui/app-shell-state.service';
import { ConfirmationDialogService } from '../../../../shared/components/confirmation-dialog/confirmation-dialog.service';
import { ToastNotificationsService } from '../../../../shared/components/toast-notifications/toast-notifications.service';
import { ContentApiService } from '../../../content/data-access/content-api.service';
import { HomeApiService, type HomeSocialActivity, type HomeSummary } from '../../data-access/home-api.service';
import { HomeComponent } from './home.component';

class TestHome extends HomeComponent {
  readSummary = this.summary;
  readStatus = this.status;
  unavailable = (item: HomeSocialActivity) => this.socialLikeUnavailable(item);
  like = (item: HomeSocialActivity) => this.toggleDiaryLike(item);
  reload = () => this.loadSummary(undefined, true);
  title = (item: HomeSocialActivity) => this.socialActivityTitle(item);
}

const diary = (id: string, details: Partial<HomeSocialActivity> = {}): HomeSocialActivity => ({
  id, eventType: 'DIARY_ENTRY', user: { id: 'author', username: 'author', name: 'Author', profilePicture: null },
  content: null, targetLabel: null, likesCount: 1, commentsCount: 2, createdAt: '2026-11-02T07:52:00', ...details,
});
const pick = { ...diary('pick'), eventType: 'PICK_CREATED' } satisfies HomeSocialActivity;
const episode = diary('episode', { targetLabel: 'Fallback', likedByMe: false, content: {
  id: 'episode-id', type: 'EPISODE', tmdbId: null, seriesTmdbId: '7', seasonNumber: 2, episodeNumber: 3,
} });

function home(socialActivities: HomeSocialActivity[]): HomeSummary {
  return {
    totalMinutesWatchedMovies: 0, totalMinutesWatchedEpisodes: 0, totalMoviesWatched: 0,
    totalDistinctMoviesWatched: 0, totalEpisodesWatched: 0, distinctSeriesWatched: 0,
    latestWatchedBackdropPath: null, nextEpisodes: [], upcomingReleases: [], watchCountByDayLast30Days: [],
    genreCountsMoviesLast30Days: [], genreCountsEpisodesLast30Days: [], viewer: null,
    hasUnreadNotifications: false, recentlyWatched: [], socialActivities,
  };
}

function component(activities: HomeSocialActivity[]) {
  const get = vi.fn().mockReturnValue(of(home(activities)));
  const api = new HomeApiService({ get } as unknown as HttpClient);
  const getHomeSummary = vi.spyOn(api, 'getHomeSummary');
  const content = { setReviewLike: vi.fn(), getEpisodePage: vi.fn() };
  const router = { navigateByUrl: vi.fn() };
  const session = { user: () => ({ id: 'viewer' }), clear: vi.fn() };
  const shell = { clearHomeState: vi.fn(), updateHomeState: vi.fn() };
  const toasts = { error: vi.fn() };
  const injector = Injector.create({ providers: [
    { provide: ToastNotificationsService, useValue: toasts },
    { provide: ConfirmationDialogService, useValue: {} },
  ] });
  const page = runInInjectionContext(injector, () => new TestHome(
    api, content as unknown as ContentApiService, session as unknown as AuthSessionService,
    shell as unknown as AppShellStateService, router as unknown as Router,
  ));
  return { page, getHomeSummary, get, content, router, session, toasts };
}

describe('Home social activity', () => {
  it('uses the ordered summary as the source of Diary actions and leaves Picks alone', () => {
    const first = diary('rated', { score: 8, comment: 'Loved it', likedByMe: true });
    const second = diary('unrated', { likedByMe: false });
    const { page, getHomeSummary, content, get } = component([first, second, pick]);
    page.ngOnInit();
    expect(getHomeSummary).toHaveBeenCalledExactlyOnceWith('viewer', true);
    expect(get).toHaveBeenCalledExactlyOnceWith('/api/v1/users/viewer/summary/home', { params: { includeDiaryActivity: true } });
    expect(content.getEpisodePage).not.toHaveBeenCalled();
    expect(page.readSummary()?.socialActivities).toEqual([first, second, pick]);
    expect(page.unavailable(first)).toBe(false);
    expect(page.unavailable(second)).toBe(false);
    expect(page.unavailable(pick)).toBe(true);
    expect(second.score).toBeUndefined();
    expect(second.comment).toBeUndefined();
  });

  it.each([{ label: 'Picks only', items: [pick] }, { label: 'empty Feed', items: [] }])(
    'leaves the $label control without a social fetch or title lookup', ({ items }) => {
      const { page, get, content } = component(items);
      page.ngOnInit();
      expect(get).toHaveBeenCalledExactlyOnceWith('/api/v1/users/viewer/summary/home', { params: { includeDiaryActivity: true } });
      expect(content.getEpisodePage).not.toHaveBeenCalled();
      expect(page.readSummary()?.socialActivities).toEqual(items);
    },
  );

  it('retains like and unlike and rejects repeated clicks while a request is pending', () => {
    const initial = diary('diary', { likedByMe: false });
    const { page, content, toasts } = component([initial, pick]);
    const update = new Subject<void>();
    content.setReviewLike.mockReturnValueOnce(update).mockReturnValueOnce(of(undefined))
      .mockReturnValueOnce(throwError(() => new HttpErrorResponse({ status: 403 })));
    page.ngOnInit();
    page.like(initial);
    page.like(initial);
    expect(content.setReviewLike).toHaveBeenCalledExactlyOnceWith('diary', 'DIARY', true);
    update.next();
    const liked = page.readSummary()!.socialActivities[0];
    expect(liked).toMatchObject({ likedByMe: true, likesCount: 2 });
    page.like(liked);
    expect(content.setReviewLike).toHaveBeenLastCalledWith('diary', 'DIARY', false);
    const unliked = page.readSummary()!.socialActivities[0];
    expect(unliked).toMatchObject({ likedByMe: false, likesCount: 1 });
    page.like(unliked);
    expect(page.readSummary()!.socialActivities).toEqual([unliked, pick]);
    expect(toasts.error).toHaveBeenCalledOnce();
  });

  it('keeps actions unavailable for a legacy or incomplete response without a like state', () => {
    const item = diary('legacy', { score: 8, comment: 'Text' });
    const {page, content, get} = component([item]);
    page.ngOnInit();
    expect(page.unavailable(item)).toBe(true);
    page.like(item);
    expect(content.setReviewLike).not.toHaveBeenCalled();
    expect(get).toHaveBeenCalledExactlyOnceWith('/api/v1/users/viewer/summary/home', { params: { includeDiaryActivity: true } });
  });

  it('looks up an episode title from the summary without blocking readiness or actions', () => {
    const {page, content, get} = component([pick, episode]);
    const title = new Subject<unknown>();
    content.getEpisodePage.mockReturnValue(title);
    page.ngOnInit();
    expect(get).toHaveBeenCalledExactlyOnceWith('/api/v1/users/viewer/summary/home', { params: { includeDiaryActivity: true } });
    expect(content.getEpisodePage).toHaveBeenCalledExactlyOnceWith('episode-id');
    expect(page.readStatus()).toBe('ready');
    expect(page.unavailable(episode)).toBe(false);
    expect(page.title(episode)).toBe('Fallback');
    title.next({details: {title: 'Episode title', parentTitle: 'Series title'}});
    const items = page.readSummary()!.socialActivities;
    expect(items).toEqual([pick, {...episode, episodeTitle: 'Episode title', seriesTitle: 'Series title'}]);
    expect(page.title(items[1])).toBe('Episode title');
  });

  it('keeps the fallback on episode failure and ignores an obsolete lookup after reload', () => {
    const {page, getHomeSummary, content} = component([episode]);
    const old = new Subject<unknown>();
    content.getEpisodePage.mockReturnValueOnce(old)
      .mockReturnValueOnce(throwError(() => new Error('Unavailable')));
    page.ngOnInit();
    getHomeSummary.mockReturnValue(of(home([episode])));
    page.reload();
    old.next({details: {title: 'Stale', parentTitle: 'Stale'}});
    expect(page.readStatus()).toBe('ready');
    expect(page.title(page.readSummary()!.socialActivities[0])).toBe('Fallback');
  });

  it('keeps the episode fallback when the authorized summary has no internal ID', () => {
    const item = { ...episode, content: { ...episode.content!, id: null } };
    const { page, content } = component([item]);
    page.ngOnInit();
    expect(content.getEpisodePage).not.toHaveBeenCalled();
    expect(page.title(item)).toBe('Fallback');
    expect(page.unavailable(item)).toBe(false);
  });

  it('does not apply a title arriving after the component is destroyed', () => {
    const { page, content } = component([episode]);
    const title = new Subject<unknown>();
    content.getEpisodePage.mockReturnValue(title);
    page.ngOnInit();
    page.ngOnDestroy();
    title.next({ details: { title: 'Obsolete', parentTitle: 'Obsolete' } });
    expect(page.readSummary()?.socialActivities).toEqual([episode]);
  });

  it('keeps the existing session error policy', () => {
    const {page, getHomeSummary, router, session, content} = component([]);
    getHomeSummary.mockReturnValue(throwError(() => new HttpErrorResponse({ status: 401 })));
    page.ngOnInit();
    expect(session.clear).toHaveBeenCalledOnce();
    expect(router.navigateByUrl).toHaveBeenCalledWith('/login');
    expect(content.getEpisodePage).not.toHaveBeenCalled();
  });

  it('only opts in to supplemental fields explicitly at the service call site', () => {
    const http = { get: vi.fn() };
    const api = new HomeApiService(http as unknown as HttpClient);
    api.getHomeSummary('user/id');
    api.getHomeSummary('user/id', true);
    expect(http.get).toHaveBeenNthCalledWith(1, '/api/v1/users/user%2Fid/summary/home');
    expect(http.get).toHaveBeenNthCalledWith(2, '/api/v1/users/user%2Fid/summary/home', { params: { includeDiaryActivity: true } });
  });
});

