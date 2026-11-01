import '@angular/compiler';
import { Injector, runInInjectionContext } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { NEVER, of } from 'rxjs';
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
import { WatchlistApiService } from '../../data-access/watchlist-api.service';
import { WatchlistComponent } from './watchlist.component';

describe('Stable genre menus', () => {
  it.each(['watchlist', 'profile'])('keeps complete choices while %s changes its visible genre/page', mode => {
    const api = { getView: vi.fn().mockReturnValue(of({ content: [{ card: { genres: ['Drama'] } }], totalPages: 4 })), getGenreOptions: vi.fn().mockReturnValue(of(['Comédia', 'Drama', 'Terror'])) };
    const injector = Injector.create({ providers: [
      { provide: ActivatedRoute, useValue: { paramMap: NEVER, data: NEVER } },
      { provide: AuthSessionService, useValue: { user: () => ({ id: 'viewer' }) } },
      { provide: Router, useValue: {} }, { provide: WatchlistApiService, useValue: api },
      { provide: HomeApiService, useValue: { getHomeSummary: () => of({ latestWatchedBackdropPath: null }) } },
      ...[ContentApiService, DiaryApiService, ListsApiService, PicksApiService, ProfileApiService, SearchApiService].map(provide => ({ provide, useValue: {} })),
    ] });
    const page = runInInjectionContext(injector, () => mode === 'watchlist' ? new WatchlistComponent() : new ProfileComponent()) as any;
    if (mode === 'profile') { page.section.set('watchlist'); page.loadSection('viewer'); }
    expect(page[mode === 'watchlist' ? 'genreOptions' : 'watchlistGenreOptions']()).toEqual(['Comédia', 'Drama', 'Terror']);
    api.getView.mockReturnValue(of({ content: [{ card: { genres: ['Comédia'] } }], totalPages: 2 }));
    if (mode === 'watchlist') page.selectGenre('Comédia');
    else { page.watchlistGenre.set('Comédia'); page.loadSection('viewer'); }
    expect(page[mode === 'watchlist' ? 'genreOptions' : 'watchlistGenreOptions']()).toEqual(['Comédia', 'Drama', 'Terror']);
    expect(api.getView.mock.calls.at(-1)?.[1]).toMatchObject({ genre: 'Comédia', size: mode === 'watchlist' ? 18 : page.pageSize });
    expect(api.getGenreOptions).toHaveBeenCalledTimes(1);
  });
});
