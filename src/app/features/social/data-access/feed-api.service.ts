import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { HomeContentCard, HomeSocialActivity } from '../../home/data-access/home-api.service';

export interface FeedActivity extends HomeSocialActivity {
  top5Type?: 'MOVIE' | 'SERIES' | null;
  score?: number | null;
  comment?: string | null;
  likedByMe?: boolean | null;
  recentComments?: FeedCommentPreview[] | null;
  pick?: { title?: string | null; likesCount?: number | null; commentsCount?: number | null; likedByMe?: boolean | null; isLikedByViewer?: boolean | null; recentComments?: FeedCommentPreview[] } | null;
  picksTemplate?: { name?: string | null; title?: string | null; coverImage?: string | null; likesCount?: number | null; commentsCount?: number | null; likedByMe?: boolean | null; isLikedByViewer?: boolean | null; recentComments?: FeedCommentPreview[] } | null;
  pickTargetCards?: HomeContentCard[] | null;
  top5Preview?: { type: 'MOVIE' | 'SERIES'; cards: HomeContentCard[] } | null;
}

export interface FeedCommentPreview {
  id: string;
  text: string;
  containsSpoiler?: boolean;
  user: { id?: string; username?: string | null; name?: string | null; profilePicture?: string | null };
}

export interface FeedPage {
  content: FeedActivity[];
  size: number;
  nextCursor: string | null;
  hasNext: boolean;
  followingCount: number;
  followedUsersPreview: Array<{
    id: string;
    username: string;
    name: string;
    profilePicture: string | null;
    isProfilePublic: boolean | null;
  }>;
}

@Injectable({ providedIn: 'root' })
export class FeedApiService {
  constructor(private readonly http: HttpClient) {}

  getFeed(options: { cursor?: string | null; size?: number } = {}): Observable<FeedPage> {
    let params = new HttpParams().set('size', options.size ?? 20);
    if (options.cursor) params = params.set('cursor', options.cursor);
    return this.http.get<FeedPage>('/api/v1/feed', { params });
  }
}
