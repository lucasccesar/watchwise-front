import '@angular/compiler';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injector, runInInjectionContext } from '@angular/core';
import { ActivatedRoute, convertToParamMap } from '@angular/router';
import { of, throwError } from 'rxjs';
import { describe, expect, it, vi } from 'vitest';
import { PicksApiService } from '../../data-access/picks-api.service';
import { PicksExploreComponent } from './picks-explore.component';

const totalsPath = '/api/v1/users/me/picks/totals';
const catalogPath = '/api/v1/picks-templates';
const templatePage = { content: [], page: 1, size: 5, totalElements: 0, totalPages: 0, hasNext: false };

function open(query?: Record<string, string>, totals: { picksCount: number | null; templatesCount: number | null } | null = {
  picksCount: 3, templatesCount: 2,
}) {
  const get = vi.fn((url: string, options?: { params: { get(key: string): string | null } }) => {
    if (url === totalsPath) return totals === null
      ? throwError(() => new HttpErrorResponse({ status: 503 }))
      : of(totals);
    if (url === catalogPath) {
      const sort = options?.params.get('sort');
      return of(sort === 'POPULAR_WEEK' ? templatePage : {
        ...templatePage, content: [{ id: sort }], totalElements: 1, totalPages: 1,
      });
    }
    return of(templatePage);
  });
  const route = { snapshot: {
    pathFromRoot: query ? [{ routeConfig: { path: 'picks/templates' } }] : [],
    queryParamMap: convertToParamMap(query ?? {}),
  } };
  const api = new PicksApiService({ get } as unknown as HttpClient);
  const injector = Injector.create({ providers: [
    { provide: ActivatedRoute, useValue: route },
    { provide: PicksApiService, useValue: api },
  ] });
  const page = runInInjectionContext(injector, () => new PicksExploreComponent());
  return { page, get };
}

describe('Picks Explore header totals', () => {
  it('loads all three sections and one header request on opening, without reloading totals on a filter', () => {
    const { page, get } = open();
    expect(get.mock.calls.map(([url]) => url)).toEqual([totalsPath, catalogPath, catalogPath, catalogPath]);
    expect(page['heroStats']()).toBe('3 escolhas · 2 modelos');
    expect(page['myTemplateCountLabel']()).toBe('2 modelos');
    expect(page['popular']()?.content).toEqual([]);
    expect(page['recent']()?.content[0]?.id).toBe('RECENT');
    expect(page['mostPicked']()?.content[0]?.id).toBe('MOST_PICKED');
    page['selectOrigin']('COMMUNITY');
    expect(get.mock.calls.filter(([url]) => url === totalsPath)).toHaveLength(1);
  });

  it('loads fresh totals on a new route instance and keeps catalog pagination and sort', () => {
    const { page, get } = open({ sort: 'MOST_PICKED', page: '2' }, { picksCount: 4, templatesCount: 3 });
    expect(get.mock.calls.map(([url]) => url)).toEqual([totalsPath, catalogPath]);
    expect(get.mock.calls[1][1]?.params.get('sort')).toBe('MOST_PICKED');
    expect(get.mock.calls[1][1]?.params.get('page')).toBe('2');
    expect(page['allTemplates']()?.content[0]?.id).toBe('MOST_PICKED');
    expect(page['heroStats']()).toBe('4 escolhas · 3 modelos');
  });

  it('keeps the paginated page request in the own-templates catalog', () => {
    const { get } = open({ scope: 'mine' });
    expect(get.mock.calls.map(([url]) => url)).toEqual([totalsPath, '/api/v1/users/me/picks-templates/view']);
    expect(get.mock.calls[1][1]?.params.get('size')).toBe('5');
  });

  it.each([
    [{ picksCount: 0, templatesCount: 0 }, '0 escolhas · 0 modelos', '0 modelos'],
    [{ picksCount: null, templatesCount: 2 }, null, '2 modelos'],
    [{ picksCount: 3, templatesCount: null }, null, '0 modelos'],
    [null, null, '0 modelos'],
  ] as const)('preserves zero, partial and unavailable totals (%j)', (totals, hero, strip) => {
    const { page } = open(undefined, totals);
    expect(page['heroStats']()).toBe(hero);
    expect(page['myTemplateCountLabel']()).toBe(strip);
    expect(page['status']()).toBe('ready');
    expect(page['recent']()?.content[0]?.id).toBe('RECENT');
  });
});
