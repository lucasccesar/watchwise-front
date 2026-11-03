import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, map } from 'rxjs';
import { readAllPages } from '../../../shared/data-access/read-all-pages';

export interface DiarySeriesOption { seriesTmdbId: string; title: string; entriesCount: number; }

export type DiaryContentType = 'MOVIE' | 'EPISODE' | 'SEASON' | 'SERIES';
export type DiarySortBy = 'NEWEST' | 'OLDEST' | 'RATING_DESC' | 'RATING_ASC';
export type ProgressSortBy = 'LAST_WATCHED' | 'LAST_RELEASED' | 'REMAINING_EPISODES' | 'REMAINING_RUNTIME';

export interface DiaryRecord {
  id: string;
  reviewSource?: 'DIARY' | 'CONTENT_REVIEW';
  seriesTitle?: string | null;
  seriesPosterPath?: string | null;
  content: {
    id: string | null;
    type: DiaryContentType;
    tmdbId: string | null;
    seriesTmdbId: string | null;
    seasonNumber: number | null;
    episodeNumber: number | null;
    runtimeMinutes: number | null;
  };
  card: {
    title: string | null;
    posterPath: string | null;
    backdropPath?: string | null;
    customPosterUrl: string | null;
    releaseDate: string | null;
    releaseYear: number | null;
    runtimeMinutes: number | null;
    tmdbVoteAverage?: number | null;
    stats?: { averageScore: number | null; playsCount: number; reviewsCount: number; commentsCount: number } | null;
    previewStatus?: 'AVAILABLE' | 'PARTIAL' | 'UNAVAILABLE' | null;
  } | null;
  comment: string | null;
  score: number | null;
  watchedDate: string | null;
  createdAt: string;
  watchedInTheater: boolean | null;
  customPosterUrl: string | null;
  watchNumber: number;
  likesCount: number;
  commentsCount: number;
  likedByMe: boolean;
  watchedWith: Array<{ id?: string | null; name?: string | null; username?: string | null; profilePicture?: string | null }>;
}

interface DiaryReviewApiRecord {
  id: string;
  source: 'DIARY' | 'CONTENT_REVIEW';
  content: DiaryRecord['content'];
  card: DiaryRecord['card'];
  comment: string | null;
  score: number | null;
  watchedDate: string | null;
  createdAt: string;
  watchedInTheater: boolean | null;
  customPosterUrl: string | null;
  watchNumber: number | null;
  likesCount: number;
  commentsCount: number;
  likedByMe: boolean;
  watchedWith: DiaryRecord['watchedWith'];
  seriesTitle: string | null;
  seriesPosterPath: string | null;
}

interface DiaryReviewApiPage extends Omit<DiaryRecordPage, 'content'> {
  content: DiaryReviewApiRecord[];
}

export interface DiaryRecordPage {
  content: DiaryRecord[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
  hasNext: boolean;
  backdropPath?: string | null;
}

export interface SeriesSeasonProgress {
  seasonNumber: number;
  watchedEpisodeCount: number;
  totalEpisodeCount: number;
  watchedPercentage: number;
  watchedRuntimeMinutes: number | null;
  remainingEpisodeCount: number | null;
  remainingRuntimeMinutes: number | null;
}

export interface ProgressEpisode {
  seasonNumber: number;
  episodeNumber: number;
  title: string | null;
  releaseDate: string | null;
  runtimeMinutes: number | null;
  stillPath: string | null;
  availableToWatch: boolean | null;
}

export interface SeriesInProgressRecord {
  seriesTmdbId: string;
  maxSeasonNumber: number;
  maxEpisodeNumber: number;
  lastWatchedDate: string | null;
  watchedEpisodeCount: number;
  totalEpisodeCount: number | null;
  watchedPercentage: number | null;
  lastWatchedSeasonNumber: number | null;
  lastWatchedEpisodeNumber: number | null;
  watchedRuntimeMinutes: number | null;
  totalReleasedEpisodeCount: number | null;
  totalKnownRuntime: number | null;
  lastReleasedEpisodeDate: string | null;
  remainingEpisodeCount: number | null;
  remainingRuntimeMinutes: number | null;
  customPosterUrl: string | null;
  title: string | null;
  releaseYear: number | null;
  posterPath: string | null;
  seriesTitle: string | null;
  seriesPosterPath: string | null;
  lastWatchedEpisodeTitle: string | null;
  nextEpisode: ProgressEpisode | null;
  seasonProgress: SeriesSeasonProgress[];
}

export interface SeriesInProgressPage {
  content: SeriesInProgressRecord[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
  hasNext: boolean;
  aggregate: {
    totalSeriesCount: number;
    watchedEpisodeCount: number;
    totalReleasedEpisodeCount: number;
    remainingEpisodeCount: number;
    remainingRuntimeMinutes: number | null;
  };
}

@Injectable({ providedIn: 'root' })
export class DiaryApiService {
  constructor(private readonly http: HttpClient) {}

  getDiarySeries(userId: string): Observable<DiarySeriesOption[]> {
    return this.http.get<DiarySeriesOption[]>(`/api/v1/users/${encodeURIComponent(userId)}/diary/series`);
  }

  getAllDiaryEntries(userId: string, hasReview?: boolean): Observable<DiaryRecord[]> {
    return readAllPages(page => this.getDiaryPage(userId, { page, size: 1000, hasReview, sortBy: 'NEWEST' }));
  }

  getAllReviews(userId: string): Observable<DiaryRecord[]> {
    return readAllPages(page => this.getUserReviewsPage(userId, page, 1000)).pipe(
      map(records => records.map(record => ({
        ...record,
        reviewSource: record.source,
        watchedDate: record.watchedDate ?? record.createdAt.slice(0, 10),
        watchNumber: record.watchNumber ?? 1,
      }))),
    );
  }

  getUserReviewsPage(userId: string, page: number, size: number): Observable<DiaryReviewApiPage> {
    const params = new HttpParams().set('page', page).set('size', size);
    return this.http.get<DiaryReviewApiPage>(
      `/api/v1/users/${encodeURIComponent(userId)}/reviews`,
      { params },
    );
  }

  getDiaryPage(
    userId: string,
    options: {
      page: number;
      size: number;
      type?: 'MOVIE' | 'EPISODE';
      hasReview?: boolean;
      sortBy?: DiarySortBy;
      seriesTmdbId?: string;
      score?: number;
      scoreFrom?: number;
      scoreTo?: number;
      dateFrom?: string;
      dateTo?: string;
    },
  ): Observable<DiaryRecordPage> {
    let params = new HttpParams()
      .set('page', options.page)
      .set('size', options.size)
      .set('sortBy', options.sortBy ?? 'NEWEST');
    if (options.type) params = params.set('type', options.type);
    if (options.hasReview !== undefined) params = params.set('hasReview', options.hasReview);
    if (options.seriesTmdbId) params = params.set('seriesTmdbId', options.seriesTmdbId);
    if (options.score !== undefined) params = params.set('score', options.score);
    if (options.scoreFrom !== undefined) params = params.set('scoreFrom', options.scoreFrom);
    if (options.scoreTo !== undefined) params = params.set('scoreTo', options.scoreTo);
    if (options.dateFrom) params = params.set('dateFrom', options.dateFrom);
    if (options.dateTo) params = params.set('dateTo', options.dateTo);
    return this.http.get<DiaryRecordPage>(
      `/api/v1/users/${encodeURIComponent(userId)}/diary`,
      { params },
    );
  }

  getSeriesInProgress(
    userId: string,
    options: { page: number; size: number; sortBy: ProgressSortBy; direction: 'ASC' | 'DESC' },
  ): Observable<SeriesInProgressPage> {
    const params = new HttpParams()
      .set('page', options.page)
      .set('size', options.size)
      .set('sortBy', options.sortBy)
      .set('direction', options.direction);
    return this.http.get<SeriesInProgressPage>(
      `/api/v1/users/${encodeURIComponent(userId)}/series-in-progress`,
      { params },
    );
  }

  getAllSeriesInProgress(
    userId: string,
    options: { sortBy: ProgressSortBy; direction: 'ASC' | 'DESC' },
  ): Observable<SeriesInProgressRecord[]> {
    const size = 100;
    return readAllPages(page => this.getSeriesInProgress(userId, {
      page,
      size,
      sortBy: options.sortBy,
      direction: options.direction,
    }));
  }
}
