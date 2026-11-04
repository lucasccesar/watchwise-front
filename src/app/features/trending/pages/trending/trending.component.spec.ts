import '@angular/compiler';
import { HttpErrorResponse } from '@angular/common/http';
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
  };
}

describe('TrendingComponent', () => {
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
