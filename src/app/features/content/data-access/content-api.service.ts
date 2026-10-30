import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';

export type ReviewSort = 'POPULAR' | 'RECENT' | 'FOLLOWING';
export type ContentReviewSource = 'DIARY' | 'DROPPED' | 'CONTENT_REVIEW';

export interface ContentReference {
  id: string;
  type: 'MOVIE';
  tmdbId: string;
}

export interface MovieCastMember {
  id: number;
  name: string;
  character: string | null;
  profilePath: string | null;
}

export interface MovieCrewMember {
  id: number;
  name: string;
  profilePath: string | null;
  jobs: string[];
}

export interface MovieVideo {
  key: string;
  name: string;
  type: string;
  official: boolean;
  url: string;
}

export interface MovieProvider {
  providerId: number | null;
  providerName: string;
  logoPath: string | null;
  type: 'flatrate' | 'rent' | 'buy';
  watchUrl: string | null;
}

export interface MovieDetails {
  contentId: string;
  type: 'MOVIE';
  tmdbId: string;
  title: string | null;
  overview: string | null;
  posterPath: string | null;
  customPosterUrl: string | null;
  backdropPath: string | null;
  releaseDate: string | null;
  runtimeMinutes: number | null;
  genres: string[];
  countries: string[];
  cast: MovieCastMember[];
  crew: MovieCrewMember[];
  watchProviders: Array<{
    providerName: string;
    logoPath: string | null;
    type: 'flatrate' | 'rent' | 'buy';
  }>;
  productionCompanies: Array<{
    id: number;
    name: string;
    logoPath: string | null;
    originCountry: string | null;
  }>;
  budget: number | null;
  revenue: number | null;
  videos: MovieVideo[];
  imdbId: string | null;
}

export interface ContentPageStats {
  contentId: string;
  averageScore: number | null;
  ratingsCount: number;
  ratingsDistribution: Array<{ score: number; count: number }>;
  playsCount: number;
  commentsCount: number;
}

export interface ContentViewerState {
  watchStatus: 'WATCHED' | 'PARTIALLY_WATCHED' | 'UNWATCHED' | 'UNKNOWN' | null;
  myRating: number | null;
  myReview: string | null;
  lastWatchedDate: string | null;
  lastWatchNumber: number | null;
  watchedInTheater: boolean | null;
  playsCount: number | null;
  latestDiaryEntryId: string | null;
  inWatchlist: boolean;
  watchlistEntryId: string | null;
  dropped: boolean;
  droppedEntryId: string | null;
  lists: Array<{ listId: string; name: string; visibility: 'PUBLIC' | 'FOLLOWERS' | 'PRIVATE' }>;
}

export interface ContentPage {
  details: MovieDetails;
  metadata: {
    originalLanguage: string | null;
    certification: string | null;
    homepageUrl: string | null;
    tmdbUrl: string | null;
    imdbUrl: string | null;
    watchProviders: MovieProvider[];
  };
  stats: ContentPageStats;
  visibleReviewsCount: number;
  viewerState: ContentViewerState;
  sections: { seasons: unknown[]; episodes: unknown[]; recentEpisodes: unknown[] };
}

export interface UserPreview {
  id: string;
  username: string;
  name: string;
  profilePicture: string | null;
}

export interface PublicUserPreview {
  id: string;
  username: string;
  name: string;
  profilePicture: string | null;
}

export type FollowingUser = PublicUserPreview;

export type FollowingPage = ContentPageResult<FollowingUser>;

export interface DiaryEntryRecord {
  id: string;
  comment: string | null;
  score: number | null;
  watchedDate: string | null;
  watchedInTheater: boolean | null;
  watchedWith?: UserPreview[] | null;
}

export interface ContentReview {
  id: string;
  source: ContentReviewSource;
  reviewer: UserPreview;
  comment: string | null;
  score: number | null;
  watchedDate: string | null;
  watchNumber: number | null;
  watchedInTheater: boolean | null;
  likesCount: number;
  commentsCount: number;
  likedByMe: boolean;
}

export interface ContentComment {
  id: string;
  user: PublicUserPreview;
  parentCommentId: string | null;
  text: string;
  containsSpoiler: boolean;
  createdAt: string;
  updatedAt: string;
  likesCount: number;
  likedByMe: boolean;
}

export interface ContentPageResult<T> {
  content: T[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
  hasNext: boolean;
}

export interface UserListSummary {
  id: string;
  name: string;
  itemsCount?: number;
  visibility: 'PUBLIC' | 'FOLLOWERS' | 'PRIVATE';
  containsContent: boolean | null;
  itemScope: 'MOVIE_OR_SERIES' | 'SEASON' | 'EPISODE' | 'LIST' | 'MIXED' | null;
}

export interface UserListDetailItem {
  id: string;
  content: { id: string; type: string; tmdbId: string | null } | null;
}

export interface UserListDetail {
  items: UserListDetailItem[];
  itemsPage: number;
  itemsHasNext: boolean;
}

export interface MovieDiaryRequest {
  content?: { type: 'MOVIE'; tmdbId: string };
  score?: number | null;
  comment?: string | null;
  watchedDate?: string | null;
  watchedInTheater?: boolean | null;
  isRewatch?: boolean;
  watchedWith?: string[];
}

export interface CommentCreationRequest {
  text: string;
  parentCommentId?: string | null;
  containsSpoiler?: boolean;
}

@Injectable({ providedIn: 'root' })
export class ContentApiService {
  constructor(private readonly http: HttpClient) {}

  createMovieReference(tmdbId: string): Observable<ContentReference> {
    return this.http.post<ContentReference>('/api/v1/contents/reference', {
      type: 'MOVIE',
      tmdbId,
    });
  }

  getPage(contentId: string): Observable<ContentPage> {
    return this.http.get<ContentPage>(`/api/v1/contents/${encodeURIComponent(contentId)}/page`);
  }

  getReviews(
    contentId: string,
    page: number,
    sort: ReviewSort,
  ): Observable<ContentPageResult<ContentReview>> {
    const params = new HttpParams().set('page', page).set('size', 20).set('sort', sort);
    return this.http.get<ContentPageResult<ContentReview>>(
      `/api/v1/contents/${encodeURIComponent(contentId)}/reviews`,
      { params },
    );
  }

  getComments(contentId: string, page: number): Observable<ContentPageResult<ContentComment>> {
    const params = new HttpParams().set('page', page).set('size', 20);
    return this.http.get<ContentPageResult<ContentComment>>(
      `/api/v1/contents/${encodeURIComponent(contentId)}/comments`,
      { params },
    );
  }

  getUserLists(
    userId: string,
    contentId: string,
    page: number,
  ): Observable<ContentPageResult<UserListSummary>> {
    const params = new HttpParams()
      .set('page', page)
      .set('size', 10)
      .set('contentId', contentId);
    return this.http.get<ContentPageResult<UserListSummary>>(
      `/api/v1/users/${encodeURIComponent(userId)}/lists`,
      { params },
    );
  }

  createMovieList(name: string, tmdbId: string): Observable<{ id: string }> {
    return this.http.post<{ id: string }>('/api/v1/users/me/lists/bulk', {
      name,
      items: [{ type: 'MOVIE', tmdbId }],
    });
  }

  getListItems(listId: string, page: number): Observable<UserListDetail> {
    const params = new HttpParams().set('page', page).set('size', 30).set('type', 'MOVIE');
    return this.http.get<UserListDetail>(`/api/v1/lists/${encodeURIComponent(listId)}`, { params });
  }

  getFollowing(userId: string, page: number): Observable<FollowingPage> {
    const params = new HttpParams().set('page', page).set('size', 20);
    return this.http.get<FollowingPage>(
      `/api/v1/users/${encodeURIComponent(userId)}/following`,
      { params },
    );
  }

  getDiaryEntry(diaryEntryId: string): Observable<DiaryEntryRecord> {
    return this.http.get<DiaryEntryRecord>(`/api/v1/diary/${encodeURIComponent(diaryEntryId)}`);
  }

  addMovieToList(listId: string, tmdbId: string): Observable<unknown> {
    return this.http.post(`/api/v1/lists/${encodeURIComponent(listId)}/items`, {
      content: { type: 'MOVIE', tmdbId },
    });
  }

  removeListItem(listId: string, itemId: string): Observable<void> {
    return this.http.delete<void>(
      `/api/v1/lists/${encodeURIComponent(listId)}/items/${encodeURIComponent(itemId)}`,
    );
  }

  createDiaryEntry(request: MovieDiaryRequest): Observable<unknown> {
    return this.http.post('/api/v1/diary', request);
  }

  updateDiaryEntry(diaryEntryId: string, request: MovieDiaryRequest): Observable<unknown> {
    const update = {
      score: request.score,
      comment: request.comment,
      watchedDate: request.watchedDate,
      watchedInTheater: request.watchedInTheater,
      watchedWith: request.watchedWith,
    };
    return this.http.patch(
      `/api/v1/diary/${encodeURIComponent(diaryEntryId)}`,
      update,
    );
  }

  deleteDiaryEntry(diaryEntryId: string): Observable<void> {
    return this.http.delete<void>(`/api/v1/diary/${encodeURIComponent(diaryEntryId)}`);
  }

  addToWatchlist(tmdbId: string): Observable<unknown> {
    return this.http.post('/api/v1/users/me/watchlist/MOVIE', { tmdbId });
  }

  removeFromWatchlist(entryId: string): Observable<void> {
    return this.http.delete<void>(
      `/api/v1/users/me/watchlist/MOVIE/${encodeURIComponent(entryId)}`,
    );
  }

  markDropped(tmdbId: string): Observable<unknown> {
    return this.http.post(
      `/api/v1/users/me/dropped/MOVIE/${encodeURIComponent(tmdbId)}`,
      null,
    );
  }

  removeDropped(tmdbId: string): Observable<void> {
    return this.http.delete<void>(
      `/api/v1/users/me/dropped/MOVIE/${encodeURIComponent(tmdbId)}`,
    );
  }

  createComment(contentId: string, request: CommentCreationRequest): Observable<ContentComment> {
    return this.http.post<ContentComment>(
      `/api/v1/contents/${encodeURIComponent(contentId)}/comments`,
      request,
    );
  }

  setCommentLike(commentId: string, liked: boolean): Observable<void> {
    const path = `/api/v1/comments/${encodeURIComponent(commentId)}/like`;
    return liked ? this.http.post<void>(path, null) : this.http.delete<void>(path);
  }

  deleteComment(commentId: string): Observable<void> {
    return this.http.delete<void>(`/api/v1/comments/${encodeURIComponent(commentId)}`);
  }

  setReviewLike(reviewId: string, source: ContentReviewSource, liked: boolean): Observable<void> {
    const path = source === 'DROPPED'
      ? `/api/v1/dropped/${encodeURIComponent(reviewId)}/like`
      : source === 'CONTENT_REVIEW'
        ? `/api/v1/reviews/${encodeURIComponent(reviewId)}/like`
        : `/api/v1/diary/${encodeURIComponent(reviewId)}/like`;
    return liked ? this.http.post<void>(path, null) : this.http.delete<void>(path);
  }
}
