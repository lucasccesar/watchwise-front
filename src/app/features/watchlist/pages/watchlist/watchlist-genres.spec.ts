import '@angular/compiler';
import { HttpErrorResponse } from '@angular/common/http';
import { Injector, runInInjectionContext } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { NEVER, Subject, of, throwError } from 'rxjs';
import { describe, expect, it, vi } from 'vitest';
import { AuthSessionService } from '../../../../core/session/session.service';
import { ConfirmationDialogService } from '../../../../shared/components/confirmation-dialog/confirmation-dialog.service';
import { ToastNotificationsService } from '../../../../shared/components/toast-notifications/toast-notifications.service';
import { HomeApiService } from '../../../home/data-access/home-api.service';
import { ContentApiService } from '../../../content/data-access/content-api.service';
import { DiaryApiService } from '../../../diary/data-access/diary-api.service';
import { ListsApiService } from '../../../lists/data-access/lists-api.service';
import { PicksApiService } from '../../../picks/data-access/picks-api.service';
import { ProfileApiService } from '../../../profile/data-access/profile-api.service';
import { ProfileComponent } from '../../../profile/pages/profile/profile.component';
import { SearchApiService } from '../../../search-content/data-access/search-api.service';
import { WatchlistApiService, WatchlistView } from '../../data-access/watchlist-api.service';
import { WatchlistComponent } from './watchlist.component';

const view = (availableGenres: string[], totalPages = 4) => ({
  content: [], availableGenres, totalPages,
});
const rawGenres = ['Terror', 'Ação', ' acao ', 'Drama', 'drama', '', 'Drama', 'Áção'];
const previousGenres = [...new Set(rawGenres)].sort((a, b) => a.localeCompare(b, 'pt-BR'));

function setup(mode: 'watchlist' | 'profile', response = of(view(rawGenres))) {
  const api = {
    getView: vi.fn().mockReturnValue(response),
    getGenreOptions: vi.fn().mockReturnValue(of(previousGenres)),
  };
  const toast = { error: vi.fn() };
  const injector = Injector.create({ providers: [
    { provide: ActivatedRoute, useValue: { paramMap: NEVER, data: NEVER } },
    { provide: AuthSessionService, useValue: { user: () => ({ id: 'viewer' }) } },
    { provide: Router, useValue: {} },
    { provide: ToastNotificationsService, useValue: toast },
    { provide: ConfirmationDialogService, useValue: {} },
    { provide: WatchlistApiService, useValue: api },
    { provide: HomeApiService, useValue: { getHomeSummary: () => of({ latestWatchedBackdropPath: null }) } },
    ...[ContentApiService, DiaryApiService, ListsApiService, PicksApiService, ProfileApiService, SearchApiService]
      .map(provide => ({ provide, useValue: {} })),
  ] });
  const page = runInInjectionContext(injector,
    () => mode === 'watchlist' ? new WatchlistComponent() : new ProfileComponent()) as any;
  return { page, api, toast };
}

describe('Watchlist genre options', () => {
  it('loads exact names in legacy locale order with only the paginated request', () => {
    const { page, api } = setup('watchlist');

    expect(page.status()).toBe('ready');
    expect(page.genreOptions()).toEqual(previousGenres);
    expect(api.getView).toHaveBeenCalledExactlyOnceWith('viewer', expect.objectContaining({
      includeGenreOptions: true, page: 1, size: 18,
    }));
    expect(api.getGenreOptions).not.toHaveBeenCalled();
  });

  it('keeps global options during page, type, sort, select and clear changes', () => {
    const { page, api } = setup('watchlist');
    page.goToPage(2);
    expect(api.getView.mock.calls.at(-1)?.[1]).toMatchObject({ page: 2, size: 18 });
    page.selectType('SERIES');
    page.selectSort('TITLE');
    page.selectGenre('Drama');
    expect(api.getView.mock.calls.at(-1)?.[1]).toMatchObject({ page: 1, type: 'SERIES', sort: 'TITLE', genre: 'Drama' });
    page.selectGenre(null);
    expect(api.getView.mock.calls.at(-1)?.[1]).toMatchObject({ genre: null, page: 1 });
    expect(page.genreOptions()).toEqual(previousGenres);
    expect(api.getGenreOptions).not.toHaveBeenCalled();
    api.getView.mockReturnValue(of(view([], 0)));
    page.load(true);
    expect(page.genreOptions()).toEqual([]);
    expect(page.visibleItems()).toEqual([]);
  });

  it('preserves error and reload behavior and ignores canceled responses', () => {
    const pending = new Subject<WatchlistView>();
    const { page, api, toast } = setup('watchlist', pending as never);
    api.getView.mockReturnValue(of(view(['Nova'])));
    page.selectType('MOVIE');
    pending.next(view(['Obsoleta']) as WatchlistView);
    expect(pending.observed).toBe(false);
    expect(page.genreOptions()).toEqual(['Nova']);

    api.getView.mockReturnValue(throwError(() => new HttpErrorResponse({ status: 500 })));
    page.load(true);
    expect(toast.error).toHaveBeenCalledOnce();
    expect(page.genreOptions()).toEqual(['Nova']);
    page.load();
    expect(page.status()).toBe('error');
    expect(page.error()).toBeTruthy();

    const inflight = new Subject<WatchlistView>();
    api.getView.mockReturnValue(inflight);
    page.load();
    page.ngOnDestroy();
    expect(inflight.observed).toBe(false);
  });

  it('preserves independent genre pagination on Profile', () => {
    const { page, api } = setup('profile');
    page.profile.set({ id: 'viewer' });
    page.section.set('watchlist');
    page.loadSection('viewer');
    page.watchlistGenre.set('Drama');
    page.loadSection('viewer');

    expect(page.watchlistGenreOptions()).toEqual(previousGenres);
    expect(api.getGenreOptions).not.toHaveBeenCalled();
    expect(api.getView.mock.calls.at(-1)?.[1]).toMatchObject({ genre: 'Drama', size: page.pageSize });
    expect(api.getView.mock.calls.at(-1)?.[1]).toHaveProperty('includeGenreOptions', true);
  });
});


describe('Watchlist session-independent genre menus', () => {
  it.each(['watchlist', 'profile'] as const)('clears a stale %s menu on a legacy response without making an auxiliary request', (mode) => {
    const { page, api } = setup(mode);
    if (mode === 'profile') {
      page.profile.set({ id: 'viewer' });
      page.section.set('watchlist');
      page.loadSection('viewer');
    }
    const genres = () => mode === 'profile' ? page.watchlistGenreOptions() : page.genreOptions();
    expect(genres()).toEqual(previousGenres);
    api.getView.mockReturnValue(of({ content: [], totalPages: 1 }));
    if (mode === 'profile') page.loadSection('viewer');
    else page.load();
    expect(genres()).toEqual([]);
    expect(api.getView).toHaveBeenCalledTimes(2);
    expect(api.getGenreOptions).not.toHaveBeenCalled();
  });

  it('ignores an older watchlist response when the profile changes owner', () => {
    const old = new Subject<WatchlistView>();
    const { page, api } = setup('profile', old as never);
    page.section.set('watchlist');
    page.profile.set({ id: 'owner-a' });
    page.loadSection('owner-a');
    api.getView.mockReturnValue(of(view(['Nova'])));
    page.profile.set({ id: 'owner-b' });
    page.loadSection('owner-b');
    old.next(view(['Antiga']) as WatchlistView);
    expect(page.watchlistGenreOptions()).toEqual(['Nova']);
    expect(api.getView.mock.calls.every(([, opts]) => opts.includeGenreOptions === true && opts.size === page.pageSize)).toBe(true);
  });

  it('does not reset a valid selection when the filtered page is empty', () => {
    const { page, api } = setup('watchlist');
    api.getView.mockReturnValue(of(view(['Drama'], 0)));
    page.selectGenre('Drama');
    expect(page.genre()).toBe('Drama');
    expect(api.getView).toHaveBeenCalledTimes(2);
  });
});
