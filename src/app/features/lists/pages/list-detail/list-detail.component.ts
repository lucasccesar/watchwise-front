import { ModalFocusDirective } from '../../../../shared/directives/modal-focus.directive';
import { TooltipWhenTruncatedDirective } from '../../../../shared/directives/tooltip-when-truncated.directive';
import { NgTemplateOutlet } from '@angular/common';
import { SocialActionsMenuComponent, SocialActionMenuEvent } from '../../../../shared/components/social-actions-menu/social-actions-menu.component';
import { CommentItemComponent } from '../../../../shared/components/comment-item/comment-item.component';
import { buildCommentTree } from '../../../../shared/components/comment-item/comment-tree';
import { PageSkeletonComponent } from '../../../../shared/components/page-skeleton/page-skeleton.component';
import { ResponsiveBannerComponent } from '../../../../shared/components/responsive-banner/responsive-banner.component';
import { ToastNotificationsService } from '../../../../shared/components/toast-notifications/toast-notifications.service';
import { canAddContentToWatchlist, isContentFullyWatched, shouldShowContentWatchlistAction } from '../../../../shared/utils/content-watch-status';
import { WatchLogDialogComponent, WatchLogSubmission } from '../../../../shared/components/watch-log-dialog/watch-log-dialog.component';
import { SeriesBulkWatchDialogComponent, type SeriesBulkWatchSubmission } from '../../../../shared/components/series-bulk-watch-dialog/series-bulk-watch-dialog.component';
import { PostWatchRatingFlowComponent, type PostWatchRatingSaved, type PostWatchRatingTarget } from '../../../../shared/components/post-watch-rating-flow/post-watch-rating-flow.component';
import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, ElementRef, HostListener, OnDestroy, ViewChild, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { CdkDrag, CdkDropList, moveItemInArray, type CdkDragDrop } from '@angular/cdk/drag-drop';
import { distinctUntilChanged, map, of, Subscription, switchMap, throwError, type Observable } from 'rxjs';
import { AuthSessionService } from '../../../../core/session/session.service';
import { ContentApiService, type ContentPageResult, type UserListSummary } from '../../../content/data-access/content-api.service';
import { ContentImageAction, ContentImageActionSelection, ContentImageActionsComponent } from '../../../../shared/components/content-image-actions/content-image-actions.component';
import { ShareCardModel, SharePreviewComponent } from '../../../../shared/components/share-preview/share-preview.component';
import { messageCatalog } from '../../../../shared/i18n/messages';
import { tmdbImageUrl } from '../../../../shared/utils/tmdb-image-url';
import { resolveRating } from '../../../../shared/utils/community-rating';
import { episodeContentNavigationState, episodeContentRoute } from '../../../../shared/utils/episode-content-route';
import { CheckIconComponent } from '../../../../shared/components/check-icon/check-icon.component';
import { applyOrderMoves, buildOrderMoves, ListComment, ListContentReference, ListDetailItem, ListDetailView, ListOrderItem, ListOwner, ListsApiService, ListVisibility } from '../../data-access/lists-api.service';

type ListContentType = 'MOVIE' | 'SERIES' | 'SEASON' | 'EPISODE' | null;
type ListWatchStatus = 'WATCHED' | 'PARTIALLY_WATCHED' | 'UNWATCHED' | 'UNKNOWN' | null;
type ListDetailSort = 'position' | 'dateAdded' | 'duration' | 'episodeAvgRating' | 'globalEpisodeAvgRating' | 'contentAvgRating';
type DetailMenu = 'type' | 'genre' | 'sort' | 'status' | null;

@Component({
  selector: 'app-list-detail',
  standalone: true,
    imports: [NgTemplateOutlet, ModalFocusDirective, TooltipWhenTruncatedDirective, RouterLink, CdkDrag, CdkDropList, ContentImageActionsComponent, SharePreviewComponent, PageSkeletonComponent, ResponsiveBannerComponent, SocialActionsMenuComponent, CommentItemComponent, CheckIconComponent, WatchLogDialogComponent, SeriesBulkWatchDialogComponent, PostWatchRatingFlowComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './list-detail.component.html',
  styleUrl: './list-detail.component.css',
})
export class ListDetailComponent implements OnDestroy {
  @ViewChild('listMenuButton') protected listMenuTrigger?: ElementRef<HTMLElement>;
  @ViewChild('reorderSentinel') set reorderSentinel(ref: ElementRef<HTMLElement> | undefined) {
    this.orderObserver?.disconnect();
    this.orderObserver = undefined;
    if (!ref || typeof IntersectionObserver === 'undefined') return;
    this.orderObserver = new IntersectionObserver((entries) => {
      if (entries.some((entry) => entry.isIntersecting)) this.loadMoreOrder();
    }, { rootMargin: '240px 0px' });
    this.orderObserver.observe(ref.nativeElement);
  }
  protected readonly copy = messageCatalog['pt-BR'].listDetailPage;
  protected readonly listCopy = messageCatalog['pt-BR'].listsPage;
  protected readonly homeCopy = messageCatalog['pt-BR'].home;
  protected readonly trendingCopy = messageCatalog['pt-BR'].trendingPage;
  protected readonly listId = signal('');
  protected readonly detail = signal<ListDetailView | null>(null);
  protected readonly owner = signal<ListOwner | null>(null);
  protected readonly status = signal<'loading' | 'ready' | 'error'>('loading');
  protected readonly errorMessage = signal('');
  protected readonly page = signal(1);
  protected readonly type = signal<ListContentType>(null);
  protected readonly genre = signal<string | null>(null);
  protected readonly watchStatus = signal<ListWatchStatus>(null);
  protected readonly sort = signal<ListDetailSort>('position');
  protected readonly sortDirection = signal<'asc' | 'desc'>('asc');
  protected readonly activeMenu = signal<DetailMenu>(null);
  protected readonly listMenuOpen = signal(false);
  protected readonly activeImageMenu = signal<string | null>(null);
  protected readonly listPickerItem = signal<ListDetailItem | null>(null);
  protected readonly userLists = signal<UserListSummary[]>([]);
  protected readonly userListsPage = signal<ContentPageResult<UserListSummary> | null>(null);
  protected readonly userListsStatus = signal<'idle' | 'loading' | 'ready' | 'error'>('idle');
  protected readonly userListsLoadingMore = signal(false);
  protected readonly busyItemActionId = signal<string | null>(null);
  protected readonly watchDialogItem = signal<ListDetailItem | null>(null);
  protected readonly watchDialogOpener = signal<HTMLElement | null>(null);
  protected readonly watchDialogSaving = signal(false);
  protected readonly postWatchRatingTarget = signal<PostWatchRatingTarget | null>(null);
  protected readonly busyListId = signal<string | null>(null);
  protected readonly reorderMode = signal(false);
  protected readonly reorderDraft = signal<ListOrderItem[]>([]);
  protected readonly reorderInitialIds = signal<string[]>([]);
  protected readonly orderRevision = signal<string | null>(null);
  protected readonly orderCursor = signal<string | null>(null);
  protected readonly reorderLoading = signal(false);
  protected readonly reorderError = signal(false);
  protected readonly selectedOrderId = signal<string | null>(null);
  protected readonly savingItemOrder = signal(false);
  protected readonly reorderHasChanges = computed(() => {
    const current = this.reorderDraft().map((item) => item.id);
    const initial = this.reorderInitialIds();
    return current.length !== initial.length || current.some((id, index) => id !== initial[index]);
  });
  protected readonly reorderDragStartDelay = { touch: 150, mouse: 0 };
  protected readonly loadingPlaceholders = Array.from({ length: 30 }, (_, index) => index);
  protected readonly deleteListDialogOpen = signal(false);
  protected readonly deletingList = signal(false);
  protected readonly deleteItem = signal<ListDetailItem | null>(null);
  protected readonly deletingItemId = signal<string | null>(null);
  protected readonly shareDialogOpen = signal(false);
  protected readonly comments = signal<ListComment[]>([]);
  protected readonly commentsPage = signal(1);
  protected readonly commentsHasNext = signal(false);
  protected readonly commentsLoading = signal(false);
  protected readonly commentsError = signal(false);
  protected readonly commentText = signal('');
  protected readonly replyDraft = signal('');
  protected readonly replyingTo = signal<ListComment | null>(null);
  protected readonly postingComment = signal(false);
  protected readonly expandedSpoilers = signal<ReadonlySet<string>>(new Set());
  protected readonly commentDeleteTarget = signal<ListComment | null>(null);
  protected readonly deletingComment = signal(false);
  protected readonly itemCount = computed(() => this.detail()?.items.totalElements ?? 0);
  protected readonly totalPages = computed(() => Math.max(1, this.detail()?.items.totalPages ?? 1));
  protected readonly pageNumbers = computed(() => Array.from({ length: this.totalPages() }, (_, index) => index + 1));
  protected readonly currentUserId = computed(() => this.session.user()?.id ?? null);
  protected readonly shareModel = computed<ShareCardModel>(() => {
    const detail = this.detail();
    const user = this.owner() ?? this.session.user();
    const items = (detail?.items.content ?? []).map((item) => ({
      title: item.card?.title || item.nestedList?.name || 'Conteúdo indisponível',
      label: item.card?.title || item.nestedList?.name || 'Conteúdo indisponível',
      imageUrl: this.posterFor(item),
    }));
    return {
      kind: 'list',
      title: detail?.name || 'Lista',
      subtitle: `Lista de @${user?.username ?? ''}`,
      description: detail?.description,
      authorName: user?.name || user?.username || 'Watchwise',
      username: user?.username,
      avatarUrl: user?.profilePicture,
      backgroundUrl: items.find((item) => item.imageUrl)?.imageUrl,
      itemCount: detail?.items.totalElements ?? 0,
      items,
    };
  });
  protected readonly canManage = signal(false);
  protected readonly genreOptions = computed(() => [...new Set((this.detail()?.items.content ?? []).flatMap((item) => item.card?.genres ?? []))].sort((a, b) => a.localeCompare(b, 'pt-BR')));
  protected readonly items = computed(() => this.detail()?.items.content ?? []);
  protected readonly displayedItems = computed(() => this.items());
  protected readonly episodeItems = computed(() => this.detail()?.itemScope === 'EPISODE' || this.items().some((item) => item.card?.type === 'EPISODE'));
  protected readonly commentThreads = computed(() => buildCommentTree(this.comments()));

  private readonly api = inject(ListsApiService);
  private readonly contentApi = inject(ContentApiService);
  private readonly session = inject(AuthSessionService);
  private readonly toasts = inject(ToastNotificationsService);
  private readonly route = inject(ActivatedRoute);
  protected readonly router = inject(Router);
  private request?: Subscription;
  private orderRequest?: Subscription;
  private orderObserver?: IntersectionObserver;
  private refreshTargetIds: string[] | null = null;
  private refreshBaselineIds: string[] | null = null;
  private refreshExpectedRevision: string | null = null;
  private commentsRequest?: Subscription;
  private listPickerRequests = new Subscription();

  constructor() {
    this.route.paramMap.pipe(
      map((params) => params.get('listId') ?? ''),
      distinctUntilChanged(),
      takeUntilDestroyed(),
    ).subscribe((listId) => {
      if (!listId) {
        void this.router.navigateByUrl('/lists');
        return;
      }
      this.listId.set(listId);
      this.resetForListChange();
      this.load();
      this.loadComments(true);
    });
  }

  ngOnDestroy(): void {
    this.request?.unsubscribe();
    this.commentsRequest?.unsubscribe();
    this.clearOrderSession();
    this.listPickerRequests.unsubscribe();
  }

  protected load(preserveExisting = false): void {
    this.request?.unsubscribe();
    const keepCurrentView = preserveExisting && this.status() === 'ready' && this.detail() !== null;
    if (!keepCurrentView) {
      this.status.set('loading');
      this.errorMessage.set('');
    }
    const params = {
      page: this.page(),
      size: 30,
      type: this.type() ?? undefined,
      genre: this.genre() ?? undefined,
      watchStatus: this.watchStatus() ?? undefined,
      sortBy: this.sort(),
      sortDirection: this.sortDirection(),
    };
    const listId = this.listId();
    this.request = this.api.getDetail(listId, params).subscribe({
      next: (detail) => {
        this.detail.set(detail);
        const owner = detail.owner ?? null;
        this.owner.set(owner);
        this.canManage.set(owner?.id === this.currentUserId());
        this.status.set('ready');
      },
      error: (error: unknown) => {
        if (keepCurrentView) {
          this.toasts.error(this.copy.actionError);
          return;
        }
        this.status.set('error');
        this.errorMessage.set(error instanceof HttpErrorResponse && error.status === 0
          ? this.homeCopy.actionConnectionError
          : this.homeCopy.genericError);
      },
    });
  }

  protected loadComments(reset = false): void {
    if (this.commentsLoading()) return;
    const nextPage = reset ? 1 : this.commentsPage() + 1;
    this.commentsLoading.set(true);
    this.commentsRequest?.unsubscribe();
    this.commentsRequest = this.api.getComments(this.listId(), nextPage).subscribe({
      next: (page) => {
        this.comments.update((current) => reset ? page.content : [...current, ...page.content]);
        this.commentsPage.set(page.page);
        this.commentsHasNext.set(page.hasNext);
        this.commentsError.set(false);
        this.commentsLoading.set(false);
      },
      error: () => { this.commentsError.set(true); this.commentsLoading.set(false); },
    });
  }

  protected selectType(type: ListContentType): void { this.type.set(type); this.activeMenu.set(null); this.resetFilters(); }
  protected selectGenre(genre: string | null): void { this.genre.set(genre); this.activeMenu.set(null); this.resetFilters(); }
  protected selectWatchStatus(status: ListWatchStatus): void { this.watchStatus.set(status); this.activeMenu.set(null); this.resetFilters(); }
  protected selectSort(sort: ListDetailSort): void { this.sort.set(sort); this.activeMenu.set(null); this.resetFilters(); }
  protected toggleDirection(): void { this.sortDirection.update((direction) => direction === 'asc' ? 'desc' : 'asc'); this.load(); }
  protected toggleMenu(menu: Exclude<DetailMenu, null>): void { this.activeMenu.update((active) => active === menu ? null : menu); }
  protected goToPage(page: number): void { this.page.set(Math.max(1, Math.min(this.totalPages(), page))); this.load(); window.scrollTo({ top: 0, behavior: 'smooth' }); }
  protected scrollToComments(): void { document.getElementById('list-comments')?.scrollIntoView({ behavior: 'smooth', block: 'start' }); }
  protected toggleReorder(): void {
    if (this.savingItemOrder() || this.reorderMode()) return;
    this.reorderMode.set(true);
    this.listMenuOpen.set(false);
    this.beginOrderSession();
  }
  protected cancelItemOrder(): void {
    if (this.savingItemOrder()) return;
    this.finishReorderMode();
  }
  protected saveItemOrder(): void {
    if (!this.reorderMode() || !this.canManage() || this.savingItemOrder() || this.reorderLoading()) return;
    const revision = this.orderRevision();
    if (!revision) return;
    const baselineIds = this.reorderInitialIds();
    const targetIds = this.reorderDraft().map((item) => item.id);
    const movableIds = this.reorderDraft().filter((item) => item.movable).map((item) => item.id);
    const allMoves = buildOrderMoves(baselineIds, targetIds, movableIds);
    const moves = allMoves.slice(0, 100);
    if (!moves.length) return;
    const listId = this.listId();
    this.savingItemOrder.set(true);
    this.api.reorderListItems(listId, { revision, moves }).subscribe({
      next: (response) => {
        this.savingItemOrder.set(false);
        const newBaseline = applyOrderMoves(baselineIds, moves);
        if (moves.length < 100 || moves.length === allMoves.length) {
          this.toasts.success(this.copy.orderSaved);
          this.finishReorderMode();
          this.load(true);
          return;
        }
        this.reorderInitialIds.set(newBaseline);
        this.toasts.success(this.copy.orderSavedContinue);
        this.refreshLoadedPrefix(targetIds, newBaseline, response.revision);
      },
      error: () => {
        this.savingItemOrder.set(false);
        this.toasts.error(this.copy.reorderConflict);
        this.resetOrderAfterConflict();
      },
    });
  }
  protected toggleListMenu(): void { this.listMenuOpen.update((value) => !value); }
  protected openProgress(): void { void this.router.navigate(['/lists', this.listId(), 'progress']); this.listMenuOpen.set(false); }

  protected typeLabel(): string {
    const labels: Record<Exclude<ListContentType, null>, string> = {
      MOVIE: this.copy.movies, SERIES: this.copy.series, SEASON: this.copy.seasons, EPISODE: this.copy.episodes,
    };
    return this.type() ? labels[this.type()!] : this.copy.all;
  }

  protected sortLabel(): string {
    const labels: Record<ListDetailSort, string> = {
      position: this.copy.sortPosition,
      dateAdded: this.copy.sortDate,
      duration: this.copy.sortDuration,
      episodeAvgRating: this.copy.sortEpisodeRating,
      globalEpisodeAvgRating: this.copy.sortGlobalRating,
      contentAvgRating: this.copy.sortContentRating,
    };
    return labels[this.sort()];
  }

  protected statusLabel(): string {
    const labels: Record<Exclude<ListWatchStatus, null>, string> = {
      WATCHED: this.copy.watched,
      PARTIALLY_WATCHED: this.copy.partiallyWatched,
      UNWATCHED: this.copy.unwatched,
      UNKNOWN: this.copy.unknown,
    };
    return this.watchStatus() ? labels[this.watchStatus()!] : this.copy.allStatuses;
  }

  protected ratingFor(item: ListDetailItem): string | null {
    const communityRating = item.globalEpisodeAverageRating ?? item.contentAverageRating ?? item.card?.stats?.averageScore ?? null;
    const rating = resolveRating(communityRating, item.card?.tmdbVoteAverage).value;
    return rating === null ? null : new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 }).format(rating);
  }

  protected ratingLabel(item: ListDetailItem): string {
    const rating = this.ratingFor(item);
    if (!rating) return '';
    const communityRating = item.globalEpisodeAverageRating ?? item.contentAverageRating ?? item.card?.stats?.averageScore ?? null;
    const source = resolveRating(communityRating, item.card?.tmdbVoteAverage).source;
    return `${source === 'tmdb' ? this.homeCopy.tmdbRating : this.homeCopy.communityAverage}: ${rating}`;
  }

  protected posterFor(item: ListDetailItem, size: 'w342' | 'w780' | 'w1280' = 'w342'): string | null {
    const path = item.customPosterUrl || item.card?.customPosterUrl || item.card?.posterPath;
    if (!path || item.card?.previewStatus === 'UNAVAILABLE') return null;
    return tmdbImageUrl(path, size);
  }

  protected orderThumbnailUrl(item: ListOrderItem): string | null {
    return tmdbImageUrl(item.thumbnailUrl, 'w342');
  }

  protected contentRoute(item: ListDetailItem): string[] | null {
    const card = item.card;
    if (!card) return item.nestedList ? ['/lists', item.nestedList.id] : null;
    const id = card.tmdbId || card.seriesTmdbId;
    if (!id) return null;
    if (card.type === 'MOVIE') return ['/content/movie', id];
    if (card.type === 'EPISODE') return episodeContentRoute(card);
    if (card.type === 'SEASON' && card.seasonNumber !== null) return ['/content/series', id, 'season', String(card.seasonNumber)];
    if (card.type === 'SERIES') return ['/content/series', id];
    return null;
  }

  protected contentNavigationState(item: ListDetailItem): { contentId: string } | undefined {
    return item.card?.type === 'EPISODE' ? episodeContentNavigationState(item.card.contentId) : undefined;
  }

  protected imageActionsFor(item: ListDetailItem): readonly ContentImageAction[] {
    const card = item.card;
    if (!card) return [];
    const busy = this.busyItemActionId() === item.id || this.busyListId() !== null;
    const watchStatus = this.itemWatchStatus(item);
    const watched = isContentFullyWatched(watchStatus);
    const inWatchlist = this.itemInWatchlist(item);
    const supportsWatchlist = card.type === 'MOVIE' || card.type === 'SERIES';

    const actions: ContentImageAction[] = [
      {
        id: 'mark-watched',
        label: watched ? this.trendingCopy.watchAgain : this.trendingCopy.markWatched,
        icon: watched ? 'rewatch' : 'check',
        disabled: busy,
      },
      ...(supportsWatchlist && shouldShowContentWatchlistAction(watchStatus, inWatchlist) ? [{
        id: 'watchlist',
        label: inWatchlist ? this.trendingCopy.removeFromWatchlist : this.trendingCopy.wantToWatch,
        icon: inWatchlist ? 'bookmark-filled' : 'bookmark',
        disabled: busy,
      } as const] : []),
      {
        id: 'add-to-list',
        label: this.trendingCopy.addToList,
        icon: 'list',
        disabled: busy || !this.listContentReference(item),
      },
      ...(this.canManage()
        ? [{ id: 'remove-item', label: this.copy.removeItem, icon: 'trash' as const, disabled: busy }]
        : []),
    ];
    return actions;
  }

  protected openImageAction(item: ListDetailItem, selection: ContentImageActionSelection): void {
    if (selection.action.id !== 'add-to-list') this.activeImageMenu.set(null);
    switch (selection.action.id) {
      case 'mark-watched':
        this.openWatchDialog(item, selection.event);
        break;
      case 'watchlist':
        this.toggleItemWatchlist(item);
        break;
      case 'add-to-list':
        this.openAddToList(item);
        break;
      case 'remove-item':
        if (this.canManage()) this.deleteItem.set(item);
        break;
    }
  }

  protected toggleImageMenu(item: ListDetailItem, event: MouseEvent): void {
    event.stopPropagation();
    this.closeListPicker();
    this.activeImageMenu.update((id) => id === item.id ? null : item.id);
  }

  protected openAddToList(item: ListDetailItem): void {
    if (!this.session.user()?.id) {
      void this.router.navigateByUrl('/login');
      return;
    }
    if (!item.card?.contentId) {
      this.toasts.error(this.trendingCopy.listLoadError);
      return;
    }
    this.listPickerItem.set(item);
    this.userLists.set([]);
    this.userListsPage.set(null);
    this.userListsStatus.set('loading');
    this.listPickerRequests.unsubscribe();
    this.listPickerRequests = new Subscription();
    this.loadUserLists(1);
  }

  protected closeListPicker(): void {
    if (this.busyListId() !== null) return;
    this.resetListPicker();
  }

  private resetListPicker(): void {
    this.listPickerRequests.unsubscribe();
    this.listPickerRequests = new Subscription();
    this.listPickerItem.set(null);
    this.userLists.set([]);
    this.userListsPage.set(null);
    this.userListsStatus.set('idle');
    this.userListsLoadingMore.set(false);
    this.busyListId.set(null);
  }

  protected loadMoreUserLists(): void {
    const page = this.userListsPage();
    if (!page?.hasNext || this.busyListId() !== null || this.userListsLoadingMore()) return;
    this.loadUserLists(page.page + 1);
  }

  protected retryUserLists(): void {
    if (this.listPickerItem()) this.loadUserLists(1);
  }

  protected canToggleUserList(list: UserListSummary, item = this.listPickerItem()): boolean {
    return list.containsContent === true || (!!item && this.canAddContentToList(list, item));
  }

  protected toggleUserList(list: UserListSummary): void {
    const item = this.listPickerItem();
    const reference = item ? this.listContentReference(item) : null;
    if (!item || !reference || !this.canToggleUserList(list, item) || this.busyListId() !== null) return;

    const removing = list.containsContent === true;
    const request = removing
      ? this.findListItem(list.id, item).pipe(
          switchMap((itemId) => itemId
            ? this.api.removeItem(list.id, itemId)
            : throwError(() => new Error('O conteúdo indicado não foi encontrado na lista.'))),
        )
      : this.api.addItem(list.id, reference);

    this.busyListId.set(list.id);
    this.listPickerRequests.add(request.subscribe({
      next: () => {
        this.busyListId.set(null);
        this.userLists.update((lists) => lists.map((entry) => entry.id === list.id
          ? { ...entry, containsContent: !removing, itemsCount: Math.max(0, (entry.itemsCount ?? 0) + (removing ? -1 : 1)) }
          : entry));
        this.toasts.success(removing ? this.trendingCopy.listRemoved : this.trendingCopy.listAdded);
      },
      error: (error: unknown) => {
        this.busyListId.set(null);
        if (this.handleSessionError(error)) return;
        this.toasts.error(this.trendingCopy.actionError);
      },
    }));
  }

  protected createListFromPicker(): void {
    this.closeListPicker();
    void this.router.navigateByUrl('/lists/create');
  }

  protected itemInWatchlist(item: ListDetailItem): boolean {
    return item.card?.viewerState?.inWatchlist === true || item.contentState?.inWatchlist === true;
  }

  protected itemWatchStatus(item: ListDetailItem): string | null {
    return item.contentState?.watchStatus ?? item.card?.viewerState?.watchStatus ?? null;
  }

  protected busyListOption(listId: string): boolean {
    return this.busyListId() === listId;
  }

  private openWatchDialog(item: ListDetailItem, event: MouseEvent): void {
    if (!item.card || this.busyItemActionId()) return;
    if (!this.session.user()?.id) {
      void this.router.navigateByUrl('/login');
      return;
    }
    this.watchDialogItem.set(item);
    this.watchDialogOpener.set((event.currentTarget as HTMLElement | null)?.closest('app-content-image-actions')
      ?.querySelector<HTMLElement>('.content-menu-trigger') ?? null);
  }

  protected closeWatchDialog(): void {
    if (this.watchDialogSaving()) return;
    this.watchDialogItem.set(null);
    const opener = this.watchDialogOpener();
    this.watchDialogOpener.set(null);
    if (opener) window.setTimeout(() => opener.isConnected && opener.focus());
  }

  protected watchDialogTitle(item: ListDetailItem): string {
    return item.card?.viewerState?.watchStatus === 'WATCHED' || this.itemWatchStatus(item) === 'WATCHED'
      ? this.trendingCopy.watchAgain
      : this.trendingCopy.markWatched;
  }

  protected watchDialogAllowsRating(item: ListDetailItem): boolean {
    return item.card?.type === 'MOVIE' || item.card?.type === 'EPISODE';
  }

  protected watchDialogRatingType(item: ListDetailItem): 'MOVIE' | 'EPISODE' {
    return item.card?.type === 'EPISODE' ? 'EPISODE' : 'MOVIE';
  }

  protected watchDialogSubtitle(item: ListDetailItem): string {
    const card = item.card;
    if (!card) return '';
    if (card.type === 'SEASON') return `${this.homeCopy.seasonShort}${card.seasonNumber ?? ''}`;
    if (card.type === 'EPISODE') return `${this.homeCopy.seasonShort}${card.seasonNumber ?? ''} · ${this.homeCopy.episodeShort}${card.episodeNumber ?? ''}`;
    return card.type === 'SERIES' ? this.copy.series : this.copy.movies;
  }

  protected watchDialogBulkScope(item: ListDetailItem): 'SERIES' | 'SEASON' {
    return item.card?.type === 'SEASON' ? 'SEASON' : 'SERIES';
  }

  protected watchDialogBulkTitle(item: ListDetailItem): string {
    const title = item.card?.title || this.homeCopy.titleUnavailable;
    return this.itemWatchStatus(item) === 'WATCHED'
      ? `Registrar ${title} novamente`
      : `Marcar ${title} como assistida`;
  }

  protected watchDialogBulkSubtitle(item: ListDetailItem): string {
    const card = item.card;
    if (!card) return '';
    const year = card.releaseYear ? String(card.releaseYear) : null;
    const count = card.numberOfEpisodes;
    return [card.type === 'SEASON' ? this.watchDialogSubtitle(item) : year,
      count !== null ? `${this.formatNumber(count)} episódios` : null].filter(Boolean).join(' · ');
  }

  protected watchDialogBulkEpisodeCount(item: ListDetailItem): number | null {
    return item.card?.numberOfEpisodes ?? null;
  }

  protected saveBulkWatchDialog(submission: SeriesBulkWatchSubmission): void {
    const item = this.watchDialogItem();
    const card = item?.card;
    if (!item || !card || this.watchDialogSaving()) return;
    const isRewatch = this.itemWatchStatus(item) === 'WATCHED';
    const request = card.type === 'SERIES' && card.tmdbId
      ? this.contentApi.createBulkSeriesDiaryEntry({ content: { type: 'SERIES', tmdbId: card.tmdbId }, watchedDate: submission.watchedDate }, crypto.randomUUID())
      : card.type === 'SEASON' && card.seriesTmdbId && card.seasonNumber !== null
        ? this.contentApi.createBulkSeriesDiaryEntry({ content: { type: 'SEASON', seriesTmdbId: card.seriesTmdbId, seasonNumber: card.seasonNumber }, watchedDate: submission.watchedDate }, crypto.randomUUID())
        : null;
    if (!request) {
      this.toasts.error(this.trendingCopy.actionError);
      return;
    }
    this.watchDialogSaving.set(true);
    this.runItemAction(item, request, isRewatch ? this.trendingCopy.watchAgainSuccess : this.trendingCopy.markWatchedSuccess, () => {
      this.watchDialogSaving.set(false);
      this.watchDialogItem.set(null);
      this.updateItemViewerState(item.id, { watchStatus: 'WATCHED', lastWatchedDate: submission.watchedDate });
      this.load(true);
      const opener = this.watchDialogOpener();
      this.watchDialogOpener.set(null);
      if (opener) window.setTimeout(() => opener.isConnected && opener.focus());
      if ((card.type === 'SERIES' || card.type === 'SEASON') && card.contentId) {
        this.postWatchRatingTarget.set({
          type: card.type,
          contentId: card.contentId,
          title: card.title || this.homeCopy.titleUnavailable,
          subtitle: this.watchDialogBulkSubtitle(item),
          returnFocusTarget: opener,
        });
      }
    });
  }

  protected handlePostWatchRatingSaved(_event: PostWatchRatingSaved): void {
    this.postWatchRatingTarget.set(null);
    this.load(true);
  }

  private formatNumber(value: number): string {
    return new Intl.NumberFormat('pt-BR').format(value);
  }

  protected saveWatchDialog(submission: WatchLogSubmission): void {
    const item = this.watchDialogItem();
    if (!item || this.watchDialogSaving()) return;
    const request = this.createWatchRequest(item, submission);
    if (!request) {
      this.toasts.error(this.trendingCopy.actionError);
      return;
    }
    const wasWatched = submission.isRewatch || this.itemWatchStatus(item) === 'WATCHED';
    const successMessage = wasWatched ? this.trendingCopy.watchAgainSuccess : this.trendingCopy.markWatchedSuccess;
    const watchedDate = submission.watchedDate;
    this.watchDialogSaving.set(true);
    this.runItemAction(item, request, successMessage, () => {
      this.watchDialogSaving.set(false);
      this.watchDialogItem.set(null);
      this.updateItemViewerState(item.id, { watchStatus: 'WATCHED', lastWatchedDate: watchedDate });
      this.load(true);
      const opener = this.watchDialogOpener();
      this.watchDialogOpener.set(null);
      if (opener) window.setTimeout(() => opener.isConnected && opener.focus());
    });
  }

  private toggleItemWatchlist(item: ListDetailItem): void {
    const card = item.card;
    if (!card || (card.type !== 'MOVIE' && card.type !== 'SERIES')) return;
    if (!this.session.user()?.id) {
      void this.router.navigateByUrl('/login');
      return;
    }
    const removing = this.itemInWatchlist(item);
    if (!removing && !canAddContentToWatchlist(this.itemWatchStatus(item))) return;
    const request = this.createWatchlistRequest(item, removing);
    if (!request) {
      this.toasts.error(this.trendingCopy.actionError);
      return;
    }
    this.runItemAction(
      item,
      request,
      removing ? this.trendingCopy.watchlistRemoved : this.trendingCopy.watchlistSuccess,
      () => this.updateItemViewerState(item.id, { inWatchlist: !removing }),
    );
  }

  private runItemAction(item: ListDetailItem, request: Observable<unknown>, successMessage: string, onSuccess: () => void): void {
    if (this.busyItemActionId()) return;
    this.busyItemActionId.set(item.id);
    request.subscribe({
      next: () => {
        this.busyItemActionId.set(null);
        onSuccess();
        this.toasts.success(successMessage);
      },
      error: (error: unknown) => {
        this.busyItemActionId.set(null);
        this.watchDialogSaving.set(false);
        if (this.handleSessionError(error)) return;
        this.toasts.error(this.trendingCopy.actionError);
      },
    });
  }

  private createWatchRequest(item: ListDetailItem, submission: WatchLogSubmission): Observable<unknown> | null {
    const card = item.card;
    if (!card) return null;
    const watchedDate = submission.watchedDate;
    const isRewatch = submission.isRewatch || this.itemWatchStatus(item) === 'WATCHED';
    switch (card.type) {
      case 'MOVIE':
        return card.tmdbId
          ? this.contentApi.createDiaryEntry({
              content: { type: 'MOVIE', tmdbId: card.tmdbId },
              watchedDate,
              isRewatch,
              watchedInTheater: submission.watchedInTheater ?? false,
              watchedWith: submission.watchedWith,
              score: submission.score,
              comment: submission.comment || null,
            })
          : null;
      case 'SERIES':
        return card.tmdbId
          ? this.contentApi.createBulkSeriesDiaryEntry({ content: { type: 'SERIES', tmdbId: card.tmdbId }, watchedDate }, crypto.randomUUID())
          : null;
      case 'SEASON':
        return card.seriesTmdbId && card.seasonNumber !== null
          ? this.contentApi.createBulkSeriesDiaryEntry({ content: { type: 'SEASON', seriesTmdbId: card.seriesTmdbId, seasonNumber: card.seasonNumber }, watchedDate }, crypto.randomUUID())
          : null;
      case 'EPISODE':
        return card.seriesTmdbId && card.seasonNumber !== null && card.episodeNumber !== null
          ? this.contentApi.createSeriesDiaryEntry({ content: { type: 'EPISODE', seriesTmdbId: card.seriesTmdbId, seasonNumber: card.seasonNumber, episodeNumber: card.episodeNumber, runtimeMinutes: card.runtimeMinutes ?? undefined }, watchedDate, isRewatch, watchedInTheater: false, score: submission.score, comment: submission.comment || null })
          : null;
      default:
        return null;
    }
  }

  private createWatchlistRequest(item: ListDetailItem, removing: boolean): Observable<unknown> | null {
    const card = item.card;
    if (!card?.tmdbId || (card.type !== 'MOVIE' && card.type !== 'SERIES')) return null;
    if (!removing) {
      return card.type === 'MOVIE'
        ? this.contentApi.addToWatchlist(card.tmdbId)
        : this.contentApi.addSeriesToWatchlist(card.tmdbId);
    }

    const referenceRequest = card.type === 'MOVIE'
      ? this.contentApi.createMovieReference(card.tmdbId)
      : this.contentApi.createSeriesReference(card.tmdbId);
    return referenceRequest.pipe(switchMap((reference) => card.type === 'MOVIE'
      ? this.contentApi.getPage(reference.id).pipe(switchMap((page) => page.viewerState.watchlistEntryId
          ? this.contentApi.removeFromWatchlist(page.viewerState.watchlistEntryId)
          : throwError(() => new Error('A API não retornou o registro da watchlist.'))))
      : this.contentApi.getSeriesPage(reference.id).pipe(switchMap((page) => page.viewerState.watchlistEntryId
          ? this.contentApi.removeSeriesFromWatchlist(page.viewerState.watchlistEntryId)
          : throwError(() => new Error('A API não retornou o registro da watchlist.'))))));
  }

  private loadUserLists(pageNumber: number): void {
    const userId = this.session.user()?.id;
    const item = this.listPickerItem();
    const contentId = item?.card?.contentId;
    if (!userId || !contentId) {
      this.userListsStatus.set('error');
      return;
    }
    if (pageNumber === 1) {
      this.userListsStatus.set('loading');
      this.userLists.set([]);
      this.userListsLoadingMore.set(false);
    } else {
      this.userListsLoadingMore.set(true);
    }
    this.listPickerRequests.add(this.contentApi.getUserLists(userId, contentId, pageNumber).subscribe({
      next: (response) => {
        this.userListsPage.set(response);
        this.userLists.update((lists) => pageNumber === 1 ? response.content : [...lists, ...response.content]);
        this.userListsStatus.set('ready');
        this.userListsLoadingMore.set(false);
      },
      error: (error: unknown) => {
        this.userListsLoadingMore.set(false);
        if (this.handleSessionError(error)) return;
        this.userListsStatus.set('error');
      },
    }));
  }

  private findListItem(listId: string, item: ListDetailItem, pageNumber = 1): Observable<string | null> {
    const card = item.card;
    if (!card) return of(null);
    return this.api.getDetail(listId, { page: pageNumber, size: 30, type: card.type as 'MOVIE' | 'SERIES' | 'SEASON' | 'EPISODE' }).pipe(
      switchMap((detail) => {
        const match = detail.items.content.find((candidate) => this.sameListContent(candidate, item));
        if (match) return of(match.id);
        return detail.items.hasNext ? this.findListItem(listId, item, pageNumber + 1) : of(null);
      }),
    );
  }

  private sameListContent(candidate: ListDetailItem, item: ListDetailItem): boolean {
    const left = candidate.card;
    const right = item.card;
    if (!left || !right || left.type !== right.type) return false;
    if (right.type === 'MOVIE' || right.type === 'SERIES') return left.tmdbId === right.tmdbId;
    if (right.type === 'SEASON') return left.seriesTmdbId === right.seriesTmdbId && left.seasonNumber === right.seasonNumber;
    if (right.type === 'EPISODE') return left.seriesTmdbId === right.seriesTmdbId && left.seasonNumber === right.seasonNumber && left.episodeNumber === right.episodeNumber;
    return false;
  }

  private listContentReference(item: ListDetailItem): ListContentReference | null {
    const card = item.card;
    if (!card) return null;
    if (card.type === 'MOVIE' && card.tmdbId) return { type: 'MOVIE', tmdbId: card.tmdbId };
    if (card.type === 'SERIES' && card.tmdbId) return { type: 'SERIES', tmdbId: card.tmdbId };
    if (card.type === 'SEASON' && card.seriesTmdbId && card.seasonNumber !== null) return { type: 'SEASON', seriesTmdbId: card.seriesTmdbId, seasonNumber: card.seasonNumber };
    if (card.type === 'EPISODE' && card.seriesTmdbId && card.seasonNumber !== null && card.episodeNumber !== null) return { type: 'EPISODE', seriesTmdbId: card.seriesTmdbId, seasonNumber: card.seasonNumber, episodeNumber: card.episodeNumber };
    return null;
  }

  private canAddContentToList(list: UserListSummary, item: ListDetailItem): boolean {
    const type = item.card?.type;
    if (!type || !this.listContentReference(item)) return false;
    if (list.itemScope === null || list.itemScope === 'MIXED') return true;
    if (type === 'MOVIE' || type === 'SERIES') return list.itemScope === 'MOVIE_OR_SERIES';
    return list.itemScope === type;
  }

  private updateItemViewerState(itemId: string, change: Partial<NonNullable<ListDetailItem['contentState']>>): void {
    const update = (item: ListDetailItem): ListDetailItem => {
      if (item.id !== itemId || !item.card) return item;
      const contentState = item.contentState;
      const viewerState = item.card.viewerState;
      return {
        ...item,
        contentState: {
          watchStatus: change.watchStatus ?? contentState?.watchStatus ?? 'UNKNOWN',
          lastWatchedDate: change.lastWatchedDate ?? contentState?.lastWatchedDate ?? null,
          myRating: change.myRating ?? contentState?.myRating ?? viewerState?.myRating ?? null,
          inWatchlist: change.inWatchlist ?? contentState?.inWatchlist ?? viewerState?.inWatchlist ?? null,
        },
        card: {
          ...item.card,
          viewerState: {
            watchStatus: change.watchStatus ?? viewerState?.watchStatus ?? contentState?.watchStatus ?? null,
            myRating: change.myRating ?? viewerState?.myRating ?? contentState?.myRating ?? null,
            lastWatchedDate: change.lastWatchedDate ?? viewerState?.lastWatchedDate ?? contentState?.lastWatchedDate ?? null,
            inWatchlist: change.inWatchlist ?? viewerState?.inWatchlist ?? contentState?.inWatchlist ?? null,
          },
        },
      };
    };
    this.detail.update((detail) => detail ? { ...detail, items: { ...detail.items, content: detail.items.content.map(update) } } : detail);
  }

  private handleSessionError(error: unknown): boolean {
    if (error instanceof HttpErrorResponse && error.status === 401) {
      this.session.clear();
      void this.router.navigateByUrl('/login');
      return true;
    }
    return false;
  }

  @HostListener('document:click', ['$event'])
  protected dismissItemMenus(event: MouseEvent): void {
    const target = event.target;
    if (target instanceof Element && target.closest('.content-menu-anchor, .list-detail-list-picker')) return;
    this.activeImageMenu.set(null);
    if (this.busyListId() === null) this.closeListPicker();
  }

  protected statusText(item: ListDetailItem): string | null {
    const status = item.contentState?.watchStatus;
    if (status === 'WATCHED') return this.copy.watched;
    if (status === 'PARTIALLY_WATCHED') return this.copy.partiallyWatched;
    if (item.contentState?.inWatchlist) return this.copy.inWatchlist;
    return null;
  }

  protected watchedDateFor(item: ListDetailItem): string | null {
    return item.contentState?.lastWatchedDate ?? item.card?.viewerState?.lastWatchedDate ?? null;
  }

  protected viewerRatingFor(item: ListDetailItem): number | null {
    return item.contentState?.myRating ?? item.card?.viewerState?.myRating ?? null;
  }

  protected viewerRatingLabel(item: ListDetailItem): string {
    const rating = this.viewerRatingFor(item);
    return rating === null ? '' : `${this.trendingCopy.yourRating}: ${rating} / 10`;
  }

  protected dateLabel(value: string): string {
    let date: Date;
    if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
      const [year, month, day] = value.split('-').map(Number);
      date = new Date(year, month - 1, day);
    } else {
      date = new Date(value);
    }
    return new Intl.DateTimeFormat('pt-BR', { day: 'numeric', month: 'short', year: 'numeric' }).format(date);
  }

  protected durationLabel(minutes: number | null | undefined): string {
    if (minutes === null || minutes === undefined) return '0 min';
    const days = Math.floor(minutes / 1440);
    const hours = Math.floor(minutes % 1440 / 60);
    const remainder = minutes % 60;
    if (days) return `${days}d ${hours}h`;
    if (hours) return remainder ? `${hours}h ${remainder}min` : `${hours}h`;
    return `${remainder} min`;
  }

  protected listRuntime(): string { return this.durationLabel(this.detail()?.totalRuntimeMinutes); }
  protected updatedLabel(): string { return this.detail() ? this.copy.updated.replace('{date}', this.dateLabel(this.detail()!.updatedAt)) : ''; }
  protected pageLabel(): string { return this.copy.page.replace('{page}', String(this.page())).replace('{total}', String(this.totalPages())); }
  protected heroBackdrop(): string | null {
    return this.detail()?.backdropPath ?? null;
  }
  protected visibilityLabel(visibility: ListVisibility): string {
    return visibility === 'PRIVATE' ? this.listCopy.private : visibility === 'FOLLOWERS' ? this.listCopy.followers : this.listCopy.public;
  }

  protected toggleLike(): void {
    const current = this.detail();
    if (!current) return;
    const liked = !current.likedByMe;
    this.api.setLiked(current.id, liked).subscribe({
      next: () => this.detail.update((value) => value ? { ...value, likedByMe: liked, likesCount: (value.likesCount ?? 0) + (liked ? 1 : -1) } : value),
      error: () => this.toasts.error(this.copy.actionError),
    });
  }

  protected copyLink(): void {
    const link = `${window.location.origin}/lists/${encodeURIComponent(this.listId())}`;
    void navigator.clipboard.writeText(link)
      .then(() => this.toasts.success(this.copy.copied))
      .catch(() => this.toasts.error(this.copy.actionError));
    this.listMenuOpen.set(false);
  }

  protected openSharePreview(): void { this.shareDialogOpen.set(true); this.listMenuOpen.set(false); }
  protected shareLink(): string { return `${window.location.origin}/lists/${encodeURIComponent(this.listId())}`; }

  protected openEdit(): void {
    if (!this.detail() || !this.canManage()) return;
    this.listMenuOpen.set(false);
    void this.router.navigate(['/lists', this.listId(), 'edit']);
  }

  protected confirmDeleteList(): void {
    if (!this.canManage() || this.deletingList()) return;
    this.deletingList.set(true);
    this.api.deleteList(this.listId()).subscribe({
      next: () => { this.deletingList.set(false); this.deleteListDialogOpen.set(false); void this.router.navigateByUrl('/lists'); },
      error: () => { this.deletingList.set(false); this.toasts.error(this.copy.actionError); },
    });
  }

  protected confirmDeleteItem(): void {
    const item = this.deleteItem();
    if (!item || this.deletingItemId()) return;
    this.deletingItemId.set(item.id);
    this.api.removeItem(this.listId(), item.id).subscribe({
      next: () => { this.deletingItemId.set(null); this.deleteItem.set(null); this.load(true); },
      error: () => { this.deletingItemId.set(null); this.toasts.error(this.copy.deleteError); },
    });
  }

  protected dropOrderItem(event: CdkDragDrop<ListOrderItem[]>): void {
    if (!this.reorderMode() || !this.canManage() || this.savingItemOrder() || event.previousContainer !== event.container) return;
    const current = this.reorderDraft();
    const item = current[event.previousIndex];
    const target = current[event.currentIndex];
    if (!item?.movable || !target?.movable || event.previousIndex === event.currentIndex || !this.canMoveWithinOrderSegment(current, event.previousIndex, event.currentIndex)) return;

    const reordered = [...current];
    moveItemInArray(reordered, event.previousIndex, event.currentIndex);
    this.reorderDraft.set(reordered);
    this.selectedOrderId.set(null);
  }

  protected moveOrderItem(itemId: string, offset: number): void {
    if (this.savingItemOrder() || this.reorderLoading()) return;
    const current = this.reorderDraft();
    const fromIndex = current.findIndex((item) => item.id === itemId);
    const toIndex = fromIndex + offset;
    if (fromIndex < 0 || toIndex < 0 || toIndex >= current.length ||
      !current[fromIndex]?.movable || !current[toIndex]?.movable || !this.canMoveWithinOrderSegment(current, fromIndex, toIndex)) return;
    const reordered = [...current];
    moveItemInArray(reordered, fromIndex, toIndex);
    this.reorderDraft.set(reordered);
  }

  protected loadMoreOrder(): void {
    if (!this.reorderMode() || !this.canManage() || this.reorderLoading() || this.savingItemOrder()) return;
    if (this.orderRevision() !== null && this.orderCursor() === null) return;
    this.loadOrderPage(this.orderCursor());
  }

  protected selectOrDropAfter(id: string): void {
    const selected = this.selectedOrderId();
    const current = this.reorderDraft();
    const targetIndex = current.findIndex((item) => item.id === id);
    if (!selected) {
      if (current[targetIndex]?.movable) this.selectedOrderId.set(id);
      return;
    }
    if (selected === id) {
      this.selectedOrderId.set(null);
      return;
    }
    const fromIndex = current.findIndex((item) => item.id === selected);
    if (fromIndex < 0 || targetIndex < 0 || !current[targetIndex]?.movable || !this.canMoveWithinOrderSegment(current, fromIndex, targetIndex)) return;
    const reordered = [...current];
    const [moved] = reordered.splice(fromIndex, 1);
    const anchorIndex = reordered.findIndex((item) => item.id === id);
    reordered.splice(anchorIndex + 1, 0, moved);
    this.reorderDraft.set(reordered);
    this.selectedOrderId.set(null);
  }

  protected setCommentText(event: Event): void { this.commentText.set((event.target as HTMLTextAreaElement).value); }
  protected setReplyText(event: Event): void { this.replyDraft.set((event.target as HTMLTextAreaElement).value); }

  protected submitComment(event: Event, parentComment?: ListComment): void {
    event.preventDefault();
    const text = (parentComment ? this.replyDraft() : this.commentText()).trim();
    if (!text || this.postingComment()) return;
    this.postingComment.set(true);
    this.api.createComment(this.listId(), { text, parentCommentId: parentComment?.id ?? null }).subscribe({
      next: (comment) => {
        this.comments.update((current) => [...current, comment]);
        this.detail.update((detail) => detail ? { ...detail, commentsCount: detail.commentsCount + 1 } : detail);
        if (parentComment) {
          this.replyDraft.set('');
          this.replyingTo.set(null);
        } else {
          this.commentText.set('');
        }
        this.postingComment.set(false);
      },
      error: () => { this.postingComment.set(false); this.toasts.error(this.copy.actionError); },
    });
  }

  protected repliesTo(comment: ListComment): ListComment[] { return this.comments().filter((entry) => entry.parentCommentId === comment.id); }
  protected toggleReply(comment: ListComment): void {
    this.replyDraft.set('');
    this.replyingTo.update((current) => current?.id === comment.id ? null : comment);
  }
  protected cancelReply(): void { this.replyingTo.set(null); this.replyDraft.set(''); }
  protected spoilerExpanded(comment: ListComment): boolean { return this.expandedSpoilers().has(comment.id); }
  protected toggleSpoiler(comment: ListComment): void {
    this.expandedSpoilers.update((current) => {
      const next = new Set(current);
      if (next.has(comment.id)) next.delete(comment.id); else next.add(comment.id);
      return next;
    });
  }

  protected handleCommentModeration(event: SocialActionMenuEvent): void {
    if (event.action !== 'blocked') return;
    const removedIds = new Set(this.comments().filter((comment) => comment.user.id === event.userId).map((comment) => comment.id));
    let changed = true;
    while (changed) {
      changed = false;
      for (const comment of this.comments()) {
        if (comment.parentCommentId && removedIds.has(comment.parentCommentId) && !removedIds.has(comment.id)) {
          removedIds.add(comment.id);
          changed = true;
        }
      }
    }
    this.comments.update((comments) => comments.filter((comment) => !removedIds.has(comment.id)));
    this.detail.update((detail) => detail ? {
      ...detail,
      commentsCount: Math.max(0, detail.commentsCount - removedIds.size),
    } : detail);
  }

  protected toggleCommentLike(comment: ListComment): void {
    const liked = !comment.likedByMe;
    this.contentApi.setCommentLike(comment.id, liked).subscribe({
      next: () => this.comments.update((current) => current.map((entry) => entry.id === comment.id
        ? { ...entry, likedByMe: liked, likesCount: Math.max(0, entry.likesCount + (liked ? 1 : -1)) }
        : entry)),
      error: () => this.commentsError.set(true),
    });
  }

  protected confirmDeleteComment(): void {
    const comment = this.commentDeleteTarget();
    if (!comment || this.deletingComment()) return;
    this.deletingComment.set(true);
    this.contentApi.deleteComment(comment.id).subscribe({
      next: () => {
        this.comments.update((items) => items.filter((item) => item.id !== comment.id && item.parentCommentId !== comment.id));
        this.detail.update((detail) => detail ? { ...detail, commentsCount: Math.max(0, detail.commentsCount - 1) } : detail);
        this.commentDeleteTarget.set(null);
        this.deletingComment.set(false);
      },
      error: () => { this.deletingComment.set(false); this.toasts.error(this.copy.actionError); },
    });
  }

  protected relativeDate(value: string): string {
    const minutes = Math.max(0, Math.floor((Date.now() - new Date(value).getTime()) / 60000));
    if (minutes < 1) return 'agora';
    if (minutes < 60) return `há ${minutes} min`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `há ${hours} h`;
    const days = Math.floor(hours / 24);
    if (days < 30) return `há ${days} d`;
    return this.dateLabel(value);
  }

  protected userAvatar(user: ListOwner): string | null { return user.profilePicture; }
  protected currentUserAvatar(): string | null { return this.session.user()?.profilePicture ?? null; }
  protected isOwnComment(comment: ListComment): boolean { return comment.user.id === this.currentUserId(); }

  private resetForListChange(): void {
    this.request?.unsubscribe();
    this.commentsRequest?.unsubscribe();
    this.clearOrderSession();
    this.detail.set(null);
    this.owner.set(null);
    this.canManage.set(false);
    this.status.set('loading');
    this.errorMessage.set('');
    this.page.set(1);
    this.type.set(null);
    this.genre.set(null);
    this.watchStatus.set(null);
    this.sort.set('position');
    this.sortDirection.set('asc');
    this.activeMenu.set(null);
    this.listMenuOpen.set(false);
    this.activeImageMenu.set(null);
    this.resetListPicker();
    this.busyItemActionId.set(null);
    this.reorderMode.set(false);
    this.reorderDraft.set([]);
    this.reorderInitialIds.set([]);
    this.orderRevision.set(null);
    this.orderCursor.set(null);
    this.selectedOrderId.set(null);
    this.savingItemOrder.set(false);
    this.deleteListDialogOpen.set(false);
    this.deleteItem.set(null);
    this.deletingItemId.set(null);
    this.comments.set([]);
    this.commentsPage.set(1);
    this.commentsHasNext.set(false);
    this.commentsLoading.set(false);
    this.commentsError.set(false);
    this.commentText.set('');
    this.replyDraft.set('');
    this.replyingTo.set(null);
    this.expandedSpoilers.set(new Set());
    this.commentDeleteTarget.set(null);
  }

  private resetFilters(): void { this.page.set(1); this.load(); }

  private finishReorderMode(): void {
    this.clearOrderSession();
    this.reorderMode.set(false);
    this.reorderDraft.set([]);
    this.reorderInitialIds.set([]);
    this.orderRevision.set(null);
    this.orderCursor.set(null);
    this.selectedOrderId.set(null);
  }

  private beginOrderSession(): void {
    this.request?.unsubscribe();
    this.clearOrderSession();
    this.reorderDraft.set([]);
    this.reorderInitialIds.set([]);
    this.orderRevision.set(null);
    this.orderCursor.set(null);
    this.selectedOrderId.set(null);
    this.loadOrderPage(null);
  }

  private loadOrderPage(cursor: string | null): void {
    this.reorderLoading.set(true);
    this.reorderError.set(false);
    this.orderRequest?.unsubscribe();
    this.orderRequest = this.api.getListItemsOrder(this.listId(), cursor).subscribe({
      next: (page) => {
        if (this.refreshExpectedRevision && page.revision !== this.refreshExpectedRevision) {
          this.resetOrderAfterConflict();
          return;
        }
        if (this.orderRevision() && this.orderRevision() !== page.revision && !this.refreshExpectedRevision) {
          this.resetOrderAfterConflict();
          return;
        }
        this.orderRevision.set(page.revision);
        this.orderCursor.set(page.nextCursor);
        const existing = this.reorderDraft();
        const known = new Set(existing.map((item) => item.id));
        const additions = page.items.filter((item) => !known.has(item.id));
        const combined = [...existing, ...additions];
        this.reorderDraft.set(combined);

        if (this.refreshTargetIds) {
          if (combined.length >= this.refreshTargetIds.length || page.nextCursor === null) {
            const actualIds = combined.map((item) => item.id).slice(0, this.refreshBaselineIds?.length ?? 0);
            if (actualIds.length !== this.refreshBaselineIds?.length ||
              actualIds.some((id, index) => id !== this.refreshBaselineIds?.[index])) {
              this.resetOrderAfterConflict();
              return;
            }
            const byId = new Map(combined.map((item) => [item.id, item]));
            this.reorderDraft.set(this.refreshTargetIds.map((id) => byId.get(id)!).filter(Boolean));
            this.reorderInitialIds.set(this.refreshBaselineIds ?? []);
            this.refreshTargetIds = null;
            this.refreshBaselineIds = null;
            this.refreshExpectedRevision = null;
            this.reorderLoading.set(false);
            return;
          }
          this.loadOrderPage(page.nextCursor);
          return;
        }

        this.reorderInitialIds.update((ids) => [...ids, ...additions.map((item) => item.id)]);
        this.reorderLoading.set(false);
      },
      error: (error: unknown) => {
        if (error instanceof HttpErrorResponse && error.status === 409) {
          this.resetOrderAfterConflict();
          return;
        }
        this.reorderLoading.set(false);
        this.reorderError.set(true);
      },
    });
  }

  private refreshLoadedPrefix(targetIds: string[], baselineIds: string[], revision: string): void {
    this.refreshTargetIds = targetIds;
    this.refreshBaselineIds = baselineIds;
    this.refreshExpectedRevision = revision;
    this.reorderDraft.set([]);
    this.reorderInitialIds.set([]);
    this.orderRevision.set(null);
    this.orderCursor.set(null);
    this.loadOrderPage(null);
  }

  private resetOrderAfterConflict(): void {
    this.toasts.error(this.copy.reorderConflict);
    this.refreshTargetIds = null;
    this.refreshBaselineIds = null;
    this.refreshExpectedRevision = null;
    this.reorderDraft.set([]);
    this.reorderInitialIds.set([]);
    this.orderRevision.set(null);
    this.orderCursor.set(null);
    if (this.reorderMode()) this.loadOrderPage(null);
  }

  private clearOrderSession(): void {
    this.orderRequest?.unsubscribe();
    this.orderRequest = undefined;
    this.orderObserver?.disconnect();
    this.orderObserver = undefined;
    this.refreshTargetIds = null;
    this.refreshBaselineIds = null;
    this.refreshExpectedRevision = null;
    this.reorderLoading.set(false);
    this.reorderError.set(false);
  }

  private canMoveWithinOrderSegment(items: ListOrderItem[], fromIndex: number, toIndex: number): boolean {
    const start = Math.min(fromIndex, toIndex);
    const end = Math.max(fromIndex, toIndex);
    return items.slice(start + 1, end + 1).every((item) => item.movable);
  }
}
