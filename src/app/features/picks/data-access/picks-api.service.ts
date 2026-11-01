import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';

export type PicksOrigin = 'OFFICIAL' | 'COMMUNITY';
export type PicksTemplateSort = 'POPULAR_WEEK' | 'MOST_PICKED' | 'RECENT';

export interface PicksUserPreview {
  id: string;
  username: string;
  name: string;
  profilePicture: string | null;
  isProfilePublic: boolean | null;
}

export interface PicksCommentPreview {
  id: string;
  user: PicksUserPreview;
  parentCommentId: string | null;
  text: string;
  containsSpoiler: boolean;
  createdAt: string;
  likesCount: number | null;
  likedByMe: boolean | null;
}

export interface PicksTemplatePreview {
  id: string;
  creator: PicksUserPreview | null;
  origin: PicksOrigin;
  name: string;
  description: string | null;
  coverImage: string | null;
  createdAt: string | null;
  picksCount: number;
  categoriesCount: number;
  categoryNames: string[];
  likesCount: number | null;
  commentsCount: number;
  isLikedByViewer: boolean | null;
  myPicksCount: number;
  latestMyPickId: string | null;
  recentComments: PicksCommentPreview[];
}

export interface PicksTemplatePage {
  content: PicksTemplatePreview[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
  hasNext: boolean;
}

export interface PicksTemplateCategory {
  id: string;
  name: string;
  description: string | null;
  group: 'PRIMARY' | 'SECONDARY';
  displayOrder: number;
  allowedType: 'MOVIE' | 'SERIES' | 'EPISODE' | 'PERSON';
  optionMode: 'OPEN' | 'FIXED';
  options: Array<{ id: string; target: PicksTargetSearch }>;
}

export interface PicksContentReference {
  type: 'MOVIE' | 'SERIES' | 'EPISODE' | 'SEASON';
  tmdbId: string | null;
  seriesTmdbId: string | null;
  seasonNumber: number | null;
  episodeNumber: number | null;
}

export interface PicksTargetSearch {
  id?: string;
  content: PicksContentReference | null;
  personTmdbId: string | null;
  contextContent: PicksContentReference | null;
}

export interface PicksTargetPreview {
  contentCard: { contentId: string | null; type: 'MOVIE' | 'SERIES' | 'EPISODE' | 'SEASON'; tmdbId: string | null; seriesTmdbId: string | null; seasonNumber: number | null; episodeNumber: number | null; title: string | null; posterPath: string | null; customPosterUrl: string | null; releaseYear: number | null; stats: { averageScore: number | null } | null } | null;
  person: { tmdbId: string; name: string; profileUrl: string | null } | null;
  contextCard: { title: string | null; posterPath: string | null } | null;
}

export interface PicksOptionView {
  id: string;
  target: PicksTargetSearch;
  preview: PicksTargetPreview;
}

export interface PicksAnswer {
  categoryId: string;
  name: string;
  group: 'PRIMARY' | 'SECONDARY';
  displayOrder: number;
  allowedType: 'MOVIE' | 'SERIES' | 'EPISODE' | 'PERSON';
  optionMode: 'OPEN' | 'FIXED';
  target: PicksTargetSearch | null;
  preview: PicksTargetPreview | null;
  isAnswered: boolean | null;
  isValid: boolean | null;
}

export interface PicksPickView {
  id: string;
  picksTemplate: PicksTemplatePreview;
  user: PicksUserPreview;
  visibility: 'PUBLIC' | 'FOLLOWERS' | 'PRIVATE';
  createdAt: string;
  updatedAt: string;
  progress: 'EMPTY' | 'PARTIAL' | 'COMPLETE';
  answeredCategoriesCount: number;
  totalCategoriesCount: number;
  answers: PicksAnswer[];
  likesCount: number | null;
  commentsCount: number;
  isLikedByViewer: boolean | null;
}

export interface PicksTemplatePickView {
  id: string;
  user: PicksUserPreview;
  visibility: 'PUBLIC' | 'FOLLOWERS' | 'PRIVATE';
  createdAt: string;
  progress: 'EMPTY' | 'PARTIAL' | 'COMPLETE';
  answeredCategoriesCount: number;
  totalCategoriesCount: number;
  answeredCategories: PicksAnswer[];
  likesCount: number | null;
  commentsCount: number;
  isLikedByViewer: boolean | null;
}

export interface UserPickPreview {
  id: string;
  user: PicksUserPreview;
  visibility: 'PUBLIC' | 'FOLLOWERS' | 'PRIVATE';
  createdAt: string;
  likesCount: number | null;
  commentsCount: number;
  isLikedByViewer: boolean | null;
  answeredCategories: Array<{
    categoryId?: string;
    name?: string;
    target?: PicksTargetPreview | null;
  }>;
  recentComments?: PicksCommentPreview[];
}

export interface UserPickPreviewPage {
  content: UserPickPreview[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
  hasNext: boolean;
}

export interface PickCreationSelection { categoryId: string; target: { content?: PicksContentReference | null; personTmdbId?: string | null; contextContent?: PicksContentReference | null }; }

export interface PicksTemplateDetail extends PicksTemplatePreview {
  instructions: string | null;
  eligibilityStartDate: string | null;
  eligibilityEndDate: string | null;
  updatedAt: string | null;
  categories: PicksTemplateCategory[];
}

export interface PicksTemplateCategoryInput {
  name: string;
  description?: string | null;
  group: 'PRIMARY' | 'SECONDARY';
  displayOrder: number;
  allowedType: 'MOVIE' | 'SERIES' | 'EPISODE' | 'PERSON';
  optionMode: 'OPEN' | 'FIXED';
  options?: Array<{ target: unknown }>;
}

export interface PicksTemplateCreation {
  name: string;
  description?: string | null;
  coverImage?: string | null;
  instructions?: string | null;
  eligibilityStartDate?: string | null;
  eligibilityEndDate?: string | null;
  categories: PicksTemplateCategoryInput[];
}

export interface PicksCommentPage {
  content: PicksCommentPreview[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
  hasNext: boolean;
}

@Injectable({ providedIn: 'root' })
export class PicksApiService {
  constructor(private readonly http: HttpClient) {}

  getTemplates(options: { origin?: PicksOrigin; name?: string; page?: number; size?: number; sort?: PicksTemplateSort }): Observable<PicksTemplatePage> {
    let params = new HttpParams().set('page', options.page ?? 1).set('size', options.size ?? 20).set('sort', options.sort ?? 'POPULAR_WEEK');
    if (options.origin) params = params.set('origin', options.origin);
    if (options.name?.trim()) params = params.set('name', options.name.trim());
    return this.http.get<PicksTemplatePage>('/api/v1/picks-templates', { params });
  }

  getMyTemplates(options: { page?: number; size?: number; sort?: PicksTemplateSort } = {}): Observable<PicksTemplatePage> {
    let params = new HttpParams().set('page', options.page ?? 1).set('size', options.size ?? 20);
    if (options.sort) params = params.set('sort', options.sort);
    return this.http.get<PicksTemplatePage>('/api/v1/users/me/picks-templates/view', { params });
  }

  getTemplate(templateId: string): Observable<PicksTemplateDetail> {
    return this.http.get<PicksTemplateDetail>(`/api/v1/picks-templates/${encodeURIComponent(templateId)}`);
  }

  getTemplateOptionViews(templateId: string, categoryId: string): Observable<PicksCommentPage & { content: PicksOptionView[] }> {
    return this.http.get<PicksCommentPage & { content: PicksOptionView[] }>(`/api/v1/picks-templates/${encodeURIComponent(templateId)}/categories/${encodeURIComponent(categoryId)}/options/view`, { params: new HttpParams().set('page', 1).set('size', 100) });
  }

  getTemplatePicks(templateId: string, options: { page?: number; size?: number; sort?: 'POPULAR' | 'RECENT' } = {}): Observable<PicksCommentPage & { content: PicksTemplatePickView[] }> {
    let params = new HttpParams().set('page', options.page ?? 1).set('size', options.size ?? 10).set('sort', options.sort ?? 'RECENT');
    return this.http.get<PicksCommentPage & { content: PicksTemplatePickView[] }>(`/api/v1/picks-templates/${encodeURIComponent(templateId)}/picks/view`, { params });
  }

  getMyTemplatePicks(templateId: string, page = 1, size = 10): Observable<PicksCommentPage & { content: PicksTemplatePickView[] }> {
    const params = new HttpParams().set('page', page).set('size', size);
    return this.http.get<PicksCommentPage & { content: PicksTemplatePickView[] }>(`/api/v1/picks-templates/${encodeURIComponent(templateId)}/my-picks/view`, { params });
  }

  createPick(templateId: string, request: { visibility: 'PUBLIC' | 'FOLLOWERS' | 'PRIVATE'; selections: PickCreationSelection[] }): Observable<{ id: string }> {
    return this.http.post<{ id: string }>(`/api/v1/picks-templates/${encodeURIComponent(templateId)}/picks`, request);
  }

  getPick(pickId: string): Observable<PicksPickView> {
    return this.http.get<PicksPickView>(`/api/v1/picks/${encodeURIComponent(pickId)}/view`);
  }

  getUserPicks(userId: string, page = 1, size = 20): Observable<UserPickPreviewPage> {
    const params = new HttpParams().set('page', page).set('size', size);
    return this.http.get<UserPickPreviewPage>(
      '/api/v1/users/' + encodeURIComponent(userId) + '/picks',
      { params },
    );
  }

  updatePickVisibility(pickId: string, visibility: 'PUBLIC' | 'FOLLOWERS' | 'PRIVATE'): Observable<void> {
    return this.http.patch<void>(`/api/v1/picks/${encodeURIComponent(pickId)}`, { visibility });
  }

  updateSelection(pickId: string, categoryId: string, target: PickCreationSelection['target']): Observable<unknown> {
    return this.http.put(`/api/v1/picks/${encodeURIComponent(pickId)}/categories/${encodeURIComponent(categoryId)}/selection`, target);
  }

  removeSelection(pickId: string, categoryId: string): Observable<void> {
    return this.http.delete<void>(`/api/v1/picks/${encodeURIComponent(pickId)}/categories/${encodeURIComponent(categoryId)}/selection`);
  }

  likePick(pickId: string): Observable<void> { return this.http.post<void>(`/api/v1/picks/${encodeURIComponent(pickId)}/like`, {}); }
  unlikePick(pickId: string): Observable<void> { return this.http.delete<void>(`/api/v1/picks/${encodeURIComponent(pickId)}/like`); }

  getPickComments(pickId: string, page = 1, size = 20): Observable<PicksCommentPage> {
    const params = new HttpParams().set('page', page).set('size', size);
    return this.http.get<PicksCommentPage>(`/api/v1/picks/${encodeURIComponent(pickId)}/comments`, { params });
  }

  createPickComment(pickId: string, request: { text: string; parentCommentId?: string; containsSpoiler?: boolean }): Observable<PicksCommentPreview> {
    return this.http.post<PicksCommentPreview>(`/api/v1/picks/${encodeURIComponent(pickId)}/comments`, request);
  }

  createTemplate(request: PicksTemplateCreation): Observable<PicksTemplateDetail> {
    return this.http.post<PicksTemplateDetail>('/api/v1/picks-templates', request);
  }

  likeTemplate(templateId: string): Observable<void> {
    return this.http.post<void>(`/api/v1/picks-templates/${encodeURIComponent(templateId)}/like`, {});
  }

  unlikeTemplate(templateId: string): Observable<void> {
    return this.http.delete<void>(`/api/v1/picks-templates/${encodeURIComponent(templateId)}/like`);
  }

  getTemplateComments(templateId: string, page = 1, size = 20): Observable<PicksCommentPage> {
    const params = new HttpParams().set('page', page).set('size', size);
    return this.http.get<PicksCommentPage>(`/api/v1/picks-templates/${encodeURIComponent(templateId)}/comments`, { params });
  }

  createTemplateComment(templateId: string, request: { text: string; parentCommentId?: string; containsSpoiler?: boolean }): Observable<PicksCommentPreview> {
    return this.http.post<PicksCommentPreview>(`/api/v1/picks-templates/${encodeURIComponent(templateId)}/comments`, request);
  }
}
