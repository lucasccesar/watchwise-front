import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';

export interface BlockedUserPreview {
  id: string;
  username: string;
  name: string | null;
  profilePicture: string | null;
  description: string | null;
  isProfilePublic: boolean | null;
  createdAt: string | null;
}

export interface BlockedUserRecord {
  user: BlockedUserPreview;
  createdAt: string;
}

export interface SettingsPage<T> {
  content: T[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
  hasNext: boolean;
}

export interface SettingsConnectionPreview {
  id: string;
  username: string;
  name: string | null;
  profilePicture: string | null;
}

export interface SettingsView {
  profile: {
    id: string;
    username: string;
    name: string | null;
    description: string | null;
    profilePicture: string | null;
    banner: string | null;
    isProfilePublic: boolean | null;
  };
  privacy: {
    followersCount: number;
    followingCount: number;
    pendingFollowRequestsCount: number;
    pendingFollowRequests: SettingsConnectionPreview[];
    blockedUsersCount: number;
    blockedUsers: SettingsConnectionPreview[];
  };
  contentPreferences: {
    preferredLanguage: string | null;
    preferredRegion: string | null;
  };
  account: { email: string };
}

export interface UserSettingsUpdate {
  id: string;
  username: string;
  name: string | null;
  email: string;
  description: string | null;
  profilePicture: string | null;
  isProfilePublic: boolean | null;
  banner: string | null;
  preferredLanguage: string | null;
  preferredRegion: string | null;
}

export interface UpdateUserSettingsRequest {
  username?: string;
  name?: string;
  email?: string;
  password?: string;
  description?: string;
  profilePicture?: string;
  isProfilePublic?: boolean;
  currentPassword?: string;
  banner?: string;
  preferredLanguage?: string;
  preferredRegion?: string;
}

@Injectable({ providedIn: 'root' })
export class SettingsApiService {
  constructor(private readonly http: HttpClient) {}

  getSettings(): Observable<SettingsView> {
    return this.http.get<SettingsView>('/api/v1/users/me/settings');
  }

  updateUser(settings: UpdateUserSettingsRequest): Observable<UserSettingsUpdate> {
    return this.http.patch<UserSettingsUpdate>('/api/v1/users/me', settings);
  }

  removeBanner(): Observable<void> {
    return this.http.delete<void>('/api/v1/users/me/banner');
  }

  deleteAccount(password: string): Observable<void> {
    return this.http.delete<void>('/api/v1/users/me', { body: { password } });
  }

  getBlockedUsers(page = 1, size = 20): Observable<SettingsPage<BlockedUserRecord>> {
    const params = new HttpParams().set('page', page).set('size', size);
    return this.http.get<SettingsPage<BlockedUserRecord>>('/api/v1/users/me/blocked', { params });
  }

  blockUser(userId: string): Observable<void> {
    return this.http.post<void>(`/api/v1/users/me/blocked/${encodeURIComponent(userId)}`, null);
  }

  unblockUser(userId: string): Observable<void> {
    return this.http.delete<void>(`/api/v1/users/me/blocked/${encodeURIComponent(userId)}`);
  }
}
