import '@angular/compiler';
import { DOCUMENT } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { FormBuilder } from '@angular/forms';
import { Injector, Renderer2, runInInjectionContext } from '@angular/core';
import { DomSanitizer, Title } from '@angular/platform-browser';
import { ActivatedRoute, Router, convertToParamMap } from '@angular/router';
import { of, throwError } from 'rxjs';
import { describe, expect, it, vi } from 'vitest';
import { AuthSessionService } from '../../../../core/session/session.service';
import { ConfirmationDialogService } from '../../../../shared/components/confirmation-dialog/confirmation-dialog.service';
import { ToastNotificationsService } from '../../../../shared/components/toast-notifications/toast-notifications.service';
import { ContentApiService } from '../../data-access/content-api.service';
import { MovieComponent } from './movie.component';

const id = '44317204-e413-43bd-a7c5-b34f4ebd6952';
const other = '70000000-0000-4000-8000-000000000004';
const movie = {
  details: { contentId: id, type: 'MOVIE', title: 'Pulp Fiction' },
  metadata: { tmdbUrl: 'https://www.themoviedb.org/movie/680' },
};
const emptyPanel = { content: [] };

function openMovie(hint?: string, result = of(movie)) {
  const api = {
    getPage: vi.fn().mockImplementation((uuid: string) => uuid === hint ? result : of(movie)),
    createMovieReference: vi.fn().mockReturnValue(of({ id })),
    getReviews: vi.fn().mockReturnValue(of(emptyPanel)),
    getComments: vi.fn().mockReturnValue(of(emptyPanel)),
  };
  const injector = Injector.create({ providers: [
    { provide: ActivatedRoute, useValue: {
      paramMap: of(convertToParamMap({ tmdbId: '680' })),
      queryParamMap: of(convertToParamMap(hint ? { contentId: hint } : {})),
    } },
    { provide: Router, useValue: { getCurrentNavigation: () => null } },
    { provide: ContentApiService, useValue: api },
    { provide: AuthSessionService, useValue: { user: () => null } },
    { provide: ConfirmationDialogService, useValue: {} },
    { provide: ToastNotificationsService, useValue: {} },
    { provide: DomSanitizer, useValue: {} },
    { provide: DOCUMENT, useValue: { baseURI: 'http://localhost/', head: {} } },
    { provide: Renderer2, useValue: { createElement: vi.fn(() => ({})), setAttribute: vi.fn(), appendChild: vi.fn() } },
    { provide: Title, useValue: { setTitle: vi.fn() } },
  ] });
  const component = runInInjectionContext(injector, () => new MovieComponent(injector.get(ActivatedRoute), injector.get(Router), injector.get(ContentApiService), injector.get(AuthSessionService), new FormBuilder()));
  component.ngOnInit();
  return api;
}

describe('Movie reference on navigation and reload', () => {
  it('uses the UUID when its page confirms the movie identity', () => {
    const api = openMovie(id);
    expect(api.getPage).toHaveBeenCalledExactlyOnceWith(id);
    expect(api.createMovieReference).not.toHaveBeenCalled();
    expect(api.getReviews).toHaveBeenCalledWith(id, 1, 'RECENT');
    expect(api.getComments).toHaveBeenCalledWith(id, 1);
  });

  it.each([undefined, 'invalid-uuid'])('resolves the route without a usable hint (%s)', hint => {
    const api = openMovie(hint);
    expect(api.createMovieReference).toHaveBeenCalledExactlyOnceWith('680');
    expect(api.getPage).toHaveBeenCalledExactlyOnceWith(id);
  });

  it.each([
    { ...movie, details: { ...movie.details, contentId: other }, metadata: { tmdbUrl: 'https://www.themoviedb.org/movie/197100004' } },
    { ...movie, details: { ...movie.details, contentId: other, type: 'SERIES' } },
    { ...movie, details: { ...movie.details, contentId: other }, metadata: { tmdbUrl: null } },
  ])('does not load panels from an incompatible hint', hintedPage => {
    const api = openMovie(other, of(hintedPage as typeof movie));
    expect(api.createMovieReference).toHaveBeenCalledExactlyOnceWith('680');
    expect(api.getPage.mock.calls).toEqual([[other], [id]]);
    expect(api.getReviews.mock.calls.map(([uuid]) => uuid)).toEqual([id]);
    expect(api.getComments.mock.calls.map(([uuid]) => uuid)).toEqual([id]);
  });

  it('resolves a hint whose UUID no longer exists', () => {
    const api = openMovie(other, throwError(() => new HttpErrorResponse({ status: 404 })));
    expect(api.createMovieReference).toHaveBeenCalledExactlyOnceWith('680');
    expect(api.getPage.mock.calls).toEqual([[other], [id]]);
  });

  it('does not repeat the request on transient errors', () => {
    const api = openMovie(other, throwError(() => new HttpErrorResponse({ status: 502 })));
    expect(api.createMovieReference).not.toHaveBeenCalled();
    expect(api.getReviews).not.toHaveBeenCalled();
  });
});
