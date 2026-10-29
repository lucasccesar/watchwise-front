import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';

export type TrendingType = 'MOVIE' | 'SERIES';
export type TrendingWindow = 'day' | 'week';

export interface TrendingViewerState {
  watchStatus: 'WATCHED' | 'PARTIALLY_WATCHED' | 'UNWATCHED' | 'UNKNOWN' | null;
  myRating: number | null;
  lastWatchedDate: string | null;
  playsCount: number | null;
  inWatchlist: boolean | null;
  dropped: boolean | null;
}

export interface TrendingCard {
  tmdbId: string;
  type: TrendingType;
  title: string | null;
  posterUrl: string | null;
  backdropPath: string | null;
  year: number | null;
  genres: string[] | null;
  tmdbVoteAverage: number | null;
  popularity: number | null;
  runtimeMinutes: number | null;
  numberOfSeasons: number | null;
  viewerState: TrendingViewerState | null;
  previewStatus: 'AVAILABLE' | 'PARTIAL' | 'UNAVAILABLE';
}

export interface TrendingSectionPage {
  page: number;
  size: number;
  totalPages: number;
  totalResults: number;
  hasNext: boolean;
}

export interface TrendingResponse {
  movies: TrendingCard[];
  series: TrendingCard[];
  moviesPage: TrendingSectionPage | null;
  seriesPage: TrendingSectionPage | null;
}

@Injectable({ providedIn: 'root' })
export class TrendingApiService {
  constructor(private readonly http: HttpClient) {}

  getTrending(timeWindow: TrendingWindow): Observable<TrendingResponse> {
    return this.http.get<TrendingResponse>('/api/v1/trending', {
      params: new HttpParams().set('timeWindow', timeWindow).set('size', 12),
    });
  }

  getSection(
    type: TrendingType,
    timeWindow: TrendingWindow,
    page: number,
  ): Observable<TrendingResponse> {
    const params = new HttpParams().set('timeWindow', timeWindow).set('page', page).set('size', 21);
    return this.http.get<TrendingResponse>(`/api/v1/trending/${type.toLowerCase()}`, {
      params,
    });
  }
}
