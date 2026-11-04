import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';

export type ListVisibility = 'PUBLIC' | 'FOLLOWERS' | 'PRIVATE';
export type ListSource = 'OWNED' | 'LIKED' | 'ALL';
export type ListItemType = 'MOVIE' | 'SERIES' | 'SEASON' | 'EPISODE' | 'LIST';
export type ListContentReference =
  | { type: 'MOVIE'; tmdbId: string }
  | { type: 'SERIES'; tmdbId: string }
  | { type: 'SEASON'; seriesTmdbId: string; seasonNumber: number }
  | { type: 'EPISODE'; seriesTmdbId: string; seasonNumber: number; episodeNumber: number };

export interface ListOwner {
  id: string;
  username: string;
  name: string;
  profilePicture: string | null;
  isProfilePublic?: boolean | null;
}

export interface ListCardPreview {
  contentId: string | null;
  type: string;
  tmdbId: string | null;
  seriesTmdbId: string | null;
  seasonNumber: number | null;
  episodeNumber: number | null;
  title: string | null;
  posterPath: string | null;
  customPosterUrl: string | null;
  releaseYear: number | null;
  runtimeMinutes: number | null;
  numberOfEpisodes: number | null;
  genres: string[] | null;
  stats: { averageScore: number | null; playsCount: number; reviewsCount: number; commentsCount: number } | null;
  viewerState: { watchStatus: string | null; myRating: number | null } | null;
  previewStatus: 'AVAILABLE' | 'PARTIAL' | 'UNAVAILABLE';
}

export interface UserListCard {
  id: string;
  user: ListOwner;
  name: string;
  description: string | null;
  visibility: ListVisibility;
  createdAt: string;
  updatedAt: string;
  previewCards: ListCardPreview[];
  nestedListPreviews: Array<{ id: string; user: ListOwner; name: string; visibility: ListVisibility }>;
  nestedListsCount: number;
  likesCount: number;
  likedByMe: boolean;
  itemsCount: number;
  commentsCount: number;
  rank: number | null;
  itemScope: 'MOVIE_OR_SERIES' | 'SEASON' | 'EPISODE' | 'LIST' | 'MIXED' | null;
  ownedByMe: boolean;
}

export interface UserListCardPage {
  content: UserListCard[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
  hasNext: boolean;
  backdropPath?: string | null;
}

export interface ListDetailItem {
  id: string;
  card: ListCardPreview | null;
  nestedList: { id: string; name: string; description: string | null; visibility: ListVisibility; itemsCount: number; previewCards: ListCardPreview[] } | null;
  position: number;
  description: string | null;
  createdAt: string;
  customPosterUrl: string | null;
  contentState: { watchStatus: 'WATCHED' | 'PARTIALLY_WATCHED' | 'UNWATCHED' | 'UNKNOWN'; lastWatchedDate: string | null; myRating: number | null; inWatchlist: boolean | null } | null;
  episodeAverageRating: number | null;
  globalEpisodeAverageRating: number | null;
  contentAverageRating: number | null;
}

export interface ListDetailPage {
  content: ListDetailItem[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
  hasNext: boolean;
}

export interface ListDetailView {
  id: string;
  owner: ListOwner;
  name: string;
  description: string | null;
  visibility: ListVisibility;
  watchedPercentage: number | null;
  createdAt: string;
  updatedAt: string;
  likesCount: number | null;
  likedByMe: boolean | null;
  itemsCount: number;
  commentsCount: number;
  totalRuntimeMinutes: number;
  rank: number | null;
  itemScope: string | null;
  items: ListDetailPage;
}

export interface ListComment {
  id: string;
  user: ListOwner;
  parentCommentId: string | null;
  text: string;
  containsSpoiler: boolean;
  createdAt: string;
  updatedAt: string;
  likesCount: number;
  likedByMe: boolean;
}

export interface ListProgressEpisode {
  seasonNumber: number;
  episodeNumber: number;
  title: string | null;
  releaseDate: string | null;
  runtimeMinutes: number | null;
  stillPath: string | null;
  availableToWatch: boolean | null;
}

export interface ListSeriesProgress {
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
  nextEpisode: ListProgressEpisode | null;
  seasonProgress: Array<{
    seasonNumber: number;
    watchedEpisodeCount: number;
    totalEpisodeCount: number;
    watchedPercentage: number;
    watchedRuntimeMinutes: number | null;
    remainingEpisodeCount: number | null;
    remainingRuntimeMinutes: number | null;
  }>;
}

export interface ListProgressData {
  id: string;
  name: string;
  description: string | null;
  visibility: ListVisibility;
  createdAt: string;
  updatedAt: string;
  likesCount: number;
  likedByMe: boolean;
  itemsCount: number;
  commentsCount: number;
  totalRuntimeMinutes: number;
  rank: number | null;
  itemScope: string | null;
  totalItems: number;
  watchedItems: number;
  watchedPercentage: number;
  movieProgress: {
    totalItems: number;
    watchedItems: number;
    remainingItems: number;
    totalRuntimeMinutes: number;
    watchedRuntimeMinutes: number;
    remainingRuntimeMinutes: number;
  };
  seriesProgressAggregate: {
    totalSeriesCount: number;
    watchedEpisodeCount: number;
    totalReleasedEpisodeCount: number;
    remainingEpisodeCount: number;
    remainingRuntimeMinutes: number | null;
  };
  items: Array<{
    id: string;
    content: { type: 'MOVIE' | 'SERIES' | 'SEASON' | 'EPISODE'; tmdbId: string | null; seriesTmdbId: string | null; seasonNumber: number | null; episodeNumber: number | null };
    position: number;
    description: string | null;
    createdAt: string;
    updatedAt: string;
    customPosterUrl: string | null;
    seriesProgress: ListSeriesProgress | null;
    seasonProgress: {
      seasonNumber: number;
      watchedEpisodeCount: number;
      totalEpisodeCount: number | null;
      watchedPercentage: number | null;
      watchedRuntimeMinutes: number | null;
      remainingEpisodeCount: number | null;
      remainingRuntimeMinutes: number | null;
    } | null;
  }>;
}

@Injectable({ providedIn: 'root' })
export class ListsApiService {
  constructor(private readonly http: HttpClient) {}

  getMyLists(options: { source: ListSource; page: number; itemType?: ListItemType; genre?: string; sortBy?: 'name' | 'likesCount' | 'itemsCount' | 'commentsCount' | 'updatedAt' | 'rank'; sortDirection?: 'asc' | 'desc' }): Observable<UserListCardPage> {
    let params = new HttpParams().set('source', options.source).set('page', options.page).set('size', 10);
    if (options.itemType) params = params.set('itemType', options.itemType);
    if (options.genre) params = params.set('genre', options.genre);
    if (options.sortBy) params = params.set('sortBy', options.sortBy);
    if (options.sortDirection) params = params.set('sortDirection', options.sortDirection);
    return this.http.get<UserListCardPage>('/api/v1/users/me/lists/view', { params });
  }

  getCommunityLists(options: { page: number; itemType?: ListItemType; genre?: string; sortBy?: 'name' | 'likesCount' | 'itemsCount' | 'commentsCount' }): Observable<UserListCardPage> {
    let params = new HttpParams().set('sortBy', options.sortBy ?? 'likesCount').set('sortDirection', 'desc').set('page', options.page).set('size', 10);
    if (options.itemType) params = params.set('itemType', options.itemType);
    if (options.genre) params = params.set('genre', options.genre);
    return this.http.get<UserListCardPage>('/api/v1/lists/discover/view', { params });
  }

  getUserListsView(userId: string, options: { page: number; size?: number; itemType?: ListItemType; genre?: string; sortBy?: string; sortDirection?: 'asc' | 'desc' }): Observable<UserListCardPage> {
    let params = new HttpParams().set('page', options.page).set('size', options.size ?? 10);
    if (options.itemType) params = params.set('itemType', options.itemType);
    if (options.genre) params = params.set('genre', options.genre);
    if (options.sortBy) params = params.set('sortBy', options.sortBy);
    if (options.sortDirection) params = params.set('sortDirection', options.sortDirection);
    return this.http.get<UserListCardPage>(
      '/api/v1/users/' + encodeURIComponent(userId) + '/lists/view',
      { params },
    );
  }

  createList(request: { name: string; description?: string; visibility: ListVisibility }): Observable<{ id: string; name: string; visibility: ListVisibility }> {
    return this.http.post<{ id: string; name: string; visibility: ListVisibility }>('/api/v1/users/me/lists', request);
  }

  createListWithItems(request: { name: string; description?: string; visibility: ListVisibility; items: ListContentReference[] }): Observable<{ id: string }> {
    return this.http.post<{ id: string }>('/api/v1/users/me/lists/bulk', request);
  }

  addItem(listId: string, content: ListContentReference, position: number | null = null): Observable<unknown> {
    return this.http.post(`/api/v1/lists/${encodeURIComponent(listId)}/items`, {
      content,
      position,
      description: null,
      customPosterUrl: null,
    });
  }

  getDetail(listId: string, options: { page: number; size: number; type?: 'MOVIE' | 'SERIES' | 'SEASON' | 'EPISODE'; genre?: string; watchStatus?: 'WATCHED' | 'PARTIALLY_WATCHED' | 'UNWATCHED' | 'UNKNOWN'; sortBy?: 'position' | 'dateAdded' | 'duration' | 'episodeAvgRating' | 'globalEpisodeAvgRating' | 'contentAvgRating'; sortDirection?: 'asc' | 'desc' }): Observable<ListDetailView> {
    let params = new HttpParams().set('page', options.page).set('size', options.size);
    if (options.type) params = params.set('type', options.type);
    if (options.genre) params = params.set('genre', options.genre);
    if (options.watchStatus) params = params.set('watchStatus', options.watchStatus);
    if (options.sortBy) params = params.set('sortBy', options.sortBy);
    if (options.sortDirection) params = params.set('sortDirection', options.sortDirection);
    return this.http.get<ListDetailView>(`/api/v1/lists/${encodeURIComponent(listId)}/view`, { params });
  }

  getComments(listId: string, page: number, size = 20): Observable<{ content: ListComment[]; page: number; size: number; totalElements: number; totalPages: number; hasNext: boolean }> {
    const params = new HttpParams().set('page', page).set('size', size);
    return this.http.get<{ content: ListComment[]; page: number; size: number; totalElements: number; totalPages: number; hasNext: boolean }>(
      `/api/v1/lists/${encodeURIComponent(listId)}/comments`, { params },
    );
  }

  getProgress(listId: string): Observable<ListProgressData> {
    return this.http.get<ListProgressData>(`/api/v1/lists/${encodeURIComponent(listId)}/progress`);
  }

  createComment(listId: string, request: { text: string; parentCommentId?: string | null; containsSpoiler?: boolean }): Observable<ListComment> {
    return this.http.post<ListComment>(`/api/v1/lists/${encodeURIComponent(listId)}/comments`, request);
  }

  updateItem(listId: string, itemId: string, request: { position?: number; description?: string; customPosterUrl?: string | null }): Observable<unknown> {
    return this.http.patch(`/api/v1/lists/${encodeURIComponent(listId)}/items/${encodeURIComponent(itemId)}`, request);
  }

  removeItem(listId: string, itemId: string): Observable<void> {
    return this.http.delete<void>(`/api/v1/lists/${encodeURIComponent(listId)}/items/${encodeURIComponent(itemId)}`);
  }

  deleteList(listId: string): Observable<void> {
    return this.http.delete<void>(`/api/v1/lists/${encodeURIComponent(listId)}`);
  }

  setLiked(listId: string, liked: boolean): Observable<void> {
    return this.http.request<void>(liked ? 'POST' : 'DELETE', `/api/v1/lists/${encodeURIComponent(listId)}/like`);
  }

  updateList(listId: string, request: { name?: string; description?: string; visibility?: ListVisibility; rank?: number }): Observable<unknown> {
    return this.http.patch(`/api/v1/lists/${encodeURIComponent(listId)}`, request);
  }
}
