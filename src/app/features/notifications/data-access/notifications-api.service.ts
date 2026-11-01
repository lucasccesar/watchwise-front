import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';

export type WatchwiseNotificationType =
  | 'RELEASE'
  | 'ANNOUNCED_DATE'
  | 'CANCELLED'
  | 'RENEWED'
  | 'NEW_EPISODE'
  | 'FOLLOWED_PERSON_NEW_CREDIT'
  | 'LIKE_RECEIVED'
  | 'COMMENT_RECEIVED'
  | 'FOLLOW_REQUEST'
  | 'NEW_FOLLOWER'
  | 'FOLLOW_REQUEST_ACCEPTED'
  | 'REPORT_RESOLVED';

export type NotificationTargetType =
  | 'COMMENT'
  | 'DIARY_ENTRY'
  | 'CONTENT_REVIEW'
  | 'DROPPED_ENTRY'
  | 'USER_LIST'
  | 'PICK'
  | 'PICKS_TEMPLATE'
  | 'REPORT_CASE';

export interface NotificationUserPreview {
  id: string;
  username: string;
  name: string;
  profilePicture: string | null;
  isProfilePublic: boolean | null;
}

export interface NotificationContentRef {
  id: string | null;
  tmdbId: string | null;
  type: 'MOVIE' | 'SERIES' | 'SEASON' | 'EPISODE' | null;
  seriesTmdbId: string | null;
  seasonNumber: number | null;
  episodeNumber: number | null;
  runtimeMinutes: number | null;
  releaseYear: number | null;
  genres: string[] | null;
}

export interface NotificationContentCard {
  contentId: string | null;
  type: NotificationContentRef['type'];
  tmdbId: string | null;
  seriesTmdbId: string | null;
  seasonNumber: number | null;
  episodeNumber: number | null;
  title: string | null;
  posterPath: string | null;
  customPosterUrl: string | null;
  releaseDate: string | null;
  releaseYear: number | null;
  tmdbVoteAverage: number | null;
  runtimeMinutes: number | null;
  totalRuntimeMinutes: number | null;
  numberOfSeasons: number | null;
  numberOfEpisodes: number | null;
  genres: string[] | null;
  stats: { averageScore: number | null; ratingCount?: number | null } | null;
  viewerState: Record<string, unknown> | null;
  previewStatus: string | null;
}

export interface NotificationTargetPreview {
  targetType: NotificationTargetType;
  targetId: string;
  title: string | null;
  excerpt: string | null;
  score: number | null;
  coverImageUrl: string | null;
  contentCard: NotificationContentCard | null;
  previewStatus: string | null;
}

export interface NotificationView {
  id: string;
  type: WatchwiseNotificationType;
  message: string;
  content: NotificationContentRef | null;
  personTmdbId: string | null;
  isRead: boolean;
  createdAt: string;
  updatedAt: string;
  latestActor: NotificationUserPreview | null;
  targetType: NotificationTargetType | null;
  targetId: string | null;
  interactionCount: number | null;
  contentCard: NotificationContentCard | null;
  person: { personTmdbId: string; name: string | null; profileUrl: string | null; previewStatus: string | null } | null;
  targetPreview: NotificationTargetPreview | null;
}

export interface NotificationViewPage {
  content: NotificationView[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
  hasNext: boolean;
  totalNotifications: number;
  unreadNotifications: number;
}

export interface FollowRequestUser {
  id: string;
  username: string;
  name: string | null;
  description: string | null;
  profilePicture: string | null;
  isProfilePublic: boolean | null;
  createdAt: string | null;
}

export interface FollowRequestPage {
  content: FollowRequestUser[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
  hasNext: boolean;
}

@Injectable({ providedIn: 'root' })
export class NotificationsApiService {
  constructor(private readonly http: HttpClient) {}

  getView(options: { page: number; size: number; isRead?: boolean }): Observable<NotificationViewPage> {
    let params = new HttpParams().set('page', options.page).set('size', options.size);
    if (options.isRead !== undefined) params = params.set('isRead', options.isRead);
    return this.http.get<NotificationViewPage>('/api/v1/notifications/view', { params });
  }

  markAsRead(notificationId: string): Observable<void> {
    return this.http.patch<void>(`/api/v1/notifications/${encodeURIComponent(notificationId)}/read`, {});
  }

  getFollowRequests(page = 1, size = 20): Observable<FollowRequestPage> {
    const params = new HttpParams().set('page', page).set('size', size);
    return this.http.get<FollowRequestPage>('/api/v1/users/me/follow-requests', { params });
  }

  acceptFollowRequest(requesterId: string): Observable<void> {
    return this.http.post<void>(`/api/v1/users/me/follow-requests/${encodeURIComponent(requesterId)}/accept`, {});
  }

  rejectFollowRequest(requesterId: string): Observable<void> {
    return this.http.delete<void>(`/api/v1/users/me/follow-requests/${encodeURIComponent(requesterId)}`);
  }
}
