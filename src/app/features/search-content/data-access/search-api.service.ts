import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';

export type SearchScope =
  | 'CONTENT'
  | 'MOVIE'
  | 'SERIES'
  | 'PERSON'
  | 'LIST'
  | 'PICKS_TEMPLATE'
  | 'USER';

export interface SearchContentView {
  tmdbId: string;
  type: 'MOVIE' | 'SERIES';
  title?: string | null;
  posterUrl?: string | null;
  releaseYear?: number | null;
  genres?: string[] | null;
  runtimeMinutes?: number | null;
  numberOfSeasons?: number | null;
  voteAverage?: number | null;
  previewStatus: 'AVAILABLE' | 'PARTIAL' | 'UNAVAILABLE';
}

export interface SearchPersonView {
  tmdbId: string;
  name?: string | null;
  photoUrl?: string | null;
  knownForDepartment?: string | null;
}

export interface SearchUserView {
  id: string;
  name: string;
  username: string;
  profilePicture?: string | null;
  description?: string | null;
  profileDetailsVisible: boolean;
  watchedCount?: number | null;
  listsCount?: number | null;
  followersCount?: number | null;
  ownedByViewer: boolean;
  viewerFollowStatus?: 'PENDING' | 'ACCEPTED' | null;
  followsViewer: boolean;
}

export interface SearchListView {
  id: string;
  owner: {
    id?: string;
    username?: string;
    profilePicture?: string | null;
    isProfilePublic?: boolean;
  };
  name: string;
  description: string | null;
  visibility: 'PUBLIC' | 'FOLLOWERS' | 'PRIVATE';
  updatedAt: string | null;
  previewCards: Array<{
    type: 'MOVIE' | 'SERIES' | 'SEASON' | 'EPISODE';
    tmdbId?: string | null;
    seriesTmdbId?: string | null;
    seasonNumber?: number | null;
    episodeNumber?: number | null;
    title?: string | null;
    posterUrl?: string | null;
    previewStatus: 'AVAILABLE' | 'PARTIAL' | 'UNAVAILABLE';
  }>;
  itemsCount: number;
  displayScope:
    | 'MOVIES'
    | 'SERIES'
    | 'MOVIES_AND_SERIES'
    | 'SEASONS'
    | 'EPISODES'
    | 'MIXED'
    | 'LISTS'
    | 'EMPTY';
  likesCount: number;
  commentsCount: number;
  likedByViewer: boolean;
  ownedByViewer: boolean;
}

export interface SearchPicksTemplateView {
  id?: string;
  creator?: {
    id?: string;
    username?: string;
    profilePicture?: string | null;
    isProfilePublic?: boolean;
  } | null;
  origin?: 'OFFICIAL' | 'COMMUNITY';
  name?: string;
  description?: string | null;
  coverImage?: string | null;
  createdAt?: string | null;
  picksCount?: number;
  categoriesCount?: number;
  categoryNames?: string[];
  likesCount?: number;
  commentsCount?: number;
  isLikedByViewer?: boolean;
  myPicksCount?: number;
  latestMyPickId?: string | null;
}

export interface SearchView {
  scope: SearchScope;
  query: string;
  page: number;
  size: number;
  totalPages: number;
  totalResults: number;
  hasNext: boolean;
  contents: SearchContentView[];
  people: SearchPersonView[];
  lists: SearchListView[];
  templates: SearchPicksTemplateView[];
  users: SearchUserView[];
}

@Injectable({ providedIn: 'root' })
export class SearchApiService {
  constructor(private readonly http: HttpClient) {}

  search(query: string, scope: SearchScope): Observable<SearchView> {
    const params = new HttpParams()
      .set('q', query)
      .set('scope', scope)
      .set('page', '1')
      .set('size', '5');

    return this.http.get<SearchView>('/api/v1/search/view', { params });
  }
}
