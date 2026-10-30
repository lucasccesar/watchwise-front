import { HttpErrorResponse } from '@angular/common/http';
import { DOCUMENT } from '@angular/common';
import {
  Component,
  ElementRef,
  HostListener,
  OnDestroy,
  OnInit,
  Renderer2,
  ViewChild,
  computed,
  inject,
  signal,
} from '@angular/core';
import {
  FormBuilder,
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { combineLatest, Observable, of, Subscription, switchMap, throwError } from 'rxjs';
import { AuthSessionService } from '../../../../core/session/session.service';
import {
  ContentApiService,
  ContentComment,
  DiaryEntryRecord,
  FollowingPage,
  FollowingUser,
  ContentPage,
  ContentPageResult,
  ContentReview,
  ReviewSort,
  UserListSummary,
} from '../../data-access/content-api.service';
import { movieMessages } from '../../i18n/movie.messages';

type PageStatus = 'loading' | 'ready' | 'error';
type DialogState = 'watch' | 'videos' | 'lists' | 'share' | null;
type WatchMode = 'new' | 'edit' | 'again';
type WatchForm = FormGroup<{
  watchedDate: FormControl<string>;
  score: FormControl<number>;
  comment: FormControl<string>;
  watchedInTheater: FormControl<boolean>;
  isRewatch: FormControl<boolean>;
  watchedWith: FormControl<string[]>;
}>;

@Component({
  selector: 'app-movie-content',
  standalone: true,
  imports: [ReactiveFormsModule],
  templateUrl: './movie.component.html',
  styleUrl: './movie.component.css',
})
export class MovieComponent implements OnInit, OnDestroy {
  protected readonly copy = movieMessages['pt-BR'];
  protected readonly page = signal<ContentPage | null>(null);
  protected readonly pageStatus = signal<PageStatus>('loading');
  protected readonly pageError = signal('');
  protected readonly contentId = signal('');
  protected readonly tmdbId = signal('');
  protected readonly reviews = signal<ContentReview[]>([]);
  protected readonly comments = signal<ContentComment[]>([]);
  protected readonly reviewPage = signal<ContentPageResult<ContentReview> | null>(null);
  protected readonly commentPage = signal<ContentPageResult<ContentComment> | null>(null);
  protected readonly reviewStatus = signal<PageStatus>('loading');
  protected readonly commentStatus = signal<PageStatus>('loading');
  protected readonly reviewError = signal('');
  protected readonly commentError = signal('');
  protected readonly reviewSort = signal<ReviewSort>('RECENT');
  protected readonly reviewCount = computed(() => this.page()?.visibleReviewsCount ?? 0);
  protected readonly dialog = signal<DialogState>(null);
  protected readonly watchMode = signal<WatchMode>('new');
  protected readonly actionPending = signal(false);
  protected readonly commentPending = signal(false);
  protected readonly commentDraft = signal('');
  protected readonly commentHasSpoiler = signal(false);
  protected readonly replyTo = signal<ContentComment | null>(null);
  protected readonly userLists = signal<UserListSummary[]>([]);
  protected readonly userListsPage = signal<ContentPageResult<UserListSummary> | null>(null);
  protected readonly userListsStatus = signal<PageStatus>('loading');
  protected readonly userListsError = signal('');
  protected readonly following = signal<FollowingUser[]>([]);
  protected readonly followingPage = signal<FollowingPage | null>(null);
  protected readonly followingStatus = signal<PageStatus>('loading');
  protected readonly followingError = signal('');
  protected readonly watchDetailsLoading = signal(false);
  protected readonly watchDetailsReady = signal(true);
  protected readonly watchDetailsError = signal('');
  protected readonly editingDiaryEntry = signal<DiaryEntryRecord | null>(null);
  protected readonly peopleTab = signal<'cast' | 'crew'>('cast');
  protected readonly detailsExpanded = signal(false);
  protected readonly shareImageUrl = signal<string | null>(null);
  protected readonly shareImageFile = signal<File | null>(null);
  protected readonly toast = signal('');
  protected readonly ratingOptions = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
  protected readonly maxWatchedDate: string;
  protected readonly watchForm: WatchForm;

  private readonly subscriptions = new Subscription();
  private requestSubscriptions = new Subscription();
  private watchHydrationSubscription = new Subscription();
  private modalOpener: HTMLElement | null = null;
  private messageTimeout?: ReturnType<typeof setTimeout>;
  private movieStylesheet: HTMLLinkElement | null = null;
  private readonly document = inject(DOCUMENT);
  private readonly renderer = inject(Renderer2);

  @ViewChild('movieDialog')
  private movieDialog?: ElementRef<HTMLElement>;

  constructor(
    private readonly route: ActivatedRoute,
    private readonly router: Router,
    private readonly api: ContentApiService,
    protected readonly session: AuthSessionService,
    formBuilder: FormBuilder,
  ) {
    this.maxWatchedDate = this.localDate(new Date());
    this.watchForm = formBuilder.nonNullable.group({
      watchedDate: [this.maxWatchedDate, Validators.required],
      score: [0, [Validators.min(0), Validators.max(10)]],
      comment: ['', Validators.maxLength(20000)],
      watchedInTheater: [false],
      isRewatch: [false],
      watchedWith: [[] as string[]],
    });
  }

  ngOnInit(): void {
    this.loadMovieStylesheet();
    this.subscriptions.add(
      combineLatest([this.route.paramMap, this.route.queryParamMap]).subscribe(
        ([params, queryParams]) => {
          const tmdbId = params.get('tmdbId')?.trim() ?? '';
          const contentId = queryParams.get('contentId')?.trim() ?? '';
          this.loadMovie(tmdbId, contentId);
        },
      ),
    );
  }

  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
    this.requestSubscriptions.unsubscribe();
    this.watchHydrationSubscription.unsubscribe();
    this.releaseShareImage();
    if (this.messageTimeout) clearTimeout(this.messageTimeout);
    if (this.movieStylesheet) {
      this.renderer.removeChild(this.document.head, this.movieStylesheet);
    }
  }

  protected loadMovie(tmdbId: string, knownContentId = ''): void {
    this.requestSubscriptions.unsubscribe();
    this.requestSubscriptions = new Subscription();
    this.page.set(null);
    this.pageStatus.set('loading');
    this.pageError.set('');
    this.contentId.set('');
    this.tmdbId.set(tmdbId);
    this.reviews.set([]);
    this.comments.set([]);
    this.reviewPage.set(null);
    this.commentPage.set(null);
    this.reviewStatus.set('loading');
    this.commentStatus.set('loading');

    if (!tmdbId) {
      this.pageStatus.set('error');
      this.pageError.set(this.copy.notFound);
      return;
    }

    const reference$ = knownContentId
      ? of({ id: knownContentId })
      : this.api.createMovieReference(tmdbId);

    this.requestSubscriptions.add(
      reference$
        .pipe(
          switchMap((reference) => {
            this.contentId.set(reference.id);
            return this.api.getPage(reference.id);
          }),
        )
        .subscribe({
          next: (page) => {
            if (page.details.type !== 'MOVIE') {
              this.pageStatus.set('error');
              this.pageError.set(this.copy.notFound);
              return;
            }
            this.page.set(page);
            this.tmdbId.set(page.details.tmdbId || tmdbId);
            this.pageStatus.set('ready');
            this.loadReviews(1);
            this.loadComments(1);
          },
          error: (error: unknown) => {
            if (this.handleSessionError(error)) return;
            this.pageError.set(this.errorMessage(error));
            this.pageStatus.set('error');
          },
        }),
    );
  }

  protected reload(): void {
    const contentId = this.contentId();
    if (contentId) {
      this.loadMovie(this.tmdbId(), contentId);
    } else {
      this.loadMovie(this.tmdbId());
    }
  }

  protected loadReviews(pageNumber: number): void {
    const contentId = this.contentId();
    if (!contentId) return;
    this.reviewStatus.set('loading');
    this.reviewError.set('');
    this.requestSubscriptions.add(
      this.api.getReviews(contentId, pageNumber, this.reviewSort()).subscribe({
        next: (response) => {
          this.reviewPage.set(response);
          this.reviews.update((current) =>
            pageNumber === 1 ? response.content : [...current, ...response.content],
          );
          this.reviewStatus.set('ready');
        },
        error: (error: unknown) => {
          if (this.handleSessionError(error)) return;
          this.reviewError.set(this.errorMessage(error));
          this.reviewStatus.set('error');
        },
      }),
    );
  }

  protected loadComments(pageNumber: number): void {
    const contentId = this.contentId();
    if (!contentId) return;
    this.commentStatus.set('loading');
    this.commentError.set('');
    this.requestSubscriptions.add(
      this.api.getComments(contentId, pageNumber).subscribe({
        next: (response) => {
          this.commentPage.set(response);
          this.comments.update((current) =>
            pageNumber === 1 ? response.content : [...current, ...response.content],
          );
          this.commentStatus.set('ready');
        },
        error: (error: unknown) => {
          if (this.handleSessionError(error)) return;
          this.commentError.set(this.errorMessage(error));
          this.commentStatus.set('error');
        },
      }),
    );
  }

  protected changeReviewSort(sort: ReviewSort): void {
    if (sort === this.reviewSort()) return;
    this.reviewSort.set(sort);
    this.reviews.set([]);
    this.loadReviews(1);
  }

  protected openWatchDialog(mode: WatchMode, event?: Event): void {
    this.watchHydrationSubscription.unsubscribe();
    this.watchHydrationSubscription = new Subscription();
    this.modalOpener = event?.currentTarget instanceof HTMLElement ? event.currentTarget : null;
    this.watchMode.set(mode);
    const viewer = this.page()?.viewerState;
    const editing = mode === 'edit';
    this.watchForm.reset({
      watchedDate: editing && viewer?.lastWatchedDate ? viewer.lastWatchedDate : this.localDate(new Date()),
      score: editing ? (viewer?.myRating ?? 0) : 0,
      comment: editing ? (viewer?.myReview ?? '') : '',
      watchedInTheater: editing ? (viewer?.watchedInTheater ?? false) : false,
      isRewatch: mode === 'again' || Boolean(viewer?.playsCount),
      watchedWith: [],
    });
    this.watchDetailsLoading.set(editing);
    this.watchDetailsReady.set(!editing);
    this.watchDetailsError.set('');
    this.editingDiaryEntry.set(null);
    this.loadFollowing(1);
    this.dialog.set('watch');
    queueMicrotask(() => this.movieDialog?.nativeElement.focus());

    if (editing && viewer?.latestDiaryEntryId) {
      this.loadDiaryEntryForEdit(viewer.latestDiaryEntryId);
    } else if (!editing) {
      this.watchDetailsLoading.set(false);
    } else {
      this.watchDetailsLoading.set(false);
      this.watchDetailsError.set(this.copy.diaryLoadError);
    }
  }

  protected retryDiaryEntryLoad(): void {
    const diaryEntryId = this.page()?.viewerState.latestDiaryEntryId;
    if (diaryEntryId) this.loadDiaryEntryForEdit(diaryEntryId);
  }

  protected loadFollowing(pageNumber: number): void {
    const userId = this.session.user()?.id;
    if (!userId) {
      this.followingStatus.set('error');
      this.followingError.set(this.copy.followingLoadError);
      return;
    }

    this.followingStatus.set('loading');
    this.followingError.set('');
    this.watchHydrationSubscription.add(
      this.api.getFollowing(userId, pageNumber).subscribe({
        next: (response) => {
          this.followingPage.set(response);
          this.following.update((current) =>
            pageNumber === 1 ? response.content : [...current, ...response.content],
          );
          this.followingStatus.set('ready');
        },
        error: (error: unknown) => {
          this.followingError.set(this.errorMessage(error));
          this.followingStatus.set('error');
          this.handleSessionError(error);
        },
      }),
    );
  }

  protected loadMoreFollowing(): void {
    const page = this.followingPage();
    if (page?.hasNext) this.loadFollowing(page.page + 1);
  }

  protected toggleWatchedWith(userId: string, event: Event): void {
    const checked = (event.target as HTMLInputElement).checked;
    const selected = this.watchForm.controls.watchedWith.value;
    const next = checked
      ? [...new Set([...selected, userId])]
      : selected.filter((selectedId) => selectedId !== userId);
    this.watchForm.controls.watchedWith.setValue(next);
  }

  protected isWatchedWithSelected(userId: string): boolean {
    return this.watchForm.controls.watchedWith.value.includes(userId);
  }

  protected setPeopleTab(tab: 'cast' | 'crew'): void {
    this.peopleTab.set(tab);
  }

  protected peopleTabKeydown(event: KeyboardEvent): void {
    if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
    event.preventDefault();
    const tab = event.key === 'Home' || event.key === 'ArrowLeft' ? 'cast' : 'crew';
    this.setPeopleTab(tab);
    queueMicrotask(() => this.document.getElementById(`movie-${tab}-tab`)?.focus());
  }

  protected openVideos(event?: Event): void {
    this.modalOpener = event?.currentTarget instanceof HTMLElement ? event.currentTarget : null;
    this.dialog.set('videos');
    queueMicrotask(() => this.movieDialog?.nativeElement.focus());
  }

  protected openShareDialog(event?: Event): void {
    this.modalOpener = event?.currentTarget instanceof HTMLElement ? event.currentTarget : null;
    this.releaseShareImage();
    this.dialog.set('share');
    queueMicrotask(() => this.movieDialog?.nativeElement.focus());
  }

  protected onShareImageChanged(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      this.showToast(this.copy.shareImageTypeError);
      input.value = '';
      return;
    }
    this.releaseShareImage();
    this.shareImageFile.set(file);
    this.shareImageUrl.set(URL.createObjectURL(file));
  }

  protected async shareMovieReview(): Promise<void> {
    const details = this.page()?.details;
    const comment = this.page()?.viewerState.myReview?.trim();
    if (!details || !comment) return;

    const title = details.title || this.copy.untitled;
    const url = window.location.href;
    const image = this.shareImageFile();
    try {
      if (image && navigator.share && navigator.canShare?.({ files: [image] })) {
        await navigator.share({ title, text: comment, url, files: [image] });
        return;
      }
      if (navigator.share) {
        await navigator.share({ title, text: comment, url });
        return;
      }
      await navigator.clipboard.writeText(`${title}\n${comment}\n${url}`);
      this.showToast(this.copy.shareSuccess);
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') return;
      this.showToast(this.copy.shareError);
    }
  }

  protected openLists(event?: Event): void {
    this.modalOpener = event?.currentTarget instanceof HTMLElement ? event.currentTarget : null;
    this.dialog.set('lists');
    this.loadUserLists(1);
    queueMicrotask(() => this.movieDialog?.nativeElement.focus());
  }

  protected loadUserLists(pageNumber: number): void {
    const userId = this.session.user()?.id;
    const contentId = this.contentId();
    if (!userId || !contentId) {
      this.userListsStatus.set('error');
      this.userListsError.set(this.copy.listLoadError);
      return;
    }

    this.userListsStatus.set('loading');
    this.userListsError.set('');
    this.requestSubscriptions.add(
      this.api.getUserLists(userId, contentId, pageNumber).subscribe({
        next: (response) => {
          this.userListsPage.set(response);
          this.userLists.update((current) =>
            pageNumber === 1 ? response.content : [...current, ...response.content],
          );
          this.userListsStatus.set('ready');
        },
        error: (error: unknown) => {
          if (this.handleSessionError(error)) return;
          this.userListsError.set(this.errorMessage(error));
          this.userListsStatus.set('error');
        },
      }),
    );
  }

  protected toggleMovieInList(list: UserListSummary): void {
    if (
      this.actionPending() ||
      (list.containsContent !== true && (list.itemScope === 'LIST' || list.itemScope === 'MIXED'))
    ) return;

    if (list.containsContent) {
      const removal = this.findMovieItemInList(list.id, this.contentId(), 1).pipe(
        switchMap((itemId) =>
          itemId ? this.api.removeListItem(list.id, itemId) : throwError(() => new Error('List item not found')),
        ),
      );
      this.runAction(removal, () => {
        this.showToast(this.copy.listRemoved);
        this.loadUserLists(1);
        this.refreshPageStats();
      });
      return;
    }

    this.runAction(this.api.addMovieToList(list.id, this.tmdbId()), () => {
      this.showToast(this.copy.listAdded);
      this.loadUserLists(1);
      this.refreshPageStats();
    });
  }

  protected loadMoreLists(): void {
    const current = this.userListsPage();
    if (current?.hasNext) this.loadUserLists(current.page + 1);
  }

  protected closeDialog(): void {
    this.watchHydrationSubscription.unsubscribe();
    this.watchDetailsLoading.set(false);
    this.watchDetailsReady.set(true);
    this.watchDetailsError.set('');
    this.dialog.set(null);
    this.releaseShareImage();
    this.modalOpener?.focus();
    this.modalOpener = null;
  }

  protected saveWatch(): void {
    if (this.isScoreClearUnsupported()) {
      this.showToast(this.copy.scoreClearUnavailable);
      return;
    }
    if (!this.watchDetailsReady() || this.watchForm.invalid || this.actionPending()) {
      this.watchForm.markAllAsTouched();
      return;
    }
    const details = this.page()?.details;
    if (!details) return;

    const value = this.watchForm.getRawValue();
    const releaseDate = this.page()?.details.releaseDate;
    if (
      value.watchedDate > this.maxWatchedDate ||
      (releaseDate && value.watchedDate < releaseDate)
    ) {
      this.showToast(this.copy.invalid);
      return;
    }
    const request = {
      watchedDate: value.watchedDate,
      score: value.score > 0 ? value.score : null,
      comment: value.comment.trim(),
      watchedInTheater: value.watchedInTheater,
      isRewatch: value.isRewatch,
      watchedWith: value.watchedWith,
    };
    const diaryEntryId = this.page()?.viewerState.latestDiaryEntryId;
    const saving = this.watchMode() === 'edit' && diaryEntryId
      ? this.api.updateDiaryEntry(diaryEntryId, request)
      : this.api.createDiaryEntry({
          ...request,
          content: { type: 'MOVIE', tmdbId: details.tmdbId },
        });

    this.runAction(saving, () => {
      this.closeDialog();
      this.showToast(this.copy.saved);
      this.reload();
    });
  }

  protected deleteWatch(): void {
    const diaryEntryId = this.page()?.viewerState.latestDiaryEntryId;
    if (!diaryEntryId || this.actionPending() || !window.confirm(this.copy.removeWatchConfirm)) return;
    this.runAction(this.api.deleteDiaryEntry(diaryEntryId), () => {
      this.closeDialog();
      this.showToast(this.copy.removed);
      this.reload();
    });
  }

  protected toggleWatchlist(): void {
    const viewer = this.page()?.viewerState;
    if (!viewer || this.actionPending()) return;
    if (viewer.inWatchlist && viewer.watchlistEntryId) {
      this.runAction(this.api.removeFromWatchlist(viewer.watchlistEntryId), () => this.reload());
      return;
    }
    this.runAction(this.api.addToWatchlist(this.tmdbId()), () => {
      this.showToast(this.copy.contentUpdated);
      this.reload();
    });
  }

  protected toggleDropped(): void {
    if (this.actionPending()) return;
    const dropped = this.page()?.viewerState.dropped;
    const action = dropped
      ? this.api.removeDropped(this.tmdbId())
      : this.api.markDropped(this.tmdbId());
    this.runAction(action, () => {
      this.showToast(this.copy.contentUpdated);
      this.reload();
    });
  }

  protected submitComment(): void {
    const text = this.commentDraft().trim();
    const contentId = this.contentId();
    if (!text || text.length > 280 || !contentId || this.commentPending()) return;
    this.commentError.set('');
    this.commentPending.set(true);
    this.requestSubscriptions.add(
      this.api
        .createComment(contentId, {
          text,
          parentCommentId: this.replyTo()?.id ?? null,
          containsSpoiler: this.commentHasSpoiler(),
        })
        .subscribe({
          next: () => {
            this.commentPending.set(false);
            this.commentDraft.set('');
            this.commentHasSpoiler.set(false);
            this.replyTo.set(null);
            this.showToast(this.copy.commentPosted);
            this.loadComments(1);
            this.refreshPageStats();
          },
          error: (error: unknown) => {
            this.commentPending.set(false);
            if (this.handleSessionError(error)) return;
            this.commentError.set(this.errorMessage(error));
          },
        }),
    );
  }

  protected onCommentInput(event: Event): void {
    this.commentDraft.set((event.target as HTMLTextAreaElement).value);
  }

  protected setCommentSpoiler(event: Event): void {
    this.commentHasSpoiler.set((event.target as HTMLInputElement).checked);
  }

  protected deleteComment(comment: ContentComment): void {
    if (this.isOwnComment(comment) && window.confirm(this.copy.commentDeleteConfirm)) {
      this.runAction(this.api.deleteComment(comment.id), () => this.loadComments(1));
    }
  }

  protected toggleCommentLike(comment: ContentComment): void {
    this.runAction(this.api.setCommentLike(comment.id, !comment.likedByMe), () => this.loadComments(1));
  }

  protected toggleReviewLike(review: ContentReview): void {
    this.runAction(
      this.api.setReviewLike(review.id, review.source, !review.likedByMe),
      () => this.loadReviews(1),
    );
  }

  protected setReplyTo(comment: ContentComment): void {
    this.replyTo.set(comment);
    document.getElementById('movie-comment-input')?.focus();
  }

  protected clearReply(): void {
    this.replyTo.set(null);
  }

  protected imageUrl(path: string | null | undefined, size = 'w500'): string | null {
    if (!path) return null;
    if (/^https?:\/\//i.test(path)) return path;
    return `https://image.tmdb.org/t/p/${size}${path.startsWith('/') ? path : `/${path}`}`;
  }

  protected posterUrl(): string | null {
    const details = this.page()?.details;
    return this.imageUrl(details?.customPosterUrl || details?.posterPath, 'w500');
  }

  protected backdropUrl(): string | null {
    return this.imageUrl(this.page()?.details.backdropPath, 'w1280');
  }

  protected toggleDetails(): void {
    this.detailsExpanded.update((expanded) => !expanded);
  }

  protected crewNamesForRole(movie: ContentPage, role: 'director' | 'writer' | 'producer'): string {
    const keywords: Record<typeof role, string[]> = {
      director: ['director'],
      writer: ['writer', 'screenplay', 'story'],
      producer: ['producer'],
    };
    const names = movie.details.crew
      .filter((person) => person.jobs.some((job) => keywords[role].some((keyword) => job.toLowerCase().includes(keyword))))
      .map((person) => person.name)
      .filter((name, index, allNames) => allNames.indexOf(name) === index);
    if (names.length <= 3) return names.join(', ');
    return `${names.slice(0, 3).join(', ')} + ${names.length - 3}`;
  }

  protected languageName(language: string): string {
    const names: Record<string, string> = {
      de: 'Alemão',
      en: 'Inglês',
      es: 'Espanhol',
      fr: 'Francês',
      it: 'Italiano',
      ja: 'Japonês',
      ko: 'Coreano',
      pt: 'Português',
      zh: 'Chinês',
    };
    const normalized = language.toLowerCase().split('-')[0];
    return names[normalized] ?? language;
  }

  protected providerInitials(name: string): string {
    const first = name.trim().split(/\s+/)[0] ?? '';
    return first.endsWith('+') ? `${first.charAt(0)}+` : first.charAt(0).toUpperCase();
  }

  protected formatDate(value: string | null | undefined): string {
    if (!value) return '';
    const [year, month, day] = value.slice(0, 10).split('-').map(Number);
    if (!year || !month || !day) return '';
    return new Intl.DateTimeFormat('pt-BR', { day: 'numeric', month: 'long', year: 'numeric' }).format(
      new Date(year, month - 1, day),
    );
  }

  protected formatRuntime(minutes: number | null | undefined): string {
    if (!minutes || minutes < 0) return '';
    const hours = Math.floor(minutes / 60);
    const rest = minutes % 60;
    if (hours && rest) return this.copy.runtime.replace('{hours}', String(hours)).replace('{minutes}', String(rest));
    if (hours) return this.copy.hours.replace('{hours}', String(hours));
    return this.copy.minutes.replace('{minutes}', String(rest));
  }

  protected formatNumber(value: number | null | undefined, maximumFractionDigits = 1): string {
    if (value === null || value === undefined) return '—';
    return new Intl.NumberFormat('pt-BR', { maximumFractionDigits }).format(value);
  }

  protected ratingBarHeight(score: number): number {
    const distribution = this.page()?.stats.ratingsDistribution ?? [];
    const count = distribution.find((item) => item.score === score)?.count ?? 0;
    const largest = Math.max(...distribution.map((item) => item.count), 0);
    return largest ? Math.max(2, (count / largest) * 56) : 2;
  }

  protected ratingCount(score: number): number {
    return this.page()?.stats.ratingsDistribution.find((item) => item.score === score)?.count ?? 0;
  }

  protected dateLabel(value: string | null | undefined, template: string): string {
    return template.replace('{date}', this.formatDate(value) || '—');
  }

  protected reviewerName(review: ContentReview): string {
    return `@${review.reviewer.username}`;
  }

  protected commentAuthorName(comment: ContentComment): string {
    return comment.user.name?.trim() || `@${comment.user.username}`;
  }

  protected isScoreClearUnsupported(): boolean {
    const originalScore = this.editingDiaryEntry()?.score;
    return this.watchMode() === 'edit' && originalScore !== null && originalScore !== undefined && this.watchForm.controls.score.value === 0;
  }

  protected providerLabel(type: 'flatrate' | 'rent' | 'buy'): string {
    if (type === 'rent') return this.copy.rent;
    if (type === 'buy') return this.copy.buy;
    return this.copy.subscription;
  }

  protected reviewSortChanged(event: Event): void {
    const value = (event.target as HTMLSelectElement).value as ReviewSort;
    this.changeReviewSort(value);
  }

  protected nextReviews(): void {
    const page = this.reviewPage();
    if (page?.hasNext) this.loadReviews(page.page + 1);
  }

  protected nextComments(): void {
    const page = this.commentPage();
    if (page?.hasNext) this.loadComments(page.page + 1);
  }

  protected isOwnComment(comment: ContentComment): boolean {
    return this.session.user()?.id === comment.user.id;
  }

  protected canSubmitComment(): boolean {
    const text = this.commentDraft().trim();
    return Boolean(text) && text.length <= 280 && !this.commentPending();
  }

  protected retriesReviews(): void {
    this.loadReviews(1);
  }

  protected retriesComments(): void {
    this.loadComments(1);
  }

  @HostListener('document:keydown', ['$event'])
  protected onDocumentKeydown(event: KeyboardEvent): void {
    if (!this.dialog()) return;
    if (event.key === 'Escape') {
      event.preventDefault();
      this.closeDialog();
      return;
    }
    if (event.key !== 'Tab') return;
    const root = this.movieDialog?.nativeElement;
    if (!root) return;
    const focusable = Array.from(
      root.querySelectorAll<HTMLElement>('button:not([disabled]), a[href], input:not([disabled]), textarea:not([disabled]), select:not([disabled])'),
    );
    if (!focusable.length) return;
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  }

  private runAction<T>(request: Observable<T>, success: () => void): void {
    if (this.actionPending()) return;
    this.actionPending.set(true);
    this.requestSubscriptions.add(
      request.subscribe({
        next: () => {
          this.actionPending.set(false);
          success();
        },
        error: (error: unknown) => {
          this.actionPending.set(false);
          if (this.handleSessionError(error)) return;
          this.showToast(this.errorMessage(error));
        },
      }),
    );
  }

  private refreshPageStats(): void {
    const contentId = this.contentId();
    if (!contentId) return;
    this.requestSubscriptions.add(
      this.api.getPage(contentId).subscribe({
        next: (page) => this.page.set(page),
        error: (error: unknown) => {
          if (!this.handleSessionError(error)) this.showToast(this.errorMessage(error));
        },
      }),
    );
  }

  private findMovieItemInList(
    listId: string,
    contentId: string,
    pageNumber: number,
  ): Observable<string | null> {
    return this.api.getListItems(listId, pageNumber).pipe(
      switchMap((response) => {
        const item = response.items.find((candidate) => candidate.content?.id === contentId);
        if (item) return of(item.id);
        return response.itemsHasNext
          ? this.findMovieItemInList(listId, contentId, pageNumber + 1)
          : of(null);
      }),
    );
  }

  private applyDiaryEntry(entry: DiaryEntryRecord): void {
    this.editingDiaryEntry.set(entry);
    this.watchForm.reset({
      watchedDate: entry.watchedDate || this.maxWatchedDate,
      score: entry.score ?? 0,
      comment: entry.comment ?? '',
      watchedInTheater: entry.watchedInTheater ?? false,
      isRewatch: Boolean(this.page()?.viewerState.playsCount),
      watchedWith: entry.watchedWith?.map((user) => user.id) ?? [],
    });
  }

  private loadDiaryEntryForEdit(diaryEntryId: string): void {
    this.watchDetailsLoading.set(true);
    this.watchDetailsReady.set(false);
    this.watchDetailsError.set('');
    this.watchHydrationSubscription.add(
      this.api.getDiaryEntry(diaryEntryId).subscribe({
        next: (entry) => {
          this.applyDiaryEntry(entry);
          this.watchDetailsLoading.set(false);
          this.watchDetailsReady.set(true);
        },
        error: (error: unknown) => {
          this.watchDetailsLoading.set(false);
          this.watchDetailsError.set(this.copy.diaryLoadError);
          this.handleSessionError(error);
        },
      }),
    );
  }

  private releaseShareImage(): void {
    const imageUrl = this.shareImageUrl();
    if (imageUrl?.startsWith('blob:')) URL.revokeObjectURL(imageUrl);
    this.shareImageUrl.set(null);
    this.shareImageFile.set(null);
  }

  private handleSessionError(error: unknown): boolean {
    if (!(error instanceof HttpErrorResponse) || error.status !== 401) return false;
    this.session.clear();
    void this.router.navigateByUrl('/login');
    return true;
  }

  private errorMessage(error: unknown): string {
    if (!(error instanceof HttpErrorResponse)) return this.copy.loadError;
    if (error.status === 0) return this.copy.connectionError;
    if (error.status === 400) return this.copy.invalid;
    if (error.status === 403) return this.copy.forbidden;
    if (error.status === 404) return this.copy.notFound;
    if (error.status === 429) return this.copy.rateLimited;
    if (error.status === 502) return this.copy.unavailable;
    return this.copy.actionUnavailable;
  }

  private showToast(message: string): void {
    this.toast.set(message);
    if (this.messageTimeout) clearTimeout(this.messageTimeout);
    this.messageTimeout = setTimeout(() => this.toast.set(''), 3500);
  }

  private localDate(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  private loadMovieStylesheet(): void {
    const stylesheet = this.renderer.createElement('link') as HTMLLinkElement;
    this.renderer.setAttribute(stylesheet, 'rel', 'stylesheet');
    this.renderer.setAttribute(
      stylesheet,
      'href',
      new URL('styles/movie-content.css', this.document.baseURI).href,
    );
    this.renderer.appendChild(this.document.head, stylesheet);
    this.movieStylesheet = stylesheet;
  }
}
