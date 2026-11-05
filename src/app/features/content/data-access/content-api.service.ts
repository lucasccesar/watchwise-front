import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, map } from 'rxjs';

export type ReviewSort = 'POPULAR' | 'RECENT' | 'FOLLOWING';
export type ContentReviewSource = 'DIARY' | 'DROPPED' | 'CONTENT_REVIEW';
export type ContentImageSelectionType = 'MOVIE' | 'SERIES';
export type ContentImageSelectionKind = 'posters' | 'backdrops';

export interface ContentImageSelection {
  url: string;
  width: number | null;
  height: number | null;
  aspectRatio: number | null;
  language: string | null;
  voteAverage: number | null;
  voteCount: number | null;
}

export interface ContentReference {
  id: string;
  type: 'MOVIE' | 'SERIES' | 'SEASON' | 'EPISODE';
  tmdbId: string | null;
  seriesTmdbId?: string | null;
  seasonNumber?: number | null;
  episodeNumber?: number | null;
}

export interface SeasonEpisodeCard extends Omit<SeriesChildCard, 'contentId' | 'type'> {
  contentId: string | null;
  type: 'EPISODE';
}

export interface SeasonContentPage {
  details: {
    contentId: string;
    type: 'SEASON';
    tmdbId: string | null;
    seriesTmdbId: string;
    seasonNumber: number;
    title: string | null;
    overview: string | null;
    posterPath: string | null;
    customPosterUrl: string | null;
    backdropPath: string | null;
    releaseDate: string | null;
    runtimeMinutes: number | null;
    episodeCount: number | null;
    genres: string[] | null;
    countries: string[] | null;
    cast: SeriesCastMember[] | null;
    guestStars: SeriesCastMember[] | null;
    crew: MovieCrewMember[] | null;
    videos: MovieVideo[] | null;
    parentTitle: string | null;
    parentReleaseYear: number | null;
  };
  metadata: ContentPage['metadata'];
  stats: ContentPageStats;
  visibleReviewsCount: number;
  viewerState: ContentViewerState & { currentRatingVersion?: number | null };
  sections: {
    episodes: SeasonEpisodeCard[] | null;
    seasons: SeriesChildCard[] | null;
  } | null;
}

export interface EpisodeContentPage {
  details: {
    contentId: string;
    type: 'EPISODE';
    tmdbId: string | null;
    seriesTmdbId: string;
    seasonNumber: number;
    episodeNumber: number;
    title: string | null;
    overview: string | null;
    posterPath: string | null;
    backdropPath: string | null;
    releaseDate: string | null;
    runtimeMinutes: number | null;
    genres: string[];
    countries: string[];
    cast: SeriesCastMember[];
    guestStars: SeriesCastMember[];
    parentTitle: string | null;
    parentReleaseYear: number | null;
    customPosterUrl: string | null;
  };
  metadata: ContentPage['metadata'];
  stats: ContentPageStats;
  visibleReviewsCount: number;
  viewerState: ContentViewerState;
  navigation: ContentNavigation | null;
}

export interface ContentNavigation {
  seriesTmdbId: string | null;
  seasonNumber: number | null;
  episodeNumber: number | null;
  seasonEpisodeCount: number | null;
  previousEpisode: SeriesChildCard | null;
  nextEpisode: SeriesChildCard | null;
}

export interface SeriesCastMember {
  id: number;
  name: string;
  character: string | null;
  profilePath: string | null;
  episodeCount?: number | null;
}

export interface SeriesEpisodeSummary {
  seasonNumber: number | null;
  episodeNumber: number | null;
  name: string | null;
  airDate: string | null;
  runtime: number | null;
  stillPath: string | null;
}

export interface ContentSeasonSelection {
  seriesTmdbId: string; seasonNumber: number; name: string | null; episodeCount: number | null; posterUrl: string | null; releaseDate: string | null;
}

export interface ContentEpisodeSelection {
  seriesTmdbId: string; seasonNumber: number; episodeNumber: number; name: string | null; stillUrl: string | null; airDate: string | null;
}

export interface SeriesSeasonSummary {
  seasonNumber: number | null;
  name: string | null;
  posterPath: string | null;
  airDate: string | null;
  episodeCount: number | null;
  airedEpisodeCount: number | null;
}

export interface SeriesChildCard {
  contentId: string;
  type: 'SEASON' | 'EPISODE';
  tmdbId: string | null;
  seriesTmdbId: string | null;
  seasonNumber: number | null;
  episodeNumber: number | null;
  title: string | null;
  posterPath: string | null;
  releaseDate: string | null;
  runtimeMinutes: number | null;
  stats: ContentPageStats;
  viewerState: ContentViewerState & {
    watchStatus?: string | null;
    myRating?: number | null;
    watchedEpisodeCount?: number | null;
    releasedEpisodeCount?: number | null;
  };
}

export interface SeriesPage extends Omit<ContentPage, 'details' | 'viewerState' | 'sections'> {
  details: {
    contentId: string;
    type: 'SERIES';
    tmdbId: string;
    title: string | null;
    overview: string | null;
    posterPath: string | null;
    backdropPath: string | null;
    releaseDate: string | null;
    runtimeMinutes: number | null;
    totalRuntimeMinutes: number | null;
    numberOfSeasons: number | null;
    numberOfEpisodes: number | null;
    genres: string[];
    countries: string[];
    cast: SeriesCastMember[];
    guestStars: SeriesCastMember[];
    creators: Array<{ name: string; profilePath: string | null }>;
    watchProviders: MovieProvider[];
    seasons: SeriesSeasonSummary[];
    episodes: SeriesEpisodeSummary[];
    recentEpisodes: SeriesEpisodeSummary[];
    productionCompanies: Array<{ id: number; name: string; logoPath: string | null; originCountry: string | null }>;
    crew: MovieCrewMember[];
    videos: MovieVideo[];
    imdbId: string | null;
    customPosterUrl: string | null;
    parentTitle: string | null;
    parentReleaseYear: number | null;
  };
  metadata: ContentPage['metadata'] & {
    presentationPosterPath?: string | null;
    presentationCrew?: MovieCrewMember[];
    crewInherited?: boolean | null;
  };
  viewerState: ContentViewerState & {
    watchedEpisodeCount: number | null;
    releasedEpisodeCount: number | null;
    currentRatingVersion?: number | null;
    reviewsCount?: number | null;
    reviewIds?: string[];
  };
  navigation: unknown;
  sections: {
    seasons: SeriesChildCard[];
    episodes: SeriesChildCard[];
    recentEpisodes: SeriesChildCard[];
  };
}

type NullableCollectionFields<T> = { [K in keyof T]: T[K] | null };

type SeriesDetailsCollections = Pick<
  SeriesPage['details'],
  | 'genres'
  | 'countries'
  | 'cast'
  | 'guestStars'
  | 'creators'
  | 'watchProviders'
  | 'seasons'
  | 'episodes'
  | 'recentEpisodes'
  | 'productionCompanies'
  | 'crew'
  | 'videos'
>;

export type SeriesPageResponse = Omit<SeriesPage, 'details' | 'metadata' | 'stats' | 'viewerState' | 'sections'> & {
  details: Omit<SeriesPage['details'], keyof SeriesDetailsCollections> &
    NullableCollectionFields<SeriesDetailsCollections>;
  metadata: Omit<SeriesPage['metadata'], 'watchProviders' | 'presentationCrew'> & {
    watchProviders: MovieProvider[] | null;
    presentationCrew?: MovieCrewMember[] | null;
  };
  stats: Omit<SeriesPage['stats'], 'ratingsDistribution'> & {
    ratingsDistribution: Array<{ score: number; count: number }> | null;
  };
  viewerState: Omit<SeriesPage['viewerState'], 'lists' | 'reviewIds'> & {
    lists: ContentViewerState['lists'] | null;
    reviewIds?: string[] | null;
  };
  sections: {
    seasons: SeriesChildCard[] | null;
    episodes: SeriesChildCard[] | null;
    recentEpisodes: SeriesChildCard[] | null;
  } | null;
};

export function normalizeSeriesPageResponse(page: SeriesPageResponse): SeriesPage {
  const crew = page.details.crew ?? [];
  return {
    ...page,
    details: {
      ...page.details,
      genres: page.details.genres ?? [],
      countries: page.details.countries ?? [],
      cast: page.details.cast ?? [],
      guestStars: page.details.guestStars ?? [],
      creators: page.details.creators ?? [],
      watchProviders: page.details.watchProviders ?? [],
      seasons: page.details.seasons ?? [],
      episodes: page.details.episodes ?? [],
      recentEpisodes: page.details.recentEpisodes ?? [],
      productionCompanies: page.details.productionCompanies ?? [],
      crew: crew.map((person) => ({ ...person, jobs: person.jobs ?? [] })),
      videos: page.details.videos ?? [],
    },
    metadata: {
      ...page.metadata,
      watchProviders: page.metadata.watchProviders ?? [],
      presentationCrew: page.metadata.presentationCrew ?? [],
    },
    stats: {
      ...page.stats,
      ratingsDistribution: page.stats.ratingsDistribution ?? [],
    },
    viewerState: {
      ...page.viewerState,
      lists: page.viewerState.lists ?? [],
      reviewIds: page.viewerState.reviewIds ?? [],
    },
    sections: {
      seasons: page.sections?.seasons ?? [],
      episodes: page.sections?.episodes ?? [],
      recentEpisodes: page.sections?.recentEpisodes ?? [],
    },
  };
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
  tmdbVoteAverage?: number | null;
  ratingsCount: number;
  ratingsDistribution: Array<{ score: number; count: number }>;
  playsCount: number;
  commentsCount: number;
}

export interface ContentViewerState {
  watchStatus: 'WATCHED' | 'PARTIALLY_WATCHED' | 'UNWATCHED' | 'UNKNOWN' | null;
  myRating: number | null;
  currentRatingVersion?: number | null;
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
  userId?: string;
  content?: {
    id: string | null;
    type: 'MOVIE' | 'SERIES' | 'SEASON' | 'EPISODE' | string;
    tmdbId: string | null;
    seriesTmdbId: string | null;
    seasonNumber: number | null;
    episodeNumber: number | null;
    runtimeMinutes: number | null;
  };
  watchedAt?: string | null;
  watchNumber?: number | null;
  customPosterUrl?: string | null;
  likesCount?: number | null;
  commentsCount?: number | null;
  likedByMe?: boolean | null;
  card?: {
    title: string | null;
    posterPath: string | null;
    customPosterUrl: string | null;
    releaseDate: string | null;
    releaseYear: number | null;
    tmdbVoteAverage?: number | null;
    runtimeMinutes: number | null;
  } | null;
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

export interface CommentUpdateRequest {
  text: string;
  containsSpoiler?: boolean;
}

export interface SeriesDiaryBulkRequest {
  content:
    | { type: 'SERIES'; tmdbId: string }
    | { type: 'SEASON'; seriesTmdbId: string; seasonNumber: number; isSeriesFinale?: boolean };
  watchedDate?: string | null;
  finaleSeasonNumber?: number | null;
  seasonFinaleEpisodeNumbers?: Record<number, number> | null;
  watchedWith?: string[];
}

export interface SeriesDiaryRequest {
  content: { type: 'EPISODE'; seriesTmdbId: string; seasonNumber: number; episodeNumber: number; isSeasonFinale?: boolean; isSeriesFinale?: boolean; runtimeMinutes?: number };
  watchedDate?: string | null;
  score?: number | null;
  comment?: string | null;
  isRewatch?: boolean;
  watchedInTheater?: boolean;
}

@Injectable({ providedIn: 'root' })
export class ContentApiService {
  constructor(private readonly http: HttpClient) {}

  getContentImages(
    type: ContentImageSelectionType,
    tmdbId: string,
    kind: ContentImageSelectionKind,
  ): Observable<ContentImageSelection[]> {
    return this.http.get<ContentImageSelection[]>(
      `/api/v1/contents/selection/${type}/${encodeURIComponent(tmdbId)}/${kind}`,
    );
  }

  setCustomContentPoster(contentId: string, customPosterUrl: string): Observable<void> {
    return this.http.put<void>(
      `/api/v1/users/me/content-posters/${encodeURIComponent(contentId)}`,
      { customPosterUrl },
    );
  }

  getSeriesSeasons(seriesTmdbId: string): Observable<ContentSeasonSelection[]> {
    return this.http.get<ContentSeasonSelection[]>(`/api/v1/contents/selection/series/${encodeURIComponent(seriesTmdbId)}/seasons`);
  }

  getSeasonEpisodes(seriesTmdbId: string, seasonNumber: number): Observable<ContentEpisodeSelection[]> {
    return this.http.get<ContentEpisodeSelection[]>(`/api/v1/contents/selection/series/${encodeURIComponent(seriesTmdbId)}/seasons/${seasonNumber}/episodes`);
  }

  createMovieReference(tmdbId: string): Observable<ContentReference> {
    return this.http.post<ContentReference>('/api/v1/contents/reference', {
      type: 'MOVIE',
      tmdbId,
    });
  }

  createSeriesReference(tmdbId: string): Observable<ContentReference> {
    return this.http.post<ContentReference>('/api/v1/contents/reference', {
      type: 'SERIES',
      tmdbId,
    });
  }

  createSeasonReference(seriesTmdbId: string, seasonNumber: number): Observable<ContentReference> {
    return this.http.post<ContentReference>('/api/v1/contents/reference', {
      type: 'SEASON',
      seriesTmdbId,
      seasonNumber,
    });
  }

  createEpisodeReference(
    seriesTmdbId: string,
    seasonNumber: number,
    episodeNumber: number,
    runtimeMinutes?: number | null,
  ): Observable<ContentReference> {
    return this.http.post<ContentReference>('/api/v1/contents/reference', {
      type: 'EPISODE',
      seriesTmdbId,
      seasonNumber,
      episodeNumber,
      runtimeMinutes: runtimeMinutes ?? undefined,
    });
  }

  getPage(contentId: string): Observable<ContentPage> {
    return this.http.get<ContentPage>(`/api/v1/contents/${encodeURIComponent(contentId)}/page`);
  }

  getSeriesPage(contentId: string): Observable<SeriesPage> {
    return this.http
      .get<SeriesPageResponse>(`/api/v1/contents/${encodeURIComponent(contentId)}/page`)
      .pipe(map(normalizeSeriesPageResponse));
  }

  getSeasonPage(contentId: string): Observable<SeasonContentPage> {
    return this.http.get<SeasonContentPage>(`/api/v1/contents/${encodeURIComponent(contentId)}/page`);
  }

  getEpisodePage(contentId: string): Observable<EpisodeContentPage> {
    return this.http.get<EpisodeContentPage>(`/api/v1/contents/${encodeURIComponent(contentId)}/page`);
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

  createSeriesList(name: string, tmdbId: string): Observable<{ id: string }> {
    return this.http.post<{ id: string }>('/api/v1/users/me/lists/bulk', {
      name,
      items: [{ type: 'SERIES', tmdbId }],
    });
  }

  getListItems(listId: string, page: number, type: 'MOVIE' | 'SERIES' | 'SEASON' = 'MOVIE'): Observable<UserListDetail> {
    const params = new HttpParams().set('page', page).set('size', 30).set('type', type);
    return this.http.get<UserListDetail>(`/api/v1/lists/${encodeURIComponent(listId)}`, { params });
  }

  getFollowing(userId: string, page: number): Observable<FollowingPage> {
    const params = new HttpParams().set('page', page).set('size', 20);
    return this.http.get<FollowingPage>(
      `/api/v1/users/${encodeURIComponent(userId)}/following`,
      { params },
    );
  }

  getFollowers(userId: string, page: number): Observable<FollowingPage> {
    const params = new HttpParams().set('page', page).set('size', 20);
    return this.http.get<FollowingPage>(
      `/api/v1/users/${encodeURIComponent(userId)}/followers`,
      { params },
    );
  }

  getDiaryEntry(diaryEntryId: string): Observable<DiaryEntryRecord> {
    return this.http.get<DiaryEntryRecord>(`/api/v1/diary/${encodeURIComponent(diaryEntryId)}`);
  }

  getDiaryComments(diaryEntryId: string, page: number): Observable<ContentPageResult<ContentComment>> {
    const params = new HttpParams().set('page', page).set('size', 20);
    return this.http.get<ContentPageResult<ContentComment>>(
      `/api/v1/diary/${encodeURIComponent(diaryEntryId)}/comments`,
      { params },
    );
  }

  createDiaryComment(diaryEntryId: string, request: CommentCreationRequest): Observable<ContentComment> {
    return this.http.post<ContentComment>(
      `/api/v1/diary/${encodeURIComponent(diaryEntryId)}/comments`,
      request,
    );
  }

  addMovieToList(listId: string, tmdbId: string): Observable<unknown> {
    return this.http.post(`/api/v1/lists/${encodeURIComponent(listId)}/items`, {
      content: { type: 'MOVIE', tmdbId },
    });
  }

  addSeriesToList(listId: string, tmdbId: string): Observable<unknown> {
    return this.http.post(`/api/v1/lists/${encodeURIComponent(listId)}/items`, {
      content: { type: 'SERIES', tmdbId },
    });
  }

  addSeasonToList(listId: string, seriesTmdbId: string, seasonNumber: number): Observable<unknown> {
    return this.http.post(`/api/v1/lists/${encodeURIComponent(listId)}/items`, {
      content: { type: 'SEASON', seriesTmdbId, seasonNumber },
    });
  }

  createSeasonList(name: string, seriesTmdbId: string, seasonNumber: number): Observable<{ id: string }> {
    return this.http.post<{ id: string }>('/api/v1/users/me/lists/bulk', {
      name,
      items: [{ type: 'SEASON', seriesTmdbId, seasonNumber }],
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

  updateDiaryEntry(diaryEntryId: string, request: MovieDiaryRequest): Observable<DiaryEntryRecord> {
    const update = {
      score: request.score,
      comment: request.comment,
      watchedDate: request.watchedDate,
      watchedInTheater: request.watchedInTheater,
      isRewatch: request.isRewatch,
      watchedWith: request.watchedWith,
    };
    return this.http.patch<DiaryEntryRecord>(
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

  addSeriesToWatchlist(tmdbId: string): Observable<unknown> {
    return this.http.post('/api/v1/users/me/watchlist/SERIES', { tmdbId });
  }

  removeFromWatchlist(entryId: string): Observable<void> {
    return this.http.delete<void>(
      `/api/v1/users/me/watchlist/MOVIE/${encodeURIComponent(entryId)}`,
    );
  }

  removeSeriesFromWatchlist(entryId: string): Observable<void> {
    return this.http.delete<void>(
      `/api/v1/users/me/watchlist/SERIES/${encodeURIComponent(entryId)}`,
    );
  }

  markDropped(tmdbId: string): Observable<unknown> {
    return this.http.post(
      `/api/v1/users/me/dropped/MOVIE/${encodeURIComponent(tmdbId)}`,
      null,
    );
  }

  markSeriesDropped(tmdbId: string): Observable<unknown> {
    return this.http.post(`/api/v1/users/me/dropped/SERIES/${encodeURIComponent(tmdbId)}`, null);
  }

  removeDropped(tmdbId: string): Observable<void> {
    return this.http.delete<void>(
      `/api/v1/users/me/dropped/MOVIE/${encodeURIComponent(tmdbId)}`,
    );
  }

  removeSeriesDropped(tmdbId: string): Observable<void> {
    return this.http.delete<void>(`/api/v1/users/me/dropped/SERIES/${encodeURIComponent(tmdbId)}`);
  }

  createBulkSeriesDiaryEntry(request: SeriesDiaryBulkRequest, idempotencyKey: string): Observable<unknown> {
    return this.http.post('/api/v1/diary/bulk', request, {
      headers: { 'Idempotency-Key': idempotencyKey },
    });
  }

  createSeriesDiaryEntry(request: SeriesDiaryRequest): Observable<unknown> {
    return this.http.post('/api/v1/diary', request);
  }

  setContentRating(contentId: string, score: number, expectedVersion: number | null): Observable<{ score: number; version: number }> {
    return this.http.put<{ score: number; version: number }>(
      `/api/v1/contents/${encodeURIComponent(contentId)}/my-rating`,
      { score, expectedVersion },
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

  updateComment(commentId: string, request: CommentUpdateRequest): Observable<ContentComment> {
    return this.http.patch<ContentComment>(
      `/api/v1/comments/${encodeURIComponent(commentId)}`,
      request,
    );
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
