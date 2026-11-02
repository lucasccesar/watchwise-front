import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';

export type ProfileContentMode = 'MOVIE' | 'EPISODE';
export type TopFiveContentType = 'MOVIE' | 'SERIES';

function apiContentType(type: ProfileContentMode): TopFiveContentType {
  return type === 'EPISODE' ? 'SERIES' : 'MOVIE';
}

export interface PublicUserProfile {
  id: string;
  username: string;
  name: string | null;
  description: string | null;
  profilePicture: string | null;
  isProfilePublic: boolean | null;
  createdAt: string | null;
  totalMinutesWatchedMovies: number | null;
  totalMinutesWatchedEpisodes: number | null;
  minutesWatchedMoviesLast30Days: number | null;
  minutesWatchedEpisodesLast30Days: number | null;
  totalTheaterVisits: number | null;
  genreCountsMovies: GenreCount[];
  genreCountsSeries: GenreCount[];
  banner: string | null;
  followersCount: number | null;
  followingCount: number | null;
  viewerRelation: 'SELF' | 'FOLLOWING' | 'NOT_FOLLOWING';
  blockRelationship?: string | null;
  isContentRestrictedByBlock?: boolean | null;
}

export interface GenreCount {
  genre: string;
  count: number;
}

export interface ProfileContentCard {
  contentId: string | null;
  type: string | null;
  tmdbId: string | null;
  seriesTmdbId: string | null;
  seasonNumber: number | null;
  episodeNumber: number | null;
  title: string | null;
  posterPath: string | null;
  backdropPath?: string | null;
  customPosterUrl: string | null;
  releaseYear: number | null;
  runtimeMinutes?: number | null;
  genres?: string[] | null;
  stats?: { averageScore: number | null } | null;
  viewerState?: { watchStatus?: string | null; myRating?: number | null } | null;
}

export interface ProfileDiaryPreview {
  id: string;
  source?: string | null;
  content: {
    id: string | null;
    type: string;
    tmdbId: string | null;
    seriesTmdbId: string | null;
    seasonNumber: number | null;
    episodeNumber: number | null;
  } | null;
  card: ProfileContentCard | null;
  score: number | null;
  watchedDate: string | null;
  activityDate?: string | null;
  watchNumber?: number | null;
  customPosterUrl?: string | null;
  watchedWith?: Array<{ id?: string; name?: string; username?: string; profilePicture?: string | null }>;
  comment?: string | null;
  likesCount?: number | null;
  commentsCount?: number | null;
}

export interface RatingCount {
  score: number;
  count: number;
}

export interface ProfileSummary {
  watchTime: {
    totalMinutesWatched: number;
    minutesWatchedLast30Days: number;
    totalWatchedCount: number;
    watchedCountLast30Days: number;
  };
  highlights: {
    rewatch: {
      kind: string;
      content: ProfileContentCard | null;
      count: number;
    } | null;
    longestWatch: {
      content: ProfileContentCard | null;
      totalMinutesWatched: number;
      watchedEpisodeCount: number | null;
    } | null;
  } | null;
  genreCounts: GenreCount[];
  ratingsSummary: { totalRatings: number; averageScore: number | null } | null;
  ratingsDistribution: RatingCount[];
  recentEpisodes: ProfileDiaryPreview[];
  recentReviews: ProfileDiaryPreview[];
  recentActivity: Array<Record<string, unknown>>;
}

export interface ProfileMonthReview {
  recentWatched: ProfileDiaryPreview[];
  topRated: ProfileDiaryPreview[];
  bottomRated: ProfileDiaryPreview[];
  ratingsDistribution: RatingCount[];
  watchCount: number;
  minutesWatched: number;
  firstWatched: ProfileDiaryPreview | null;
  lastWatched: ProfileDiaryPreview | null;
  minutesPerDay: Array<{ watchedDate: string; minutesWatched: number }>;
  watchCountByDayOfWeek: Array<{ dayOfWeek: number; count: number }>;
  genreCounts: GenreCount[];
  topSeriesByWatchTime: Array<{ contentId: string | null; seriesTmdbId: string; totalMinutesWatched: number; card: ProfileContentCard | null }>;
  topLongestMovies: unknown[];
  topWatchCompanions: Array<{ companion: { id?: string; username?: string; name?: string; profilePicture?: string | null }; watchCount: number }>;
  topLongestMovieCards: ProfileContentCard[];
}

export interface ProfileYearReview {
  ratingsDistribution: RatingCount[];
  watchCount: number;
  minutesWatched: number;
  averageMinutesPerMonth: number;
  averageMinutesPerWeek: number;
  averageMinutesPerDay: number;
  watchCountByMonth: Array<{ month: number; count: number }>;
  watchCountByDayOfWeek: Array<{ dayOfWeek: number; count: number }>;
  firstWatched: ProfileDiaryPreview | null;
  lastWatched: ProfileDiaryPreview | null;
  longestWatched: Array<{ type: string; contentId: string | null; tmdbId: string | null; seriesTmdbId: string | null; totalMinutesWatched: number; card: ProfileContentCard | null }>;
  genreCounts: GenreCount[];
  topRated: ProfileDiaryPreview[];
  bottomRated: ProfileDiaryPreview[];
  topWatchCompanions: ProfileMonthReview['topWatchCompanions'];
}

export interface ProfileAllTimeStats {
  totalMoviesWatched: number;
  totalEpisodesWatched: number;
  totalMinutesWatchedMovies: number;
  totalMinutesWatchedEpisodes: number;
  totalTheaterVisits: number;
  averageMinutesPerMonth: number;
  averageMinutesPerWeek: number;
  averageMinutesPerDay: number;
  watchCountByYearMovies: Array<{ year: number; count: number }>;
  watchCountByYearEpisodes: Array<{ year: number; count: number }>;
  watchCountByDecade: Array<{ decade: number; count: number }>;
  watchCountByCountry: Array<{ country: string; count: number }>;
  mostLoggedContent: Array<{ content: unknown; count: number; card: ProfileContentCard | null }>;
  genreCountsMovies: GenreCount[];
  genreCountsSeries: GenreCount[];
  topRated: ProfileDiaryPreview[];
  bottomRated: ProfileDiaryPreview[];
  topWatchCompanions: ProfileMonthReview['topWatchCompanions'];
  currentSeriesAndSeasonTopRated: unknown[];
  currentSeriesAndSeasonBottomRated: unknown[];
}

export interface ProfileAllTimeEdition {
  type: string;
  watchedCount: number;
  minutesWatched: number;
  totalTheaterVisits: number;
  averageMinutesPerMonth: number;
  averageMinutesPerWeek: number;
  averageMinutesPerDay: number;
  watchCountByYear: Array<{ year: number; count: number }>;
  watchCountByDecade: Array<{ decade: number; count: number }>;
  watchCountByCountry: Array<{ country: string; count: number }>;
  mostLoggedContent: ProfileAllTimeStats['mostLoggedContent'];
  genreCounts: GenreCount[];
  ratingsDistribution: RatingCount[];
  topRated: ProfileDiaryPreview[];
  bottomRated: ProfileDiaryPreview[];
  currentSeriesAndSeasonTopRated: unknown[];
  currentSeriesAndSeasonBottomRated: unknown[];
}

export interface EpisodeRatingsMapItem {
  seriesTmdbId: string;
  watchedEpisodeCount: number | null;
  totalEpisodeCount: number | null;
  customPosterUrl: string | null;
  title: string | null;
  releaseYear: number | null;
  posterPath: string | null;
}

export interface EpisodeRatingsMap {
  series: EpisodeRatingsMapItem[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
  hasNext: boolean;
  totalWatchedEpisodeCount: number;
  totalEpisodeCount: number | null;
}

export interface EpisodeRatingsGrid {
  seriesTmdbId: string;
  episodes: Array<{
    seasonNumber: number | null;
    episodeNumber: number | null;
    score: number | null;
    averageScore: number | null;
    ratingCount: number;
  }>;
  customPosterUrl: string | null;
  title: string | null;
  releaseYear: number | null;
  posterPath: string | null;
  backdropPath: string | null;
  overallAverageScore: number | null;
  overallRatingCount: number;
}

export interface TopFiveEntry {
  id: string;
  type: TopFiveContentType;
  content: { id: string; tmdbId: string; type: string };
  position: number;
  customPosterUrl: string | null;
  score: number | null;
}

@Injectable({ providedIn: 'root' })
export class ProfileApiService {
  constructor(private readonly http: HttpClient) {}

  getUser(userId: string): Observable<PublicUserProfile> {
    return this.http.get<PublicUserProfile>('/api/v1/users/' + encodeURIComponent(userId));
  }

  setFollow(userId: string, following: boolean): Observable<unknown> {
    const url = '/api/v1/users/' + encodeURIComponent(userId) + '/follow';
    return following
      ? this.http.post(url, {})
      : this.http.delete(url);
  }

  getTopFive(userId: string, type: TopFiveContentType): Observable<TopFiveEntry[]> {
    return this.http.get<TopFiveEntry[]>(
      '/api/v1/users/' + encodeURIComponent(userId) + '/top5/' + type,
    );
  }

  getSummary(userId: string, type: ProfileContentMode): Observable<ProfileSummary> {
    return this.http.get<ProfileSummary>('/api/v1/users/' + encodeURIComponent(userId) + '/summary', {
      params: new HttpParams().set('type', apiContentType(type)),
    });
  }

  getMonthReview(userId: string, type: ProfileContentMode, month: string): Observable<ProfileMonthReview> {
    return this.http.get<ProfileMonthReview>(
      '/api/v1/users/' + encodeURIComponent(userId) + '/summary/month',
      { params: new HttpParams().set('type', apiContentType(type)).set('month', month) },
    );
  }

  getYearReview(userId: string, type: ProfileContentMode, year: number): Observable<ProfileYearReview> {
    return this.http.get<ProfileYearReview>(
      '/api/v1/users/' + encodeURIComponent(userId) + '/summary/year',
      { params: new HttpParams().set('type', apiContentType(type)).set('year', year) },
    );
  }

  getAllTimeStats(userId: string): Observable<ProfileAllTimeStats> {
    return this.http.get<ProfileAllTimeStats>(
      '/api/v1/users/' + encodeURIComponent(userId) + '/summary/all-time',
    );
  }

  getAllTimeEdition(userId: string, type: ProfileContentMode): Observable<ProfileAllTimeEdition> {
    return this.http.get<ProfileAllTimeEdition>(
      '/api/v1/users/' + encodeURIComponent(userId) + '/summary/all-time/edition',
      { params: new HttpParams().set('type', apiContentType(type)) },
    );
  }

  getEpisodeMap(userId: string, page = 1, size = 11): Observable<EpisodeRatingsMap> {
    const params = new HttpParams().set('page', page).set('size', size);
    return this.http.get<EpisodeRatingsMap>(
      '/api/v1/users/' + encodeURIComponent(userId) + '/episode-ratings-map',
      { params },
    );
  }

  getEpisodeGrid(userId: string, seriesTmdbId: string): Observable<EpisodeRatingsGrid> {
    return this.http.get<EpisodeRatingsGrid>(
      '/api/v1/users/' + encodeURIComponent(userId) + '/series/'
        + encodeURIComponent(seriesTmdbId) + '/episode-ratings',
    );
  }
}
