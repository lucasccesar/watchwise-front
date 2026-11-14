import { ChangeDetectionStrategy, Component, OnDestroy, computed, effect, input, output, signal } from '@angular/core';
import { forkJoin, of, switchMap, type Observable, type Subscription } from 'rxjs';
import { ContentApiService, type MyContentRating } from '../../../features/content/data-access/content-api.service';
import { movieMessages } from '../../../features/content/i18n/movie.messages';
import { messageCatalog } from '../../i18n/messages';
import { PostWatchRatingPromptComponent } from '../post-watch-rating-prompt/post-watch-rating-prompt.component';
import { RatingDialogComponent, type RatingDialogSubmission, type RatingDialogValue } from '../rating-dialog/rating-dialog.component';
import { ToastNotificationsService } from '../toast-notifications/toast-notifications.service';

export interface PostWatchRatingTarget {
  type: 'SERIES' | 'SEASON';
  contentId?: string | null;
  tmdbId?: string | null;
  seriesTmdbId?: string | null;
  seasonNumber?: number | null;
  title: string;
  subtitle: string;
  returnFocusTarget?: HTMLElement | null;
}

export interface PostWatchRatingSaved {
  contentId: string;
  score: number | null;
}

@Component({
  selector: 'app-post-watch-rating-flow',
  standalone: true,
  imports: [PostWatchRatingPromptComponent, RatingDialogComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './post-watch-rating-flow.component.html',
})
export class PostWatchRatingFlowComponent implements OnDestroy {
  readonly target = input<PostWatchRatingTarget | null>(null);
  readonly closed = output<void>();
  readonly saved = output<PostWatchRatingSaved>();

  protected readonly promptOpen = signal(false);
  protected readonly ratingDialogOpen = signal(false);
  protected readonly contentId = signal<string | null>(null);
  protected readonly rating = signal<MyContentRating | null>(null);
  protected readonly loading = signal(false);
  protected readonly saving = signal(false);
  protected readonly loadError = signal('');
  protected readonly initialValue = computed<Partial<RatingDialogValue>>(() => ({
    score: this.rating()?.score ?? null,
    comment: '',
  }));

  private request?: Subscription;
  private readonly copy = messageCatalog['pt-BR'].home;

  constructor(
    private readonly api: ContentApiService,
    private readonly toasts: ToastNotificationsService,
  ) {
    effect(() => {
      this.target();
      this.request?.unsubscribe();
      this.request = undefined;
      this.promptOpen.set(Boolean(this.target()));
      this.ratingDialogOpen.set(false);
      this.contentId.set(null);
      this.rating.set(null);
      this.loading.set(false);
      this.saving.set(false);
      this.loadError.set('');
    });
  }

  ngOnDestroy(): void {
    this.request?.unsubscribe();
  }

  protected promptTitle(target: PostWatchRatingTarget): string {
    return movieMessages['pt-BR'].postWatchSeriesTitle.replace('{title}', target.title);
  }

  protected promptMessage(target: PostWatchRatingTarget): string {
    return target.type === 'SEASON'
      ? movieMessages['pt-BR'].postWatchSeasonMessage
      : movieMessages['pt-BR'].postWatchSeriesMessage;
  }

  protected promptRatingLabel(target: PostWatchRatingTarget): string {
    return target.type === 'SEASON' ? movieMessages['pt-BR'].rateSeason : movieMessages['pt-BR'].rateSeries;
  }

  protected ratingTitle(): string {
    return this.rating()?.score == null ? this.copy.rate : this.copy.editRating;
  }

  protected evaluate(): void {
    const target = this.target();
    if (!target || this.loading() || this.saving()) return;
    this.promptOpen.set(false);
    this.ratingDialogOpen.set(true);
    this.loadCurrentRating(target);
  }

  protected retryLoad(): void {
    const target = this.target();
    if (target && !this.loading() && !this.saving()) this.loadCurrentRating(target);
  }

  private loadCurrentRating(target: PostWatchRatingTarget): void {
    const contentIdRequest = this.resolveContentId(target);
    if (!contentIdRequest) {
      this.loadError.set(movieMessages['pt-BR'].ratingVersionUnavailable);
      return;
    }
    this.loading.set(true);
    this.loadError.set('');
    this.request?.unsubscribe();
    this.request = contentIdRequest.pipe(
      switchMap((id) => this.api.getMyContentRating(id).pipe(switchMap((rating) => of({ id, rating })))),
    ).subscribe({
      next: ({ id, rating }) => {
        if (this.target() !== target) return;
        this.contentId.set(id);
        this.rating.set(rating);
        this.loading.set(false);
      },
      error: () => {
        if (this.target() !== target) return;
        this.loading.set(false);
        this.loadError.set(movieMessages['pt-BR'].ratingVersionUnavailable);
      },
    });
  }

  private resolveContentId(target: PostWatchRatingTarget): Observable<string> | null {
    const resolvedContentId = this.contentId();
    if (resolvedContentId) return of(resolvedContentId);
    if (target.contentId) return of(target.contentId);
    if (target.type === 'SERIES' && target.tmdbId) {
      return this.api.createSeriesReference(target.tmdbId).pipe(switchMap((reference) => of(reference.id)));
    }
    if (target.type === 'SEASON' && target.seriesTmdbId && target.seasonNumber !== null && target.seasonNumber !== undefined) {
      return this.api.createSeasonReference(target.seriesTmdbId, target.seasonNumber).pipe(switchMap((reference) => of(reference.id)));
    }
    return null;
  }

  protected submit(submission: RatingDialogSubmission): void {
    const target = this.target();
    const contentId = this.contentId();
    const currentRating = this.rating();
    if (!target || !contentId || !currentRating || this.loading() || this.saving()) return;

    const comment = submission.comment.trim();
    const score = submission.score;
    if (score !== null && currentRating.score !== null && score !== currentRating.score && currentRating.version === null) {
      this.loadError.set(movieMessages['pt-BR'].ratingVersionUnavailable);
      return;
    }

    const requests: Observable<unknown>[] = [];
    if (comment) {
      requests.push(this.api.createContentReview(contentId, {
        comment,
        ...(score !== null ? {
          score,
          ...(currentRating.version !== null ? { expectedRatingVersion: currentRating.version } : {}),
        } : {}),
      }, crypto.randomUUID()));
    } else if (score !== currentRating.score) {
      requests.push(score === null
        ? this.api.deleteMyContentRating(contentId)
        : this.api.setContentRating(contentId, score, currentRating.version));
    }
    if (comment && score === null && currentRating.score !== null) {
      requests.push(this.api.deleteMyContentRating(contentId));
    }
    if (!requests.length) {
      this.closed.emit();
      return;
    }

    this.saving.set(true);
    this.request?.unsubscribe();
    this.request = forkJoin(requests).subscribe({
      next: () => {
        this.saving.set(false);
        this.toasts.success(this.copy.ratingSaved);
        this.saved.emit({ contentId, score });
      },
      error: (error: unknown) => {
        this.saving.set(false);
        if ((error as { status?: number })?.status === 409) {
          this.toasts.error(movieMessages['pt-BR'].ratingConflict);
          this.loadCurrentRating(target);
          return;
        }
        this.toasts.error(this.copy.genericError);
      },
    });
  }

  protected dismiss(): void {
    if (this.saving()) return;
    this.closed.emit();
  }
}
