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
  tmdbVoteAverage?: number | null;
  runtimeMinutes: number | null;
  numberOfEpisodes: number | null;
  genres: string[] | null;
  stats: { averageScore: number | null; playsCount: number; reviewsCount: number; commentsCount: number } | null;
  viewerState: { watchStatus: string | null; myRating: number | null; myReview?: string | null; lastWatchedDate?: string | null; inWatchlist?: boolean | null } | null;
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

export interface ListOrderItem {
  id: string;
  position: number;
  label: string | null;
  thumbnailUrl: string | null;
  movable: boolean;
}

export interface ListOrderPage {
  revision: string;
  items: ListOrderItem[];
  nextCursor: string | null;
}

export interface ListOrderMove {
  movedId: string;
  anchorId: string;
  side: 'BEFORE' | 'AFTER';
}

export interface ListOrderUpdateResponse {
  revision: string;
}

export function buildOrderMoves(initialIds: string[], desiredIds: string[], movableIds: Iterable<string> = initialIds): ListOrderMove[] {
  const initialSet = new Set(initialIds);
  const desiredSet = new Set(desiredIds);
  if (initialIds.length !== desiredIds.length || initialSet.size !== initialIds.length ||
    desiredSet.size !== desiredIds.length || initialIds.some((id) => !desiredSet.has(id)) ||
    desiredIds.some((id) => !initialSet.has(id))) {
    throw new RangeError('The order draft must contain the same unique IDs as its baseline');
  }

  const movable = new Set(movableIds);
  const partition = (ids: string[]) => {
    const groups: string[][] = [[]];
    const fixed: string[] = [];
    ids.forEach((id) => {
      if (movable.has(id)) groups[groups.length - 1].push(id);
      else {
        fixed.push(id);
        groups.push([]);
      }
    });
    return { groups, fixed };
  };
  const initialParts = partition(initialIds);
  const desiredParts = partition(desiredIds);
  if (initialParts.fixed.some((id, index) => id !== desiredParts.fixed[index]) ||
    initialParts.groups.length !== desiredParts.groups.length ||
    initialParts.groups.some((group, index) => {
      const desiredGroup = desiredParts.groups[index];
      const desiredGroupIds = new Set(desiredGroup);
      return group.length !== desiredGroup.length || group.some((id) => !desiredGroupIds.has(id));
    })) {
    throw new RangeError('Rows marked as immovable cannot be crossed or reordered');
  }

  return initialParts.groups.flatMap((group, index) => buildMovableSegmentMoves(group, desiredParts.groups[index]));
}

function buildMovableSegmentMoves(initialIds: string[], desiredIds: string[]): ListOrderMove[] {
  if (desiredIds.length < 2) return [];

  const initialPositions = new Map(initialIds.map((id, index) => [id, index]));
  const desiredPositions = desiredIds.map((id) => initialPositions.get(id)!);
  const tails: number[] = [];
  const tailIndices: number[] = [];
  const previous = Array.from({ length: desiredIds.length }, () => -1);

  desiredPositions.forEach((position, index) => {
    let low = 0;
    let high = tails.length;
    while (low < high) {
      const middle = (low + high) >>> 1;
      if (tails[middle] < position) low = middle + 1;
      else high = middle;
    }
    tails[low] = position;
    previous[index] = low > 0 ? tailIndices[low - 1] : -1;
    tailIndices[low] = index;
  });

  const stationary = new Set<string>();
  let cursor = tailIndices[tails.length - 1] ?? -1;
  while (cursor >= 0) {
    stationary.add(desiredIds[cursor]);
    cursor = previous[cursor];
  }

  const moves: ListOrderMove[] = [];
  for (let index = 0; index < desiredIds.length;) {
    if (stationary.has(desiredIds[index])) {
      index++;
      continue;
    }
    const start = index;
    while (index < desiredIds.length && !stationary.has(desiredIds[index])) index++;
    const run = desiredIds.slice(start, index);
    const nextAnchor = desiredIds[index];
    const previousAnchor = desiredIds[start - 1];
    const side: ListOrderMove['side'] = nextAnchor ? 'BEFORE' : 'AFTER';
    const anchorId = nextAnchor ?? previousAnchor;
    const orderedRun = nextAnchor ? run : [...run].reverse();
    if (!anchorId) throw new RangeError('A moved run must be anchored to a stationary row');
    for (const movedId of orderedRun) {
      moves.push({ movedId, anchorId, side });
    }
  }
  return moves;
}

export function applyOrderMoves(ids: string[], moves: ListOrderMove[]): string[] {
  const result = [...ids];
  for (const { movedId, anchorId, side } of moves) {
    const movedIndex = result.indexOf(movedId);
    const anchorIndex = result.indexOf(anchorId);
    if (movedIndex < 0 || anchorIndex < 0 || movedId === anchorId) continue;
    result.splice(movedIndex, 1);
    const indexAfterRemoval = result.indexOf(anchorId);
    result.splice(indexAfterRemoval + (side === 'AFTER' ? 1 : 0), 0, movedId);
  }
  return result;
}

export interface ListDetailItem {
  id: string;
  card: (Omit<ListCardPreview, 'contentId'> & { contentId: string }) | null;
  nestedList: { id: string; name: string; description: string | null; visibility: ListVisibility; itemsCount: number; previewCards: ListCardPreview[] } | null;
  position: number;
  description: string | null;
  createdAt: string;
  customPosterUrl: string | null;
  contentState: { watchStatus: 'WATCHED' | 'PARTIALLY_WATCHED' | 'UNWATCHED' | 'UNKNOWN'; lastWatchedDate?: string | null; myRating?: number | null; inWatchlist?: boolean | null } | null;
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
  backdropPath?: string | null;
  rank: number | null;
  itemScope: string | null;
  items: ListDetailPage;
}

export type ListEditorCard = Pick<ListCardPreview,
  'type' | 'tmdbId' | 'seriesTmdbId' | 'seasonNumber' | 'episodeNumber' |
  'title' | 'releaseYear' | 'posterPath'> & Partial<Pick<ListCardPreview, 'customPosterUrl'>>;

export interface ListEditorItem {
  id: string;
  position: number;
  card: ListEditorCard | null;
  customPosterUrl: string | null;
  nestedList?: Pick<NonNullable<ListDetailItem['nestedList']>, 'id' | 'name' | 'previewCards'> | null;
}

export interface ListEditorFields {
  name: string;
  description?: string | null;
  visibility: ListVisibility;
  itemScope?: string | null;
}

export type ListEditorView =
  | (ListEditorFields & { status: 'READY'; items: ListEditorItem[] })
  | { status: 'READ_ONLY' | 'LEGACY' };

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

  getOwnedListOrder(cursor?: string | null): Observable<ListOrderPage> {
    let params = new HttpParams().set('size', 30);
    if (cursor) params = params.set('cursor', cursor);
    return this.http.get<ListOrderPage>('/api/v1/users/me/lists/order', { params });
  }

  updateOwnedListOrder(request: { revision: string; moves: ListOrderMove[] }): Observable<ListOrderUpdateResponse> {
    return this.http.patch<ListOrderUpdateResponse>('/api/v1/users/me/lists/order', request);
  }

  getListItemsOrder(listId: string, cursor?: string | null): Observable<ListOrderPage> {
    let params = new HttpParams().set('size', 30);
    if (cursor) params = params.set('cursor', cursor);
    return this.http.get<ListOrderPage>(`/api/v1/lists/${encodeURIComponent(listId)}/items/order`, { params });
  }

  reorderListItems(listId: string, request: { revision: string; moves: ListOrderMove[] }): Observable<ListOrderUpdateResponse> {
    return this.http.patch<ListOrderUpdateResponse>(`/api/v1/lists/${encodeURIComponent(listId)}/items/order`, request);
  }

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

  getEditor(listId: string): Observable<ListEditorView> {
    return this.http.get<ListEditorView>(`/api/v1/lists/${encodeURIComponent(listId)}/editor`);
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
