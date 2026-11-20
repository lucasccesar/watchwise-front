import '@angular/compiler';
import { DOCUMENT } from '@angular/common';
import { DestroyRef, Injector, runInInjectionContext } from '@angular/core';
import { NEVER, Subject, of } from 'rxjs';
import { describe, expect, it, vi } from 'vitest';
import { ImportEditableField, ImportJob, ImportPreviewItem, ImportsApiService } from '../../data-access/imports-api.service';
import { SettingsImportComponent } from './settings-import.component';

function resolvingJob(reviewRevision = 40): ImportJob {
  return {
    id: 'import-1',
    inputKind: 'PLATFORM_ARCHIVE',
    sourceFormat: 'TRAKT_ZIP',
    platform: 'TRAKT',
    state: 'RESOLVING',
    version: 1,
    previewVersion: 2,
    previewDigest: null,
    createdAt: '',
    updatedAt: '',
    expiresAt: null,
    inventory: null,
    progress: null,
    resolutionProgress: {
      phase: 'MATCHING',
      examinedItems: 40,
      totalItems: 100,
      reviewRequiredCount: 40,
      reviewGeneration: 1,
      reviewRevision,
    },
  };
}

function componentWithApi(api: Partial<ImportsApiService>) {
  const document = {
    visibilityState: 'visible',
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  } as unknown as Document;
  const injector = Injector.create({ providers: [
    { provide: DOCUMENT, useValue: document },
    { provide: DestroyRef, useValue: { onDestroy: vi.fn() } },
    { provide: ImportsApiService, useValue: api },
  ] });
  const component = runInInjectionContext(injector, () => new SettingsImportComponent()) as any;
  return component as {
    job: { set(job: ImportJob): void };
    syncReviewQueue(job: ImportJob): void;
    handleJob(job: ImportJob): void;
    stopPolling(): void;
    issueLabel(item: ImportPreviewItem): string;
    editFields(item: ImportPreviewItem): ImportEditableField[];
    editMaxLength(item: ImportPreviewItem): number | null;
    reviewItems: (() => ImportPreviewItem[]) & { set(items: ImportPreviewItem[]): void };
    reviewHasMore(): boolean;
    preview(): { items: unknown[] } | null;
    reviewPageIndex(): number;
    hasNextReviewPage(): boolean;
  };
}

describe('SettingsImportComponent review queue', () => {
  it('explains list content group conflicts', () => {
    const component = componentWithApi({});
    const item = {
      itemId: 'review-1',
      kind: 'LIST_ITEM',
      decision: 'SKIP_ITEM',
      outcome: 'NORMALIZATION_ISSUE',
      issue: 'LIST_ITEM_CONTENT_GROUP_CONFLICT: This list cannot mix content type groups.',
    } as ImportPreviewItem;

    expect(component.issueLabel(item)).toBe(
      'Este item pertence a outro grupo de conteúdo da lista. Ignore-o para importar os demais itens.',
    );
  });

  it('fetches at most one review page while the job revision stays unchanged', () => {
    const api = { getReviewItems: vi.fn().mockReturnValue(of({
      importId: 'import-1',
      state: 'RESOLVING',
      previewVersion: 2,
      reviewGeneration: 1,
      reviewRevision: 40,
      changes: [],
      nextCursor: 'cursor-40',
      hasMore: true,
    })) };
    const component = componentWithApi(api);
    const job = resolvingJob();
    component.job.set(job);

    component.syncReviewQueue(job);
    component.syncReviewQueue(job);

    expect(api.getReviewItems).toHaveBeenCalledTimes(1);
    expect(component.reviewHasMore()).toBe(true);
  });

  it('fetches again when a status revision advances while the previous page is in flight', () => {
    const firstPage = new Subject<{
      importId: string;
      state: 'RESOLVING';
      previewVersion: number;
      reviewGeneration: number;
      reviewRevision: number;
      changes: [];
      nextCursor: string;
      hasMore: false;
    }>();
    const api = { getReviewItems: vi.fn()
      .mockReturnValueOnce(firstPage)
      .mockReturnValueOnce(of({
        importId: 'import-1', state: 'RESOLVING', previewVersion: 2,
        reviewGeneration: 1, reviewRevision: 41, changes: [],
        nextCursor: 'cursor-41', hasMore: false,
      })) };
    const component = componentWithApi(api);
    const firstJob = resolvingJob(40);
    component.job.set(firstJob);

    component.syncReviewQueue(firstJob);
    const newerJob = resolvingJob(41);
    component.job.set(newerJob);
    component.syncReviewQueue(newerJob);
    firstPage.next({
      importId: 'import-1', state: 'RESOLVING', previewVersion: 2,
      reviewGeneration: 1, reviewRevision: 40, changes: [],
      nextCursor: 'cursor-40', hasMore: false,
    });
    firstPage.complete();
    component.syncReviewQueue(newerJob);

    expect(api.getReviewItems).toHaveBeenCalledTimes(2);
    expect(api.getReviewItems).toHaveBeenNthCalledWith(2, 'import-1', 'cursor-40', 40);
  });

  it('keeps an unseen queue head available after the visible card capacity fills', () => {
    const api = { getReviewItems: vi.fn()
      .mockReturnValueOnce(of({
        importId: 'import-1', state: 'RESOLVING', previewVersion: 2,
        reviewGeneration: 1, reviewRevision: 100, changes: [],
        nextCursor: 'cursor-100', hasMore: false,
      }))
      .mockReturnValueOnce(of({
        importId: 'import-1', state: 'RESOLVING', previewVersion: 2,
        reviewGeneration: 1, reviewRevision: 101,
        changes: [{
          itemId: 'review-1', type: 'REMOVE', revision: 101, displayTitle: null,
          item: null, allowedOperations: [], editableFields: [],
        }],
        nextCursor: 'cursor-101', hasMore: false,
      })) };
    const component = componentWithApi(api);
    const firstJob = resolvingJob(100);
    component.job.set(firstJob);
    component.syncReviewQueue(firstJob);
    const cards = Array.from({ length: 100 }, (_, index) => ({
      itemId: `review-${index + 1}`,
      ordinal: index + 1,
      kind: 'LIST_ITEM',
      decision: 'SKIP_ITEM',
      outcome: 'NORMALIZATION_ISSUE',
      issue: 'Needs review',
      resolvedTarget: null,
      itemTitle: `Item ${index + 1}`,
      itemDescription: null,
      reviewText: null,
      watchedDate: null,
      watchedAt: null,
      datePrecision: null,
      watchScopePreview: null,
      reviewRevision: index + 1,
    } as ImportPreviewItem));
    component.reviewItems.set(cards);
    const newerJob = resolvingJob(101);
    component.job.set(newerJob);
    component.syncReviewQueue(newerJob);

    component.loadMoreReviewItems();
    component.loadMoreReviewItems();
    expect(component.hasNextReviewPage()).toBe(true);
    component.loadMoreReviewItems();

    expect(api.getReviewItems).toHaveBeenCalledTimes(2);
    expect(api.getReviewItems).toHaveBeenNthCalledWith(2, 'import-1', 'cursor-100', 40);
    expect(component.reviewItems()).toHaveLength(99);
  });

  it('keeps the indeterminate progress path from repeatedly loading the full preview', () => {
    const api = {
      getImport: vi.fn().mockReturnValue(NEVER),
      getPreview: vi.fn(),
    };
    const component = componentWithApi(api);
    const job = { ...resolvingJob(), resolutionProgress: null };

    component.handleJob(job);

    expect(api.getPreview).not.toHaveBeenCalled();
    component.stopPolling();
  });

  it('uses the paged preview fallback when the server marks a legacy job', () => {
    const api = {
      getImport: vi.fn().mockReturnValue(NEVER),
      getPreview: vi.fn().mockReturnValue(of({ items: [], page: 0 })),
    };
    const component = componentWithApi(api);
    const job = { ...resolvingJob(), resolutionProgressAvailable: false } as ImportJob & {
      resolutionProgress?: ImportJob['resolutionProgress'];
    };
    delete job.resolutionProgress;

    component.handleJob(job);

    expect(api.getPreview).toHaveBeenCalledOnce();
    component.stopPolling();
  });

  it('uses the field length limits supplied by the review queue', () => {
    const component = componentWithApi({});
    const item = {
      itemId: 'review-1',
      kind: 'LIST_ITEM',
      editableFields: [{ field: 'DESCRIPTION', maxLength: 675 }],
    } as ImportPreviewItem;

    expect(component.editFields(item)).toEqual(['DESCRIPTION']);
    expect(component.editMaxLength(item)).toBe(675);
  });

  it('keeps only the current review page in the rendered preview', () => {
    const card = (ordinal: number) => ({
      itemId: `review-${ordinal}`,
      ordinal,
      kind: 'LIST_ITEM',
      decision: null,
      outcome: 'NORMALIZATION_ISSUE',
      issue: 'Needs review',
      resolvedTarget: null,
      itemTitle: `List item ${ordinal}`,
      itemDescription: null,
      reviewText: null,
      watchedDate: null,
      watchedAt: null,
      datePrecision: null,
      watchScopePreview: null,
    } as ImportPreviewItem);
    const change = (ordinal: number) => ({
      itemId: `review-${ordinal}`,
      type: 'UPSERT' as const,
      revision: ordinal,
      displayTitle: null,
      item: card(ordinal),
      allowedOperations: ['SKIP_ITEM' as const],
      editableFields: [],
    });
    const api = {
      getReviewItems: vi.fn()
        .mockReturnValueOnce(of({
          importId: 'import-1', state: 'RESOLVING', previewVersion: 2,
          reviewGeneration: 1, reviewRevision: 40,
          changes: Array.from({ length: 40 }, (_, index) => change(index + 1)),
          nextCursor: 'cursor-40', hasMore: true,
        }))
        .mockReturnValueOnce(of({
          importId: 'import-1', state: 'RESOLVING', previewVersion: 2,
          reviewGeneration: 1, reviewRevision: 41,
          changes: [change(41)], nextCursor: 'cursor-41', hasMore: false,
        })),
    };
    const component = componentWithApi(api);
    const job = resolvingJob();
    component.job.set(job);

    component.syncReviewQueue(job);
    expect(component.preview()?.items).toHaveLength(40);
    component.loadMoreReviewItems();

    expect(component.reviewPageIndex()).toBe(1);
    expect(component.preview()?.items).toHaveLength(1);
    expect(api.getReviewItems).toHaveBeenNthCalledWith(2, 'import-1', 'cursor-40', 40);
  });
});
