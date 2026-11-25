import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, map } from 'rxjs';
import { readAllPages } from '../../../shared/data-access/read-all-pages';

export type DiaryContentType = 'MOVIE' | 'EPISODE' | 'SEASON' | 'SERIES';
export type DiarySortBy = 'NEWEST' | 'OLDEST' | 'RATING_DESC' | 'RATING_ASC';
export type ProgressSortBy = 'LAST_WATCHED' | 'LAST_RELEASED' | 'REMAINING_EPISODES' | 'REMAINING_RUNTIME';

export interface DiaryReviewsSummary {
  totalMinutesWatchedMovies: number;
  totalMinutesWatchedEpisodes: number;
  totalMoviesWatched: number;
  totalDistinctMoviesWatched: number;
  totalEpisodesWatched: number;
  distinctSeriesWatched: number;
  latestWatchedBackdropPath: string | null;
}

export interface DiaryRecord {
  id: string;
  reviewSource?: 'DIARY' | 'CONTENT_REVIEW';
  seriesTitle?: string | null;
  seriesCustomPosterUrl?: string | null;
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
    viewerState?: { myRating?: number | null; currentRatingVersion?: number | null } | null;
    previewStatus?: 'AVAILABLE' | 'PARTIAL' | 'UNAVAILABLE' | null;
  } | null;
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
  seriesCustomPosterUrl?: string | null;
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

export type DiaryViewContentRef = DiaryRecord['content'] & {
  totalRuntimeMinutes?: number | null;
};

export interface DiaryViewReviewPreview {
  id?: string;
  comment?: string | null;
  watchNumber?: number | null;
}

export interface DiaryViewCompletion {
  kind: 'DERIVED_COMPLETION';
  diaryEntryId: null;
  completionKey: string;
  content: DiaryViewContentRef;
  watchNumber: number;
  anchorEntryId: string | null;
  watchedDate: string | null;
  orderedAt: string | null;
  currentScore: number | null;
  currentRatingVersion: number | null;
  reviewPreviews: DiaryViewReviewPreview[];
  reviewCount: number;
  relatedDiaryEntryIds: string[];
}

export interface DiaryTimelineEntryItem {
  kind: 'PERSISTED_ENTRY';
  entry: DiaryRecord;
}

export interface DiaryTimelineCompletionItem {
  kind: 'DERIVED_COMPLETION';
  completion: DiaryViewCompletion;
  card: DiaryRecord['card'];
  seriesCard: DiaryRecord['card'];
}

export type DiaryTimelineItem = DiaryTimelineEntryItem | DiaryTimelineCompletionItem;

export interface DiaryTimelinePage extends Omit<DiaryRecordPage, 'content'> {
  content: DiaryTimelineItem[];
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
  completedSeasonProgress?: SeriesSeasonProgress[] | null;
}

export interface SeriesInProgressPage {
  content: SeriesInProgressRecord[];
  backdropPath: string | null;
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

  deleteSeriesDiaryHistory(seriesTmdbId: string): Observable<void> {
    return this.http.delete<void>(`/api/v1/diary/series/${encodeURIComponent(seriesTmdbId)}`);
  }

  getAllDiaryEntries(userId: string, hasReview?: boolean): Observable<DiaryRecord[]> {
    return readAllPages(page => this.getDiaryPage(userId, { page, size: 1000, hasReview, sortBy: 'NEWEST' }));
  }

  getEpisodeDiaryEntriesForSeries(userId: string, seriesTmdbId: string): Observable<DiaryRecord[]> {
    return readAllPages(page => this.getDiaryPage(userId, {
      page,
      size: 1000,
      type: 'EPISODE',
      seriesTmdbId,
      sortBy: 'NEWEST',
    }));
  }

  getAllReviews(userId: string): Observable<DiaryRecord[]> {
    return readAllPages(page => this.getReviewsPage(userId, page, 1000));
  }

  getReviewsSummary(userId: string): Observable<DiaryReviewsSummary> {
    return this.http.get<DiaryReviewsSummary>(
      `/api/v1/users/${encodeURIComponent(userId)}/summary/diary-reviews`,
    );
  }

  getReviewsPage(userId: string, page: number, size: number): Observable<DiaryRecordPage> {
    return this.getUserReviewsPage(userId, page, size).pipe(map(response => ({
      ...response,
      content: response.content.map(({ source, ...record }) => ({
        ...record,
        reviewSource: source,
        watchedDate: record.watchedDate ?? record.createdAt.slice(0, 10),
      })),
    })));
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
    return this.http.get<DiaryRecordPage>(
      `/api/v1/users/${encodeURIComponent(userId)}/diary`,
      { params: this.diaryPageParams(options, false) },
    );
  }

  getDiaryTimelinePage(
    userId: string,
    options: {
      page: number;
      size: number;
      type?: DiaryContentType;
      hasReview?: boolean;
      sortBy?: DiarySortBy;
      seriesTmdbId?: string;
      score?: number;
      scoreFrom?: number;
      scoreTo?: number;
      dateFrom?: string;
      dateTo?: string;
    },
  ): Observable<DiaryTimelinePage> {
    return this.http.get<DiaryTimelinePage>(
      `/api/v1/users/${encodeURIComponent(userId)}/diary`,
      { params: this.diaryPageParams(options, true) },
    );
  }

  private diaryPageParams(
    options: {
      page: number;
      size: number;
      type?: DiaryContentType;
      hasReview?: boolean;
      sortBy?: DiarySortBy;
      seriesTmdbId?: string;
      score?: number;
      scoreFrom?: number;
      scoreTo?: number;
      dateFrom?: string;
      dateTo?: string;
    },
    includeCompletions: boolean,
  ): HttpParams {
    let params = new HttpParams()
      .set('page', options.page)
      .set('size', options.size)
      .set('sortBy', options.sortBy ?? 'NEWEST')
      .set('includeCompletions', includeCompletions);
    if (options.type) params = params.set('type', options.type);
    if (options.hasReview !== undefined) params = params.set('hasReview', options.hasReview);
    if (options.seriesTmdbId) params = params.set('seriesTmdbId', options.seriesTmdbId);
    if (options.score !== undefined) params = params.set('score', options.score);
    if (options.scoreFrom !== undefined) params = params.set('scoreFrom', options.scoreFrom);
    if (options.scoreTo !== undefined) params = params.set('scoreTo', options.scoreTo);
    if (options.dateFrom) params = params.set('dateFrom', options.dateFrom);
    if (options.dateTo) params = params.set('dateTo', options.dateTo);
    return params;
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
