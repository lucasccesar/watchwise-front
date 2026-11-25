import '@angular/compiler';
import { HttpClient, HttpErrorResponse, HttpParams } from '@angular/common/http';
import { Injector, runInInjectionContext } from '@angular/core';
import { of, throwError } from 'rxjs';
import { describe, expect, it, vi } from 'vitest';
import { PicksApiService } from '../../data-access/picks-api.service';
import { PicksMyComponent } from './picks-my.component';

const listUrl = '/api/v1/users/me/picks/list';
const templateUrl = '/api/v1/users/me/picks-templates/view';
const cards = Array.from({length: 10}, (_, i) => ({
  id: 'pick-' + (10 - i),
  picksTemplate: { name: 'Template', coverImage: null, creator: { username: 'creator', name: 'Creator', profilePicture: null } },
  visibility: 'PRIVATE', createdAt: '2026-11-01T00:00:00', answeredCategoriesCount: 6, totalCategoriesCount: 8,
  answeredCategories: Array.from({length: 5}, (_, j) => ({categoryId: 'category-' + j, name: 'Category ' + j})),
  likesCount: 2, commentsCount: 3,
}));
const empty = {content: [], page: 1, size: 10, totalElements: 0, totalPages: 0, hasNext: false};

function open(state: 'populated' | 'empty' | 'denied' = 'populated') {
  const get = vi.fn((url: string, options?: {params: HttpParams}) => {
    if (url === listUrl && state === 'denied') return throwError(() => new HttpErrorResponse({status: 401}));
    if (url !== listUrl || state === 'empty') return of(empty);
    const second = options?.params.get('page') === '2';
    return of({...empty, content: second ? [cards[9]] : cards, page: second ? 2 : 1, totalElements: 11, totalPages: 2, hasNext: !second});
  });
  const api = new PicksApiService({get} as unknown as HttpClient);
  const injector = Injector.create({providers: [{provide: PicksApiService, useValue: api}]});
  const page = runInInjectionContext(injector, () => new PicksMyComponent());
  return {page, get, api, injector};
}

describe('Meus Picks list projection', () => {
  it('uses the summary only for the list, preserving data, ordering, progress and navigation', () => {
    const {page, get, api, injector} = open();
    expect(get.mock.calls.map(([url]) => url)).toEqual([listUrl, templateUrl]);
    expect(get.mock.calls[0][1]?.params.toString()).toBe('page=1&size=10');
    const list = page['picks']()!;
    expect(list.content).toEqual(cards);
    expect(page['status']()).toBe('ready');
    expect(page['pickRoute'](list.content[0])).toEqual(['/picks', 'pick-10']);
    expect(page['creatorHandle'](list.content[0])).toBe('@creator');
    expect(page['progressPercent'](list.content[0])).toBe(75);
    expect(page['extraAnswers'](list.content[0])).toBe(1);
    api.getPick(list.content[0].id).subscribe();
    expect(get.mock.calls.at(-1)?.[0]).toBe('/api/v1/picks/pick-10/view');
    expect(list.totalElements).toBe(11);
    page['nextPage']();
    expect(get.mock.calls.at(-1)?.[0]).toBe(listUrl);
    expect(get.mock.calls.at(-1)?.[1]?.params.toString()).toBe('page=2&size=10');
    expect(page['picks']()?.content).toEqual([cards[9]]);
    page['nextPage']();
    expect(get).toHaveBeenCalledTimes(4);
    injector.destroy();
  });

  it('preserves the empty list and independent template section', () => {
    const {page, get, injector} = open('empty');
    expect(page['status']()).toBe('ready');
    expect(page['picks']()).toEqual(empty);
    expect(get.mock.calls.map(([url]) => url)).toEqual([listUrl, templateUrl]);
    injector.destroy();
  });

  it('keeps the list error and the templates status independent', () => {
    const {page, injector} = open('denied');
    expect(page['status']()).toBe('error');
    expect(page['templatesStatus']()).toBe('ready');
    expect(page['error']()).toBe(page['copy'].loadPicksError);
    injector.destroy();
  });
});
