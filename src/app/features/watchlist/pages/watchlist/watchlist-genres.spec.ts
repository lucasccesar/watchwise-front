import '@angular/compiler';
import { Injector, runInInjectionContext } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { NEVER, of, Subject } from 'rxjs';
import { describe, expect, it, vi } from 'vitest';
import { AuthSessionService } from '../../../../core/session/session.service';
import { HomeApiService } from '../../../home/data-access/home-api.service';
import { ContentApiService } from '../../../content/data-access/content-api.service';
import { DiaryApiService } from '../../../diary/data-access/diary-api.service';
import { ListsApiService } from '../../../lists/data-access/lists-api.service';
import { PicksApiService } from '../../../picks/data-access/picks-api.service';
import { ProfileApiService } from '../../../profile/data-access/profile-api.service';
import { ProfileComponent } from '../../../profile/pages/profile/profile.component';
import { SearchApiService } from '../../../search-content/data-access/search-api.service';
import { ConfirmationDialogService } from '../../../../shared/components/confirmation-dialog/confirmation-dialog.service';
import { ToastNotificationsService } from '../../../../shared/components/toast-notifications/toast-notifications.service';
import { WatchlistApiService } from '../../data-access/watchlist-api.service';
import { WatchlistComponent } from './watchlist.component';

describe('Stable genre menus', () => {
  it.each(['watchlist', 'profile'])('uses the complete server genre set while %s changes its visible genre/page', mode => {
    const availableGenres = ['Comédia', 'Drama', 'Terror'];
    const api = { getView: vi.fn().mockReturnValue(of({
      content: [{ card: { genres: ['Drama'] } }], totalPages: 4, availableGenres,
    })) };
    const injector = Injector.create({ providers: [
      { provide: ActivatedRoute, useValue: { paramMap: NEVER, data: NEVER } },
      { provide: AuthSessionService, useValue: { user: () => ({ id: 'viewer' }) } },
      { provide: Router, useValue: {} }, { provide: WatchlistApiService, useValue: api },
      { provide: ToastNotificationsService, useValue: { success: vi.fn(), error: vi.fn() } },
      { provide: ConfirmationDialogService, useValue: {} },
      { provide: HomeApiService, useValue: { getHomeSummary: () => of({ latestWatchedBackdropPath: null }) } },
      ...[ContentApiService, DiaryApiService, ListsApiService, PicksApiService, ProfileApiService, SearchApiService].map(provide => ({ provide, useValue: {} })),
    ] });
    const page = runInInjectionContext(injector, () => mode === 'watchlist' ? new WatchlistComponent() : new ProfileComponent()) as any;
    if (mode === 'profile') {
      page.profile.set({ id: 'viewer', username: 'viewer', name: 'Viewer' });
      page.section.set('watchlist');
      page.loadSection('viewer');
    }
    expect(page[mode === 'watchlist' ? 'genreOptions' : 'watchlistGenreOptions']()).toEqual(['Comédia', 'Drama', 'Terror']);
    api.getView.mockReturnValue(of({
      content: [{ card: { genres: ['Comédia'] } }], totalPages: 2, availableGenres,
    }));
    if (mode === 'watchlist') page.selectGenre('Comédia');
    else { page.watchlistGenre.set('Comédia'); page.loadSection('viewer'); }
    expect(page[mode === 'watchlist' ? 'genreOptions' : 'watchlistGenreOptions']()).toEqual(['Comédia', 'Drama', 'Terror']);
    expect(api.getView.mock.calls.at(-1)?.[1]).toMatchObject({ genre: 'Comédia', size: mode === 'watchlist' ? 18 : page.pageSize });
    expect(api.getView.mock.calls.every(([, options]) => options.size !== 1000)).toBe(true);
  });

  it.each(['watchlist', 'profile'])('clears stale genre choices when %s receives a legacy response', mode => {
    const api = { getView: vi.fn().mockReturnValue(of({
      content: [], totalPages: 1, availableGenres: ['Drama'],
    })) };
    const injector = Injector.create({ providers: [
      { provide: ActivatedRoute, useValue: { paramMap: NEVER, data: NEVER } },
      { provide: AuthSessionService, useValue: { user: () => ({ id: 'viewer' }) } },
      { provide: Router, useValue: {} }, { provide: WatchlistApiService, useValue: api },
      { provide: ToastNotificationsService, useValue: { success: vi.fn(), error: vi.fn() } },
      { provide: ConfirmationDialogService, useValue: {} },
      { provide: HomeApiService, useValue: { getHomeSummary: () => of({ latestWatchedBackdropPath: null }) } },
      ...[ContentApiService, DiaryApiService, ListsApiService, PicksApiService, ProfileApiService, SearchApiService].map(provide => ({ provide, useValue: {} })),
    ] });
    const page = runInInjectionContext(injector, () => mode === 'watchlist' ? new WatchlistComponent() : new ProfileComponent()) as any;
    const getGenres = () => page[mode === 'watchlist' ? 'genreOptions' : 'watchlistGenreOptions']();
    if (mode === 'profile') {
      page.profile.set({ id: 'viewer', username: 'viewer', name: 'Viewer' });
      page.section.set('watchlist');
      page.loadSection('viewer');
    }
    expect(getGenres()).toEqual(['Drama']);

    api.getView.mockReturnValue(of({ content: [], totalPages: 1 }));
    if (mode === 'watchlist') page.load();
    else page.loadSection('viewer');

    expect(getGenres()).toEqual([]);
  });

  it('ignores a late profile watchlist response after navigating to another owner', () => {
    const lateResponse = new Subject<any>();
    const api = {
      getView: vi.fn().mockReturnValueOnce(lateResponse).mockReturnValueOnce(of({
        content: [{ id: 'item-b' }], totalPages: 1, availableGenres: ['Drama B'],
      })),
    };
    const injector = Injector.create({ providers: [
      { provide: ActivatedRoute, useValue: { paramMap: NEVER, data: NEVER } },
      { provide: AuthSessionService, useValue: { user: () => ({ id: 'viewer' }) } },
      { provide: Router, useValue: {} }, { provide: WatchlistApiService, useValue: api },
      { provide: ToastNotificationsService, useValue: { success: vi.fn(), error: vi.fn() } },
      { provide: ConfirmationDialogService, useValue: {} },
      { provide: HomeApiService, useValue: { getHomeSummary: () => of({ latestWatchedBackdropPath: null }) } },
      ...[ContentApiService, DiaryApiService, ListsApiService, PicksApiService, ProfileApiService, SearchApiService].map(provide => ({ provide, useValue: {} })),
    ] });
    const page = runInInjectionContext(injector, () => new ProfileComponent()) as any;
    page.section.set('watchlist');
    page.profile.set({ id: 'user-a', username: 'a', name: 'A' });
    page.loadSection('user-a');
    page.profile.set({ id: 'user-b', username: 'b', name: 'B' });
    page.loadSection('user-b');

    expect(page.watchlistGenreOptions()).toEqual(['Drama B']);
    expect(page.watchlist().content).toEqual([{ id: 'item-b' }]);

    lateResponse.next({ content: [{ id: 'item-a' }], totalPages: 1, availableGenres: ['Drama A'] });

    expect(page.watchlistGenreOptions()).toEqual(['Drama B']);
    expect(page.watchlist().content).toEqual([{ id: 'item-b' }]);
  });
});
