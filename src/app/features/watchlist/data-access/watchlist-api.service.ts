import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { map, Observable } from 'rxjs';
import { readAllPages } from '../../../shared/data-access/read-all-pages';

export type WatchlistContentType = 'MOVIE' | 'SERIES';
export type WatchlistStatus = 'ALL' | 'NEW' | 'IN_PROGRESS' | 'UPCOMING';
export type WatchlistSort = 'DATE_ADDED' | 'RELEASE_DATE' | 'RUNTIME' | 'RATING' | 'TITLE';

export interface WatchlistCard {
  id: string;
  position: number;
  createdAt: string;
  releaseDate: string | null;
  status: Exclude<WatchlistStatus, 'ALL'>;
  card: {
    contentId: string | null;
    type: WatchlistContentType;
    tmdbId: string | null;
    seriesTmdbId: string | null;
    title: string | null;
    posterPath: string | null;
    customPosterUrl: string | null;
    releaseDate: string | null;
    releaseYear: number | null;
    tmdbVoteAverage: number | null;
    runtimeMinutes: number | null;
    totalRuntimeMinutes: number | null;
    numberOfEpisodes: number | null;
    genres: string[] | null;
    stats: { averageScore: number | null; playsCount: number; reviewsCount: number; commentsCount: number } | null;
    viewerState: {
      watchStatus: 'UNWATCHED' | 'PARTIALLY_WATCHED' | 'WATCHED' | 'UNKNOWN' | null;
      watchedEpisodeCount: number | null;
      releasedEpisodeCount: number | null;
    } | null;
    previewStatus: 'AVAILABLE' | 'PARTIAL' | 'UNAVAILABLE';
  };
}

export interface WatchlistView {
  content: WatchlistCard[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
  hasNext: boolean;
  backdropPath?: string | null;
  aggregate: {
    totalCount: number;
    movieCount: number;
    seriesCount: number;
    totalRuntimeMinutes: number;
    upcomingCount: number;
  };
}

@Injectable({ providedIn: 'root' })
export class WatchlistApiService {
  constructor(private readonly http: HttpClient) {}

  getGenreOptions(userId: string): Observable<string[]> {
    return readAllPages(page => this.getView(userId, {
      type: null, genre: null, status: 'ALL', sort: 'DATE_ADDED', direction: 'DESC', page, size: 1000,
    })).pipe(map(items => [...new Set(items.flatMap(item => item.card.genres ?? []))].sort((a, b) => a.localeCompare(b, 'pt-BR'))));
  }

  getView(userId: string, options: {
    type: WatchlistContentType | null;
    genre: string | null;
    status: WatchlistStatus;
    sort: WatchlistSort;
    direction: 'ASC' | 'DESC';
    page: number;
    size: number;
  }): Observable<WatchlistView> {
    let params = new HttpParams()
      .set('status', options.status)
      .set('sort', options.sort)
      .set('direction', options.direction)
      .set('page', options.page)
      .set('size', options.size);
    if (options.type) params = params.set('type', options.type);
    if (options.genre) params = params.set('genre', options.genre);
    return this.http.get<WatchlistView>(
      `/api/v1/users/${encodeURIComponent(userId)}/watchlist/view`,
      { params },
    );
  }
}
