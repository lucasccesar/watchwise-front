import { HttpErrorResponse } from '@angular/common/http';
import { NgTemplateOutlet } from '@angular/common';
import { ChangeDetectionStrategy, Component, OnDestroy, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { forkJoin, Subscription, switchMap } from 'rxjs';
import { AuthSessionService } from '../../../../core/session/session.service';
import { ShareCardModel, SharePreviewComponent } from '../../../../shared/components/share-preview/share-preview.component';
import { DialogBackdropComponent } from '../../../../shared/components/dialog-backdrop/dialog-backdrop.component';
import { ModalFocusDirective } from '../../../../shared/directives/modal-focus.directive';
import {
  ContentApiService,
  ContentComment,
  ContentReview,
  ContentPageResult,
  EpisodeContentPage,
  SeriesChildCard,
  SeriesPage,
} from '../../data-access/content-api.service';
import { PageSkeletonComponent } from '../../../../shared/components/page-skeleton/page-skeleton.component';
import { CommentItemComponent } from '../../../../shared/components/comment-item/comment-item.component';
import { buildCommentTree } from '../../../../shared/components/comment-item/comment-tree';
import { ToastNotificationsService } from '../../../../shared/components/toast-notifications/toast-notifications.service';

type LoadState = 'loading' | 'ready' | 'error';

@Component({
  selector: 'app-episode-content',
  standalone: true,
  imports: [NgTemplateOutlet, DialogBackdropComponent, ModalFocusDirective, RouterLink, SharePreviewComponent, PageSkeletonComponent, CommentItemComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './episode.component.html',
  styleUrl: './episode.component.css',
})
export class EpisodeComponent implements OnDestroy {
  protected readonly page = signal<EpisodeContentPage | null>(null);
  protected readonly series = signal<SeriesPage | null>(null);
  protected readonly reviews = signal<ContentReview[]>([]);
  protected readonly comments = signal<ContentComment[]>([]);
  protected readonly commentThreads = computed(() => buildCommentTree(this.comments()));
  protected readonly reviewPage = signal<ContentPageResult<ContentReview> | null>(null);
  protected readonly commentPage = signal<ContentPageResult<ContentComment> | null>(null);
  protected readonly reviewsLoading = signal(false);
  protected readonly commentsLoading = signal(false);
  protected readonly reviewsError = signal('');
  protected readonly commentsError = signal('');
  protected readonly commentMaxLength = 280;
  protected readonly canSubmitComment = computed(() => {
    const text = this.commentText().trim();
    return !!text && text.length <= this.commentMaxLength && !this.busy();
  });
  protected readonly status = signal<LoadState>('loading');
  protected readonly actionError = signal('');
  protected readonly ratingOpen = signal(false);
  protected readonly selectedRating = signal(0);
  protected readonly reviewText = signal('');
  protected readonly commentText = signal('');
  protected readonly replyTo = signal<ContentComment | null>(null);
  protected readonly busy = signal(false);
  protected readonly sharePreviewOpen = signal(false);
  protected readonly tmdbId = signal('');
  protected readonly seasonNumber = signal(0);
  protected readonly episodeNumber = signal(0);
  private readonly toasts = inject(ToastNotificationsService);
  protected readonly backdrop = computed(() => {
    const path = this.page()?.details.backdropPath || this.series()?.details.backdropPath;
    return this.imageUrl(path, 'w1280');
  });
  protected readonly heroBackground = computed(() => {
    const backdrop = this.backdrop();
    return backdrop
      ? `linear-gradient(90deg, rgba(12,13,17,.96) 0%, rgba(12,13,17,.72) 46%, rgba(12,13,17,.28) 100%), linear-gradient(0deg,#111113 0%,transparent 42%), url("${backdrop}")`
      : null;
  });
  protected readonly episodeTitle = computed(() => this.page()?.details.title || 'Episódio');
  protected readonly seriesTitle = computed(() => this.series()?.details.title || this.page()?.details.parentTitle || 'Série');
  protected readonly alreadyWatched = computed(() => this.page()?.viewerState.watchStatus === 'WATCHED');
  protected readonly adjacentEpisodes = computed(() => ({
    previous: this.page()?.navigation?.previousEpisode ?? null,
    next: this.page()?.navigation?.nextEpisode ?? null,
  }));
  protected readonly shareModel = computed<ShareCardModel>(() => {
    const page = this.page();
    const user = this.session.user();
    const subtitle = `Temporada ${this.seasonNumber()} · Episódio ${this.episodeNumber()}`;
    return {
      kind: 'episode',
      title: page?.details.title || this.episodeTitle(),
      subtitle: `${this.seriesTitle()} · ${subtitle}`,
      authorName: user?.name || user?.username || 'Watchwise',
      username: user?.username,
      avatarUrl: user?.profilePicture,
      backgroundUrl: this.backdrop(),
      imageUrl: this.imageUrl(page?.details.backdropPath, 'w1280'),
      rating: page?.viewerState.myRating,
      quote: page?.viewerState.myReview,
    };
  });
  protected readonly shareUrl = computed(() => `${window.location.origin}/content/series/${encodeURIComponent(this.tmdbId())}/season/${this.seasonNumber()}/episode/${this.episodeNumber()}`);

  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly api = inject(ContentApiService);
  private readonly session = inject(AuthSessionService);
  private openShareReviewAfterLoad = false;
  private shareReturnUrl: string | null = null;
  private request?: Subscription;
  private communityRequests = new Subscription();
  private routeRequest?: Subscription;

  constructor() {
    const navigationState = this.router.getCurrentNavigation()?.extras.state;
    this.openShareReviewAfterLoad = navigationState?.['openShareReview'] === true;
    this.shareReturnUrl = typeof navigationState?.['shareReturnUrl'] === 'string'
      ? navigationState['shareReturnUrl']
      : null;
    this.routeRequest = this.route.paramMap.subscribe((params) => {
      const seriesTmdbId = params.get('tmdbId') ?? '';
      const season = Number(params.get('seasonNumber'));
      const episode = Number(params.get('episodeNumber'));
      this.load(seriesTmdbId, season, episode);
    });
  }

  ngOnDestroy(): void {
    this.routeRequest?.unsubscribe();
    this.request?.unsubscribe();
    this.communityRequests.unsubscribe();
  }

  protected reload(): void {
    this.load(this.tmdbId(), this.seasonNumber(), this.episodeNumber());
  }

  protected openSharePreview(): void {
    this.sharePreviewOpen.set(true);
  }

  protected closeSharePreview(): void {
    this.sharePreviewOpen.set(false);
    const returnUrl = this.shareReturnUrl;
    this.shareReturnUrl = null;
    if (returnUrl) void this.router.navigateByUrl(returnUrl, { replaceUrl: true });
  }

  protected imageUrl(path: string | null | undefined, size = 'w500'): string | null {
    if (!path) return null;
    return /^https?:\/\//i.test(path) ? path : `https://image.tmdb.org/t/p/${size}${path.startsWith('/') ? path : `/${path}`}`;
  }

  protected formatDate(value: string | null | undefined): string {
    if (!value) return '';
    const [year, month, day] = value.slice(0, 10).split('-').map(Number);
    if (!year || !month || !day) return '';
    return new Intl.DateTimeFormat('pt-BR', { day: 'numeric', month: 'long', year: 'numeric' }).format(new Date(year, month - 1, day));
  }

  protected formatRuntime(value: number | null | undefined): string {
    if (!value) return '';
    const hours = Math.floor(value / 60);
    const minutes = value % 60;
    return hours ? `${hours}h${minutes ? ` ${minutes}min` : ''}` : `${minutes} min`;
  }

  protected formatRating(value: number | null | undefined): string {
    return value === null || value === undefined ? '0' : value.toLocaleString('pt-BR', { maximumFractionDigits: 1 });
  }

  protected ratingBarWidth(value: number | null | undefined): number {
    return Math.min(100, Math.max(0, (value ?? 0) * 10));
  }

  protected reviewComment(event: Event): void {
    this.reviewText.set((event.target as HTMLTextAreaElement).value);
  }

  protected commentDraft(event: Event): void {
    this.commentText.set((event.target as HTMLTextAreaElement).value);
  }

  protected openRating(): void {
    this.selectedRating.set(this.page()?.viewerState.myRating ?? 0);
    this.reviewText.set(this.page()?.viewerState.myReview ?? '');
    this.ratingOpen.set(true);
  }

  protected saveRating(): void {
    const page = this.page();
    if (!page || !this.selectedRating() || this.busy()) return;
    this.busy.set(true);
    const diaryEntryId = page.viewerState.latestDiaryEntryId;
    // Omitting watchedDate from PATCH preserves the original event date on the server.
    const request = diaryEntryId
      ? this.api.updateDiaryEntry(diaryEntryId, { score: this.selectedRating(), comment: this.reviewText().trim() })
      : this.api.createSeriesDiaryEntry({
          content: { type: 'EPISODE', seriesTmdbId: this.tmdbId(), seasonNumber: this.seasonNumber(), episodeNumber: this.episodeNumber(), runtimeMinutes: page.details.runtimeMinutes ?? undefined },
          score: this.selectedRating(),
          comment: this.reviewText().trim() || null,
          watchedDate: new Date().toISOString().slice(0, 10),
        });
    request.subscribe({
      next: () => { this.ratingOpen.set(false); this.busy.set(false); this.showToast('Avaliação salva.'); this.reload(); },
      error: (error: unknown) => { this.toasts.error(this.errorText(error)); this.busy.set(false); },
    });
  }

  protected markWatched(): void {
    const page = this.page();
    if (!page || this.busy()) return;
    this.busy.set(true);
    this.api.createSeriesDiaryEntry({
      content: { type: 'EPISODE', seriesTmdbId: this.tmdbId(), seasonNumber: this.seasonNumber(), episodeNumber: this.episodeNumber(), runtimeMinutes: page.details.runtimeMinutes ?? undefined },
      watchedDate: new Date().toISOString().slice(0, 10),
      isRewatch: this.alreadyWatched(),
    }).subscribe({
      next: () => { this.busy.set(false); this.showToast(this.alreadyWatched() ? 'Reassistida.' : 'Episódio marcado como assistido.'); this.reload(); },
      error: (error: unknown) => { this.toasts.error(this.errorText(error)); this.busy.set(false); },
    });
  }

  protected submitComment(event: SubmitEvent): void {
    event.preventDefault();
    const page = this.page();
    const text = this.commentText().trim();
    if (!page || !this.canSubmitComment()) return;
    this.busy.set(true);
    this.api.createComment(page.details.contentId, { text, parentCommentId: this.replyTo()?.id ?? null }).subscribe({
      next: (comment) => { this.mergeComments([comment]); this.commentText.set(''); this.replyTo.set(null); this.busy.set(false); },
      error: (error: unknown) => { this.toasts.error(this.errorText(error)); this.busy.set(false); },
    });
  }

  protected toggleCommentLike(comment: ContentComment): void {
    const liked = !comment.likedByMe;
    this.comments.update((items) => items.map((item) => item.id === comment.id ? { ...item, likedByMe: liked, likesCount: Math.max(0, item.likesCount + (liked ? 1 : -1)) } : item));
    this.api.setCommentLike(comment.id, liked).subscribe({
      error: () => this.comments.update((items) => items.map((item) => item.id === comment.id ? { ...item, likedByMe: !liked, likesCount: Math.max(0, item.likesCount + (liked ? -1 : 1)) } : item)),
    });
  }

  protected toggleReviewLike(review: ContentReview): void {
    const liked = !review.likedByMe;
    this.reviews.update((items) => items.map((item) => item.id === review.id ? { ...item, likedByMe: liked, likesCount: Math.max(0, item.likesCount + (liked ? 1 : -1)) } : item));
    this.api.setReviewLike(review.id, review.source, liked).subscribe({
      error: () => this.reviews.update((items) => items.map((item) => item.id === review.id ? { ...item, likedByMe: !liked, likesCount: Math.max(0, item.likesCount + (liked ? -1 : 1)) } : item)),
    });
  }

  protected episodeRoute(episode: SeriesChildCard): string[] {
    return ['/content/series', episode.seriesTmdbId || this.tmdbId(), 'season', String(episode.seasonNumber ?? 1), 'episode', String(episode.episodeNumber ?? 1)];
  }

  protected loadMoreReviews(): void {
    const current = this.reviewPage();
    const contentId = this.page()?.details.contentId;
    if (!contentId || !current?.hasNext || this.reviewsLoading()) return;
    this.reviewsLoading.set(true);
    this.reviewsError.set('');
    this.communityRequests.add(this.api.getReviews(contentId, current.page + 1, 'POPULAR').subscribe({
      next: response => {
        this.reviewPage.set(response);
        this.reviews.update(items => [...items, ...response.content]);
        this.reviewsLoading.set(false);
      },
      error: error => { this.reviewsLoading.set(false); this.reviewsError.set(this.errorText(error)); },
    }));
  }

  protected loadMoreComments(): void {
    const current = this.commentPage();
    const contentId = this.page()?.details.contentId;
    if (!contentId || !current?.hasNext || this.commentsLoading()) return;
    this.commentsLoading.set(true);
    this.commentsError.set('');
    this.communityRequests.add(this.api.getComments(contentId, current.page + 1).subscribe({
      next: response => {
        this.commentPage.set(response);
        this.mergeComments(response.content);
        this.commentsLoading.set(false);
      },
      error: error => { this.commentsLoading.set(false); this.commentsError.set(this.errorText(error)); },
    }));
  }

  protected initials(value: string | null | undefined): string {
    return (value ?? '').trim().split(/\s+/).slice(0, 2).map((part) => part[0] ?? '').join('').toLocaleUpperCase('pt-BR') || 'W';
  }

  private mergeComments(incoming: ContentComment[]): void {
    this.comments.update(current => [...new Map([...current, ...incoming].map(comment => [comment.id, comment])).values()]
      .sort((a, b) => (a.createdAt ?? '').localeCompare(b.createdAt ?? '') || a.id.localeCompare(b.id)));
  }

  protected showToast(message: string): void {
    this.toasts.success(message);
  }

  private load(tmdbId: string, seasonNumber: number, episodeNumber: number): void {
    this.request?.unsubscribe();
    this.communityRequests.unsubscribe();
    this.communityRequests = new Subscription();
    this.reviewPage.set(null);
    this.commentPage.set(null);
    this.reviewsLoading.set(false);
    this.commentsLoading.set(false);
    this.reviewsError.set('');
    this.commentsError.set('');
    this.tmdbId.set(tmdbId);
    this.seasonNumber.set(seasonNumber);
    this.episodeNumber.set(episodeNumber);
    this.status.set('loading');
    this.page.set(null);
    this.series.set(null);
    this.reviews.set([]);
    this.comments.set([]);
    if (!tmdbId || !Number.isInteger(seasonNumber) || !Number.isInteger(episodeNumber) || seasonNumber < 0 || episodeNumber < 1) {
      this.status.set('error');
      this.actionError.set('Este episódio não foi encontrado.');
      return;
    }
    this.request = this.api.createEpisodeReference(tmdbId, seasonNumber, episodeNumber).pipe(
      switchMap((episodeRef) => this.api.createSeriesReference(tmdbId).pipe(
        switchMap((seriesRef) => forkJoin({
          episode: this.api.getEpisodePage(episodeRef.id),
          series: this.api.getSeriesPage(seriesRef.id),
          reviews: this.api.getReviews(episodeRef.id, 1, 'POPULAR'),
          comments: this.api.getComments(episodeRef.id, 1),
        })),
      )),
    ).subscribe({
      next: ({ episode, series, reviews, comments }) => {
        if (episode.details.type !== 'EPISODE') {
          this.status.set('error');
          this.actionError.set('Este episódio não foi encontrado.');
          return;
        }
        this.page.set(episode);
        this.series.set(series);
        this.reviews.set(reviews.content);
        this.comments.set(comments.content);
        this.reviewPage.set(reviews);
        this.commentPage.set(comments);
        this.status.set('ready');
        if (this.openShareReviewAfterLoad) {
          this.openShareReviewAfterLoad = false;
          this.openSharePreview();
        }
      },
      error: (error: unknown) => { this.status.set('error'); this.actionError.set(this.errorText(error)); },
    });
  }

  private errorText(error: unknown): string {
    if (error instanceof HttpErrorResponse && error.status === 0) return 'Não foi possível conectar ao serviço. Tente novamente.';
    if (error instanceof HttpErrorResponse && error.status === 404) return 'Este episódio não está disponível.';
    return 'Não foi possível carregar esta tela agora. Tente novamente.';
  }
}
