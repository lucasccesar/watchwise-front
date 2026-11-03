import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { Subscription } from 'rxjs';
import { ListsApiService, ListCardPreview, ListItemType, ListSource, UserListCard } from '../../data-access/lists-api.service';
import { AuthSessionService } from '../../../../core/session/session.service';
import { ContentImageAction, ContentImageActionSelection, ContentImageActionsComponent } from '../../../../shared/components/content-image-actions/content-image-actions.component';
import { messageCatalog } from '../../../../shared/i18n/messages';
import { ResponsiveBannerComponent } from '../../../../shared/components/responsive-banner/responsive-banner.component';
import { PageSkeletonComponent } from '../../../../shared/components/page-skeleton/page-skeleton.component';
import { ToastNotificationsService } from '../../../../shared/components/toast-notifications/toast-notifications.service';

type ListMenu = 'source' | 'type' | 'sort' | null;
type ListSort = 'updatedAt' | 'rank' | 'name' | 'likesCount' | 'itemsCount' | 'commentsCount';

@Component({
  selector: 'app-lists',
  standalone: true,
  imports: [RouterLink, ContentImageActionsComponent, ResponsiveBannerComponent, PageSkeletonComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './lists.component.html',
  styleUrl: './lists.component.css',
})
export class ListsComponent {
  protected readonly copy = messageCatalog['pt-BR'].listsPage;
  protected readonly homeCopy = messageCatalog['pt-BR'].home;
  protected readonly isCommunity = inject(ActivatedRoute).snapshot.data['mode'] === 'community';
  protected readonly status = signal<'loading' | 'ready' | 'error'>('loading');
  protected readonly error = signal('');
  protected readonly heroBackdropPath = signal<string | null | undefined>(undefined);
  protected readonly heroBackdropLoading = signal(true);
  protected readonly heroBackdropFailed = signal(false);
  protected readonly pageData = signal<import('../../data-access/lists-api.service').UserListCardPage | null>(null);
  protected readonly page = signal(1);
  protected readonly source = signal<ListSource>('ALL');
  protected readonly itemType = signal<ListItemType | null>(null);
  protected readonly sort = signal<ListSort>(this.isCommunity ? 'likesCount' : 'updatedAt');
  protected readonly sortDirection = signal<'asc' | 'desc'>('desc');
  protected readonly activeMenu = signal<ListMenu>(null);
  protected readonly activeCardMenu = signal<string | null>(null);
  protected readonly activePreviewMenu = signal<string | null>(null);
  protected readonly reorderMode = signal(false);
  protected readonly totalPages = computed(() => Math.max(1, this.pageData()?.totalPages ?? 1));
  protected readonly pageNumbers = computed(() => Array.from({ length: this.totalPages() }, (_, index) => index + 1));
  protected readonly previewActions: readonly ContentImageAction[] = [
    { id: 'open-content', label: this.copy.openContent, icon: 'eye' },
  ];

  private readonly api = inject(ListsApiService);
  private readonly session = inject(AuthSessionService);
  private readonly router = inject(Router);
  private readonly toasts = inject(ToastNotificationsService);
  private request?: Subscription;

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
    const omitDefaultSort = selectedSort === 'updatedAt' && (this.isCommunity || this.source() !== 'OWNED');
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

  protected selectSource(source: ListSource): void {
    this.source.set(source);
    if (source !== 'OWNED' && this.sort() === 'rank') this.sort.set('updatedAt');
    this.resetAndLoad();
  }
  protected selectType(type: ListItemType | null): void { this.itemType.set(type); this.resetAndLoad(); }
  protected selectSort(sort: ListSort): void {
    if (sort === 'rank' && (this.isCommunity || this.source() !== 'OWNED')) return;
    if (sort === 'updatedAt' && this.isCommunity) return;
    this.sort.set(sort);
    this.activeMenu.set(null);
    this.resetAndLoad();
  }
  protected toggleDirection(): void { this.sortDirection.update((direction) => direction === 'asc' ? 'desc' : 'asc'); this.load(); }
  protected toggleMenu(menu: Exclude<ListMenu, null>): void { this.activeMenu.update((active) => active === menu ? null : menu); }
  protected toggleCardMenu(id: string): void { this.activeCardMenu.update((active) => active === id ? null : id); }
  protected togglePreviewMenu(id: string, event: MouseEvent): void { event.stopPropagation(); this.activePreviewMenu.update((active) => active === id ? null : id); }

  protected goToPage(page: number): void { this.page.set(Math.max(1, Math.min(this.totalPages(), page))); this.load(); }

  protected toggleReorder(): void {
    const entering = !this.reorderMode();
    this.reorderMode.set(entering);
    if (entering) {
      this.source.set('OWNED');
      this.sort.set('rank');
      this.sortDirection.set('asc');
      this.resetAndLoad();
    }
  }

  protected moveList(list: UserListCard, offset: number): void {
    const position = list.rank ?? 1;
    const target = Math.max(1, Math.min(this.currentCount(), position + offset));
    if (target === position) return;
    this.api.updateList(list.id, { rank: target }).subscribe({ next: () => this.load(), error: () => this.toasts.error(this.copy.reorderError) });
  }

  protected typeLabel(): string {
    if (!this.itemType()) return this.copy.allTypes;
    const labels: Record<ListItemType, string> = { MOVIE: this.copy.movies, SERIES: this.copy.series, SEASON: this.copy.seasons, EPISODE: this.copy.episodes, LIST: this.copy.nestedLists };
    return labels[this.itemType()!];
  }

  protected sourceLabel(): string {
    const labels: Record<ListSource, string> = { ALL: this.copy.allLists, OWNED: this.copy.myLists, LIKED: this.copy.likedLists };
    return labels[this.source()];
  }

  protected sortLabel(): string {
    if (this.sort() === 'updatedAt' && (this.isCommunity || this.source() !== 'OWNED')) return this.copy.sortNone;
    const labels: Record<ListSort, string> = {
      updatedAt: this.copy.sortRecent,
      rank: this.copy.sortManual,
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
  protected previewRating(card: ListCardPreview): string | null {
    const value = card.stats?.averageScore;
    return value === null || value === undefined ? null : new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 }).format(value);
  }
  protected previewRatingLabel(card: ListCardPreview): string {
    const value = this.previewRating(card);
    return value ? `${this.homeCopy.communityAverage}: ${value}` : '';
  }
  protected previewMenuKey(list: UserListCard, card: ListCardPreview, index: number): string {
    return `${list.id}:${card.contentId ?? card.tmdbId ?? card.seriesTmdbId ?? index}`;
  }
  protected previewRoute(card: ListCardPreview): string[] | null {
    const id = card.tmdbId || card.seriesTmdbId;
    if (!id) return null;
    if (card.type === 'MOVIE') return ['/content/movie', id];
    if (card.type === 'SERIES') return ['/content/series', id];
    return null;
  }
  protected openPreview(card: ListCardPreview, selection: ContentImageActionSelection): void {
    if (selection.action.id !== 'open-content') return;
    const route = this.previewRoute(card);
    if (route) void this.router.navigate(route);
  }
  protected share(list: UserListCard, event?: MouseEvent): void {
    event?.stopPropagation();
    const url = `${window.location.origin}/lists/${encodeURIComponent(list.id)}`;
    void navigator.clipboard.writeText(url)
      .then(() => this.toasts.success(this.copy.copied))
      .catch(() => this.toasts.error('Não foi possível copiar o link.'));
  }

  private imageUrl(path: string | null | undefined): string | null {
    if (!path) return null;
    if (/^https?:\/\//i.test(path)) return path;
    return `https://image.tmdb.org/t/p/w500${path.startsWith('/') ? path : `/${path}`}`;
  }

  private communitySort(): 'name' | 'likesCount' | 'itemsCount' | 'commentsCount' {
    const sort = this.sort();
    if (sort === 'itemsCount') return 'itemsCount';
    if (sort === 'commentsCount') return 'commentsCount';
    if (sort === 'name') return 'name';
    return 'likesCount';
  }
  private resetAndLoad(): void { this.page.set(1); this.load(); }
}
