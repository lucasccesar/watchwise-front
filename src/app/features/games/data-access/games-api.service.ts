import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';

export type DailyGameType =
  | 'MOVIE_BY_POSTER'
  | 'SERIES_BY_POSTER'
  | 'PERSON_BY_FACE'
  | 'EPISODE_BY_FRAME'
  | 'MOVIE_BY_INFO'
  | 'SERIES_BY_INFO'
  | 'ACTOR_BY_MOVIE_FILMOGRAPHY'
  | 'ACTOR_BY_SERIES_FILMOGRAPHY';
export type DailyGameStatus = 'NOT_PLAYED' | 'IN_PROGRESS' | 'COMPLETED' | 'FAILED';

export interface DailyGameOverviewCard {
  gameType: DailyGameType;
  targetKind: 'MOVIE' | 'SERIES' | 'PERSON' | 'EPISODE';
  maxAttempts: number;
  attemptsUsed: number;
  attemptsRemaining: number;
  status: DailyGameStatus;
  score: number;
  imageUrl: string | null;
  visibleImageUrls: string[] | null;
}

export interface DailyGamesOverview {
  date: string;
  nextResetAt: string;
  totalMaxScore: number;
  currentScore: number;
  games: DailyGameOverviewCard[];
}

export interface DailyGameSearchResult {
  targetKind: 'MOVIE' | 'SERIES' | 'PERSON' | 'EPISODE';
  tmdbId: string | null;
  personTmdbId: string | null;
  seriesTmdbId: string | null;
  seasonNumber: number | null;
  episodeNumber: number | null;
  title: string;
  imageUrl: string | null;
  date: string | null;
  genres: string[] | null;
  numberOfSeasons: number | null;
}

export interface DailyGameCandidate {
  targetKind: 'MOVIE' | 'SERIES' | 'PERSON' | 'EPISODE';
  tmdbId: string | null;
  personTmdbId: string | null;
  seriesTmdbId: string | null;
  seasonNumber: number | null;
  episodeNumber: number | null;
  title: string;
  imageUrl: string | null;
  year: number | null;
  genres: string[] | null;
  numberOfSeasons: number | null;
}

export interface DailyGameComparisonCell {
  status: string;
  direction: string | null;
  displayValue: unknown;
  matchedValues: string[];
  matchCount: number | null;
}

export interface DailyGameInfoFeedback {
  platforms: DailyGameComparisonCell | null;
  genres: DailyGameComparisonCell | null;
  year: DailyGameComparisonCell | null;
  certification: DailyGameComparisonCell | null;
  directorOrCreators: DailyGameComparisonCell | null;
  cast: DailyGameComparisonCell | null;
  productionCompanies: DailyGameComparisonCell | null;
  revenueOrSeasons: DailyGameComparisonCell | null;
  candidateEpisodeCount: number | null;
}

export interface DailyGameAttemptView {
  attemptNumber: number;
  candidate: DailyGameCandidate;
  outcome: { correct: boolean; seriesCorrect: boolean | null; seasonCorrect: boolean | null; episodeCorrect: boolean | null };
  infoFeedback: DailyGameInfoFeedback | null;
}

export interface DailyGameMediaRef {
  slot: string;
  url: string;
  variant: string;
  revealed: boolean;
}

export interface DailyGamePlayView {
  challengeDate: string;
  nextResetAt: string;
  gameType: DailyGameType;
  targetKind: 'MOVIE' | 'SERIES' | 'PERSON' | 'EPISODE';
  maxAttempts: number;
  attemptsUsed: number;
  attemptsRemaining: number;
  status: DailyGameStatus;
  score: number;
  potentialScore: number;
  media: DailyGameMediaRef[];
  attempts: DailyGameAttemptView[];
  answer: { title: string | null; image: DailyGameMediaRef | null; year: number | null; genres: string[] | null; seriesName: string | null; seasonNumber?: number | null; episodeNumber?: number | null } | null;
  canAttempt: boolean;
  canGiveUp: boolean;
  shareOnCompletion: boolean;
  sharedToFeed: boolean;
  filmography: { majorRoles: boolean; guessedActors: Array<{ personTmdbId: string; name: string; profileUrl: string | null }>; entries: Array<{ workId: string; title: string; revealed: boolean; highlighted: boolean; year: number | null; genres: string[]; posterUrl: string | null; period: string | null; character: string | null }> } | null;
}

export interface DailyGamePlayAction {
  state: DailyGamePlayView;
  currentAttempt: DailyGameAttemptView | null;
}

export interface DailyGameSeasonOption { seasonNumber: number; name: string; episodeCount: number | null; }
export interface DailyGameEpisodeOption { seriesTmdbId: string; seasonNumber: number; episodeNumber: number; name: string; airDate: string | null; }
export interface DailyGamePage<T> { content: T[]; page: number; size: number; totalElements: number; totalPages: number; hasNext: boolean; }
export interface DailyGameRankingEntry { rank: number; userId: string; name: string; username: string; profilePicture: string | null; score: number; daysPlayed: number; gamesPlayed: number; solvedPercentage: number; averageAttempts: number; }
export interface DailyGameRankingView { content: DailyGameRankingEntry[]; page: number; size: number; totalElements: number; totalPages: number; hasNext: boolean; gameType: DailyGameType | null; viewer: { userId: string; name: string; username: string; profilePicture: string | null; rank: number | null; score: number; daysPlayed: number; gamesPlayed: number; solvedPercentage: number; averageAttempts: number; inTop200: boolean; pointsToTop200: number | null; top200CutoffScore: number | null } | null; }
export interface DailyGameHistory { challengeDate: string; gameType: DailyGameType; status: DailyGameStatus; attemptsUsed: number; score: number; completedAt: string | null; answer: { title: string | null } | null; }

@Injectable({ providedIn: 'root' })
export class GamesApiService {
  constructor(private readonly http: HttpClient) {}

  getOverview(): Observable<DailyGamesOverview> { return this.http.get<DailyGamesOverview>('/api/v1/games/today/view'); }
  getDay(date: string): Observable<{ date: string; games: Array<{ gameType: DailyGameType; targetKind: string; maxAttempts: number; attemptsUsed: number; attemptsRemaining: number; status: DailyGameStatus; score: number; imageUrl: string | null; visibleImageUrls: string[] | null }> }> {
    return this.http.get<{ date: string; games: Array<{ gameType: DailyGameType; targetKind: string; maxAttempts: number; attemptsUsed: number; attemptsRemaining: number; status: DailyGameStatus; score: number; imageUrl: string | null; visibleImageUrls: string[] | null }> }>(`/api/v1/games/${encodeURIComponent(date)}`);
  }
  getPlay(gameType: DailyGameType, majorRoles = true): Observable<DailyGamePlayView> {
    const params = new HttpParams().set('majorRoles', majorRoles);
    return this.http.get<DailyGamePlayView>(`/api/v1/games/${gameType}/play`, { params });
  }
  submitPlayAttempt(gameType: DailyGameType, request: { tmdbId?: string; personTmdbId?: string; seriesTmdbId?: string; seasonNumber?: number; episodeNumber?: number; shareOnCompletion?: boolean }, majorRoles = true): Observable<DailyGamePlayAction> {
    const params = new HttpParams().set('majorRoles', majorRoles);
    return this.http.post<DailyGamePlayAction>(`/api/v1/games/${gameType}/play/attempt`, request, { params });
  }
  giveUp(gameType: DailyGameType, majorRoles = true): Observable<DailyGamePlayAction> {
    const params = new HttpParams().set('majorRoles', majorRoles);
    return this.http.post<DailyGamePlayAction>(`/api/v1/games/${gameType}/play/give-up`, {}, { params });
  }
  search(gameType: DailyGameType, query: string, page = 1): Observable<DailyGamePage<DailyGameSearchResult>> {
    const params = new HttpParams().set('q', query).set('page', page).set('size', 8).set('view', true);
    return this.http.get<DailyGamePage<DailyGameSearchResult>>(`/api/v1/games/${gameType}/search`, { params });
  }
  searchEpisodeSeries(query: string): Observable<DailyGamePage<DailyGameSearchResult>> {
    const params = new HttpParams().set('q', query).set('page', 1).set('size', 8).set('view', true);
    return this.http.get<DailyGamePage<DailyGameSearchResult>>('/api/v1/games/EPISODE_BY_FRAME/search/series', { params });
  }
  getEpisodeSeasons(seriesTmdbId: string): Observable<DailyGameSeasonOption[]> {
    return this.http.get<DailyGameSeasonOption[]>(`/api/v1/games/EPISODE_BY_FRAME/series/${encodeURIComponent(seriesTmdbId)}/seasons`);
  }
  getEpisodeOptions(seriesTmdbId: string, seasonNumber: number): Observable<DailyGameEpisodeOption[]> {
    return this.http.get<DailyGameEpisodeOption[]>(`/api/v1/games/EPISODE_BY_FRAME/series/${encodeURIComponent(seriesTmdbId)}/seasons/${seasonNumber}/episodes`);
  }
  getHistory(page = 1, size = 200): Observable<DailyGamePage<DailyGameHistory>> {
    const params = new HttpParams().set('page', page).set('size', size);
    return this.http.get<DailyGamePage<DailyGameHistory>>('/api/v1/games/history', { params });
  }
  getRanking(options: { gameType?: DailyGameType | null; page?: number; size?: number } = {}): Observable<DailyGameRankingView> {
    let params = new HttpParams().set('page', options.page ?? 1).set('size', options.size ?? 20);
    if (options.gameType) params = params.set('gameType', options.gameType);
    return this.http.get<DailyGameRankingView>('/api/v1/games/rankings/view', { params });
  }
}
