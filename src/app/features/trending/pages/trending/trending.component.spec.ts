import '@angular/compiler';
import { HttpErrorResponse } from '@angular/common/http';
import { ElementRef } from '@angular/core';
import { Router } from '@angular/router';
import { of, throwError } from 'rxjs';
import { describe, expect, it, vi } from 'vitest';
import { AuthSessionService } from '../../../../core/session/session.service';
import {
  TrendingApiService,
  TrendingCard,
  TrendingResponse,
  TrendingType,
} from '../../data-access/trending-api.service';
import { TrendingComponent } from './trending.component';

const movie = (index: number): TrendingCard => ({
  tmdbId: String(index),
  type: 'MOVIE',
  title: `Movie ${index}`,
  posterUrl: null,
  backdropPath: null,
  year: 2026,
  genres: [],
  tmdbVoteAverage: null,
  popularity: null,
  runtimeMinutes: null,
  numberOfSeasons: null,
  viewerState: null,
  previewStatus: 'AVAILABLE',
});

const initial: TrendingResponse = {
  movies: Array.from({ length: 12 }, (_, index) => movie(index + 1)),
  series: [],
  moviesPage: { page: 1, size: 12, totalPages: 2, totalResults: 25, hasNext: true },
  seriesPage: { page: 1, size: 12, totalPages: 0, totalResults: 0, hasNext: false },
};

function read(component: TrendingComponent) {
  return component as unknown as {
    section(type: TrendingType): { cards: TrendingCard[]; visibleCount: number };
    toggleMore(type: TrendingType): void;
    status(): string;
    view(): 'grid' | 'list';
    period(): 'day' | 'week';
    filterOpen(): boolean;
    filterSubpage(): 'view' | 'period' | null;
    openFilters(event: Event): void;
    openFilterSubpage(page: 'view' | 'period'): void;
    selectFilterView(view: 'grid' | 'list'): void;
    selectFilterPeriod(period: 'day' | 'week'): void;
    backToFilters(): void;
    closeFilters(): void;
    handleFilterKeydown(event: KeyboardEvent): void;
    filterCloseButton: ElementRef<HTMLButtonElement>;
    filterDialog: ElementRef<HTMLElement>;
  };
}

describe('TrendingComponent', () => {
  function filterSheet() {
    const api = { getTrending: vi.fn().mockReturnValue(of(initial)) };
    const component = new TrendingComponent(
      api as unknown as TrendingApiService,
      {} as AuthSessionService,
      {} as Router,
    );
    const sheet = read(component);
    const opener = { focus: vi.fn() };
    sheet.openFilters({ currentTarget: opener } as unknown as Event);
    return { sheet, api, opener };
  }

  it.each(['grid', 'list'] as const)('returns to the summary immediately after selecting %s without reloading', (view) => {
    const { sheet, api } = filterSheet();
    sheet.openFilterSubpage('view');
    expect(sheet.filterSubpage()).toBe('view');

    sheet.selectFilterView(view);

    expect(sheet.view()).toBe(view);
    expect(sheet.filterSubpage()).toBeNull();
    expect(sheet.filterOpen()).toBe(true);
    expect(api.getTrending).not.toHaveBeenCalled();
  });

  it('returns to the summary and reloads only when the selected period changes', () => {
    const { sheet, api } = filterSheet();
    for (const [period, calls] of [['day', 1], ['day', 1], ['week', 2]] as const) {
      sheet.openFilterSubpage('period');
      expect(sheet.filterSubpage()).toBe('period');

      sheet.selectFilterPeriod(period);

      expect(sheet.period()).toBe(period);
      expect(sheet.filterSubpage()).toBeNull();
      expect(sheet.filterOpen()).toBe(true);
      expect(api.getTrending).toHaveBeenCalledTimes(calls);
      expect(api.getTrending).toHaveBeenLastCalledWith(period);
    }
  });

  it.each(['view', 'period'] as const)('returns from %s with Back or Done without changing selection', (page) => {
    const { sheet, api } = filterSheet();
    const originalView = sheet.view();
    sheet.openFilterSubpage(page);

    sheet.backToFilters();

    expect(sheet.filterSubpage()).toBeNull();
    expect(sheet.filterOpen()).toBe(true);
    expect(sheet.view()).toBe(originalView);
    expect(sheet.period()).toBe('week');
    expect(api.getTrending).not.toHaveBeenCalled();
  });

  it.each(['view', 'period'] as const)('closes %s with Escape and restores focus to the opener', (page) => {
    const { sheet, opener } = filterSheet();
    sheet.openFilterSubpage(page);

    sheet.handleFilterKeydown({ key: 'Escape' } as KeyboardEvent);

    expect(sheet.filterOpen()).toBe(false);
    expect(sheet.filterSubpage()).toBeNull();
    expect(opener.focus).toHaveBeenCalledOnce();
    sheet.openFilters({ currentTarget: opener } as unknown as Event);
    expect(sheet.filterSubpage()).toBeNull();
  });

  it('dismisses through the close handler and restores focus', () => {
    const { sheet, opener } = filterSheet();
    sheet.closeFilters();
    expect(sheet.filterOpen()).toBe(false);
    expect(opener.focus).toHaveBeenCalledOnce();
  });

  it('focuses the close control when the open dialog renders', () => {
    const { sheet } = filterSheet();
    const close = { focus: vi.fn() };
    sheet.filterCloseButton = new ElementRef(close as unknown as HTMLButtonElement);
    expect(close.focus).toHaveBeenCalledOnce();
  });

  it('wraps Tab and Shift+Tab within the dialog controls', () => {
    const { sheet } = filterSheet();
    const first = { focus: vi.fn() };
    const last = { focus: vi.fn() };
    sheet.filterDialog = new ElementRef({
      querySelectorAll: () => [first, last],
    } as unknown as HTMLElement);
    const preventDefault = vi.fn();
    try {
      vi.stubGlobal('document', { activeElement: last });
      sheet.handleFilterKeydown({ key: 'Tab', shiftKey: false, preventDefault } as unknown as KeyboardEvent);
      expect(first.focus).toHaveBeenCalledOnce();
      vi.stubGlobal('document', { activeElement: first });
      sheet.handleFilterKeydown({ key: 'Tab', shiftKey: true, preventDefault } as unknown as KeyboardEvent);
      expect(last.focus).toHaveBeenCalledOnce();
      expect(preventDefault).toHaveBeenCalledTimes(2);
    } finally {
      vi.unstubAllGlobals();
    }
  });

  it('replaces the initial 12 cards with the expanded first page', () => {
    const expanded: TrendingResponse = {
      ...initial,
      movies: Array.from({ length: 20 }, (_, index) => movie(index + 1)),
      moviesPage: { page: 1, size: 21, totalPages: 2, totalResults: 25, hasNext: true },
    };
    const api = {
      getTrending: vi.fn().mockReturnValue(of(initial)),
      getSection: vi.fn().mockReturnValue(of(expanded)),
    };
    const component = new TrendingComponent(
      api as unknown as TrendingApiService,
      {} as AuthSessionService,
      {} as Router,
    );

    component.ngOnInit();
    read(component).toggleMore('MOVIE');

    expect(api.getTrending).toHaveBeenCalledWith('week');
    expect(api.getSection).toHaveBeenCalledWith('MOVIE', 'week', 1);
    expect(read(component).section('MOVIE').cards).toHaveLength(20);
    expect(read(component).section('MOVIE').visibleCount).toBe(20);
  });

  it('clears the session and redirects when the API returns 401', () => {
    const session = { clear: vi.fn() };
    const router = { navigateByUrl: vi.fn().mockResolvedValue(true) };
    const api = {
      getTrending: vi
        .fn()
        .mockReturnValue(throwError(() => new HttpErrorResponse({ status: 401 }))),
    };
    const component = new TrendingComponent(
      api as unknown as TrendingApiService,
      session as unknown as AuthSessionService,
      router as unknown as Router,
    );

    component.ngOnInit();

    expect(session.clear).toHaveBeenCalledOnce();
    expect(router.navigateByUrl).toHaveBeenCalledWith('/login');
  });
});
