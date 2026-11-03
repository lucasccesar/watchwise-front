import { DecimalPipe } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, OnDestroy, computed, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { Subscription } from 'rxjs';
import { AuthSessionService } from '../../../../core/session/session.service';
import { ContentApiService } from '../../../content/data-access/content-api.service';
import { ContentImageAction, ContentImageActionSelection, ContentImageActionsComponent } from '../../../../shared/components/content-image-actions/content-image-actions.component';
import { messageCatalog } from '../../../../shared/i18n/messages';
import { ResponsiveBannerComponent } from '../../../../shared/components/responsive-banner/responsive-banner.component';
import { WatchlistApiService, WatchlistCard, WatchlistContentType, WatchlistSort, WatchlistStatus, WatchlistView } from '../../data-access/watchlist-api.service';

type WatchlistMenu = 'genre' | 'sort' | 'visibility' | null;
type WatchlistUpcomingMode = 'ALL' | 'FADE' | 'HIDE';

@Component({
  selector: 'app-watchlist',
  standalone: true,
  imports: [DecimalPipe, RouterLink, ContentImageActionsComponent, ResponsiveBannerComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './watchlist.component.html',
  styleUrl: './watchlist.component.css',
})
export class WatchlistComponent implements OnDestroy {
  protected readonly copy = messageCatalog['pt-BR'].watchlistPage;
  protected readonly homeCopy = messageCatalog['pt-BR'].home;
  protected readonly trendingCopy = messageCatalog['pt-BR'].trendingPage;
  protected readonly status = signal<'loading' | 'ready' | 'error'>('loading');
  protected readonly error = signal('');
  protected readonly loadingPlaceholders = Array.from({ length: 12 }, (_, index) => index);
  protected readonly view = signal<WatchlistView | null>(null);
  protected readonly heroBackdropPath = signal<string | null | undefined>(undefined);
  protected readonly heroBackdropLoading = signal(true);
  protected readonly heroBackdropFailed = signal(false);
  protected readonly viewMode = signal<'AUTO' | 'GRID' | 'LIST'>('AUTO');
  protected readonly mobileFiltersOpen = signal(false);
  protected readonly type = signal<WatchlistContentType | null>(null);
  protected readonly genre = signal<string | null>(null);
  protected readonly filterStatus = signal<WatchlistStatus>('ALL');
  protected readonly upcomingMode = signal<WatchlistUpcomingMode>('ALL');
  protected readonly sort = signal<WatchlistSort>('DATE_ADDED');
  protected readonly direction = signal<'ASC' | 'DESC'>('DESC');
  protected readonly page = signal(1);
  protected readonly pageSize = 18;
  protected readonly activeMenu = signal<WatchlistMenu>(null);
  protected readonly busyId = signal<string | null>(null);
  protected readonly totalPages = computed(() => Math.max(1, this.view()?.totalPages ?? 1));
  protected readonly pageNumbers = computed(() => Array.from({ length: this.totalPages() }, (_, index) => index + 1));
  protected readonly visibleItems = computed(() => {
    const items = this.view()?.content ?? [];
    return this.upcomingMode() === 'HIDE' ? items.filter((item) => item.status !== 'UPCOMING') : items;
  });
  protected readonly genreOptions = signal<string[]>([]);
  protected readonly posterActions: readonly ContentImageAction[] = [
    { id: 'open-content', label: this.copy.openContent, icon: 'eye' },
    { id: 'remove-watchlist', label: this.copy.remove, icon: 'trash' },
  ];

  private readonly session = inject(AuthSessionService);
  private readonly api = inject(WatchlistApiService);
  private readonly contentApi = inject(ContentApiService);
  private readonly router = inject(Router);
  private request?: Subscription;
  private genreRequest?: Subscription;
  private genreUserId = '';

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

  protected updatedAt(): string {
    const date = this.view()?.content[0]?.createdAt;
    return date ? this.dateLabel(date) : '';
  }

  protected selectMobileType(event: Event): void {
    const value = (event.target as HTMLSelectElement).value;
    this.selectType(value === 'ALL' ? null : value as WatchlistContentType);
  }

  protected selectMobileGenre(event: Event): void {
    this.selectGenre((event.target as HTMLSelectElement).value || null);
  }

  protected selectMobileSort(event: Event): void {
    this.selectSort((event.target as HTMLSelectElement).value as WatchlistSort);
  }

  protected selectMobileDirection(event: Event): void {
    this.direction.set((event.target as HTMLSelectElement).value as 'ASC' | 'DESC');
    this.page.set(1);
    this.load();
  }

  protected selectMobileStatus(event: Event): void {
    this.selectStatus((event.target as HTMLSelectElement).value as WatchlistStatus);
  }

  protected selectMobileUpcomingMode(event: Event): void {
    this.setUpcomingMode((event.target as HTMLSelectElement).value as WatchlistUpcomingMode);
  }

  protected selectViewMode(event: Event): void {
    this.viewMode.set((event.target as HTMLSelectElement).value as 'GRID' | 'LIST');
  }

  ngOnDestroy(): void { this.request?.unsubscribe(); this.genreRequest?.unsubscribe(); }

  protected load(): void {
    const user = this.session.user();
    if (!user) {
      void this.router.navigateByUrl('/login');
      return;
    }
    if (this.genreUserId !== user.id) {
      this.genreRequest?.unsubscribe(); this.genreUserId = user.id; this.genreOptions.set([]);
      this.genreRequest = this.api.getGenreOptions(user.id).subscribe({
        next: genres => this.genreOptions.set(genres),
        error: () => { this.genreUserId = ''; },
      });
    }
    this.request?.unsubscribe();
    this.status.set('loading');
    this.heroBackdropPath.set(undefined);
    this.heroBackdropLoading.set(true);
    this.heroBackdropFailed.set(false);
    this.error.set('');
    this.request = this.api.getView(user.id, {
      type: this.type(),
      genre: this.genre(),
      status: this.filterStatus(),
      sort: this.sort(),
      direction: this.direction(),
      page: this.page(),
      size: this.pageSize,
    }).subscribe({
      next: (view) => {
        const backdropPath = view.backdropPath ?? null;
        this.heroBackdropPath.set(backdropPath);
        this.heroBackdropLoading.set(backdropPath === null || Boolean(backdropPath?.trim()));
        this.heroBackdropFailed.set(false);
        this.view.set(view);
        this.status.set('ready');
      },
      error: (error: unknown) => {
        this.heroBackdropLoading.set(false);
        this.status.set('error');
        this.error.set(error instanceof HttpErrorResponse && error.status === 0
          ? this.homeCopy.actionConnectionError
          : this.homeCopy.genericError);
      },
    });
  }

  protected selectType(type: WatchlistContentType | null): void {
    this.type.set(type);
    this.page.set(1);
    this.load();
  }

  protected selectGenre(genre: string | null): void {
    this.genre.set(genre);
    this.activeMenu.set(null);
    this.page.set(1);
    this.load();
  }

  protected selectStatus(status: WatchlistStatus): void {
    this.filterStatus.set(status);
    this.activeMenu.set(null);
    this.page.set(1);
    this.load();
  }

  protected selectSort(sort: WatchlistSort): void {
    this.sort.set(sort);
    this.activeMenu.set(null);
    this.page.set(1);
    this.load();
  }

  protected toggleDirection(): void {
    this.direction.update((direction) => direction === 'DESC' ? 'ASC' : 'DESC');
    this.load();
  }

  protected toggleMenu(menu: Exclude<WatchlistMenu, null>): void {
    this.activeMenu.update((active) => active === menu ? null : menu);
  }

  protected goToPage(page: number): void {
    this.page.set(Math.max(1, Math.min(this.totalPages(), page)));
    this.load();
  }

  protected title(item: WatchlistCard): string {
    return item.card.title || this.copy.titleUnavailable;
  }

  protected poster(item: WatchlistCard): string | null {
    return this.imageUrl(item.card.customPosterUrl || item.card.posterPath);
  }

  protected cardRating(item: WatchlistCard): { label: string; value: string } | null {
    if (this.isUpcoming(item)) return null;
    const communityScore = item.card.stats?.averageScore;
    const score = communityScore ?? item.card.tmdbVoteAverage;
    if (score === null || score === undefined) return null;
    return {
      label: communityScore === null || communityScore === undefined
        ? this.homeCopy.tmdbRating
        : this.homeCopy.communityAverage,
      value: new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 }).format(score),
    };
  }

  protected route(item: WatchlistCard): string[] | null {
    const tmdbId = item.card.tmdbId || item.card.seriesTmdbId;
    if (!tmdbId) return null;
    return item.card.type === 'MOVIE' ? ['/content/movie', tmdbId] : ['/content/series', tmdbId];
  }

  protected handlePosterAction(item: WatchlistCard, selection: ContentImageActionSelection): void {
    if (selection.action.id === 'open-content') {
      const route = this.route(item);
      if (route) void this.router.navigate(route);
      return;
    }
    if (selection.action.id !== 'remove-watchlist' || this.busyId()) return;
    this.busyId.set(item.id);
    const remove = item.card.type === 'MOVIE'
      ? this.contentApi.removeFromWatchlist(item.id)
      : this.contentApi.removeSeriesFromWatchlist(item.id);
    remove.subscribe({
      next: () => { this.busyId.set(null); this.load(); },
      error: () => { this.busyId.set(null); this.error.set(this.copy.removeError); },
    });
  }

  protected sortLabel(): string {
    const labels: Record<WatchlistSort, string> = {
      DATE_ADDED: this.copy.sortDateAdded,
      RELEASE_DATE: this.copy.sortReleaseDate,
      RUNTIME: this.copy.sortRuntime,
      RATING: this.copy.sortRating,
      TITLE: this.copy.sortTitle,
    };
    return labels[this.sort()];
  }

  protected statusLabel(): string {
    const labels: Record<WatchlistStatus, string> = {
      ALL: this.copy.all,
      NEW: this.copy.new,
      IN_PROGRESS: this.copy.inProgress,
      UPCOMING: this.copy.upcoming,
    };
    return labels[this.filterStatus()];
  }

  protected upcomingModeLabel(): string {
    if (this.upcomingMode() === 'FADE') return this.copy.fadeUpcoming;
    if (this.upcomingMode() === 'HIDE') return this.copy.hideUpcoming;
    return this.copy.all;
  }

  protected setUpcomingMode(mode: WatchlistUpcomingMode): void {
    this.upcomingMode.set(mode);
    this.activeMenu.set(null);
  }

  protected isUpcoming(item: WatchlistCard): boolean {
    return item.status === 'UPCOMING';
  }

  protected cardMeta(item: WatchlistCard): string {
    if (this.isUpcoming(item) && item.releaseDate) {
      return `${this.trendingCopy.releaseDatePrefix} ${this.releaseDateLong(item.releaseDate)}`;
    }
    return [item.card.releaseYear, ...(item.card.genres ?? []).slice(0, 2)].filter(Boolean).join(' · ');
  }

  protected releaseDateShort(value: string): string {
    const [year, month, day] = value.slice(0, 10).split('-').map(Number);
    return new Intl.DateTimeFormat('pt-BR', { day: 'numeric', month: 'short' }).format(new Date(year, month - 1, day));
  }

  private releaseDateLong(value: string): string {
    const [year, month, day] = value.slice(0, 10).split('-').map(Number);
    return new Intl.DateTimeFormat('pt-BR', { day: 'numeric', month: 'long', year: 'numeric' })
      .format(new Date(year, month - 1, day));
  }

  protected runtimeLabel(item: WatchlistCard): string {
    if (item.card.type === 'SERIES') {
      const episodes = item.card.numberOfEpisodes;
      return episodes ? `${episodes} ${this.copy.episodesShort}` : '';
    }
    const minutes = item.card.runtimeMinutes;
    if (minutes === null || minutes === undefined || minutes <= 0) return '';
    const hours = Math.floor(minutes / 60);
    const remainder = minutes % 60;
    return hours ? `${hours}h${remainder ? ` ${remainder}min` : ''}` : `${remainder}min`;
  }

  private imageUrl(path: string | null | undefined): string | null {
    if (!path) return null;
    if (/^https?:\/\//i.test(path)) return path;
    return `https://image.tmdb.org/t/p/w500${path.startsWith('/') ? path : `/${path}`}`;
  }

  protected dateLabel(value: string | null): string {
    if (!value) return this.copy.dateUnknown;
    return new Intl.DateTimeFormat('pt-BR', { day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(value));
  }

  protected runtimeTotal(minutes: number): string {
    const day = Math.floor(minutes / 1440);
    const hours = Math.floor((minutes % 1440) / 60);
    const remainder = minutes % 60;
    if (day) return `${day}d ${hours}h`;
    return hours ? `${hours}h ${remainder}min` : `${remainder} min`;
  }

  protected pageLabel(): string {
    return this.copy.pageLabel
      .replace('{page}', String(this.view()?.page ?? this.page()))
      .replace('{total}', String(this.totalPages()));
  }
}
