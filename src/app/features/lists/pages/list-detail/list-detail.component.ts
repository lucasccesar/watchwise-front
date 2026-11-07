import { ModalFocusDirective } from '../../../../shared/directives/modal-focus.directive';
import { NgTemplateOutlet } from '@angular/common';
import { SocialActionsMenuComponent, SocialActionMenuEvent } from '../../../../shared/components/social-actions-menu/social-actions-menu.component';
import { CommentItemComponent } from '../../../../shared/components/comment-item/comment-item.component';
import { buildCommentTree } from '../../../../shared/components/comment-item/comment-tree';
import { PageSkeletonComponent } from '../../../../shared/components/page-skeleton/page-skeleton.component';
import { ResponsiveBannerComponent } from '../../../../shared/components/responsive-banner/responsive-banner.component';
import { ToastNotificationsService } from '../../../../shared/components/toast-notifications/toast-notifications.service';
import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, ElementRef, HostListener, ViewChild, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { CdkDrag, CdkDropList, moveItemInArray, type CdkDragDrop } from '@angular/cdk/drag-drop';
import { concatMap, distinctUntilChanged, finalize, from, map, of, Subscription, switchMap, throwError, toArray, type Observable } from 'rxjs';
import { AuthSessionService } from '../../../../core/session/session.service';
import { ContentApiService, type ContentPageResult, type UserListSummary } from '../../../content/data-access/content-api.service';
import { ContentImageAction, ContentImageActionSelection, ContentImageActionsComponent } from '../../../../shared/components/content-image-actions/content-image-actions.component';
import { ShareCardModel, SharePreviewComponent } from '../../../../shared/components/share-preview/share-preview.component';
import { messageCatalog } from '../../../../shared/i18n/messages';
import { tmdbImageUrl } from '../../../../shared/utils/tmdb-image-url';
import { resolveRating } from '../../../../shared/utils/community-rating';
import { episodeContentNavigationState, episodeContentRoute } from '../../../../shared/utils/episode-content-route';
import { CheckIconComponent } from '../../../../shared/components/check-icon/check-icon.component';
import { ListComment, ListContentReference, ListDetailItem, ListDetailView, ListOwner, ListsApiService, ListVisibility } from '../../data-access/lists-api.service';

type ListContentType = 'MOVIE' | 'SERIES' | 'SEASON' | 'EPISODE' | null;
type ListWatchStatus = 'WATCHED' | 'PARTIALLY_WATCHED' | 'UNWATCHED' | 'UNKNOWN' | null;
type ListDetailSort = 'position' | 'dateAdded' | 'duration' | 'episodeAvgRating' | 'globalEpisodeAvgRating' | 'contentAvgRating';
type DetailMenu = 'type' | 'genre' | 'sort' | 'status' | null;

@Component({
  selector: 'app-list-detail',
  standalone: true,
    imports: [NgTemplateOutlet, ModalFocusDirective, RouterLink, CdkDrag, CdkDropList, ContentImageActionsComponent, SharePreviewComponent, PageSkeletonComponent, ResponsiveBannerComponent, SocialActionsMenuComponent, CommentItemComponent, CheckIconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './list-detail.component.html',
  styleUrl: './list-detail.component.css',
})
export class ListDetailComponent {
  @ViewChild('listMenuButton') protected listMenuTrigger?: ElementRef<HTMLElement>;
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
  protected readonly busyListId = signal<string | null>(null);
  protected readonly reorderMode = signal(false);
  protected readonly reorderDraft = signal<ListDetailItem[]>([]);
  protected readonly reorderInitialIds = signal<string[]>([]);
  protected readonly savingItemOrder = signal(false);
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
  protected readonly displayedItems = computed(() => this.reorderMode() ? this.reorderDraft() : this.items());
  protected readonly episodeItems = computed(() => this.detail()?.itemScope === 'EPISODE' || this.items().some((item) => item.card?.type === 'EPISODE'));
  protected readonly commentThreads = computed(() => buildCommentTree(this.comments()));

  private readonly api = inject(ListsApiService);
  private readonly contentApi = inject(ContentApiService);
  private readonly session = inject(AuthSessionService);
  private readonly toasts = inject(ToastNotificationsService);
  private readonly route = inject(ActivatedRoute);
  protected readonly router = inject(Router);
  private request?: Subscription;
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

  protected load(): void {
    this.request?.unsubscribe();
    this.status.set('loading');
    this.errorMessage.set('');
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
        if (this.reorderMode()) {
          this.reorderInitialIds.set(detail.items.content.map((item) => item.id));
          this.setReorderDraftOrder(detail.items.content);
        }
        const owner = detail.owner ?? null;
        this.owner.set(owner);
        this.canManage.set(owner?.id === this.currentUserId());
        this.status.set('ready');
      },
      error: (error: unknown) => {
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
    this.reorderInitialIds.set(this.items().map((item) => item.id));
    this.setReorderDraftOrder(this.items());
    this.reorderMode.set(true);
    this.listMenuOpen.set(false);
  }
  protected saveItemOrder(): void {
    if (!this.reorderMode() || !this.canManage() || this.savingItemOrder()) return;
    const draftIds = this.reorderDraft().map((item) => item.id);
    const initialIds = this.reorderInitialIds();
    const hasChanges = draftIds.length !== initialIds.length || draftIds.some((id, index) => id !== initialIds[index]);
    if (!hasChanges) {
      this.finishReorderMode();
      return;
    }

    const updates = this.buildItemOrderUpdates();
    if (!updates.length) {
      this.finishReorderMode();
      return;
    }

    const listId = this.listId();
    this.savingItemOrder.set(true);
    from(updates).pipe(
      concatMap(({ item, position }) => this.api.updateItem(listId, item.id, { position })),
      toArray(),
      finalize(() => this.savingItemOrder.set(false)),
    ).subscribe({
      next: () => {
        this.finishReorderMode();
        this.load();
      },
      error: () => {
        this.toasts.error(this.copy.actionError);
        this.load();
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
    const watched = this.itemWatchStatus(item) === 'WATCHED';
    const inWatchlist = this.itemInWatchlist(item);
    const supportsWatchlist = card.type === 'MOVIE' || card.type === 'SERIES';

    return [
      {
        id: 'mark-watched',
        label: watched ? this.trendingCopy.watchAgain : this.trendingCopy.markWatched,
        icon: watched ? 'rewatch' : 'check',
        disabled: busy,
      },
      {
        id: 'watchlist',
        label: inWatchlist ? this.trendingCopy.removeFromWatchlist : this.trendingCopy.wantToWatch,
        icon: inWatchlist ? 'bookmark-filled' : 'bookmark',
        disabled: busy || !supportsWatchlist || (!inWatchlist && watched),
      },
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
  }

  protected openImageAction(item: ListDetailItem, selection: ContentImageActionSelection): void {
    this.activeImageMenu.set(null);
    switch (selection.action.id) {
      case 'mark-watched':
        this.markItemAsWatched(item);
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

  private markItemAsWatched(item: ListDetailItem): void {
    if (!item.card) return;
    if (!this.session.user()?.id) {
      void this.router.navigateByUrl('/login');
      return;
    }
    const request = this.createWatchRequest(item);
    if (!request) {
      this.toasts.error(this.trendingCopy.actionError);
      return;
    }
    const watchedDate = this.todayDate();
    const wasWatched = this.itemWatchStatus(item) === 'WATCHED';
    this.runItemAction(item, request, wasWatched ? this.trendingCopy.watchAgainSuccess : this.trendingCopy.markWatchedSuccess, () => {
      this.updateItemViewerState(item.id, { watchStatus: 'WATCHED', lastWatchedDate: watchedDate });
      this.load();
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
        if (this.handleSessionError(error)) return;
        this.toasts.error(this.trendingCopy.actionError);
      },
    });
  }

  private createWatchRequest(item: ListDetailItem): Observable<unknown> | null {
    const card = item.card;
    if (!card) return null;
    const watchedDate = this.todayDate();
    const isRewatch = this.itemWatchStatus(item) === 'WATCHED';
    switch (card.type) {
      case 'MOVIE':
        return card.tmdbId
          ? this.contentApi.createDiaryEntry({ content: { type: 'MOVIE', tmdbId: card.tmdbId }, watchedDate, isRewatch, watchedInTheater: false, score: null, comment: null })
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
          ? this.contentApi.createSeriesDiaryEntry({ content: { type: 'EPISODE', seriesTmdbId: card.seriesTmdbId, seasonNumber: card.seasonNumber, episodeNumber: card.episodeNumber, runtimeMinutes: card.runtimeMinutes ?? undefined }, watchedDate, isRewatch, watchedInTheater: false, score: null, comment: null })
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
            inWatchlist: change.inWatchlist ?? viewerState?.inWatchlist ?? contentState?.inWatchlist ?? null,
          },
        },
      };
    };
    this.detail.update((detail) => detail ? { ...detail, items: { ...detail.items, content: detail.items.content.map(update) } } : detail);
    this.reorderDraft.update((items) => items.map(update));
  }

  private todayDate(): string {
    const date = new Date();
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
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

  protected dateLabel(value: string): string {
    return new Intl.DateTimeFormat('pt-BR', { day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(value));
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
      next: () => { this.deletingItemId.set(null); this.deleteItem.set(null); this.load(); },
      error: () => { this.deletingItemId.set(null); this.toasts.error(this.copy.deleteError); },
    });
  }

  protected moveItem(item: ListDetailItem, offset: number): void {
    if (this.savingItemOrder()) return;
    const pageContent = this.reorderDraft();
    const currentIndex = pageContent.findIndex((entry) => entry.id === item.id);
    const targetIndex = currentIndex + offset;
    if (currentIndex < 0 || targetIndex < 0 || targetIndex >= pageContent.length) return;
    const reordered = [...pageContent];
    moveItemInArray(reordered, currentIndex, targetIndex);
    this.setReorderDraftOrder(reordered);
  }

  protected dropItem(event: CdkDragDrop<ListDetailItem[]>): void {
    if (!this.reorderMode() || !this.canManage() || this.savingItemOrder() || event.previousContainer !== event.container) return;
    const current = this.reorderDraft();
    const item = current[event.previousIndex];
    if (!item || !current[event.currentIndex] || event.previousIndex === event.currentIndex) return;

    const reordered = [...current];
    moveItemInArray(reordered, event.previousIndex, event.currentIndex);
    this.setReorderDraftOrder(reordered);
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

  private setReorderDraftOrder(items: ListDetailItem[]): void {
    const positions = this.items().map((item) => item.position).sort((a, b) => a - b);
    this.reorderDraft.set(items.map((item, index) => ({ ...item, position: positions[index] ?? item.position })));
  }

  private buildItemOrderUpdates(): Array<{ item: ListDetailItem; position: number }> {
    const originalItems = this.items();
    const targetPositions = originalItems.map((item) => item.position).sort((a, b) => a - b);
    const simulatedPositions = new Map(originalItems.map((item) => [item.id, item.position]));
    const updates: Array<{ item: ListDetailItem; position: number }> = [];

    this.reorderDraft().forEach((item, index) => {
      const oldPosition = simulatedPositions.get(item.id);
      const newPosition = targetPositions[index];
      if (oldPosition === undefined || newPosition === undefined || oldPosition === newPosition) return;

      updates.push({ item, position: newPosition });
      simulatedPositions.set(item.id, newPosition);
      for (const other of originalItems) {
        if (other.id === item.id) continue;
        const position = simulatedPositions.get(other.id);
        if (position === undefined) continue;
        if (newPosition < oldPosition && position >= newPosition && position < oldPosition) {
          simulatedPositions.set(other.id, position + 1);
        } else if (newPosition > oldPosition && position > oldPosition && position <= newPosition) {
          simulatedPositions.set(other.id, position - 1);
        }
      }
    });

    return updates;
  }

  private finishReorderMode(): void {
    this.reorderMode.set(false);
    this.reorderDraft.set([]);
    this.reorderInitialIds.set([]);
  }
}
