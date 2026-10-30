import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';

export interface GenreCount {
  genre: string;
  count: number;
}

export interface DailyWatchCount {
  watchedDate: string;
  count: number;
}

export interface HomeContentCard {
  contentId: string | null;
  type: string | null;
  tmdbId: string | null;
  seriesTmdbId: string | null;
  seasonNumber: number | null;
  episodeNumber: number | null;
  title: string | null;
  posterPath: string | null;
  customPosterUrl: string | null;
  releaseDate: string | null;
  releaseYear: number | null;
  runtimeMinutes: number | null;
  totalRuntimeMinutes: number | null;
  numberOfSeasons: number | null;
  numberOfEpisodes: number | null;
  tmdbVoteAverage?: number | null;
  genres: string[] | null;
  previewStatus: 'AVAILABLE' | 'PARTIAL' | 'UNAVAILABLE' | null;
}

export interface NextEpisode {
  seriesTmdbId: string;
  maxSeasonNumber: number | null;
  maxEpisodeNumber: number | null;
  lastWatchedDate: string | null;
  watchedEpisodeCount: number | null;
  totalEpisodeCount: number | null;
  watchedPercentage: number | null;
  seriesTitle: string | null;
  episodeTitle: string | null;
  stillPath: string | null;
  runtimeMinutes: number | null;
  releaseDate: string | null;
  contentId: string | null;
  communityAverageScore: number | null;
  tmdbVoteAverage: number | null;
  availableToWatch: boolean | null;
}

export interface UpcomingReleaseContent {
  tmdbId?: string | null;
  seriesTmdbId?: string | null;
  seasonNumber?: number | null;
  episodeNumber?: number | null;
  episodeCount?: number | null;
  title?: string | null;
  seriesTitle?: string | null;
  posterPath?: string | null;
  stillPath?: string | null;
}

/** The API DTO currently serializes `date`; the local screen snapshot names this field `releaseDate`. */
export interface UpcomingRelease {
  date: string;
  eventType: 'MOVIE' | 'EPISODE' | 'SEASON' | 'SERIES';
  releaseStatus: 'RELEASED' | 'UPCOMING' | 'UNKNOWN';
  watchStatus: 'WATCHED' | 'PARTIALLY_WATCHED' | 'UNWATCHED' | 'UNKNOWN';
  sources: ('IN_PROGRESS' | 'WATCHLIST')[];
  content: UpcomingReleaseContent;
  releaseContext: {
    releaseTime: string | null;
    network: string | null;
  } | null;
}

export interface HomeViewer {
  name: string | null;
  username: string | null;
  profilePicture: string | null;
}

export interface HomeRecentlyWatched {
  id: string;
  content: {
    id: string | null;
    tmdbId: string | null;
    type: string | null;
    seriesTmdbId: string | null;
    seasonNumber: number | null;
    episodeNumber: number | null;
    runtimeMinutes: number | null;
  };
  score: number | null;
  watchedDate: string;
  customPosterUrl: string | null;
  companionProfilePictures: string[];
  card: HomeContentCard | null;
  seriesTitle: string | null;
}

export interface HomeSocialActivity {
  eventType:
    | 'DIARY_ENTRY'
    | 'CONTENT_REVIEW'
    | 'DROPPED'
    | 'TOP5_UPDATE'
    | 'PICK_CREATED'
    | 'PICKS_TEMPLATE_CREATED'
    | 'DAILY_GAME_RESULT';
  id: string;
  user: {
    id?: string;
    username?: string | null;
    name?: string | null;
    profilePicture?: string | null;
  };
  content: {
    id: string | null;
    tmdbId: string | null;
    type: string | null;
    seriesTmdbId: string | null;
    seasonNumber: number | null;
    episodeNumber: number | null;
  } | null;
  targetLabel: string | null;
  likesCount: number | null;
  commentsCount: number | null;
  createdAt: string;
  card: HomeContentCard | null;
}

export interface HomeSummary {
  totalMinutesWatchedMovies: number;
  totalMinutesWatchedEpisodes: number;
  totalMoviesWatched: number;
  totalDistinctMoviesWatched: number;
  totalEpisodesWatched: number;
  distinctSeriesWatched: number;
  latestWatchedBackdropPath: string | null;
  nextEpisodes: NextEpisode[];
  upcomingReleases: UpcomingRelease[];
  watchCountByDayLast30Days: DailyWatchCount[];
  genreCountsMoviesLast30Days: GenreCount[];
  genreCountsEpisodesLast30Days: GenreCount[];
  viewer: HomeViewer | null;
  hasUnreadNotifications: boolean;
  recentlyWatched: HomeRecentlyWatched[];
  socialActivities: HomeSocialActivity[];
}

export interface DiaryEpisodeReference {
  type: 'EPISODE';
  seriesTmdbId: string;
  seasonNumber: number;
  episodeNumber: number;
}

export interface DiaryEntryCreationRequest {
  content: DiaryEpisodeReference;
  watchedDate: string;
  isRewatch: boolean;
  score?: number;
  comment?: string;
}

export interface DiaryEntryUpdateRequest {
  score?: number;
  comment?: string;
}

@Injectable({ providedIn: 'root' })
export class HomeApiService {
  constructor(private readonly http: HttpClient) {}

  getHomeSummary(userId: string): Observable<HomeSummary> {
    return this.http.get<HomeSummary>(
      `/api/v1/users/${encodeURIComponent(userId)}/summary/home`,
    );
  }

  createDiaryEntry(request: DiaryEntryCreationRequest): Observable<unknown> {
    return this.http.post<unknown>('/api/v1/diary', request);
  }

  updateDiaryEntry(
    diaryEntryId: string,
    request: DiaryEntryUpdateRequest,
  ): Observable<unknown> {
    return this.http.patch<unknown>(
      `/api/v1/diary/${encodeURIComponent(diaryEntryId)}`,
      request,
    );
  }
}
