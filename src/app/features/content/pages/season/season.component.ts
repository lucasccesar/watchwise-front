import { DOCUMENT, NgTemplateOutlet } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  HostListener,
  OnDestroy,
  Renderer2,
  ViewChild,
  computed,
  inject,
  signal,
} from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { Title } from '@angular/platform-browser';
import { forkJoin, Observable, Subscription, of, switchMap, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { AuthSessionService } from '../../../../core/session/session.service';
import { DialogBackdropComponent } from '../../../../shared/components/dialog-backdrop/dialog-backdrop.component';
import { CheckIconComponent } from '../../../../shared/components/check-icon/check-icon.component';
import { CommentItemComponent } from '../../../../shared/components/comment-item/comment-item.component';
import { buildCommentTree } from '../../../../shared/components/comment-item/comment-tree';
import { ContentImageAction, ContentImageActionSelection, ContentImageActionsComponent } from '../../../../shared/components/content-image-actions/content-image-actions.component';
import { ContentListSkeletonComponent } from '../../../../shared/components/content-list-skeleton/content-list-skeleton.component';
import { PageSkeletonComponent } from '../../../../shared/components/page-skeleton/page-skeleton.component';
import { ResponsiveBannerComponent } from '../../../../shared/components/responsive-banner/responsive-banner.component';
import { ToastNotificationType, ToastNotificationsService } from '../../../../shared/components/toast-notifications/toast-notifications.service';
import { ModalFocusDirective } from '../../../../shared/directives/modal-focus.directive';
import { ContentApiService, ContentComment, ContentPageStats, ContentPageResult, ContentReview, ContentSeasonSelection, ReviewSort, SeasonContentPage, SeasonEpisodeCard, UserListSummary } from '../../data-access/content-api.service';
import { tmdbImageUrl, type TmdbImageSize } from '../../../../shared/utils/tmdb-image-url';
import { resolveRating } from '../../../../shared/utils/community-rating';

type PageStatus = 'loading' | 'ready' | 'error';
type WatchDateMode = 'today' | 'specific' | 'release';
type RatingTarget = { type: 'SEASON' } | { type: 'EPISODE'; episode: SeasonEpisodeCard };

@Component({
  selector: 'app-season-content',
  standalone: true,
  imports: [NgTemplateOutlet, RouterLink, DialogBackdropComponent, ModalFocusDirective, CheckIconComponent, CommentItemComponent, ContentImageActionsComponent, ContentListSkeletonComponent, PageSkeletonComponent, ResponsiveBannerComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './season.component.html',
  styleUrl: './season.component.css',
})
export class SeasonComponent implements OnDestroy {
  protected readonly page = signal<SeasonContentPage | null>(null);
  protected readonly seasons = signal<ContentSeasonSelection[]>([]);
  protected readonly status = signal<PageStatus>('loading');
  protected readonly pageError = signal('');
  protected readonly tmdbId = signal('');
  protected readonly seasonNumber = signal(0);
  protected readonly contentId = signal('');
  protected readonly episodes = computed(() => this.page()?.sections?.episodes ?? []);
  protected readonly cast = computed(() => this.page()?.details.cast ?? []);
  protected readonly guestStars = computed(() => this.page()?.details.guestStars ?? []);
  protected readonly comments = signal<ContentComment[]>([]);
  protected readonly commentThreads = computed(() => buildCommentTree(this.comments()));
  protected readonly reviews = signal<ContentReview[]>([]);
  protected readonly reviewPage = signal<ContentPageResult<ContentReview> | null>(null);
  protected readonly commentPage = signal<ContentPageResult<ContentComment> | null>(null);
  protected readonly reviewStatus = signal<PageStatus>('loading');
  protected readonly commentStatus = signal<PageStatus>('loading');
  protected readonly reviewError = signal('');
  protected readonly commentError = signal('');
  protected readonly reviewSort = signal<ReviewSort>('POPULAR');
  protected readonly activeEpisodeMenu = signal<string | null>(null);
  protected readonly userLists = signal<UserListSummary[]>([]);
  protected readonly userListsPage = signal<ContentPageResult<UserListSummary> | null>(null);
  protected readonly userListsStatus = signal<PageStatus>('loading');
  protected readonly userListsError = signal('');
  protected readonly listsOpen = signal(false);
  protected readonly listCreateOpen = signal(false);
  protected readonly newListName = signal('');
  protected readonly watchDialogOpen = signal(false);
  protected readonly ratingDialogOpen = signal(false);
  protected readonly ratingTarget = signal<RatingTarget | null>(null);
  protected readonly ratingScore = signal(0);
  protected readonly ratingOptions = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
  protected readonly watchDateMode = signal<WatchDateMode>('today');
  protected readonly watchDate = signal(this.localDate(new Date()));
  protected readonly commentDraft = signal('');
  protected readonly replyTo = signal<ContentComment | null>(null);
  protected readonly detailsExpanded = signal(false);
  protected readonly actionPending = signal(false);
  protected readonly commentPending = signal(false);
  protected readonly reviewCount = computed(() => this.page()?.visibleReviewsCount ?? 0);
  protected readonly backdropUrl = computed(() => this.imageUrl(this.page()?.details.backdropPath, 'w1280'));
  protected readonly posterUrl = computed(() => this.imageUrl(this.page()?.details.customPosterUrl || this.page()?.details.posterPath, 'w500'));
  protected readonly seasonName = computed(() => this.page()?.details.title?.trim() || `Temporada ${this.seasonNumber()}`);
  protected readonly seriesName = computed(() => this.page()?.details.parentTitle?.trim() || 'Série');
  protected readonly watchedEpisodeCount = computed(() => this.episodes().filter((episode) => this.episodeIsWatched(episode)).length);
  protected readonly episodeCount = computed(() => this.page()?.details.episodeCount ?? this.episodes().length);
  protected readonly watched = computed(() => this.page()?.viewerState.watchStatus === 'WATCHED' || (this.episodeCount() > 0 && this.watchedEpisodeCount() >= this.episodeCount()));
  protected readonly progressLabel = computed(() => `${this.formatNumber(this.watchedEpisodeCount(), 0)} de ${this.formatNumber(this.episodeCount(), 0)} episódios assistidos`);
  protected readonly averageRuntime = computed(() => {
    const fromPage = this.page()?.details.runtimeMinutes;
    if (fromPage) return fromPage;
    const runtimes = this.episodes().map((episode) => episode.runtimeMinutes).filter((value): value is number => value !== null && value > 0);
    return runtimes.length ? Math.round(runtimes.reduce((sum, value) => sum + value, 0) / runtimes.length) : null;
  });
  protected readonly providers = computed(() => this.page()?.metadata.watchProviders ?? []);
  protected readonly crew = computed(() => this.page()?.details.crew ?? []);
  protected readonly genres = computed(() => this.page()?.details.genres ?? []);
  protected readonly countries = computed(() => this.page()?.details.countries ?? []);
  protected readonly commentMaxLength = 280;
  protected readonly canSubmitComment = computed(() => !!this.commentDraft().trim() && this.commentDraft().trim().length <= this.commentMaxLength && !this.commentPending());

  private readonly document = inject(DOCUMENT);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly api = inject(ContentApiService);
  private readonly title = inject(Title);
  private readonly renderer = inject(Renderer2);
  protected readonly session = inject(AuthSessionService);
  private readonly toasts = inject(ToastNotificationsService);
  private routeRequest?: Subscription;
  private request?: Subscription;
  private requests = new Subscription();
  private stylesheet: HTMLLinkElement | null = null;

  @ViewChild('seasonDialog')
  private seasonDialog?: ElementRef<HTMLElement>;

  constructor() {
    this.loadStylesheet();
    this.routeRequest = this.route.paramMap.subscribe((params) => {
      const tmdbId = params.get('tmdbId')?.trim() ?? '';
      const season = Number(params.get('seasonNumber'));
      this.loadSeason(tmdbId, season);
    });
  }

  ngOnDestroy(): void {
    this.routeRequest?.unsubscribe();
    this.request?.unsubscribe();
    this.requests.unsubscribe();
    if (this.stylesheet) this.renderer.removeChild(this.document.head, this.stylesheet);
  }

  protected reload(): void {
    this.loadSeason(this.tmdbId(), this.seasonNumber());
  }

  protected imageUrl(path: string | null | undefined, size: TmdbImageSize = 'w500'): string | null {
    return tmdbImageUrl(path, size);
  }

  protected formatNumber(value: number | null | undefined, maximumFractionDigits = 1): string {
    return new Intl.NumberFormat('pt-BR', { maximumFractionDigits }).format(value ?? 0);
  }

  protected formatRating(value: number | null | undefined): string {
    return value === null || value === undefined ? '0' : this.formatNumber(value, 1);
  }

  protected averageRating(stats: ContentPageStats): number | null {
    return resolveRating(stats.averageScore, stats.tmdbVoteAverage).value;
  }

  protected averageRatingCaption(stats: ContentPageStats): string {
    const rating = resolveRating(stats.averageScore, stats.tmdbVoteAverage);
    return rating.source === 'tmdb' ? 'Nota no TMDB' : `${this.formatNumber(stats.ratingsCount, 0)} avaliações`;
  }

  protected episodeRating(episode: SeasonEpisodeCard): number | null {
    return resolveRating(episode.stats.averageScore, episode.stats.tmdbVoteAverage).value;
  }

  protected episodeRatingLabel(episode: SeasonEpisodeCard): string {
    const rating = resolveRating(episode.stats.averageScore, episode.stats.tmdbVoteAverage);
    if (rating.value === null) return '';
    const source = rating.source === 'tmdb' ? 'Nota no TMDB' : 'Nota média da comunidade';
    return `${source}: ${this.formatRating(rating.value)} de 10`;
  }

  protected formatDate(value: string | null | undefined, options: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'short', year: 'numeric' }): string {
    if (!value) return '';
    const [year, month, day] = value.slice(0, 10).split('-').map(Number);
    if (!year || !month || !day) return '';
    return new Intl.DateTimeFormat('pt-BR', options).format(new Date(year, month - 1, day));
  }

  protected localDateForInput(): string {
    return this.localDate(new Date());
  }

  protected formatRuntime(minutes: number | null | undefined): string {
    if (!minutes || minutes < 0) return '';
    const hours = Math.floor(minutes / 60);
    const rest = minutes % 60;
    if (hours && rest) return `${hours}h ${rest}min`;
    return hours ? `${hours}h` : `${rest} min`;
  }

  protected ratingBarWidth(value: number | null | undefined): number {
    return Math.min(100, Math.max(0, (value ?? 0) * 10));
  }

  protected ratingCount(score: number): number {
    return this.page()?.stats.ratingsDistribution.find((entry) => entry.score === score)?.count ?? 0;
  }

  protected ratingBarHeight(score: number): number {
    const distribution = this.page()?.stats.ratingsDistribution ?? [];
    const maximum = Math.max(1, ...distribution.map((entry) => entry.count));
    return Math.max(2, Math.round((this.ratingCount(score) / maximum) * 56));
  }

  protected personInitials(name: string | null | undefined): string {
    return (name ?? '').trim().split(/\s+/).slice(0, 2).map((part) => part[0] ?? '').join('').toLocaleUpperCase('pt-BR') || 'W';
  }

  protected providerInitials(name: string): string {
    const first = name.trim().split(/\s+/)[0] ?? '';
    return first.endsWith('+') ? `${first.charAt(0)}+` : first.charAt(0).toLocaleUpperCase('pt-BR');
  }

  protected parentYear(): string {
    const year = this.page()?.details.parentReleaseYear;
    return year ? String(year) : this.page()?.details.releaseDate?.slice(0, 4) ?? '';
  }

  protected seasonRoute(season: ContentSeasonSelection): string[] {
    return ['/content/series', this.tmdbId(), 'season', String(season.seasonNumber)];
  }

  protected episodeRoute(episode: SeasonEpisodeCard): string[] {
    if (episode.seasonNumber === null || episode.episodeNumber === null) return ['/content/series', this.tmdbId()];
    return ['/content/series', episode.seriesTmdbId || this.tmdbId(), 'season', String(episode.seasonNumber), 'episode', String(episode.episodeNumber)];
  }

  protected episodeKey(episode: SeasonEpisodeCard): string {
    return `${episode.seasonNumber ?? this.seasonNumber()}-${episode.episodeNumber ?? 0}`;
  }

  protected episodeIsWatched(episode: SeasonEpisodeCard): boolean {
    return episode.viewerState.watchStatus === 'WATCHED';
  }

  protected episodeMyRating(episode: SeasonEpisodeCard): number | null {
    return episode.viewerState.myRating ?? null;
  }

  protected episodeActions(episode: SeasonEpisodeCard): readonly ContentImageAction[] {
    return [
      { id: 'watch', label: this.episodeIsWatched(episode) ? 'Assistir novamente' : 'Marcar como assistido', icon: 'check' },
      { id: 'rate', label: this.episodeMyRating(episode) === null ? 'Avaliar episódio' : 'Editar avaliação', icon: 'star' },
    ];
  }

  protected toggleEpisodeMenu(key: string, event: MouseEvent): void {
    event.stopPropagation();
    this.activeEpisodeMenu.update((active) => active === key ? null : key);
  }

  @HostListener('document:click', ['$event'])
  protected closeOpenMenus(event: MouseEvent): void {
    const target = event.target;
    if (target instanceof Element && target.closest('.season-lists-control, .season-card-menu')) return;
    this.activeEpisodeMenu.set(null);
    this.listsOpen.set(false);
  }

  protected episodeAction(episode: SeasonEpisodeCard, selection: ContentImageActionSelection): void {
    this.activeEpisodeMenu.set(null);
    if (selection.action.id === 'watch') this.markEpisodeWatched(episode);
    else if (selection.action.id === 'rate') this.openRating({ type: 'EPISODE', episode });
  }

  protected openBulkWatch(): void {
    if (!this.episodeCount()) return;
    this.watchDateMode.set('today');
    this.watchDate.set(this.localDate(new Date()));
    this.watchDialogOpen.set(true);
    queueMicrotask(() => this.seasonDialog?.nativeElement.focus());
  }

  protected saveBulkWatch(): void {
    const page = this.page();
    if (!page || this.actionPending() || !this.episodeCount()) return;
    const wasWatched = this.watched();
    const watchedDate = this.watchDateMode() === 'release' ? null : this.watchDate();
    this.runAction(this.api.createBulkSeriesDiaryEntry({
      content: { type: 'SEASON', seriesTmdbId: this.tmdbId(), seasonNumber: this.seasonNumber() },
      watchedDate,
    }, crypto.randomUUID()), () => {
      this.watchDialogOpen.set(false);
      this.showToast(wasWatched ? 'Temporada registrada novamente no diário.' : 'Temporada adicionada ao diário.');
      this.reload();
    });
  }

  protected openRating(target: RatingTarget = { type: 'SEASON' }): void {
    this.ratingTarget.set(target);
    this.ratingScore.set(target.type === 'SEASON' ? this.page()?.viewerState.myRating ?? 0 : target.episode.viewerState.myRating ?? 0);
    this.ratingDialogOpen.set(true);
    queueMicrotask(() => this.seasonDialog?.nativeElement.focus());
  }

  protected saveRating(): void {
    const target = this.ratingTarget();
    const page = this.page();
    const score = this.ratingScore();
    if (!target || !page || !score || this.actionPending()) return;
    const request = target.type === 'SEASON'
      ? this.api.setContentRating(page.details.contentId, score, page.viewerState.currentRatingVersion ?? null)
      : this.api.createSeriesDiaryEntry({
          content: {
            type: 'EPISODE',
            seriesTmdbId: this.tmdbId(),
            seasonNumber: target.episode.seasonNumber ?? this.seasonNumber(),
            episodeNumber: target.episode.episodeNumber ?? 1,
            runtimeMinutes: target.episode.runtimeMinutes ?? undefined,
          },
          score,
          watchedDate: this.localDate(new Date()),
        });
    this.runAction(request, () => {
      this.ratingDialogOpen.set(false);
      this.showToast('Avaliação salva.');
      this.reload();
    });
  }

  protected markEpisodeWatched(episode: SeasonEpisodeCard): void {
    if (episode.seasonNumber === null || episode.episodeNumber === null) return;
    this.runAction(this.api.createSeriesDiaryEntry({
      content: {
        type: 'EPISODE',
        seriesTmdbId: episode.seriesTmdbId || this.tmdbId(),
        seasonNumber: episode.seasonNumber,
        episodeNumber: episode.episodeNumber,
        runtimeMinutes: episode.runtimeMinutes ?? undefined,
      },
      watchedDate: this.localDate(new Date()),
      isRewatch: this.episodeIsWatched(episode),
    }), () => {
      this.showToast(this.episodeIsWatched(episode) ? 'Episódio registrado novamente.' : 'Episódio marcado como assistido.');
      this.reload();
    });
  }

  protected toggleLists(): void {
    const isOpen = !this.listsOpen();
    this.listsOpen.set(isOpen);
    if (isOpen && this.userListsStatus() !== 'ready') this.loadUserLists(1);
  }

  protected createList(): void {
    const name = this.newListName().trim();
    if (!name || this.actionPending()) return;
    this.runAction(this.api.createSeasonList(name, this.tmdbId(), this.seasonNumber()), () => {
      this.newListName.set('');
      this.listCreateOpen.set(false);
      this.showToast('Lista criada e temporada adicionada.');
      this.loadUserLists(1);
      this.refreshSeasonViewerState();
    });
  }

  protected loadUserLists(pageNumber: number): void {
    const userId = this.session.user()?.id;
    const contentId = this.contentId();
    if (!userId || !contentId) {
      this.userListsStatus.set('error');
      this.userListsError.set('Entre na sua conta para adicionar temporadas às listas.');
      return;
    }
    this.userListsStatus.set('loading');
    this.userListsError.set('');
    this.requests.add(this.api.getUserLists(userId, contentId, pageNumber).subscribe({
      next: (response) => {
        this.userListsPage.set(response);
        this.userLists.update((current) => pageNumber === 1 ? response.content : [...current, ...response.content]);
        this.userListsStatus.set('ready');
      },
      error: (error: unknown) => {
        if (!this.handleSessionError(error)) this.userListsError.set(this.errorMessage(error));
        this.userListsStatus.set('error');
      },
    }));
  }

  protected canAddToList(list: UserListSummary): boolean {
    return list.itemScope === null || list.itemScope === 'SEASON' || list.itemScope === 'MIXED';
  }

  protected toggleSeasonInList(list: UserListSummary): void {
    if (this.actionPending() || (list.containsContent !== true && !this.canAddToList(list))) return;
    this.listsOpen.set(false);
    this.listCreateOpen.set(false);
    this.newListName.set('');
    if (list.containsContent) {
      this.runAction(this.findSeasonItemInList(list.id, this.contentId(), 1).pipe(
        switchMap((itemId) => itemId ? this.api.removeListItem(list.id, itemId) : throwError(() => new Error('List item not found'))),
      ), () => {
        this.showToast('Temporada removida da lista.');
        this.updateSeasonListMembership(list, false);
      });
      return;
    }
    this.runAction(this.api.addSeasonToList(list.id, this.tmdbId(), this.seasonNumber()), () => {
      this.showToast('Temporada adicionada à lista.');
      this.updateSeasonListMembership(list, true);
    });
  }

  private updateSeasonListMembership(list: UserListSummary, containsContent: boolean): void {
    const updateList = (current: UserListSummary): UserListSummary => {
      if (current.id !== list.id) return current;
      const wasInList = current.containsContent === true;
      const countDelta = Number(containsContent) - Number(wasInList);
      return {
        ...current,
        containsContent,
        ...(current.itemsCount === undefined ? {} : { itemsCount: Math.max(0, current.itemsCount + countDelta) }),
      };
    };

    this.userLists.update((current) => current.map(updateList));
    this.userListsPage.update((current) => current
      ? { ...current, content: current.content.map(updateList) }
      : current);
    this.page.update((current) => {
      if (!current) return current;
      const lists = current.viewerState.lists.filter((item) => item.listId !== list.id);
      if (containsContent) lists.push({ listId: list.id, name: list.name, visibility: list.visibility });
      return { ...current, viewerState: { ...current.viewerState, lists } };
    });
  }

  private refreshSeasonViewerState(): void {
    const contentId = this.contentId();
    if (!contentId) return;
    this.requests.add(this.api.getSeasonPage(contentId).subscribe({
      next: (page) => this.page.update((current) => current
        ? { ...current, viewerState: page.viewerState }
        : current),
      error: (error: unknown) => {
        if (!this.handleSessionError(error)) this.showToast(this.errorMessage(error), 'error');
      },
    }));
  }

  protected loadMoreLists(): void {
    const current = this.userListsPage();
    if (current?.hasNext && this.userListsStatus() !== 'loading') this.loadUserLists(current.page + 1);
  }

  protected changeReviewSort(sort: ReviewSort): void {
    if (sort === this.reviewSort()) return;
    this.reviewSort.set(sort);
    this.reviews.set([]);
    this.loadReviews(1);
  }

  protected loadReviews(pageNumber: number): void {
    const contentId = this.contentId();
    if (!contentId) return;
    this.reviewStatus.set('loading');
    this.reviewError.set('');
    this.requests.add(this.api.getReviews(contentId, pageNumber, this.reviewSort()).subscribe({
      next: (response) => {
        this.reviewPage.set(response);
        this.reviews.update((current) => pageNumber === 1 ? response.content : [...current, ...response.content]);
        this.reviewStatus.set('ready');
      },
      error: (error: unknown) => {
        if (!this.handleSessionError(error)) this.reviewError.set(this.errorMessage(error));
        this.reviewStatus.set('error');
      },
    }));
  }

  protected loadComments(pageNumber: number): void {
    const contentId = this.contentId();
    if (!contentId) return;
    this.commentStatus.set('loading');
    this.commentError.set('');
    this.requests.add(this.api.getComments(contentId, pageNumber).subscribe({
      next: (response) => {
        this.commentPage.set(response);
        this.comments.update((current) => pageNumber === 1 ? response.content : [...current, ...response.content]);
        this.commentStatus.set('ready');
      },
      error: (error: unknown) => {
        if (!this.handleSessionError(error)) this.commentError.set(this.errorMessage(error));
        this.commentStatus.set('error');
      },
    }));
  }

  protected loadMoreReviews(): void {
    const current = this.reviewPage();
    if (current?.hasNext) this.loadReviews(current.page + 1);
  }

  protected loadMoreComments(): void {
    const current = this.commentPage();
    if (current?.hasNext) this.loadComments(current.page + 1);
  }

  protected reviewerName(review: ContentReview): string {
    return review.reviewer.name || `@${review.reviewer.username}`;
  }

  protected commentAuthorName(comment: ContentComment): string {
    return comment.user.name || `@${comment.user.username}`;
  }

  protected initials(value: string | null | undefined): string {
    return (value ?? '').trim().split(/\s+/).slice(0, 2).map((part) => part[0] ?? '').join('').toLocaleUpperCase('pt-BR') || 'W';
  }

  protected onCommentInput(event: Event): void {
    this.commentDraft.set((event.target as HTMLTextAreaElement).value);
  }

  protected submitComment(): void {
    const text = this.commentDraft().trim();
    if (!text || text.length > this.commentMaxLength || !this.contentId() || this.commentPending()) return;
    this.commentPending.set(true);
    this.requests.add(this.api.createComment(this.contentId(), { text, parentCommentId: this.replyTo()?.id ?? null }).subscribe({
      next: () => {
        this.commentPending.set(false);
        this.commentDraft.set('');
        this.replyTo.set(null);
        this.loadComments(1);
        this.reload();
      },
      error: (error: unknown) => {
        this.commentPending.set(false);
        if (!this.handleSessionError(error)) this.showToast(this.errorMessage(error), 'error');
      },
    }));
  }

  protected setReplyTo(comment: ContentComment): void {
    this.replyTo.set(comment);
    this.document.getElementById('season-comment-input')?.focus();
  }

  protected toggleCommentLike(comment: ContentComment): void {
    this.runAction(this.api.setCommentLike(comment.id, !comment.likedByMe), () => this.loadComments(1));
  }

  protected toggleReviewLike(review: ContentReview): void {
    this.runAction(this.api.setReviewLike(review.id, review.source, !review.likedByMe), () => this.loadReviews(1));
  }

  protected deleteComment(comment: ContentComment): void {
    if (comment.user.id !== this.session.user()?.id || !window.confirm('Excluir este comentário?')) return;
    this.runAction(this.api.deleteComment(comment.id), () => this.loadComments(1));
  }

  protected closeDialog(): void {
    this.watchDialogOpen.set(false);
    this.ratingDialogOpen.set(false);
  }

  protected providerLabel(type: 'flatrate' | 'rent' | 'buy'): string {
    return type === 'flatrate' ? 'Assinatura' : type === 'rent' ? 'Aluguel' : 'Compra';
  }

  protected showToast(message: string, type: ToastNotificationType = 'success'): void {
    this.toasts[type](message);
  }

  private loadSeason(tmdbId: string, seasonNumber: number): void {
    this.request?.unsubscribe();
    this.requests.unsubscribe();
    this.requests = new Subscription();
    this.page.set(null);
    this.seasons.set([]);
    this.status.set('loading');
    this.pageError.set('');
    this.tmdbId.set(tmdbId);
    this.seasonNumber.set(seasonNumber);
    this.contentId.set('');
    this.reviews.set([]);
    this.comments.set([]);
    this.reviewPage.set(null);
    this.commentPage.set(null);
    this.reviewStatus.set('loading');
    this.commentStatus.set('loading');
    this.userLists.set([]);
    this.userListsPage.set(null);
    this.userListsStatus.set('loading');
    this.listsOpen.set(false);
    this.listCreateOpen.set(false);
    this.newListName.set('');
    this.activeEpisodeMenu.set(null);
    this.detailsExpanded.set(false);
    if (!tmdbId || !Number.isInteger(seasonNumber) || seasonNumber < 1) {
      this.pageError.set('Esta temporada não foi encontrada.');
      this.status.set('error');
      return;
    }
    this.request = this.api.createSeasonReference(tmdbId, seasonNumber).pipe(
      switchMap((reference) => {
        this.contentId.set(reference.id);
        return forkJoin({
          page: this.api.getSeasonPage(reference.id),
          seasons: this.api.getSeriesSeasons(tmdbId).pipe(catchError(() => of([] as ContentSeasonSelection[]))),
        });
      }),
    ).subscribe({
      next: ({ page, seasons }) => {
        if (page.details.type !== 'SEASON') {
          this.pageError.set('Esta temporada não foi encontrada.');
          this.status.set('error');
          return;
        }
        this.page.set(page);
        this.seasons.set(seasons.filter((season) => season.seasonNumber > 0));
        this.title.setTitle(`${page.details.parentTitle || 'Série'} · ${page.details.title || `Temporada ${seasonNumber}`} | Watchwise`);
        this.status.set('ready');
        this.loadReviews(1);
        this.loadComments(1);
        if (this.listsOpen()) this.loadUserLists(1);
      },
      error: (error: unknown) => {
        if (!this.handleSessionError(error)) this.pageError.set(this.errorMessage(error));
        this.status.set('error');
      },
    });
  }

  private findSeasonItemInList(listId: string, contentId: string, pageNumber: number): Observable<string | null> {
    return this.api.getListItems(listId, pageNumber, 'SEASON').pipe(switchMap((response) => {
      const item = response.items.find((candidate) => candidate.content?.id === contentId);
      if (item) return of(item.id);
      return response.itemsHasNext ? this.findSeasonItemInList(listId, contentId, pageNumber + 1) : of(null);
    }));
  }

  private runAction<T>(request: Observable<T>, success: () => void): void {
    if (this.actionPending()) return;
    this.actionPending.set(true);
    this.requests.add(request.subscribe({
      next: () => {
        this.actionPending.set(false);
        success();
      },
      error: (error: unknown) => {
        this.actionPending.set(false);
        if (!this.handleSessionError(error)) this.showToast(this.errorMessage(error), 'error');
      },
    }));
  }

  private handleSessionError(error: unknown): boolean {
    if (!(error instanceof HttpErrorResponse) || error.status !== 401) return false;
    this.session.clear();
    void this.router.navigateByUrl('/login');
    return true;
  }

  private errorMessage(error: unknown): string {
    if (!(error instanceof HttpErrorResponse)) return 'Não foi possível carregar esta temporada.';
    if (error.status === 0) return 'Não foi possível conectar à API. Verifique sua conexão e tente novamente.';
    if (error.status === 400) return 'Confira os dados e tente novamente.';
    if (error.status === 403) return 'A API não autorizou esta ação.';
    if (error.status === 404) return 'Esta temporada não foi encontrada.';
    if (error.status === 429) return 'Muitas ações em pouco tempo. Aguarde e tente novamente.';
    return 'Não foi possível concluir esta ação.';
  }

  private localDate(date: Date): string {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  }

  private loadStylesheet(): void {
    const stylesheet = this.renderer.createElement('link') as HTMLLinkElement;
    this.renderer.setAttribute(stylesheet, 'rel', 'stylesheet');
    this.renderer.setAttribute(stylesheet, 'href', '/styles/movie-content.css');
    this.renderer.appendChild(this.document.head, stylesheet);
    this.stylesheet = stylesheet;
  }
}
