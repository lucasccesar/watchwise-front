import '@angular/compiler';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injector, runInInjectionContext } from '@angular/core';
import { ActivatedRoute, Router, convertToParamMap } from '@angular/router';
import { BehaviorSubject, of, Subject, throwError } from 'rxjs';
import { describe, expect, it, vi } from 'vitest';
import { AuthSessionService } from '../../../../core/session/session.service';
import { ConfirmationDialogService } from '../../../../shared/components/confirmation-dialog/confirmation-dialog.service';
import { ToastNotificationsService } from '../../../../shared/components/toast-notifications/toast-notifications.service';
import { ContentApiService } from '../../../content/data-access/content-api.service';
import { ProfileApiService } from '../../../profile/data-access/profile-api.service';
import { DiaryReviewDetailComponent } from './review-detail.component';

const movieId = '101c38de-ebe1-4799-a35a-d689a3abdbaa';
const detailsUrl = `/api/v1/contents/${movieId}/details`;
const legacyUrl = `/api/v1/contents/${movieId}/page`;
const viewerBackdrop = 'https://image.tmdb.org/t/p/w1280/viewer.svg';
const review = {
  id: 'own',
  userId: 'viewer',
  comment: 'Uma review',
  likedByMe: true,
  likesCount: 2,
  content: { id: movieId, type: 'MOVIE', tmdbId: '105' },
  card: { title: 'Um filme', backdropPath: '/author.svg', posterPath: '/poster.svg' },
};
const comment = { id: 'comment', body: 'Comentário', likedByMe: true };
const movieDetails = { contentId: movieId, type: 'MOVIE', backdropPath: '/viewer.svg' };

function openReview(firstId: string, responses: Record<string, unknown> = {}, internal = false) {
  const paramMap = new BehaviorSubject(convertToParamMap({ entryId: firstId }));
  const entries = {
    own: review,
    other: { ...review, id: 'other', userId: 'author' },
    noText: { ...review, id: 'noText', comment: null, card: { ...review.card, backdropPath: null } },
    episode: { ...review, id: 'episode', content: { type: 'EPISODE', seriesTmdbId: '42' } },
  };
  const get = vi.fn((url: string) => {
    if (Object.hasOwn(responses, url)) return responses[url];
    if (url === detailsUrl) return of(movieDetails);
    if (url === legacyUrl) return of({ details: movieDetails });
    if (url === '/api/v1/contents/series/page') {
      return of({ details: { title: 'Série', backdropPath: '/series.svg' }, metadata: {}, stats: {}, viewerState: {}, sections: {} });
    }
    if (url.endsWith('/comments')) return of({ content: [comment] });
    const key = url.split('/').at(-1) as keyof typeof entries;
    if (Object.hasOwn(entries, key)) return of(entries[key]);
    throw new Error(`GET inesperado: ${url}`);
  });
  const post = vi.fn().mockReturnValue(of({ id: 'series' }));
  const profile = { getUser: vi.fn().mockReturnValue(of({ name: 'Autora' })) };
  const injector = Injector.create({ providers: [
    { provide: ActivatedRoute, useValue: { paramMap } },
    { provide: Router, useValue: { getCurrentNavigation: () => internal ? { extras: {} } : null } },
    { provide: ContentApiService, useValue: new ContentApiService({ get, post } as unknown as HttpClient) },
    { provide: AuthSessionService, useValue: { user: () => ({ id: 'viewer', name: 'Visitante' }) } },
    { provide: ProfileApiService, useValue: profile },
    { provide: ConfirmationDialogService, useValue: {} },
    { provide: ToastNotificationsService, useValue: {} },
  ] });
  const component = runInInjectionContext(injector, () => new DiaryReviewDetailComponent());
  return { component, get, post, profile, paramMap };
}

describe('Fundo de review e registro de filme', () => {
  it.each([['own', false], ['own', true], ['other', false]] as const)(
    'monta o fundo para %s (navegação interna: %s) sem buscar a página completa', (id, internal) => {
      const { component, get, profile, post } = openReview(id, {}, internal);
      expect(get.mock.calls.map(([url]) => url)).toEqual([
        `/api/v1/diary/${id}`, detailsUrl, `/api/v1/diary/${id}/comments`,
      ]);
      expect(post).not.toHaveBeenCalled();
      expect(component['status']()).toBe('ready');
      expect(component['contentTitle']()).toBe('Um filme');
      expect(component['posterUrl']()).toContain('/poster.svg');
      expect(component['backdrop']()).toBe(viewerBackdrop);
      expect(component['comments']()).toEqual([comment]);
      expect(component['entry']()).toMatchObject({ id, likedByMe: true, likesCount: 2, comment: 'Uma review' });
      if (id === 'other') expect(profile.getUser).toHaveBeenCalledExactlyOnceWith('author');
      else expect(profile.getUser).not.toHaveBeenCalled();
    },
  );

  it.each([null, undefined, '   '])('mantém o pôster sem fundo próprio (%s)', (backdropPath) => {
    const { component, get } = openReview('noText', { [detailsUrl]: of({ ...movieDetails, backdropPath }) });
    expect(get).toHaveBeenCalledWith(detailsUrl);
    expect(get).not.toHaveBeenCalledWith(legacyUrl);
    expect(component['backdrop']()).toBeNull();
    expect(component['posterUrl']()).toContain('/poster.svg');
    expect(component['entry']()?.comment).toBeNull();
    expect(component['comments']()).toEqual([comment]);
  });

  it('não usa o fundo de outra mídia', () => {
    const { component } = openReview('own', { [detailsUrl]: of({ ...movieDetails, contentId: 'wrong' }) });
    expect(component['backdrop']()).toBeNull();
  });

  it('mantém o registro e os comentários quando a leitura do fundo falha', () => {
    const failure = throwError(() => new HttpErrorResponse({ status: 503 }));
    const { component, get } = openReview('own', { [detailsUrl]: failure });
    expect(get).not.toHaveBeenCalledWith(legacyUrl);
    expect(component['status']()).toBe('ready');
    expect(component['comments']()).toEqual([comment]);
    expect(component['backdrop']()).toBeNull();
  });

  it.each([401, 403, 404])('interrompe o carregamento após HTTP %d do registro', (status) => {
    const url = '/api/v1/diary/private';
    const { component, get, post, profile } = openReview('private', {
      [url]: throwError(() => new HttpErrorResponse({ status })),
    });
    expect(get.mock.calls).toEqual([[url]]);
    expect(post).not.toHaveBeenCalled();
    expect(profile.getUser).not.toHaveBeenCalled();
    expect(component['status']()).toBe('error');
  });

  it('não aplica o fundo atrasado do registro anterior', () => {
    const pending = new Subject();
    const { component, paramMap } = openReview('own', { [detailsUrl]: pending });
    paramMap.next(convertToParamMap({ entryId: 'episode' }));
    pending.next(movieDetails);
    expect(component['backdrop']()).toContain('/series.svg');
  });

  it('preserva a referência e a página da série para episódios', () => {
    const { component, get, post } = openReview('episode');
    expect(post).toHaveBeenCalledExactlyOnceWith('/api/v1/contents/reference', { type: 'SERIES', tmdbId: '42' });
    expect(get).toHaveBeenCalledWith('/api/v1/contents/series/page');
    expect(get).not.toHaveBeenCalledWith(detailsUrl);
    expect(component['contentTitle']()).toBe('Série');
    expect(component['backdrop']()).toContain('/series.svg');
  });
});
