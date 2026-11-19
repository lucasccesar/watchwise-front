import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';

export type ImportInputKind = 'PLATFORM_ARCHIVE' | 'SINGLE_LIST' | 'SINGLE_WATCHLIST';
export type ImportPlatform = 'TRAKT' | 'LETTERBOXD';
export type ImportSourceFormat = 'TRAKT_ZIP' | 'LETTERBOXD_ZIP' | 'TRAKT_JSON' | 'LETTERBOXD_CSV';
export type ImportJobState =
  | 'ANALYZING'
  | 'AWAITING_SELECTION'
  | 'RESOLVING'
  | 'READY'
  | 'IMPORTING'
  | 'COMPLETED'
  | 'COMPLETED_WITH_WARNINGS'
  | 'FAILED'
  | 'CANCELLED'
  | 'EXPIRED';

export interface ImportCategoryInventory {
  kind: string;
  count: number;
  available: boolean;
}

export interface ImportListInventory {
  sourceId: string;
  name: string;
  description: string | null;
  itemCount: number;
  coverage: string | null;
}

export interface ImportInventory {
  categories: ImportCategoryInventory[];
  lists: ImportListInventory[];
}

export interface ImportProgress {
  totalItems: number;
  processedItems: number;
  appliedItems: number;
  skippedItems: number;
}

export type ImportResolutionPhase = 'MATCHING' | 'VALIDATING' | 'RETRYING' | 'WAITING_FOR_REVIEW' | 'DONE';

export interface ImportResolutionProgress {
  phase: ImportResolutionPhase;
  examinedItems: number;
  totalItems: number;
  reviewRequiredCount: number;
  reviewGeneration: number;
  reviewRevision: number;
}

export interface ImportJob {
  id: string;
  inputKind: ImportInputKind;
  sourceFormat: ImportSourceFormat;
  platform: ImportPlatform | null;
  state: ImportJobState;
  version: number;
  previewVersion: number;
  previewDigest: string | null;
  createdAt: string;
  updatedAt: string;
  expiresAt: string | null;
  inventory: ImportInventory | null;
  resolutionProgressAvailable?: boolean;
  progress: ImportProgress | null;
  resolutionProgress?: ImportResolutionProgress | null;
}

export interface ImportWatchScopePreview {
  available: boolean;
  issue: string | null;
  scheduleVersion: string | null;
  validUntil: string | null;
  releaseComplete: boolean | null;
  episodes: Array<{ seasonNumber: number; episodeNumber: number }>;
}

export interface ImportEditableFieldOption {
  field: ImportEditableField;
  maxLength: number | null;
}

export interface ImportPreviewItem {
  itemId: string;
  ordinal: number;
  kind: string;
  parentItemId: string | null;
  targetType: string | null;
  decision: string | null;
  outcome: string;
  issue: string | null;
  watchedDate: string | null;
  watchedAt: string | null;
  datePrecision: 'TIMESTAMP' | 'DAY' | 'UNKNOWN' | null;
  resolvedTarget: unknown;
  itemTitle: string | null;
  itemTitleLength: number | null;
  itemTitleTruncated: boolean | null;
  itemDescription: string | null;
  itemDescriptionLength: number | null;
  itemDescriptionTruncated: boolean | null;
  reviewText: string | null;
  reviewTextLength: number | null;
  reviewTextTruncated: boolean | null;
  watchScopePreview: ImportWatchScopePreview | null;
  reviewRevision?: number | null;
  allowedOperations?: ImportDecision[];
  editableFields?: ImportEditableFieldOption[];
}

export interface ImportPage<T> {
  importId: string;
  state: ImportJobState;
  previewVersion: number;
  previewDigest: string | null;
  items: T[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
}

export interface ImportReviewChange {
  itemId: string;
  type: 'UPSERT' | 'REMOVE';
  revision: number;
  displayTitle: string | null;
  item: ImportPreviewItem | null;
  allowedOperations: ImportDecision[];
  editableFields: ImportEditableFieldOption[];
}

export interface ImportReviewPage {
  importId: string;
  state: ImportJobState;
  previewVersion: number;
  reviewGeneration: number;
  reviewRevision: number;
  changes: ImportReviewChange[];
  nextCursor: string | null;
  hasMore: boolean;
}

export interface ImportSelectionRequest {
  previewVersion: number;
  history: boolean;
  watchlist: boolean;
  listIds: string[];
  metadata?: Record<string, unknown>;
}

export interface ImportEpisodeReference {
  type: 'EPISODE';
  seriesTmdbId: string;
  seasonNumber: number;
  episodeNumber: number;
}

export type ImportEditableField =
  | 'TITLE'
  | 'DESCRIPTION'
  | 'RELEASE_YEAR'
  | 'RATING'
  | 'REVIEW'
  | 'WATCHED_DATE'
  | 'WATCHED_IN_THEATER'
  | 'COVER_IMAGE'
  | 'ELIGIBILITY_START'
  | 'ELIGIBILITY_END'
  | 'CATEGORY_NAME';

export type ImportDecision =
  | 'RESOLVE_TARGET'
  | 'SKIP_ITEM'
  | 'EDIT_FIELD'
  | 'ASSIGN_PASS'
  | 'CONFIRM_WATCH_SCOPE'
  | 'LINK_IMPORTED_LIST'
  | 'RESOLVE_REVIEW_ORDER'
  | 'REMOVE_NOMINEE'
  | 'REMOVE_CATEGORY'
  | 'SET_CATEGORY_OPEN';

export type ImportResolutionOperation =
  | { operation: 'RESOLVE_TARGET'; itemId: string; candidateId: string }
  | { operation: 'SKIP_ITEM'; itemId: string }
  | { operation: 'EDIT_FIELD'; itemId: string; field: ImportEditableField; value: string }
  | { operation: 'ASSIGN_PASS'; itemId: string; passNumber: number }
  | {
      operation: 'CONFIRM_WATCH_SCOPE';
      itemId: string;
      scope: 'ALL_RELEASED_EPISODES' | 'SPECIFIC_EPISODES';
      scheduleVersion: string;
      episodeReferences: ImportEpisodeReference[];
    }
  | { operation: 'LINK_IMPORTED_LIST'; itemId: string; targetListId: string }
  | { operation: 'RESOLVE_REVIEW_ORDER'; itemId: string; beforeItemId: string }
  | { operation: 'REMOVE_NOMINEE'; itemId: string }
  | { operation: 'REMOVE_CATEGORY'; itemId: string }
  | { operation: 'SET_CATEGORY_OPEN'; itemId: string; open: boolean };

@Injectable({ providedIn: 'root' })
export class ImportsApiService {
  private readonly baseUrl = '/api/v1/imports';

  constructor(private readonly http: HttpClient) {}

  createImport(
    file: File,
    options: {
      inputKind: ImportInputKind;
      sourceFormat: ImportSourceFormat;
      platform: ImportPlatform;
      sourceAccountId: string | null;
      timeZone: string;
    },
  ): Observable<ImportJob> {
    const form = new FormData();
    form.append('file', file);
    let params = new HttpParams()
      .set('inputKind', options.inputKind)
      .set('sourceFormat', options.sourceFormat)
      .set('platform', options.platform)
      .set('timeZone', options.timeZone);
    if (options.sourceAccountId) params = params.set('sourceAccountId', options.sourceAccountId);
    return this.http.post<ImportJob>(this.baseUrl, form, { params, withCredentials: true });
  }

  getImport(importId: string): Observable<ImportJob> {
    return this.http.get<ImportJob>(`${this.baseUrl}/${encodeURIComponent(importId)}`, { withCredentials: true });
  }

  selectImport(importId: string, selection: ImportSelectionRequest): Observable<ImportJob> {
    return this.http.put<ImportJob>(`${this.baseUrl}/${encodeURIComponent(importId)}/selection`, selection, { withCredentials: true });
  }

  getPreview(importId: string, pageIndex = 0, size = 20): Observable<ImportPage<ImportPreviewItem>> {
    const params = new HttpParams().set('page', this.apiPageNumber(pageIndex)).set('size', size);
    return this.http.get<ImportPage<ImportPreviewItem>>(`${this.baseUrl}/${encodeURIComponent(importId)}/preview`, { params, withCredentials: true });
  }

  resolve(importId: string, previewVersion: number, operations: ImportResolutionOperation[], expectedReviewRevisions?: Record<string, number>): Observable<ImportJob> {
    return this.http.patch<ImportJob>(`${this.baseUrl}/${encodeURIComponent(importId)}/resolutions`, {
      previewVersion,
      operations,
      ...(expectedReviewRevisions ? { expectedReviewRevisions } : {}),
    }, { withCredentials: true });
  }

  getReviewItems(importId: string, after: string | null, limit = 40): Observable<ImportReviewPage> {
    let params = new HttpParams().set('limit', limit);
    if (after) params = params.set('after', after);
    return this.http.get<ImportReviewPage>(`${this.baseUrl}/${encodeURIComponent(importId)}/review-items`, {
      params,
      withCredentials: true,
    });
  }

  commit(importId: string, previewVersion: number, digest: string): Observable<ImportJob> {
    return this.http.post<ImportJob>(`${this.baseUrl}/${encodeURIComponent(importId)}/commit`, { previewVersion, digest }, { withCredentials: true });
  }

  cancel(importId: string): Observable<ImportJob> {
    return this.http.post<ImportJob>(`${this.baseUrl}/${encodeURIComponent(importId)}/cancel`, null, { withCredentials: true });
  }

  getResult(importId: string, pageIndex = 0, size = 20): Observable<ImportPage<ImportPreviewItem>> {
    const params = new HttpParams().set('page', this.apiPageNumber(pageIndex)).set('size', size);
    return this.http.get<ImportPage<ImportPreviewItem>>(`${this.baseUrl}/${encodeURIComponent(importId)}/result`, { params, withCredentials: true });
  }

  retry(importId: string): Observable<ImportJob> {
    return this.http.post<ImportJob>(`${this.baseUrl}/${encodeURIComponent(importId)}/retry`, null, { withCredentials: true });
  }

  private apiPageNumber(pageIndex: number): number {
    return pageIndex <= 0 ? 0 : pageIndex + 1;
  }
}
