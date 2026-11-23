import '@angular/compiler';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injector, runInInjectionContext } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { NEVER, of, Subject, throwError } from 'rxjs';
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
  const searchApi = { search: vi.fn().mockReturnValue(NEVER) };
  const profileApi = { getHeader: vi.fn(), getUser: vi.fn(), setFollow: vi.fn(), getSummary: vi.fn().mockReturnValue(of(summary)) };
  const injector = Injector.create({ providers: [
    { provide: ActivatedRoute, useValue: { paramMap: NEVER, data: NEVER, snapshot: { paramMap: { get: () => null } } } },
    { provide: AuthSessionService, useValue: { user: () => ({ id: 'viewer' }) } },
    { provide: Router, useValue: {} },
    { provide: ProfileApiService, useValue: profileApi },
    { provide: DiaryApiService, useValue: diaryApi },
    { provide: ListsApiService, useValue: {} },
    { provide: WatchlistApiService, useValue: {} },
    { provide: PicksApiService, useValue: {} },
    { provide: SearchApiService, useValue: searchApi },
    { provide: ContentApiService, useValue: {} },
    { provide: ToastNotificationsService, useValue: { success: vi.fn(), error: vi.fn() } },
    { provide: ConfirmationDialogService, useValue: {} },
  ] });
  const page = runInInjectionContext(injector, () => new ProfileComponent()) as any;
  return { page, diaryApi, profileApi, searchApi };
}

describe('Profile overview header', () => {
  const visible = {
    id: 'viewer', username: 'viewer', name: 'Viewer', access: 'VISIBLE',
    ownedByViewer: true, followsViewer: false, blockRelationship: 'NONE',
    minutesWatchedMoviesLast30Days: 31, minutesWatchedEpisodesLast30Days: 47,
  };

  function open(page: any, username = '@VIEWER') {
    page.username.set(username);
    page.loadProfile();
  }

  it('waits for the single header before requesting the movie overview', () => {
    const { page, profileApi, diaryApi, searchApi } = createProfilePage({});
    const header = new Subject<typeof visible>();
    profileApi.getHeader.mockReturnValue(header);
    open(page);
    expect(profileApi.getHeader).toHaveBeenCalledExactlyOnceWith('@VIEWER');
    expect(searchApi.search).not.toHaveBeenCalled();
    expect(profileApi.getUser).not.toHaveBeenCalled();
    expect(profileApi.getSummary).not.toHaveBeenCalled();
    expect(page.status()).toBe('loading');

    header.next(visible);
    expect(profileApi.getSummary).toHaveBeenCalledWith('viewer', 'MOVIE');
    expect(diaryApi.getDiaryPage).toHaveBeenCalledWith('viewer', { page: 1, size: 6, type: 'MOVIE', sortBy: 'NEWEST' });
    expect(diaryApi.getUserReviewsPage).toHaveBeenCalledWith('viewer', 1, 50);
    expect(page.followState()).toBe('SELF');
    expect(page.last30DayMinutes()).toBe(31);
  });

  it('keeps the episodes overview and its recent minutes without reloading the header', () => {
    const { page, profileApi, diaryApi } = createProfilePage({});
    profileApi.getHeader.mockReturnValue(of(visible));
    open(page);
    page.chooseMode('EPISODE');
    expect(profileApi.getHeader).toHaveBeenCalledTimes(1);
    expect(profileApi.getSummary).toHaveBeenLastCalledWith('viewer', 'EPISODE');
    expect(diaryApi.getDiaryPage).toHaveBeenLastCalledWith('viewer', { page: 1, size: 30, type: 'EPISODE', sortBy: 'NEWEST' });
    expect(diaryApi.getUserReviewsPage).toHaveBeenCalledTimes(2);
    expect(page.last30DayMinutes()).toBe(47);
  });

  it.each([
    ['PRIVATE', 'NONE', 'private', 'PENDING'],
    ['PRIVATE', 'BLOCKED_BY_ME', 'private', 'NOT_FOLLOWING'],
    ['PRIVATE', 'BLOCKED_ME', 'private', 'NOT_FOLLOWING'],
    ['UNAVAILABLE', 'MUTUAL', 'error', 'NOT_FOLLOWING'],
    ['UNAVAILABLE', 'BLOCKED_ME', 'error', 'NOT_FOLLOWING'],
  ])('keeps %s/%s out of the overview requests', (access, blockRelationship, status, followState) => {
    const { page, profileApi, diaryApi } = createProfilePage({});
    profileApi.getHeader.mockReturnValue(of({
      ...visible, id: 'other', username: 'other', access, blockRelationship, ownedByViewer: false,
      viewerFollowStatus: blockRelationship === 'NONE' ? 'PENDING' : null,
    }));
    open(page, 'other');
    expect(page.status()).toBe(status);
    expect(page.followState()).toBe(followState);
    expect(profileApi.getSummary).not.toHaveBeenCalled();
    expect(diaryApi.getDiaryPage).not.toHaveBeenCalled();
    expect(diaryApi.getUserReviewsPage).not.toHaveBeenCalled();
  });

  it('preserves relationship updates on a public third-party profile', () => {
    const { page, profileApi } = createProfilePage({});
    profileApi.getHeader.mockReturnValue(of({
      ...visible, id: 'other', username: 'other', ownedByViewer: false, followsViewer: true, followersCount: 4,
    }));
    profileApi.setFollow.mockReturnValue(of({ status: 'ACCEPTED' }));
    open(page, 'other');
    expect(page.followsViewer()).toBe(true);
    page.follow();
    expect(profileApi.setFollow).toHaveBeenCalledWith('other', true);
    expect(page.followState()).toBe('FOLLOWING');
    expect(page.profile().followersCount).toBe(5);
  });

  it.each([[403, 'private'], [404, 'error'], [500, 'error']])('handles profile header HTTP %s', (code, status) => {
    const { page, profileApi } = createProfilePage({});
    profileApi.getHeader.mockReturnValue(throwError(() => new HttpErrorResponse({ status: code })));
    open(page);
    expect(page.status()).toBe(status);
    expect(profileApi.getSummary).not.toHaveBeenCalled();
  });

  it.each([[403, 'private'], [404, 'error']])('preserves section HTTP %s after a visible header', (code, status) => {
    const { page, profileApi } = createProfilePage({});
    profileApi.getHeader.mockReturnValue(of(visible));
    profileApi.getSummary.mockReturnValue(throwError(() => new HttpErrorResponse({ status: code })));
    open(page);
    expect(page.status()).toBe(status);
    expect(page.profileOverviewLoading()).toBe(false);
  });

  it('keeps loading until the existing summary and auxiliary responses are resolved', () => {
    const { page, profileApi, diaryApi } = createProfilePage({});
    const reviews = new Subject<{ content: unknown[] }>();
    profileApi.getHeader.mockReturnValue(of(visible));
    diaryApi.getUserReviewsPage.mockReturnValue(reviews);
    open(page);
    expect(page.profileOverviewLoading()).toBe(true);
    reviews.next({ content: [] });
    expect(page.profileOverviewLoading()).toBe(true);
    reviews.complete();
    expect(page.profileOverviewLoading()).toBe(false);
  });

  it('uses a query parameter for the exact name and preserves the legacy identity route', () => {
    const get = vi.fn();
    const api = new ProfileApiService({ get } as unknown as HttpClient);
    api.getHeader('@Nome %_');
    expect(get.mock.calls[0][0]).toBe('/api/v1/users/profile-header');
    expect(get.mock.calls[0][1].params.get('username')).toBe('@Nome %_');
    api.getUser('viewer');
    expect(get).toHaveBeenLastCalledWith('/api/v1/users/viewer');
  });


  it('ignores a previous header and previous overview when navigation supersedes them', () => {
    const { page, profileApi } = createProfilePage({});
    const first = new Subject();
    const current = new Subject();
    profileApi.getHeader.mockReturnValueOnce(first).mockReturnValueOnce(current).mockReturnValueOnce(of(visible));
    open(page, 'first');
    open(page, 'current');
    first.next({ ...visible, id: 'first', username: 'first' });
    expect(profileApi.getSummary).not.toHaveBeenCalled();
    const staleOverview = new Subject();
    profileApi.getSummary.mockReturnValueOnce(staleOverview);
    current.next({ ...visible, id: 'current', username: 'current' });
    expect(profileApi.getSummary).toHaveBeenCalledWith('current', 'MOVIE');
    open(page, 'viewer');
    staleOverview.next({ genreCounts: [{ genre: 'Stale' }] });
    expect(page.profile().username).toBe('viewer');
    expect(page.summary().genreCounts).toBeUndefined();
  });
});

