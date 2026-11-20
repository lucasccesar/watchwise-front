import { DOCUMENT } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { EMPTY, Subscription, catchError, exhaustMap, timer } from 'rxjs';
import { DialogBackdropComponent } from '../../../../shared/components/dialog-backdrop/dialog-backdrop.component';
import { ModalFocusDirective } from '../../../../shared/directives/modal-focus.directive';
import {
  ImportEditableField,
  ImportEpisodeReference,
  ImportInputKind,
  ImportInventory,
  ImportJob,
  ImportJobState,
  ImportPage,
  ImportPlatform,
  ImportPreviewItem,
  ImportReviewPage,
  ImportResolutionOperation,
  ImportResolutionPhase,
  ImportDecision,
  ImportSourceFormat,
  ImportsApiService,
} from '../../data-access/imports-api.service';
import { importsMessages } from '../../i18n/imports.messages';

interface ImportCandidate {
  candidateId: string;
  target: Record<string, unknown>;
}

interface EditDraft {
  field: ImportEditableField;
  value: string;
}

const EDITABLE_FIELDS: Record<string, ImportEditableField[]> = {
  DIARY_EVENT: ['WATCHED_DATE', 'RATING', 'REVIEW'],
  REVIEW: ['REVIEW'],
  CURRENT_RATING: ['RATING', 'REVIEW'],
  SERIES_EXPANSION: ['REVIEW'],
  LIST_METADATA: ['TITLE', 'DESCRIPTION', 'COVER_IMAGE'],
  LIST_ITEM: ['DESCRIPTION'],
};

@Component({
  selector: 'app-settings-import',
  standalone: true,
  templateUrl: './settings-import.component.html',
  styleUrl: './settings-import.component.css',
  imports: [DialogBackdropComponent, ModalFocusDirective],
})
export class SettingsImportComponent {
  private readonly destroyRef = inject(DestroyRef);
  private readonly document = inject(DOCUMENT);
  private readonly importsApi = inject(ImportsApiService);
  private polling: Subscription | null = null;
  private pollingId: string | null = null;
  private reviewCursor: string | null = null;
  private reviewImportId: string | null = null;
  private reviewGeneration: number | null = null;
  private reviewRevision = -1;
  private reviewLatestHeadRevision = -1;
  private reviewRequestedHeadRevision = -1;
  private maxVisibleReviewItems = 100;
  private readonly onVisibilityChange = (): void => {
    const job = this.job();
    if (this.document.visibilityState === 'hidden') {
      this.pausePolling();
      return;
    }
    if (job && this.shouldPollJob(job) && this.pollingId === job.id) {
      this.watchForProgress(job.id);
    }
  };
  protected readonly copy = importsMessages['pt-BR'];

  protected readonly inputKind = signal<ImportInputKind>('PLATFORM_ARCHIVE');
  protected readonly platform = signal<ImportPlatform>('LETTERBOXD');
  protected readonly file = signal<File | null>(null);
  protected readonly sourceAccountId = signal('');
  protected readonly selectionSourceAccount = signal('');
  protected readonly historySelected = signal(true);
  protected readonly watchlistSelected = signal(false);
  protected readonly selectedListIds = signal<string[]>([]);
  protected readonly job = signal<ImportJob | null>(null);
  protected readonly preview = signal<ImportPage<ImportPreviewItem> | null>(null);
  protected readonly result = signal<ImportPage<ImportPreviewItem> | null>(null);
  protected readonly reviewItems = signal<ImportPreviewItem[]>([]);
  protected readonly reviewPageIndex = signal(0);
  protected readonly reviewHasMore = signal(false);
  protected readonly reviewLoading = signal(false);
  protected readonly previewPage = signal(0);
  protected readonly resultPage = signal(0);
  protected readonly busy = signal(false);
  protected readonly resultLoading = signal(false);
  protected readonly error = signal('');
  protected readonly editDrafts = signal<Record<string, EditDraft>>({});
  protected readonly passDrafts = signal<Record<string, number>>({});
  protected readonly listTargetDrafts = signal<Record<string, string>>({});
  protected readonly reviewOrderDrafts = signal<Record<string, string>>({});
  protected readonly selectionInventory = computed(() => this.job()?.inventory ?? null);
  protected readonly importProgressPercentage = computed(() => {
    const progress = this.job()?.progress;
    return progress && progress.totalItems > 0
      ? Math.floor(progress.processedItems / progress.totalItems * 100)
      : null;
  });
  protected readonly resolutionProgressPercentage = computed(() => {
    const progress = this.job()?.resolutionProgress;
    return progress?.phase === 'MATCHING' && progress.totalItems > 0
      ? Math.floor(progress.examinedItems / progress.totalItems * 100)
      : null;
  });
  protected readonly fileAccept = computed(() => {
    if (this.inputKind() === 'PLATFORM_ARCHIVE') return '.zip,application/zip,application/x-zip-compressed';
    if (this.platform() === 'TRAKT') return '.json,application/json';
    return '.csv,text/csv';
  });

  constructor() {
    this.document.addEventListener('visibilitychange', this.onVisibilityChange);
    this.destroyRef.onDestroy(() => this.document.removeEventListener('visibilitychange', this.onVisibilityChange));
  }

  protected setInputKind(value: string): void {
    if (value === 'PLATFORM_ARCHIVE' || value === 'SINGLE_LIST' || value === 'SINGLE_WATCHLIST') {
      this.inputKind.set(value);
      this.file.set(null);
      this.resetFileSelection();
      this.error.set('');
    }
  }

  protected setPlatform(value: string): void {
    if (value === 'TRAKT' || value === 'LETTERBOXD') {
      this.platform.set(value);
      this.file.set(null);
      this.resetFileSelection();
      this.error.set('');
    }
  }

  protected onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.file.set(input.files?.[0] ?? null);
    this.error.set('');
  }

  protected upload(event: SubmitEvent): void {
    event.preventDefault();
    if (this.busy()) return;
    const file = this.file();
    if (!file) {
      this.error.set(this.copy.errors.chooseFile);
      return;
    }
    if (file.size > 50 * 1024 * 1024) {
      this.error.set(this.copy.errors.fileTooLarge);
      return;
    }
    const extension = this.expectedExtension();
    if (!file.name.toLowerCase().endsWith(extension)) {
      this.error.set(this.copy.errors.wrongExtension.replace('{extension}', extension.toUpperCase()));
      return;
    }

    this.busy.set(true);
    this.error.set('');
    this.preview.set(null);
    this.result.set(null);
    this.importsApi.createImport(file, {
      inputKind: this.inputKind(),
      sourceFormat: this.sourceFormat(),
      platform: this.platform(),
      sourceAccountId: this.sourceAccountId().trim() || null,
      timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC',
    }).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (job) => {
        this.busy.set(false);
        this.handleJob(job);
      },
      error: (error: unknown) => {
        this.busy.set(false);
        this.error.set(this.errorMessage(error));
      },
    });
  }

  protected selectArchiveData(event: SubmitEvent): void {
    event.preventDefault();
    const job = this.job();
    if (!job || this.busy() || !job.inventory) return;
    if (!this.historySelected() && !this.watchlistSelected() && !this.selectedListIds().length) {
      this.error.set(this.copy.errors.noSelection);
      return;
    }
    const account = this.sourceAccountId().trim() || this.selectionSourceAccount().trim();
    if (!account) {
      this.error.set(this.copy.errors.missingAccountId);
      return;
    }

    this.busy.set(true);
    this.error.set('');
    this.importsApi.selectImport(job.id, {
      previewVersion: job.previewVersion,
      history: this.historySelected(),
      watchlist: this.watchlistSelected(),
      listIds: this.selectedListIds(),
      ...(!this.sourceAccountId().trim() ? { metadata: { sourceAccount: account } } : {}),
    }).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (updatedJob) => {
        this.busy.set(false);
        this.handleJob(updatedJob);
      },
      error: (error: unknown) => {
        this.busy.set(false);
        this.error.set(this.errorMessage(error));
        if (error instanceof HttpErrorResponse && error.status === 409) this.refreshJob();
      },
    });
  }

  protected toggleList(sourceId: string, checked: boolean): void {
    this.selectedListIds.update((current) => checked
      ? current.includes(sourceId) ? current : [...current, sourceId]
      : current.filter((id) => id !== sourceId));
  }

  protected isSelectedList(sourceId: string): boolean {
    return this.selectedListIds().includes(sourceId);
  }

  protected loadPreviewPage(page: number): void {
    const job = this.job();
    if (!job || this.busy()) return;
    this.importsApi.getPreview(job.id, page).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (preview) => {
        this.preview.set(preview);
        this.previewPage.set(preview.page);
        this.error.set('');
      },
      error: (error: unknown) => this.error.set(this.errorMessage(error)),
    });
  }

  protected loadMoreReviewItems(): void {
    const job = this.job();
    if (!job?.resolutionProgress) return;
    const nextPageStart = (this.reviewPageIndex() + 1) * 40;
    if (this.reviewItems().length > nextPageStart) {
      this.reviewPageIndex.update((page) => page + 1);
      this.publishReviewPreview(job);
      return;
    }
    if (this.reviewItems().length >= this.maxVisibleReviewItems) {
      this.maxVisibleReviewItems += 40;
    }
    this.fetchReviewChanges(job, true);
  }

  protected showPreviousReviewItems(): void {
    if (this.reviewPageIndex() <= 0) return;
    this.reviewPageIndex.update((page) => page - 1);
    const job = this.job();
    if (job) this.publishReviewPreview(job);
  }

  protected hasNextReviewPage(): boolean {
    const statusHead = this.job()?.resolutionProgress?.reviewRevision ?? -1;
    return this.reviewItems().length > (this.reviewPageIndex() + 1) * 40
      || this.reviewHasMore()
      || statusHead > this.reviewRequestedHeadRevision;
  }

  protected reviewPageLabel(): string {
    return this.copy.reviewQueue.page.replace('{page}', String(this.reviewPageIndex() + 1));
  }

  protected loadResultPage(page: number): void {
    const job = this.job();
    if (!job || this.busy()) return;
    this.resultLoading.set(true);
    this.importsApi.getResult(job.id, page).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (result) => {
        this.resultLoading.set(false);
        this.result.set(result);
        this.resultPage.set(result.page);
        this.error.set('');
      },
      error: (error: unknown) => {
        this.resultLoading.set(false);
        this.error.set(this.errorMessage(error));
      },
    });
  }

  protected get progressReturnFocus(): HTMLElement | null {
    return this.document.getElementById('settings-import-status');
  }

  protected candidatesFor(item: ImportPreviewItem): ImportCandidate[] {
    const resolved = this.record(item.resolvedTarget);
    const candidates = resolved?.['candidates'];
    if (!Array.isArray(candidates)) return [];
    return candidates.flatMap((entry): ImportCandidate[] => {
      const candidate = this.record(entry);
      const candidateId = candidate?.['candidateId'];
      const target = this.record(candidate?.['target']);
      return typeof candidateId === 'string' && target ? [{ candidateId, target }] : [];
    });
  }

  protected candidateLabel(candidate: ImportCandidate): string {
    if (candidate.target['kind'] === 'PERSON') {
      return this.copy.candidates.person.replace('{id}', String(candidate.target['personTmdbId'] ?? ''));
    }
    const content = this.record(candidate.target['content']);
    if (!content) return this.copy.candidates.identifiedContent;
    const type = String(content['type'] ?? 'conteúdo').toLowerCase();
    if (type === 'episode') {
      return this.copy.candidates.episode
        .replace('{season}', String(content['seasonNumber'] ?? '?'))
        .replace('{episode}', String(content['episodeNumber'] ?? '?'))
        .replace('{id}', String(content['seriesTmdbId'] ?? ''));
    }
    const contentType = type === 'movie' ? this.copy.candidates.movie : type === 'series' ? this.copy.candidates.series : this.copy.candidates.content;
    return this.copy.candidates.contentWithId.replace('{type}', contentType).replace('{id}', String(content['tmdbId'] ?? ''));
  }

  protected resolveCandidate(item: ImportPreviewItem, candidateId: string): void {
    this.performResolution({ operation: 'RESOLVE_TARGET', itemId: item.itemId, candidateId });
  }

  protected skipItem(item: ImportPreviewItem): void {
    this.performResolution({ operation: 'SKIP_ITEM', itemId: item.itemId });
  }

  protected canConfirmWatchScope(item: ImportPreviewItem): boolean {
    const scope = item.watchScopePreview;
    return !!scope?.available && !!scope.scheduleVersion && !!scope.episodes.length && !!this.seriesId(item);
  }

  protected confirmWatchScope(item: ImportPreviewItem): void {
    const scope = item.watchScopePreview;
    const seriesTmdbId = this.seriesId(item);
    if (!scope?.scheduleVersion || !scope.episodes.length || !seriesTmdbId) return;
    const episodeReferences: ImportEpisodeReference[] = scope.episodes.map((episode) => ({
      type: 'EPISODE',
      seriesTmdbId,
      seasonNumber: episode.seasonNumber,
      episodeNumber: episode.episodeNumber,
    }));
    this.performResolution({
      operation: 'CONFIRM_WATCH_SCOPE',
      itemId: item.itemId,
      scope: 'ALL_RELEASED_EPISODES',
      scheduleVersion: scope.scheduleVersion,
      episodeReferences,
    });
  }

  protected editFields(item: ImportPreviewItem): ImportEditableField[] {
    if (item.editableFields) return item.editableFields.map((field) => field.field);
    return EDITABLE_FIELDS[item.kind] ?? [];
  }

  protected draftField(item: ImportPreviewItem): ImportEditableField {
    return this.editDrafts()[item.itemId]?.field ?? this.editFields(item)[0] ?? 'REVIEW';
  }

  protected draftValue(item: ImportPreviewItem): string {
    const draft = this.editDrafts()[item.itemId];
    return draft?.value ?? this.initialEditValue(item, this.draftField(item));
  }

  protected setDraftField(item: ImportPreviewItem, value: string): void {
    const field = this.editFields(item).find((option) => option === value);
    if (!field) return;
    this.editDrafts.update((drafts) => ({
      ...drafts,
      [item.itemId]: { field, value: this.initialEditValue(item, field) },
    }));
  }

  protected setDraftValue(item: ImportPreviewItem, value: string): void {
    const field = this.draftField(item);
    this.editDrafts.update((drafts) => ({ ...drafts, [item.itemId]: { field, value } }));
  }

  protected isLongEdit(item: ImportPreviewItem): boolean {
    return this.draftField(item) === 'REVIEW' || this.draftField(item) === 'DESCRIPTION';
  }

  protected editInputType(item: ImportPreviewItem): string {
    const field = this.draftField(item);
    if (field === 'WATCHED_DATE' || field === 'ELIGIBILITY_START' || field === 'ELIGIBILITY_END') return 'date';
    if (field === 'RATING' || field === 'RELEASE_YEAR') return 'number';
    if (field === 'COVER_IMAGE') return 'url';
    return 'text';
  }

  protected editMaxLength(item: ImportPreviewItem): number | null {
    const field = this.draftField(item);
    const serverOption = item.editableFields?.find((option) => option.field === field);
    if (serverOption?.maxLength != null) return serverOption.maxLength;
    if (item.editableFields?.some((option) => option.field === field)) return null;
    switch (field) {
      case 'REVIEW': return 20_000;
      case 'TITLE': return 255;
      case 'DESCRIPTION': return 400;
      default: return null;
    }
  }

  protected editFieldLabel(field: ImportEditableField): string {
    return this.copy.editFields[field];
  }

  protected resolutionReviewCount(count: number): string {
    return this.copy.resolutionProgress.reviewCount.replace('{count}', String(count));
  }

  protected resolutionPhaseLabel(phase: ImportResolutionPhase): string {
    switch (phase) {
      case 'MATCHING': return this.copy.resolutionProgress.matching;
      case 'VALIDATING': return this.copy.resolutionProgress.validating;
      case 'RETRYING': return this.copy.resolutionProgress.retrying;
      case 'WAITING_FOR_REVIEW': return this.copy.resolutionProgress.waiting;
      case 'DONE': return this.copy.resolutionProgress.done;
    }
  }

  protected saveEdit(event: SubmitEvent, item: ImportPreviewItem): void {
    event.preventDefault();
    const field = this.draftField(item);
    this.performResolution({ operation: 'EDIT_FIELD', itemId: item.itemId, field, value: this.draftValue(item) });
  }

  protected passNumber(item: ImportPreviewItem): number {
    return this.passDrafts()[item.itemId] ?? 1;
  }

  protected setPassNumber(item: ImportPreviewItem, value: string): void {
    const number = Number(value);
    if (Number.isInteger(number) && number > 0) this.passDrafts.update((drafts) => ({ ...drafts, [item.itemId]: number }));
  }

  protected assignPass(item: ImportPreviewItem): void {
    this.performResolution({ operation: 'ASSIGN_PASS', itemId: item.itemId, passNumber: this.passNumber(item) });
  }

  protected listTarget(item: ImportPreviewItem): string {
    return this.listTargetDrafts()[item.itemId] ?? '';
  }

  protected setListTarget(item: ImportPreviewItem, value: string): void {
    this.listTargetDrafts.update((drafts) => ({ ...drafts, [item.itemId]: value }));
  }

  protected linkList(item: ImportPreviewItem): void {
    const targetListId = this.listTarget(item).trim();
    if (targetListId) this.performResolution({ operation: 'LINK_IMPORTED_LIST', itemId: item.itemId, targetListId });
  }

  protected reviewOrderTarget(item: ImportPreviewItem): string {
    return this.reviewOrderDrafts()[item.itemId] ?? '';
  }

  protected setReviewOrderTarget(item: ImportPreviewItem, value: string): void {
    this.reviewOrderDrafts.update((drafts) => ({ ...drafts, [item.itemId]: value }));
  }

  protected reviewOrderOptions(item: ImportPreviewItem): ImportPreviewItem[] {
    return (this.preview()?.items ?? []).filter((candidate) => candidate.itemId !== item.itemId && candidate.kind === item.kind);
  }

  protected resolveReviewOrder(item: ImportPreviewItem): void {
    const beforeItemId = this.reviewOrderTarget(item);
    if (beforeItemId) this.performResolution({ operation: 'RESOLVE_REVIEW_ORDER', itemId: item.itemId, beforeItemId });
  }

  protected removeTemplateItem(item: ImportPreviewItem): void {
    const operation: ImportResolutionOperation = item.kind === 'TEMPLATE_CATEGORY'
      ? { operation: 'REMOVE_CATEGORY', itemId: item.itemId }
      : { operation: 'REMOVE_NOMINEE', itemId: item.itemId };
    this.performResolution(operation);
  }

  protected setTemplateCategoryOpen(item: ImportPreviewItem): void {
    this.performResolution({ operation: 'SET_CATEGORY_OPEN', itemId: item.itemId, open: true });
  }

  protected kindLabel(kind: string): string {
    const label = this.copy.kinds[kind as keyof typeof this.copy.kinds];
    return typeof label === 'string' ? label : this.copy.kinds.record;
  }

  protected outcomeLabel(outcome: string): string {
    const label = this.copy.outcomes[outcome as keyof typeof this.copy.outcomes];
    return typeof label === 'string' ? label : this.copy.outcomes.processed;
  }

  protected issueLabel(item: ImportPreviewItem): string {
    if (item.outcome === 'SKIPPED') return this.copy.resolutions.skipped;
    if (item.issue?.startsWith('LIST_ITEM_CONTENT_GROUP_CONFLICT')) {
      return this.copy.resolutions.listContentGroupConflict;
    }
    const label = item.decision
      ? this.copy.resolutions[item.decision as keyof typeof this.copy.resolutions]
      : undefined;
    if (label) return label;
    return item.outcome === 'NORMALIZATION_ISSUE'
      ? this.copy.resolutions.normalizationIssue
      : this.copy.resolutions.generic;
  }

  protected isTruncated(item: ImportPreviewItem): boolean {
    return !!item.itemTitleTruncated || !!item.itemDescriptionTruncated || !!item.reviewTextTruncated;
  }

  protected stateLabel(state: ImportJobState): string {
    return this.copy.states[state].label;
  }

  protected stateDescription(state: ImportJobState): string {
    return this.copy.states[state].description;
  }

  protected canResolveItems(job: ImportJob): boolean {
    return job.state === 'RESOLVING'
      || (job.state === 'READY' && (job.resolutionProgress?.reviewRequiredCount ?? 0) > 0);
  }

  protected canCancel(state: ImportJobState): boolean {
    return ['ANALYZING', 'AWAITING_SELECTION', 'RESOLVING', 'READY'].includes(state);
  }

  protected hasSelectionAccount(): boolean {
    return !this.sourceAccountId().trim();
  }

  protected historyCount(inventory: ImportInventory): number {
    const excluded = new Set(['WATCHLIST_ITEM', 'LIST_METADATA', 'LIST_ITEM']);
    return inventory.categories.filter((category) => category.available && !excluded.has(category.kind))
      .reduce((total, category) => total + category.count, 0);
  }

  protected watchlistCount(inventory: ImportInventory): number {
    return inventory.categories.find((category) => category.kind === 'WATCHLIST_ITEM')?.count ?? 0;
  }

  protected expectedExtension(): string {
    if (this.inputKind() === 'PLATFORM_ARCHIVE') return '.zip';
    return this.platform() === 'TRAKT' ? '.json' : '.csv';
  }

  protected startAnotherImport(): void {
    this.stopPolling();
    this.resetReviewQueue();
    this.resetFileSelection();
    this.inputKind.set('PLATFORM_ARCHIVE');
    this.platform.set('LETTERBOXD');
    this.file.set(null);
    this.sourceAccountId.set('');
    this.selectionSourceAccount.set('');
    this.historySelected.set(true);
    this.watchlistSelected.set(false);
    this.selectedListIds.set([]);
    this.job.set(null);
    this.preview.set(null);
    this.result.set(null);
    this.resultLoading.set(false);
    this.previewPage.set(0);
    this.resultPage.set(0);
    this.error.set('');
    this.editDrafts.set({});
    this.passDrafts.set({});
    this.listTargetDrafts.set({});
    this.reviewOrderDrafts.set({});
  }

  protected cancelImport(): void {
    const job = this.job();
    if (!job || this.busy()) return;
    this.busy.set(true);
    this.error.set('');
    this.importsApi.cancel(job.id).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (updatedJob) => {
        this.busy.set(false);
        this.handleJob(updatedJob);
      },
      error: (error: unknown) => {
        this.busy.set(false);
        this.error.set(this.errorMessage(error));
      },
    });
  }

  protected retryImport(): void {
    const job = this.job();
    if (!job || job.state !== 'FAILED' || this.busy()) return;
    this.busy.set(true);
    this.error.set('');
    this.importsApi.retry(job.id).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (updatedJob) => {
        this.busy.set(false);
        this.preview.set(null);
        this.result.set(null);
        this.handleJob(updatedJob);
      },
      error: (error: unknown) => {
        this.busy.set(false);
        this.error.set(this.errorMessage(error));
      },
    });
  }

  protected refreshJob(): void {
    const job = this.job();
    if (!job || this.busy()) return;
    if (this.pollingId === job.id) this.pausePolling();
    this.importsApi.getImport(job.id).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (updatedJob) => this.handleJob(updatedJob),
      error: (error: unknown) => {
        this.error.set(this.errorMessage(error));
        if (this.pollingId === job.id && this.shouldPollJob(job)) {
          this.watchForProgress(job.id);
        }
      },
    });
  }

  protected commitImport(): void {
    const job = this.job();
    const preview = this.preview();
    if (!job || job.state !== 'READY' || !preview?.previewDigest || this.busy()) return;
    this.busy.set(true);
    this.error.set('');
    this.importsApi.commit(job.id, preview.previewVersion, preview.previewDigest)
      .pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
        next: (updatedJob) => {
          this.busy.set(false);
          this.handleJob(updatedJob);
        },
        error: (error: unknown) => {
          this.busy.set(false);
          this.error.set(this.errorMessage(error));
          if (error instanceof HttpErrorResponse && error.status === 409) this.refreshJob();
        },
      });
  }

  private performResolution(operation: ImportResolutionOperation): void {
    const job = this.job();
    if (!job || (job.state !== 'RESOLVING' && job.state !== 'READY') || this.busy()) return;
    const reviewItem = this.reviewItems().find((item) => item.itemId === operation.itemId);
    const expectedReviewRevisions = reviewItem?.reviewRevision != null
      ? { [reviewItem.itemId]: reviewItem.reviewRevision }
      : undefined;
    this.busy.set(true);
    this.error.set('');
    this.importsApi.resolve(job.id, job.previewVersion, [operation], expectedReviewRevisions)
      .pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
        next: (updatedJob) => {
          this.busy.set(false);
          this.handleJob(updatedJob);
        },
        error: (error: unknown) => {
          this.busy.set(false);
          this.error.set(this.errorMessage(error));
          if (error instanceof HttpErrorResponse && error.status === 409) this.refreshJob();
        },
      });
  }

  private handleJob(job: ImportJob): void {
    this.job.set(job);
    if (job.state === 'RESOLVING' && job.resolutionProgress) this.syncReviewQueue(job);
    if (this.shouldPollJob(job)) {
      this.watchForProgress(job.id);
      if (job.state === 'RESOLVING' && !this.hasResolutionProgressCapability(job)) this.loadPreviewPage(0);
      return;
    }
    this.stopPolling();
    if (job.state === 'AWAITING_SELECTION') {
      const inventory = job.inventory;
      if (inventory) {
        const historyCount = this.historyCount(inventory);
        const watchlistCount = this.watchlistCount(inventory);
        this.historySelected.set(historyCount > 0);
        this.watchlistSelected.set(watchlistCount > 0);
        this.selectedListIds.set([]);
      }
      return;
    }
    if (job.state === 'READY') {
      if (job.resolutionProgress?.reviewRequiredCount) this.syncReviewQueue(job);
      else this.loadPreviewPage(0);
      return;
    }
  }

  private shouldPollJob(job: ImportJob): boolean {
    if (job.state === 'ANALYZING' || job.state === 'IMPORTING') return true;
    return job.state === 'RESOLVING'
      && job.resolutionProgress?.phase !== 'WAITING_FOR_REVIEW';
  }

  private hasResolutionProgressCapability(job: ImportJob): boolean {
    if (typeof job.resolutionProgressAvailable === 'boolean') return job.resolutionProgressAvailable;
    return Object.prototype.hasOwnProperty.call(job, 'resolutionProgress');
  }

  private syncReviewQueue(job: ImportJob): void {
    const progress = job.resolutionProgress;
    if (!progress) return;
    if (this.reviewImportId !== job.id || this.reviewGeneration !== progress.reviewGeneration) {
      this.reviewImportId = job.id;
      this.reviewGeneration = progress.reviewGeneration;
      this.reviewRevision = -1;
      this.reviewLatestHeadRevision = -1;
      this.reviewRequestedHeadRevision = -1;
      this.reviewCursor = null;
      this.maxVisibleReviewItems = 100;
      this.reviewItems.set([]);
      this.reviewPageIndex.set(0);
      this.reviewHasMore.set(false);
    }
    this.publishReviewPreview(job);
    const hasCapacity = this.reviewItems().length < this.maxVisibleReviewItems;
    this.reviewLatestHeadRevision = Math.max(this.reviewLatestHeadRevision, progress.reviewRevision);
    const shouldFetch = this.reviewCursor === null
      || (hasCapacity && this.reviewLatestHeadRevision > this.reviewRequestedHeadRevision);
    if (shouldFetch && !this.reviewLoading()) {
      this.reviewRequestedHeadRevision = this.reviewLatestHeadRevision;
      this.fetchReviewChanges(job);
    }
  }

  private fetchReviewChanges(job: ImportJob, advancePage = false): void {
    const progress = job.resolutionProgress;
    const remainingCapacity = this.maxVisibleReviewItems - this.reviewItems().length;
    if (!progress || this.reviewLoading() || remainingCapacity <= 0) return;

    this.reviewLoading.set(true);
    this.importsApi.getReviewItems(job.id, this.reviewCursor, Math.min(40, remainingCapacity))
      .pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
        next: (page) => {
          this.reviewLoading.set(false);
          const currentJob = this.job();
          if (!currentJob || currentJob.id !== page.importId
              || currentJob.resolutionProgress?.reviewGeneration !== page.reviewGeneration) return;

          this.reviewItems.update((current) => {
            const next = [...current];
            for (const change of page.changes) {
              const existingIndex = next.findIndex((item) => item.itemId === change.itemId);
              if (change.type === 'REMOVE') {
                if (existingIndex >= 0) next.splice(existingIndex, 1);
                continue;
              }
              if (!change.item) continue;
              const item = this.reviewItem(change, change.item);
              if (existingIndex >= 0) next[existingIndex] = item;
              else if (next.length < this.maxVisibleReviewItems) next.push(item);
            }
            return next;
          });
          this.reviewCursor = page.nextCursor;
          this.reviewLatestHeadRevision = Math.max(this.reviewLatestHeadRevision, page.reviewRevision);
          this.reviewRequestedHeadRevision = page.reviewRevision;
          if (advancePage) {
            const lastVisiblePage = Math.max(0, Math.ceil(this.reviewItems().length / 40) - 1);
            this.reviewPageIndex.update((pageIndex) => Math.min(pageIndex + 1, lastVisiblePage));
          }
          if (!page.hasMore) {
            this.reviewRevision = page.reviewRevision;
          }
          this.reviewHasMore.set(page.hasMore);
          this.publishReviewPreview(currentJob);
        },
        error: (error: unknown) => {
          this.reviewLoading.set(false);
          this.reviewRequestedHeadRevision = this.reviewRevision;
          this.error.set(this.errorMessage(error));
          if (error instanceof HttpErrorResponse && error.status === 409) this.refreshJob();
        },
      });
  }

  private reviewItem(change: ImportReviewPage['changes'][number], item: ImportPreviewItem): ImportPreviewItem {
    const preferredOperations: ImportDecision[] = [
      'RESOLVE_TARGET', 'EDIT_FIELD', 'ASSIGN_PASS', 'CONFIRM_WATCH_SCOPE',
      'LINK_IMPORTED_LIST', 'RESOLVE_REVIEW_ORDER', 'REMOVE_NOMINEE', 'REMOVE_CATEGORY',
      'SET_CATEGORY_OPEN', 'SKIP_ITEM',
    ];
    const primaryOperation = preferredOperations.find((operation) => change.allowedOperations.includes(operation));
    return {
      ...item,
      itemTitle: item.itemTitle ?? change.displayTitle,
      decision: item.decision ?? primaryOperation ?? null,
      reviewRevision: change.revision,
      allowedOperations: change.allowedOperations,
      editableFields: change.editableFields,
    };
  }

  private publishReviewPreview(job: ImportJob): void {
    const progress = job.resolutionProgress;
    if (!progress) return;
    const items = this.reviewItems();
    const lastLoadedPage = Math.max(0, Math.ceil(items.length / 40) - 1);
    if (this.reviewPageIndex() > lastLoadedPage) this.reviewPageIndex.set(lastLoadedPage);
    const visibleItems = items.slice(this.reviewPageIndex() * 40, (this.reviewPageIndex() + 1) * 40);
    this.preview.set({
      importId: job.id,
      state: job.state,
      previewVersion: job.previewVersion,
      previewDigest: job.previewDigest,
      items: visibleItems,
      page: this.reviewPageIndex(),
      size: 40,
      totalElements: progress.reviewRequiredCount,
      totalPages: Math.ceil(progress.reviewRequiredCount / 40),
    });
  }

  private resetReviewQueue(): void {
    this.reviewImportId = null;
    this.reviewGeneration = null;
    this.reviewRevision = -1;
    this.reviewLatestHeadRevision = -1;
    this.reviewRequestedHeadRevision = -1;
    this.reviewCursor = null;
    this.maxVisibleReviewItems = 100;
    this.reviewItems.set([]);
    this.reviewPageIndex.set(0);
    this.reviewHasMore.set(false);
    this.reviewLoading.set(false);
  }

  private watchForProgress(importId: string): void {
    if (this.pollingId !== importId) {
      this.stopPolling();
      this.pollingId = importId;
    }
    if (this.polling || this.document.visibilityState === 'hidden') return;

    this.polling = timer(0, 2500).pipe(
      exhaustMap(() => this.importsApi.getImport(importId).pipe(
        catchError((error: unknown) => {
          this.error.set(this.errorMessage(error));
          return EMPTY;
        }),
      )),
      takeUntilDestroyed(this.destroyRef),
    ).subscribe({
      next: (job) => {
        const previousJob = this.job();
        this.job.set(job);
        this.error.set('');
        if (this.shouldPollJob(job)) {
          if (job.state === 'RESOLVING') {
            if (job.resolutionProgress) this.syncReviewQueue(job);
            else if (!this.hasResolutionProgressCapability(job)) {
              if (previousJob?.state !== 'RESOLVING' || job.previewVersion !== previousJob.previewVersion) {
                this.previewPage.set(0);
              }
              this.loadPreviewPage(this.previewPage());
            }
          }
          return;
        }
        this.stopPolling();
        this.handleJob(job);
      },
    });
  }

  private pausePolling(): void {
    this.polling?.unsubscribe();
    this.polling = null;
  }

  private stopPolling(): void {
    this.pausePolling();
    this.pollingId = null;
  }

  private resetFileSelection(): void {
    const input = document.getElementById('settings-import-file') as HTMLInputElement | null;
    if (input) input.value = '';
  }

  private sourceFormat(): ImportSourceFormat {
    if (this.inputKind() === 'PLATFORM_ARCHIVE') {
      return this.platform() === 'TRAKT' ? 'TRAKT_ZIP' : 'LETTERBOXD_ZIP';
    }
    if (this.platform() === 'TRAKT') return 'TRAKT_JSON';
    return 'LETTERBOXD_CSV';
  }

  private initialEditValue(item: ImportPreviewItem, field: ImportEditableField): string {
    if (field === 'TITLE') return item.itemTitle ?? '';
    if (field === 'DESCRIPTION') return item.itemDescription ?? '';
    if (field === 'REVIEW') return item.reviewText ?? '';
    if (field === 'WATCHED_DATE') return item.watchedDate ?? '';
    return '';
  }

  private seriesId(item: ImportPreviewItem): string | null {
    const target = this.record(item.resolvedTarget);
    const content = this.record(target?.['content']);
    if (!content) return null;
    const directId = content['type'] === 'SERIES' ? content['tmdbId'] : content['seriesTmdbId'];
    return typeof directId === 'string' ? directId : null;
  }

  private record(value: unknown): Record<string, unknown> | null {
    return typeof value === 'object' && value !== null && !Array.isArray(value)
      ? value as Record<string, unknown>
      : null;
  }

  private errorMessage(error: unknown): string {
    if (!(error instanceof HttpErrorResponse)) return this.copy.errors.generic;
    switch (error.status) {
      case 400: return this.copy.errors.invalidFile;
      case 401: return this.copy.errors.session;
      case 403: return this.copy.errors.csrf;
      case 404: return this.copy.errors.notFound;
      case 409: return this.copy.errors.conflict;
      case 413: return this.copy.errors.fileTooLarge;
      case 429: return this.copy.errors.quota;
      default: return this.copy.errors.generic;
    }
  }
}
