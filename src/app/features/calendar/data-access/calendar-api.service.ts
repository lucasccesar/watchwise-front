import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';

export type CalendarEventType = 'MOVIE' | 'EPISODE' | 'SEASON' | 'SERIES';
export type CalendarWatchStatus = 'WATCHED' | 'UNWATCHED' | 'PARTIALLY_WATCHED';

export interface CalendarReleaseEvent {
  date: string;
  eventType: CalendarEventType;
  releaseStatus: 'RELEASED' | 'UPCOMING';
  watchStatus: CalendarWatchStatus;
  sources: Array<'IN_PROGRESS' | 'WATCHLIST'>;
  releaseContext: { releaseTime: string | null; network: string | null } | null;
  content:
    | { tmdbId: string; title: string; posterPath: string | null }
    | { seriesTmdbId: string; seasonNumber: number; episodeNumber: number; title: string; seriesTitle: string; posterPath: string | null; stillPath: string | null }
    | { seriesTmdbId: string; seasonNumber: number; episodeCount: number; title: string; posterPath: string | null }
    | { seriesTmdbId: string; episodeCount: number; title: string; posterPath: string | null };
}

export interface CalendarMonthResponse {
  month: string;
  region: string;
  events: CalendarReleaseEvent[];
}

@Injectable({ providedIn: 'root' })
export class CalendarApiService {
  constructor(private readonly http: HttpClient) {}

  getMonth(month: string): Observable<CalendarMonthResponse> {
    const params = new HttpParams().set('month', month);
    return this.http.get<CalendarMonthResponse>('/api/v1/users/me/calendar', { params });
  }
}
