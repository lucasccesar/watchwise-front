import { DOCUMENT } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { Subscription, concatMap, finalize, forkJoin, from, map, of, switchMap, toArray } from 'rxjs';
import { ListsApiService, ListCardPreview, ListItemType, ListSource, UserListCard } from '../../data-access/lists-api.service';
import { AuthSessionService } from '../../../../core/session/session.service';
import { messageCatalog } from '../../../../shared/i18n/messages';
import { ModalFocusDirective } from '../../../../shared/directives/modal-focus.directive';
import { ShareCardModel, SharePreviewComponent } from '../../../../shared/components/share-preview/share-preview.component';
import { ResponsiveBannerComponent } from '../../../../shared/components/responsive-banner/responsive-banner.component';
import { PageSkeletonComponent } from '../../../../shared/components/page-skeleton/page-skeleton.component';
import { ToastNotificationsService } from '../../../../shared/components/toast-notifications/toast-notifications.service';
import { CheckIconComponent } from '../../../../shared/components/check-icon/check-icon.component';
import { tmdbImageUrl } from '../../../../shared/utils/tmdb-image-url';

type ListMenu = 'source' | 'type' | 'sort' | null;
type ListsPageSource = Exclude<ListSource, 'ALL'>;
type ListSort = 'updatedAt' | 'rank' | 'name' | 'likesCount' | 'itemsCount' | 'commentsCount';

@Component({
  selector: 'app-lists',
  standalone: true,
  imports: [RouterLink, ResponsiveBannerComponent, PageSkeletonComponent, ModalFocusDirective, SharePreviewComponent, CheckIconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './lists.component.html',
  styleUrl: './lists.component.css',
})
export class ListsComponent {
  protected readonly copy = messageCatalog['pt-BR'].listsPage;
  protected readonly detailCopy = messageCatalog['pt-BR'].listDetailPage;
  protected readonly homeCopy = messageCatalog['pt-BR'].home;
  protected readonly isCommunity = inject(ActivatedRoute).snapshot.data['mode'] === 'community';
  protected readonly status = signal<'loading' | 'ready' | 'error'>('loading');
  protected readonly error = signal('');
  protected readonly heroBackdropPath = signal<string | null | undefined>(undefined);
  protected readonly heroBackdropLoading = signal(true);
  protected readonly heroBackdropFailed = signal(false);
  protected readonly pageData = signal<import('../../data-access/lists-api.service').UserListCardPage | null>(null);
  protected readonly page = signal(1);
  protected readonly source = signal<ListsPageSource>('OWNED');
  protected readonly itemType = signal<ListItemType | null>(null);
  protected readonly sort = signal<ListSort>(this.isCommunity ? 'likesCount' : 'rank');
  protected readonly sortDirection = signal<'asc' | 'desc'>(this.isCommunity ? 'desc' : 'asc');
  protected readonly activeMenu = signal<ListMenu>(null);
  protected readonly activeCardMenu = signal<string | null>(null);
  protected readonly sharePreviewTarget = signal<UserListCard | null>(null);
  protected readonly sharePreviewReturnFocusTarget = signal<HTMLElement | null>(null);
  protected readonly deleteListTarget = signal<UserListCard | null>(null);
  protected readonly deleteListReturnFocusTarget = signal<HTMLElement | null>(null);
  protected readonly deletingList = signal(false);
  protected readonly likingListIds = signal<ReadonlySet<string>>(new Set());
  protected readonly activePreviewListId = signal<string | null>(null);
  protected readonly activePreviewIndex = signal<number | null>(null);
  protected readonly reorderMode = signal(false);
  protected readonly reorderDraft = signal<UserListCard[]>([]);
  protected readonly reorderInitialIds = signal<string[]>([]);
  protected readonly draggedListId = signal<string | null>(null);
  protected readonly dragOverListId = signal<string | null>(null);
  protected readonly savingOrder = signal(false);
  protected readonly reorderHasChanges = computed(() => {
    const current = this.reorderDraft().map((list) => list.id);
    const initial = this.reorderInitialIds();
    return current.length !== initial.length || current.some((id, index) => id !== initial[index]);
  });
  protected readonly totalPages = computed(() => Math.max(1, this.pageData()?.totalPages ?? 1));
  protected readonly pageNumbers = computed(() => Array.from({ length: this.totalPages() }, (_, index) => index + 1));
  private readonly api = inject(ListsApiService);
  private readonly session = inject(AuthSessionService);
  private readonly router = inject(Router);
  private readonly toasts = inject(ToastNotificationsService);
  private readonly document = inject(DOCUMENT);
  private request?: Subscription;
  private previousReorderState: { source: ListsPageSource; itemType: ListItemType | null; sort: ListSort; direction: 'asc' | 'desc'; page: number } | null = null;

  constructor() {
    this.load();
  }

  protected onHeroBackdropLoaded(): void {
    this.heroBackdropLoading.set(false);
  }

  protected onHeroBackdropError(): void {
    this.heroBackdropFailed.set(true);
    this.heroBackdropLoading.set(false);
  }

  protected load(): void {
    if (!this.session.user()) {
      void this.router.navigateByUrl('/login');
      return;
    }
    this.request?.unsubscribe();
    this.status.set('loading');
    this.heroBackdropPath.set(undefined);
    this.heroBackdropLoading.set(true);
    this.heroBackdropFailed.set(false);
    this.error.set('');
    const options = { page: this.page(), itemType: this.itemType() ?? undefined };
    const selectedSort = this.sort();
    const omitDefaultSort = selectedSort === 'updatedAt' && this.isCommunity;
    const request = this.isCommunity
      ? this.api.getCommunityLists({ ...options, sortBy: this.communitySort() })
      : this.api.getMyLists({
          ...options,
          source: this.source(),
          sortBy: omitDefaultSort ? undefined : selectedSort,
          sortDirection: this.sortDirection(),
        });
    this.request = request.subscribe({
      next: (page) => {
        const backdropPath = page.backdropPath ?? null;
        this.heroBackdropPath.set(backdropPath);
        this.heroBackdropLoading.set(backdropPath === null || Boolean(backdropPath?.trim()));
        this.heroBackdropFailed.set(false);
        this.pageData.set(page);
        this.status.set('ready');
      },
      error: (error: unknown) => {
        this.heroBackdropLoading.set(false);
        this.status.set('error');
        this.error.set(error instanceof HttpErrorResponse && error.status === 0 ? this.homeCopy.actionConnectionError : this.homeCopy.genericError);
      },
    });
  }

  protected retryLoad(): void {
    if (this.reorderMode()) this.loadAllOwnedLists();
    else this.load();
  }

  protected selectSource(source: ListsPageSource): void {
    this.source.set(source);
    if (source === 'LIKED' && (this.sort() === 'rank' || this.sort() === 'updatedAt')) {
      this.sort.set('likesCount');
      this.sortDirection.set('desc');
    }
    this.activeMenu.set(null);
    this.resetAndLoad();
  }
  protected selectType(type: ListItemType | null): void { this.itemType.set(type); this.activeMenu.set(null); this.resetAndLoad(); }
  protected selectSort(sort: ListSort): void {
    if ((sort === 'rank' || sort === 'updatedAt') && (this.isCommunity || this.source() !== 'OWNED')) return;
    this.sort.set(sort);
    if (sort === 'rank') this.sortDirection.set('asc');
    this.activeMenu.set(null);
    this.resetAndLoad();
  }
  protected toggleDirection(): void { this.sortDirection.update((direction) => direction === 'asc' ? 'desc' : 'asc'); this.load(); }
  protected toggleMenu(menu: Exclude<ListMenu, null>): void { this.activeMenu.update((active) => active === menu ? null : menu); }
  protected toggleCardMenu(id: string): void { this.activeCardMenu.update((active) => active === id ? null : id); }
  protected openSharePreview(list: UserListCard, event: MouseEvent): void {
    event.stopPropagation();
    this.sharePreviewReturnFocusTarget.set(this.cardMenuTrigger(event));
    this.activeCardMenu.set(null);
    this.sharePreviewTarget.set(list);
  }
  protected closeSharePreview(): void { this.sharePreviewTarget.set(null); }
  protected shareModel(list: UserListCard): ShareCardModel {
    const items = list.previewCards.slice(0, 5).map((card) => ({
      title: card.title || this.copy.titleUnavailable,
      label: card.title || this.copy.titleUnavailable,
      imageUrl: this.previewPoster(card),
    }));
    const previewItems = items.length ? items : list.nestedListPreviews.slice(0, 5).map((nested) => ({ title: nested.name, label: nested.name, imageUrl: null }));
    return {
      kind: 'list',
      title: list.name,
      subtitle: `Lista de @${list.user.username}`,
      description: list.description,
      authorName: list.user.name || list.user.username,
      username: list.user.username,
      avatarUrl: list.user.profilePicture,
      backgroundUrl: previewItems.find((item) => item.imageUrl)?.imageUrl,
      itemCount: list.itemsCount,
      items: previewItems,
    };
  }
  protected shareUrl(list: UserListCard): string { return `${window.location.origin}/lists/${encodeURIComponent(list.id)}`; }
  protected editList(list: UserListCard): void {
    if (!list.ownedByMe) return;
    this.activeCardMenu.set(null);
    void this.router.navigate(['/lists', list.id, 'edit']);
  }
  protected requestDeleteList(list: UserListCard, event: MouseEvent): void {
    event.stopPropagation();
    if (!list.ownedByMe) return;
    this.deleteListReturnFocusTarget.set(this.cardMenuTrigger(event));
    this.activeCardMenu.set(null);
    this.deleteListTarget.set(list);
  }
  protected cancelDeleteList(): void {
    if (this.deletingList()) return;
    this.deleteListTarget.set(null);
  }
  protected confirmDeleteList(): void {
    const list = this.deleteListTarget();
    if (!list?.ownedByMe || this.deletingList()) return;
    this.deletingList.set(true);
    this.api.deleteList(list.id).subscribe({
      next: () => {
        this.deletingList.set(false);
        this.deleteListTarget.set(null);
        this.toasts.success(this.copy.deleteListSuccess);
        if (this.page() > 1 && this.pageData()?.content.length === 1) this.page.update((page) => page - 1);
        this.load();
      },
      error: () => {
        this.deletingList.set(false);
        this.toasts.error(this.detailCopy.actionError);
      },
    });
  }
  protected toggleListLike(list: UserListCard): void {
    if (this.likingListIds().has(list.id)) return;

    const liked = !list.likedByMe;
    this.likingListIds.update((ids) => new Set([...ids, list.id]));
    this.api.setLiked(list.id, liked).pipe(
      finalize(() => this.likingListIds.update((ids) => {
        const next = new Set(ids);
        next.delete(list.id);
        return next;
      })),
    ).subscribe({
      next: () => {
        const refreshForMembership = this.source() === 'LIKED' && !liked;
        const refreshForSort = this.sort() === 'likesCount';
        if (refreshForMembership || refreshForSort) {
          if (refreshForMembership && this.page() > 1 && this.pageData()?.content.length === 1) {
            this.page.update((page) => page - 1);
          }
          this.load();
          return;
        }

        this.pageData.update((page) => page ? {
          ...page,
          content: page.content.map((card) => card.id === list.id ? {
            ...card,
            likedByMe: liked,
            likesCount: Math.max(0, card.likesCount + (liked ? 1 : -1)),
          } : card),
        } : page);
      },
      error: () => this.toasts.error(this.copy.likeError),
    });
  }
  protected activatePreview(listId: string, index: number, event: PointerEvent): void {
    if (event.pointerType === 'touch') return;
    this.activePreviewListId.set(listId);
    this.activePreviewIndex.set(index);
  }
  protected clearActivePreview(listId: string): void {
    if (this.activePreviewListId() !== listId) return;
    this.activePreviewListId.set(null);
    this.activePreviewIndex.set(null);
  }
  protected goToPage(page: number): void { this.page.set(Math.max(1, Math.min(this.totalPages(), page))); this.load(); }

  protected onReorderButtonClick(): void {
    if (this.reorderMode()) this.saveReorder();
    else this.toggleReorder();
  }

  protected toggleReorder(): void {
    if (this.reorderMode()) {
      this.cancelReorder();
      return;
    }

    this.previousReorderState = {
      source: this.source(),
      itemType: this.itemType(),
      sort: this.sort(),
      direction: this.sortDirection(),
      page: this.page(),
    };
    this.reorderMode.set(true);
    this.activeMenu.set(null);
    this.activeCardMenu.set(null);
    this.source.set('OWNED');
    this.itemType.set(null);
    this.sort.set('rank');
    this.sortDirection.set('asc');
    this.page.set(1);
    this.loadAllOwnedLists();
  }

  protected cancelReorder(): void {
    if (this.savingOrder()) return;
    const previous = this.previousReorderState;
    this.reorderMode.set(false);
    this.reorderDraft.set([]);
    this.reorderInitialIds.set([]);
    this.draggedListId.set(null);
    this.dragOverListId.set(null);
    this.previousReorderState = null;
    if (previous) {
      this.source.set(previous.source);
      this.itemType.set(previous.itemType);
      this.sort.set(previous.sort);
      this.sortDirection.set(previous.direction);
      this.page.set(previous.page);
    }
    this.load();
  }

  protected saveReorder(): void {
    if (!this.reorderHasChanges() || this.savingOrder()) return;
    const updates = this.reorderDraft().map((list, index) => ({ list, rank: index + 1 }));
    if (!updates.length) return;

    this.savingOrder.set(true);
    from(updates).pipe(
      concatMap(({ list, rank }) => this.api.updateList(list.id, { rank })),
      toArray(),
      finalize(() => this.savingOrder.set(false)),
    ).subscribe({
      next: () => {
        this.reorderMode.set(false);
        this.reorderDraft.set([]);
        this.reorderInitialIds.set([]);
        this.previousReorderState = null;
        this.source.set('OWNED');
        this.itemType.set(null);
        this.sort.set('rank');
        this.sortDirection.set('asc');
        this.page.set(1);
        this.toasts.success(this.copy.orderSaved);
        this.load();
      },
      error: () => {
        this.toasts.error(this.copy.reorderError);
        this.loadAllOwnedLists();
      },
    });
  }

  protected listPosition(listId: string): number {
    const index = this.reorderDraft().findIndex((list) => list.id === listId);
    return index < 0 ? 1 : index + 1;
  }

  protected moveList(listId: string, offset: number): void {
    const current = this.reorderDraft();
    const fromIndex = current.findIndex((list) => list.id === listId);
    const toIndex = Math.max(0, Math.min(current.length - 1, fromIndex + offset));
    this.moveDraftList(fromIndex, toIndex);
  }

  protected setListPosition(listId: string, rawPosition: string): void {
    const position = Number.parseInt(rawPosition, 10);
    if (!Number.isFinite(position)) return;
    const current = this.reorderDraft();
    const fromIndex = current.findIndex((list) => list.id === listId);
    const toIndex = Math.max(0, Math.min(current.length - 1, position - 1));
    this.moveDraftList(fromIndex, toIndex);
  }

  protected startListDrag(list: UserListCard, event: DragEvent): void {
    if (!this.reorderMode()) {
      event.preventDefault();
      return;
    }
    this.draggedListId.set(list.id);
    this.dragOverListId.set(list.id);
    if (event.dataTransfer) {
      event.dataTransfer.effectAllowed = 'move';
      event.dataTransfer.setData('text/plain', list.id);
    }
  }

  protected dragOverList(listId: string, event: DragEvent): void {
    if (!this.reorderMode() || !this.draggedListId()) return;
    event.preventDefault();
    if (event.dataTransfer) event.dataTransfer.dropEffect = 'move';
    this.dragOverListId.set(listId);
    const current = this.reorderDraft();
    const fromIndex = current.findIndex((list) => list.id === this.draggedListId());
    const targetIndex = current.findIndex((list) => list.id === listId);
    if (fromIndex < 0 || targetIndex < 0 || fromIndex === targetIndex) return;
    const bounds = (event.currentTarget as HTMLElement).getBoundingClientRect();
    const insertAfterTarget = event.clientY >= bounds.top + bounds.height / 2;
    const nextIndex = Math.max(0, Math.min(current.length - 1, targetIndex + Number(insertAfterTarget) - Number(fromIndex < targetIndex)));
    this.moveDraftList(fromIndex, nextIndex);
  }

  protected dropList(listId: string, event: DragEvent): void {
    event.preventDefault();
    if (this.draggedListId()) this.dragOverList(listId, event);
    else {
      const fromId = event.dataTransfer?.getData('text/plain');
      if (fromId) this.moveDraftList(this.reorderDraft().findIndex((list) => list.id === fromId), this.reorderDraft().findIndex((list) => list.id === listId));
    }
    this.draggedListId.set(null);
    this.dragOverListId.set(null);
  }

  protected finishListDrag(): void {
    this.draggedListId.set(null);
    this.dragOverListId.set(null);
  }

  protected typeLabel(): string {
    if (!this.itemType()) return this.copy.allTypes;
    const labels: Record<ListItemType, string> = { MOVIE: this.copy.movies, SERIES: this.copy.series, SEASON: this.copy.seasons, EPISODE: this.copy.episodes, LIST: this.copy.nestedLists };
    return labels[this.itemType()!];
  }

  protected sourceLabel(): string {
    const labels: Record<ListsPageSource, string> = { OWNED: this.copy.myLists, LIKED: this.copy.likedLists };
    return labels[this.source()];
  }

  protected sortLabel(): string {
    const labels: Record<ListSort, string> = {
      updatedAt: this.copy.sortRecent,
      rank: this.copy.sortDefault,
      name: this.copy.sortName,
      likesCount: this.copy.sortLikes,
      itemsCount: this.copy.sortItems,
      commentsCount: this.copy.sortComments,
    };
    return labels[this.sort()];
  }

  protected currentCount(): number { return this.pageData()?.totalElements ?? 0; }
  protected listCountLabel(): string { return this.copy.listCount.replace('{count}', new Intl.NumberFormat('pt-BR').format(this.currentCount())); }
  protected itemCountLabel(list: UserListCard): string { return this.copy.itemCount.replace('{count}', new Intl.NumberFormat('pt-BR').format(list.itemsCount)); }
  protected visibilityLabel(list: UserListCard): string {
    return list.visibility === 'PRIVATE' ? this.copy.private : list.visibility === 'FOLLOWERS' ? this.copy.followers : this.copy.public;
  }
  protected updatedLabel(value: string): string { return new Intl.DateTimeFormat('pt-BR', { day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(value)); }

  protected listRoute(list: UserListCard): string[] { return ['/lists', list.id]; }

  protected previewPoster(card: ListCardPreview): string | null { return this.imageUrl(card.customPosterUrl || card.posterPath); }
  protected previewRoute(card: ListCardPreview): string[] | null {
    const id = card.tmdbId || card.seriesTmdbId;
    if (!id) return null;
    if (card.type === 'MOVIE') return ['/content/movie', id];
    if (card.type === 'SERIES') return ['/content/series', id];
    return null;
  }
  protected copyLink(list: UserListCard, event?: MouseEvent): void {
    event?.stopPropagation();
    void navigator.clipboard.writeText(this.shareUrl(list))
      .then(() => this.toasts.success(this.copy.copied))
      .catch(() => this.toasts.error(this.detailCopy.actionError));
    this.activeCardMenu.set(null);
  }

  private imageUrl(path: string | null | undefined): string | null {
    return tmdbImageUrl(path, 'w500');
  }

  private cardMenuTrigger(event: MouseEvent): HTMLElement | null {
    return (event.currentTarget as HTMLElement).closest('.list-card-menu-wrap')?.querySelector<HTMLElement>('.list-card-more') ?? null;
  }

  private communitySort(): 'name' | 'likesCount' | 'itemsCount' | 'commentsCount' {
    const sort = this.sort();
    if (sort === 'itemsCount') return 'itemsCount';
    if (sort === 'commentsCount') return 'commentsCount';
    if (sort === 'name') return 'name';
    return 'likesCount';
  }

  private loadAllOwnedLists(): void {
    if (!this.session.user()) {
      void this.router.navigateByUrl('/login');
      return;
    }
    this.request?.unsubscribe();
    this.status.set('loading');
    this.error.set('');
    const firstPageRequest = this.api.getMyLists({ source: 'OWNED', page: 1, sortBy: 'rank', sortDirection: 'asc' });
    this.request = firstPageRequest.pipe(
      switchMap((firstPage) => {
        const remainingPages = Array.from(
          { length: Math.max(0, firstPage.totalPages - 1) },
          (_, index) => this.api.getMyLists({ source: 'OWNED', page: index + 2, sortBy: 'rank', sortDirection: 'asc' }),
        );
        return remainingPages.length
          ? forkJoin(remainingPages).pipe(map((rest) => [firstPage, ...rest]))
          : of([firstPage]);
      }),
    ).subscribe({
      next: (pages) => {
        const firstPage = pages[0];
        const lists = pages.flatMap((page) => page.content);
        const backdropPath = firstPage.backdropPath ?? null;
        this.heroBackdropPath.set(backdropPath);
        this.heroBackdropLoading.set(backdropPath === null || Boolean(backdropPath.trim()));
        this.heroBackdropFailed.set(false);
        this.pageData.set({
          ...firstPage,
          content: lists,
          page: 1,
          size: lists.length,
          totalElements: firstPage.totalElements,
          totalPages: 1,
          hasNext: false,
        });
        this.reorderDraft.set(lists);
        this.reorderInitialIds.set(lists.map((list) => list.id));
        this.status.set('ready');
      },
      error: (error: unknown) => {
        this.heroBackdropLoading.set(false);
        this.status.set('error');
        this.error.set(error instanceof HttpErrorResponse && error.status === 0 ? this.homeCopy.actionConnectionError : this.homeCopy.genericError);
      },
    });
  }

  private moveDraftList(fromIndex: number, toIndex: number): void {
    const current = this.reorderDraft();
    if (fromIndex < 0 || toIndex < 0 || fromIndex >= current.length || toIndex >= current.length || fromIndex === toIndex) return;
    const previousPositions = new Map(
      Array.from(this.document.querySelectorAll<HTMLElement>('[data-list-card-id]'))
        .map((element) => [element.dataset['listCardId'] ?? '', element.getBoundingClientRect().top] as const),
    );
    const reordered = [...current];
    const [list] = reordered.splice(fromIndex, 1);
    reordered.splice(toIndex, 0, list);
    this.reorderDraft.set(reordered);
    const view = this.document.defaultView;
    if (!view || view.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    view.requestAnimationFrame(() => view.requestAnimationFrame(() => {
      for (const element of this.document.querySelectorAll<HTMLElement>('[data-list-card-id]')) {
        if (element.dataset['listCardId'] === this.draggedListId()) continue;
        const previousTop = previousPositions.get(element.dataset['listCardId'] ?? '');
        const offset = previousTop === undefined ? 0 : previousTop - element.getBoundingClientRect().top;
        if (offset) {
          element.getAnimations().forEach((animation) => animation.cancel());
          element.animate([{ transform: `translateY(${offset}px)` }, { transform: 'translateY(0)' }], {
            duration: 180,
            easing: 'cubic-bezier(.2,.8,.2,1)',
          });
        }
      }
    }));
  }

  private resetAndLoad(): void { this.page.set(1); this.load(); }
}
