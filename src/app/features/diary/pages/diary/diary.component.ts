import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, OnDestroy, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { forkJoin, Observable, of, Subscription } from 'rxjs';
import { AuthSessionService } from '../../../../core/session/session.service';
import {
  DiaryApiService,
  DiaryRecord,
  DiarySeriesOption,
  DiaryViewEntryItem,
  DiaryViewGroupedItem,
  DiaryViewResponseItem,
} from '../../data-access/diary-api.service';
import { ContentApiService } from '../../../content/data-access/content-api.service';
import {
  HomeApiService,
  HomeRecentlyWatched,
  HomeSummary,
} from '../../../home/data-access/home-api.service';
import {
  ContentImageAction,
  ContentImageActionSelection,
  ContentImageActionsComponent,
} from '../../../../shared/components/content-image-actions/content-image-actions.component';
import { messageCatalog } from '../../../../shared/i18n/messages';
import { ResponsiveBannerComponent } from '../../../../shared/components/responsive-banner/responsive-banner.component';
import { CheckIconComponent } from '../../../../shared/components/check-icon/check-icon.component';
import { filterDiaryEntries, localDiaryDay, type DiaryFilters, type DiarySort, type DiaryTypeFilter } from './diary-filtering';
import { tmdbImageUrl } from '../../../../shared/utils/tmdb-image-url';
import { ShareReviewDialogComponent, ShareReviewDialogModel } from '../../../../shared/components/share-review-dialog/share-review-dialog.component';
import { movieMessages } from '../../../content/i18n/movie.messages';
import { ToastNotificationsService } from '../../../../shared/components/toast-notifications/toast-notifications.service';

type DiaryFilter = 'type' | 'series' | 'rating' | 'date' | 'sort' | null;

interface DiaryDayGroup {
  key: string;
  date: Date;
  entries: DiaryTimelineEntry[];
}

interface DiaryPaginationItem {
  key: string;
  page: number | null;
}

interface DiaryReviewCompanion {
  name: string | null;
  username: string | null;
  profilePicture: string | null;
}

interface DiaryGridEntry extends HomeRecentlyWatched {
  reviewSource: 'DIARY' | 'CONTENT_REVIEW';
  seriesPosterPath: string | null;
  likesCount: number;
  likedByMe: boolean;
  commentsCount: number;
  comment: string | null;
  watchedInTheater: boolean | null;
  watchNumber: number;
  companions: DiaryReviewCompanion[];
  derivedCompletion?: boolean;
  sourceEntries?: DiaryGridEntry[];
}

interface DiaryGroupedGridEntry {
  kind: 'GROUPED';
  id: string;
  content: {
    type: string;
    tmdbId: string | null;
    seriesTmdbId: string | null;
    seasonNumber: null;
    episodeNumber: null;
    runtimeMinutes: number | null;
  };
  watchedDate: string;
  score: number | null;
  watchedInTheater: boolean | null;
  seriesTitle: string | null;
  seriesPosterPath: string | null;
  backdropPath: string | null;
  groupType: DiaryViewGroupedItem['groupType'];
  seasonCount: number;
  seasonNumbers: number[];
  episodeCount: number;
  totalRuntimeMinutes: number | null;
  watchNumber: number | null;
  memberEntries: DiaryGridEntry[];
}

type DiaryTimelineEntry = DiaryGridEntry | DiaryGroupedGridEntry;

@Component({
  selector: 'app-diary',
  standalone: true,
  imports: [RouterLink, ContentImageActionsComponent, ResponsiveBannerComponent, CheckIconComponent, ShareReviewDialogComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './diary.component.html',
  styleUrl: './diary.component.css',
})
export class DiaryComponent implements OnDestroy {
  protected readonly copy = messageCatalog['pt-BR'].diaryPage;
  protected readonly homeCopy = messageCatalog['pt-BR'].home;
  protected readonly route = inject(ActivatedRoute);
  protected readonly status = signal<'loading' | 'ready' | 'error'>('loading');
  protected readonly errorMessage = signal('');
  protected readonly summary = signal<HomeSummary | null>(null);
  protected readonly heroBackdropPath = signal<string | null | undefined>(undefined);
  protected readonly heroBackdropLoading = signal(true);
  protected readonly heroBackdropFailed = signal(false);
  protected readonly diarySeries = signal<DiarySeriesOption[]>([]);
  protected readonly diaryEntries = signal<DiaryGridEntry[]>([]);
  protected readonly diaryViewItems = signal<DiaryViewResponseItem[]>([]);
  protected readonly loadingPlaceholders = Array.from({ length: 12 }, (_, index) => index);
  protected readonly reviewLoadingPlaceholders = [0, 1, 2];
  protected readonly busyReviewLikeIds = signal<ReadonlySet<string>>(new Set());
  protected readonly seriesGrouping = signal(true);
  protected readonly seriesGroupingBusy = signal(false);
  protected readonly seriesGroupingError = signal('');
  protected readonly activeFilter = signal<DiaryFilter>(null);
  protected readonly typeFilter = signal<DiaryTypeFilter>('all');
  protected readonly ratingMin = signal(1);
  protected readonly ratingMax = signal(10);
  protected readonly ratingScale = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10] as const;
  protected readonly ratingApplied = computed(() => this.ratingMin() > 1 || this.ratingMax() < 10);
  protected readonly selectedSeriesId = signal('');
  protected readonly sortOrder = signal<DiarySort>('newest');
  protected readonly dateFrom = signal('');
  protected readonly dateTo = signal('');
  protected readonly selectedDateShortcut = signal<'week' | 'month' | 'year' | 'all' | null>('all');
  protected readonly theaterOnly = signal(false);
  protected readonly grouped = signal(true);
  protected readonly page = signal(1);
  protected readonly pageSize = 30;
  protected readonly reviewsPageSize = 15;
  protected readonly isReviewsPage = this.route.snapshot.data['mode'] === 'reviews';
  protected readonly currentPageSize = computed(() => this.isReviewsPage ? this.reviewsPageSize : this.pageSize);
  private readonly activeDiaryFilters = computed(() => ({
    type: this.typeFilter(), ratingMin: this.ratingMin(), ratingMax: this.ratingMax(),
    seriesId: this.selectedSeriesId(), dateFrom: this.dateFrom(), dateTo: this.dateTo(),
    theaterOnly: this.theaterOnly(), sort: this.sortOrder(),
  }));
  protected readonly entries = computed<DiaryTimelineEntry[]>(() => this.isReviewsPage
    ? filterDiaryEntries(this.diaryEntries(), this.activeDiaryFilters())
    : this.filteredTimelineEntries());
  protected readonly visibleEntries = computed(() => this.entries().slice(
    (this.page() - 1) * this.currentPageSize(), this.page() * this.currentPageSize(),
  ));
  protected readonly visibleReviewEntries = computed(() => filterDiaryEntries(this.diaryEntries(), this.activeDiaryFilters()).slice(
    (this.page() - 1) * this.currentPageSize(), this.page() * this.currentPageSize(),
  ));
  protected readonly groups = computed(() => this.groupByDay(this.visibleEntries()));
  protected readonly displayGroups = computed<DiaryDayGroup[]>(() => this.grouped() ? this.groups() : [
    { key: 'flat', date: new Date(0), entries: this.visibleEntries() },
  ]);
  protected readonly typeOptions: readonly { value: DiaryTypeFilter; label: string }[] = [
    { value: 'all', label: this.copy.all }, { value: 'movies', label: this.copy.movies },
    { value: 'series', label: this.copy.seriesPlural }, { value: 'seasons', label: this.copy.seasons },
    { value: 'episodes', label: this.copy.episodes },
  ];
  protected readonly sortOptions: readonly { value: DiarySort; label: string }[] = [
    { value: 'newest', label: this.copy.newest }, { value: 'oldest', label: this.copy.oldest },
    { value: 'highest', label: this.copy.highestRated }, { value: 'lowest', label: this.copy.lowestRated },
  ];
  protected readonly totalPlays = computed(() => this.entries().length);
  protected readonly totalPages = computed(() => Math.max(1, Math.ceil(this.totalPlays() / this.currentPageSize())));
  protected readonly visibleStart = computed(() => this.totalPlays() === 0
    ? 0 : (this.page() - 1) * this.currentPageSize() + 1);
  protected readonly visibleEnd = computed(() => Math.min(this.totalPlays(), this.page() * this.currentPageSize()));
  protected readonly paginationItems = computed<DiaryPaginationItem[]>(() => {
    const total = this.totalPages();
    const current = this.page();
    let pages: Array<number | null>;

    if (total <= 5) pages = Array.from({ length: total }, (_, index) => index + 1);
    else if (current <= 3) pages = [1, 2, 3, null, total];
    else if (current >= total - 2) pages = [1, null, total - 2, total - 1, total];
    else pages = [1, null, current - 1, current, current + 1, null, total];

    return pages.map((page, index) => ({ key: page === null ? `ellipsis-${index}` : `page-${page}`, page }));
  });
  protected readonly posterActions: readonly ContentImageAction[] = [
    { id: 'watch-again', label: this.copy.watchAgainAction, icon: 'rewatch' },
    { id: 'edit-rating', label: this.copy.editRatingAction, icon: 'star' },
    { id: 'share-review', label: this.copy.shareReviewAction, icon: 'share' },
    { id: 'remove-history', label: this.copy.removeHistoryAction, icon: 'trash' },
  ];
  protected readonly shareCopy = movieMessages['pt-BR'];
  protected readonly shareReviewTarget = signal<DiaryGridEntry | null>(null);
  protected readonly shareReviewOpener = signal<HTMLElement | null>(null);
  protected readonly shareReviewModel = computed<ShareReviewDialogModel | null>(() => {
    const entry = this.shareReviewTarget();
    if (!entry) return null;
    const type = (entry.content.type ?? '').toUpperCase();
    const user = this.session.user();
    const posterUrl = this.poster(entry);
    const backdropUrl = tmdbImageUrl(entry.card?.backdropPath, 'w1280') || posterUrl;
    const year = entry.card?.releaseYear ?? entry.card?.releaseDate?.slice(0, 4) ?? null;
    return {
      title: this.title(entry),
      subtitle: type === 'EPISODE' ? this.reviewContext(entry) || null : year ? String(year) : null,
      subtitleBelowTitle: type === 'EPISODE',
      rating: entry.score,
      review: entry.comment,
      backgroundUrl: backdropUrl,
      posterUrl,
      username: user?.username ?? null,
      avatarUrl: user?.profilePicture ?? null,
      selectionType: type === 'MOVIE' ? 'MOVIE' : 'SERIES',
      tmdbId: type === 'MOVIE' ? entry.content.tmdbId : entry.content.seriesTmdbId || entry.content.tmdbId,
    };
  });
  protected readonly diaryActionPending = signal(false);

  private readonly session = inject(AuthSessionService);
  private readonly api = inject(HomeApiService);
  private readonly diaryApi = inject(DiaryApiService);
  private readonly contentApi = inject(ContentApiService);
  private readonly router = inject(Router);
  private readonly toasts = inject(ToastNotificationsService);
  private request?: Subscription;
  private viewRequest?: Subscription;
  private actionRequests = new Subscription();
  private filterOpener?: HTMLButtonElement;
  private ratingDrag?: { pointerId: number; track: HTMLElement; handle: 'min' | 'max' | null };

  constructor() {
    this.load();
  }

  ngOnDestroy(): void {
    this.request?.unsubscribe();
    this.viewRequest?.unsubscribe();
    this.actionRequests.unsubscribe();
  }

  protected onHeroBackdropLoaded(): void {
    this.heroBackdropLoading.set(false);
  }

  protected onHeroBackdropError(): void {
    this.heroBackdropFailed.set(true);
    this.heroBackdropLoading.set(false);
  }

  protected load(): void {
    const user = this.session.user();
    if (!user) {
      void this.router.navigateByUrl('/login');
      return;
    }
    this.request?.unsubscribe();
    this.viewRequest?.unsubscribe();
    this.seriesGroupingBusy.set(false);
    this.status.set('loading');
    this.heroBackdropPath.set(undefined);
    this.heroBackdropLoading.set(true);
    this.heroBackdropFailed.set(false);
    this.errorMessage.set('');
    this.request = forkJoin({
      summary: this.api.getHomeSummary(user.id),
      diary: this.isReviewsPage
        ? this.diaryApi.getAllReviews(user.id)
        : this.diaryApi.getAllDiaryEntries(user.id),
      view: this.isReviewsPage ? of([] as DiaryViewResponseItem[]) : this.readDiaryView(user.id, true),
      series: this.diaryApi.getDiarySeries(user.id),
    }).subscribe({
      next: ({ summary, diary, view, series }) => {
        this.summary.set(summary);
        const backdropPath = summary.latestWatchedBackdropPath;
        this.heroBackdropPath.set(backdropPath);
        this.heroBackdropLoading.set(backdropPath === null || Boolean(backdropPath.trim()));
        this.heroBackdropFailed.set(false);
        this.diarySeries.set(series);
        this.diaryViewItems.set(view);
        this.seriesGrouping.set(true);
        this.seriesGroupingError.set('');
        this.page.set(1);
        this.diaryEntries.set(diary.map((record) => this.toGridEntry(record)));
        this.status.set('ready');
      },
      error: (error: unknown) => {
        this.heroBackdropLoading.set(false);
        this.status.set('error');
        this.errorMessage.set(error instanceof HttpErrorResponse && error.status === 0
          ? this.homeCopy.actionConnectionError
          : this.homeCopy.genericError);
      },
    });
  }

  protected setTypeFilter(value: DiaryTypeFilter): void {
    this.typeFilter.set(value);
    this.closeFilter();
    this.page.set(1);
  }

  protected updateRating(handle: 'min' | 'max', event: Event): void {
    const input = event.target as HTMLInputElement;
    const value = Number(input.value);
    if (!Number.isFinite(value)) return;
    this.setRatingValue(handle, value);
    input.value = String(handle === 'min' ? this.ratingMin() : this.ratingMax());
  }

  private setRatingValue(handle: 'min' | 'max', value: number): void {
    const clamped = Math.min(10, Math.max(1, Math.round(value)));
    if (handle === 'min') this.ratingMin.set(Math.min(clamped, this.ratingMax()));
    else this.ratingMax.set(Math.max(clamped, this.ratingMin()));
    this.page.set(1);
  }

  protected startRatingDrag(event: PointerEvent): void {
    if (event.button !== 0) return;
    const track = event.currentTarget as HTMLElement;
    const value = this.ratingValueAtPointer(track, event.clientX);
    // At coincident thumbs, let the first useful movement select the endpoint.
    const handle = this.ratingMin() === this.ratingMax() ? null
      : Math.abs(value - this.ratingMin()) <= Math.abs(value - this.ratingMax()) ? 'min' : 'max';
    this.ratingDrag = { pointerId: event.pointerId, track, handle };
    track.setPointerCapture(event.pointerId);
    event.preventDefault();
    this.moveRatingDrag(event);
  }

  protected moveRatingDrag(event: PointerEvent): void {
    const drag = this.ratingDrag;
    if (!drag || drag.pointerId !== event.pointerId) return;
    const value = this.ratingValueAtPointer(drag.track, event.clientX);
    if (!drag.handle) {
      if (value < this.ratingMin()) drag.handle = 'min';
      else if (value > this.ratingMax()) drag.handle = 'max';
      else return;
    }
    this.setRatingValue(drag.handle, value);
    const input = drag.track.querySelector<HTMLInputElement>(`[data-rating-handle="${drag.handle}"]`);
    if (input) {
      input.value = String(drag.handle === 'min' ? this.ratingMin() : this.ratingMax());
      input.focus({ preventScroll: true });
    }
    event.preventDefault();
  }

  protected endRatingDrag(event: PointerEvent): void {
    if (this.ratingDrag?.pointerId === event.pointerId) this.ratingDrag = undefined;
  }

  private ratingValueAtPointer(track: HTMLElement, clientX: number): number {
    const bounds = track.getBoundingClientRect();
    // Native 18px thumbs travel between centers 9px inside each track edge.
    return Math.round(1 + Math.min(1, Math.max(0, (clientX - bounds.left - 9) / Math.max(1, bounds.width - 18))) * 9);
  }

  protected resetRating(): void {
    this.ratingMin.set(1);
    this.ratingMax.set(10);
    this.page.set(1);
  }

  protected toggleFilter(filter: Exclude<DiaryFilter, null>, event?: Event): void {
    if (event) this.filterOpener = event.currentTarget as HTMLButtonElement;
    this.activeFilter.update((current) => current === filter ? null : filter);
  }

  protected closeFilter(event?: Event): void {
    if (!this.activeFilter()) return;
    this.activeFilter.set(null);
    event?.preventDefault();
    this.filterOpener?.focus();
  }

  protected setSeriesFilter(value: string): void {
    this.selectedSeriesId.set(value);
    this.closeFilter();
    this.page.set(1);
  }

  protected updateDate(value: 'from' | 'to', event: Event): void {
    const date = (event.target as HTMLInputElement).value;
    this.selectedDateShortcut.set(null);
    if (value === 'from') this.dateFrom.set(date);
    else this.dateTo.set(date);
    this.page.set(1);
  }

  protected setDateShortcut(shortcut: 'week' | 'month' | 'year' | 'all'): void {
    this.selectedDateShortcut.set(shortcut);
    const today = new Date();
    const start = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    if (shortcut === 'week' || shortcut === 'month') start.setDate(start.getDate() - (shortcut === 'week' ? 6 : 29));
    if (shortcut === 'year') start.setMonth(0, 1);
    this.dateFrom.set(shortcut === 'all' ? '' : localDiaryDay(start.toISOString()));
    this.dateTo.set(shortcut === 'all' ? '' : localDiaryDay(today.toISOString()));
    this.page.set(1);
    this.closeFilter();
  }

  protected seriesOptions(): Array<{ id: string; title: string }> {
    return this.diarySeries().map(option => ({ id: option.seriesTmdbId, title: option.title }));
  }

  protected seriesEntriesCount(seriesId: string): number {
    return this.diarySeries().find((option) => option.seriesTmdbId === seriesId)?.entriesCount ?? 0;
  }

  protected ratingSummary(): string {
    return this.ratingApplied()
      ? `${this.ratingMin()}–${this.ratingMax()}`
      : `${this.copy.any} (1–10)`;
  }

  protected seriesFilterLabel(): string {
    const title = this.seriesOptions().find((option) => option.id === this.selectedSeriesId())?.title;
    return this.copy.seriesFilter.replace('{value}', title || this.copy.allSeries);
  }

  protected setSort(value: DiarySort): void {
    this.sortOrder.set(value);
    this.closeFilter();
    this.page.set(1);
  }

  protected typeFilterLabel(): string {
    return this.copy.typeFilter.replace('{value}', this.typeOptions.find(option => option.value === this.typeFilter())!.label);
  }

  protected reviewContext(entry: DiaryGridEntry): string {
    const type = entry.content.type?.toUpperCase();
    if (type === 'EPISODE') return [this.episodeCoordinates(entry), this.episodeTitle(entry)].filter(Boolean).join(' · ');
    if (type === 'SEASON') {
      const season = entry.content.seasonNumber === null ? this.copy.season : `${this.copy.season} ${entry.content.seasonNumber}`;
      return [season, entry.card?.releaseYear ? String(entry.card.releaseYear) : ''].filter(Boolean).join(' · ');
    }
    return entry.card?.releaseYear ? String(entry.card.releaseYear) : '';
  }

  protected reviewWatchedDate(entry: Pick<DiaryGridEntry, 'watchedDate'>): string {
    const day = localDiaryDay(entry.watchedDate);
    if (!day) return this.copy.dateUnavailable;
    const [year, month, date] = day.split('-').map(Number);
    return new Intl.DateTimeFormat('pt-BR', { day: 'numeric', month: 'short', year: 'numeric' })
      .format(new Date(year, month - 1, date));
  }

  protected reviewCompanionNames(entry: DiaryGridEntry): string {
    return entry.companions
      .map(companion => companion.name || companion.username)
      .filter((name): name is string => Boolean(name))
      .join(', ');
  }

  protected isReviewLikeBusy(id: string): boolean {
    return this.busyReviewLikeIds().has(id);
  }

  protected toggleReviewLike(entry: DiaryGridEntry): void {
    if (this.isReviewLikeBusy(entry.id)) return;

    const nextLiked = !entry.likedByMe;
    this.updateReviewLikeState(entry.id, nextLiked);
    this.busyReviewLikeIds.update((current) => new Set(current).add(entry.id));
    this.contentApi.setReviewLike(entry.id, entry.reviewSource, nextLiked).subscribe({
      next: () => this.finishReviewLikeRequest(entry.id),
      error: () => {
        this.updateReviewLikeState(entry.id, !nextLiked);
        this.finishReviewLikeRequest(entry.id);
      },
    });
  }

  private updateReviewLikeState(id: string, liked: boolean): void {
    this.diaryEntries.update((entries) => entries.map((entry) => {
      if (entry.id !== id || entry.likedByMe === liked) return entry;
      return {
        ...entry,
        likedByMe: liked,
        likesCount: Math.max(0, entry.likesCount + (liked ? 1 : -1)),
      };
    }));
  }

  private finishReviewLikeRequest(id: string): void {
    this.busyReviewLikeIds.update((current) => {
      const next = new Set(current);
      next.delete(id);
      return next;
    });
  }

  protected sortLabel(): string {
    return this.copy.sortFilter.replace('{value}', this.sortOptions.find(option => option.value === this.sortOrder())!.label);
  }

  protected toggleTheaterFilter(): void {
    this.theaterOnly.update((value) => !value);
    this.page.set(1);
  }

  protected toggleGrouping(): void {
    this.grouped.update(value => !value);
  }

  protected toggleSeriesGrouping(): void {
    if (this.seriesGroupingBusy()) return;
    const user = this.session.user();
    if (!user) return;
    const nextGrouped = !this.seriesGrouping();
    this.seriesGroupingBusy.set(true);
    this.seriesGroupingError.set('');
    this.viewRequest?.unsubscribe();
    this.viewRequest = this.readDiaryView(user.id, nextGrouped).subscribe({
      next: (items) => {
        this.diaryViewItems.set(items);
        this.seriesGrouping.set(nextGrouped);
        this.seriesGroupingBusy.set(false);
        this.page.set(1);
      },
      error: () => {
        this.seriesGroupingBusy.set(false);
        this.seriesGroupingError.set(this.homeCopy.genericError);
      },
    });
  }

  protected groupWeekdayLabel(group: DiaryDayGroup): string {
    if (group.key === 'unknown') return this.copy.dateUnavailable;
    return new Intl.DateTimeFormat('pt-BR', { weekday: 'long' }).format(group.date);
  }

  protected groupDateLabel(group: DiaryDayGroup): string {
    if (group.key === 'unknown') return '';
    return new Intl.DateTimeFormat('pt-BR', { day: 'numeric', month: 'long', year: 'numeric' }).format(group.date);
  }

  protected groupSummary(group: DiaryDayGroup): string {
    const runtime = group.entries.reduce((sum, item) => sum + (this.isGroupedEntry(item)
      ? item.totalRuntimeMinutes ?? 0
      : item.card?.runtimeMinutes ?? 0), 0);
    const plays = group.entries.reduce((sum, item) => sum + (this.isGroupedEntry(item)
      ? Math.max(item.episodeCount, item.memberEntries.length, item.seasonCount, 1)
      : 1), 0);
    const playLabel = plays === 1 ? this.copy.playSingular : this.copy.playPlural;
    const duration = runtime > 0 ? ` · ${this.formatDuration(runtime)}` : '';
    return `${plays} ${playLabel}${duration}`;
  }

  protected isGroupedEntry(entry: DiaryTimelineEntry): entry is DiaryGroupedGridEntry {
    return 'kind' in entry && entry.kind === 'GROUPED';
  }

  protected groupedTitle(entry: DiaryGroupedGridEntry): string {
    return entry.seriesTitle || this.copy.titleUnavailable;
  }

  protected groupedPoster(entry: DiaryGroupedGridEntry): string | null {
    return tmdbImageUrl(entry.seriesPosterPath, 'w342');
  }

  protected groupedBackdrop(entry: DiaryGroupedGridEntry): string | null {
    return tmdbImageUrl(entry.backdropPath, 'w1280');
  }

  protected groupedRoute(entry: DiaryGroupedGridEntry): string[] | null {
    return entry.content.tmdbId ? ['/content/series', entry.content.tmdbId] : null;
  }

  protected groupedTypeLabel(entry: DiaryGroupedGridEntry): string {
    if (entry.groupType === 'SERIES') return this.copy.seriesGroup;
    if (entry.groupType === 'SEASON') return entry.seasonCount > 1 ? this.copy.seasons : this.copy.season;
    return entry.episodeCount > 1 ? this.copy.episodes : this.copy.episode;
  }

  protected groupedMetadata(entry: DiaryGroupedGridEntry): string {
    return this.groupedMetadataParts(entry).join(' · ');
  }

  protected groupedRuntimeLabel(entry: DiaryGroupedGridEntry): string | null {
    if (entry.totalRuntimeMinutes !== null) return this.formatDuration(entry.totalRuntimeMinutes);
    return entry.episodeCount > 0 ? this.copy.groupRuntimeUnavailable : null;
  }

  protected groupedMetadataParts(entry: DiaryGroupedGridEntry): string[] {
    const format = new Intl.NumberFormat('pt-BR');
    const parts: string[] = [];
    const seasonNumbers = [...new Set(entry.seasonNumbers.filter(Number.isInteger))].sort((a, b) => a - b);
    if (seasonNumbers.length > 0) parts.push(this.groupedSeasonNumbersLabel(seasonNumbers));
    else if (entry.seasonCount > 0) parts.push(this.copy.groupSeasons.replace('{count}', format.format(entry.seasonCount)));
    if (entry.episodeCount > 0) parts.push(this.copy.groupEpisodes.replace('{count}', format.format(entry.episodeCount)));
    return parts;
  }

  private groupedSeasonNumbersLabel(seasonNumbers: number[]): string {
    const formatted = seasonNumbers.map(number => new Intl.NumberFormat('pt-BR').format(number));
    const enumeration = formatted.length === 1
      ? formatted[0]
      : `${formatted.slice(0, -1).join(', ')} e ${formatted[formatted.length - 1]}`;
    return `${this.copy.season} ${enumeration}`;
  }

  protected groupedHasReview(entry: DiaryGroupedGridEntry): boolean {
    return entry.memberEntries.some(member => Boolean(member.comment?.trim()));
  }

  protected groupedHasPartial(entry: DiaryGroupedGridEntry): boolean {
    return entry.memberEntries.some(member => member.card?.previewStatus === 'PARTIAL');
  }

  protected groupedLikesCount(entry: DiaryGroupedGridEntry): number {
    return entry.memberEntries.reduce((total, member) => total + member.likesCount, 0);
  }

  protected groupedCommentsCount(entry: DiaryGroupedGridEntry): number {
    return entry.memberEntries.reduce((total, member) => total + member.commentsCount, 0);
  }

  protected groupedDate(entry: DiaryGroupedGridEntry): string {
    return this.reviewWatchedDate(entry);
  }

  protected groupedLabel(entry: DiaryGroupedGridEntry): string {
    return [this.groupedTitle(entry), this.groupedTypeLabel(entry), this.groupedMetadata(entry), this.groupedRuntimeLabel(entry), this.groupedDate(entry)]
      .filter(Boolean).join(', ');
  }

  protected title(entry: HomeRecentlyWatched): string {
    if (entry.content.type?.toUpperCase() === 'EPISODE') {
      return entry.seriesTitle || this.copy.titleUnavailable;
    }
    if (entry.content.type?.toUpperCase() === 'SEASON') {
      return entry.seriesTitle || entry.card?.title || this.copy.titleUnavailable;
    }
    return entry.card?.title || entry.seriesTitle || this.copy.titleUnavailable;
  }

  protected episodeTitle(entry: HomeRecentlyWatched): string {
    return entry.content.type?.toUpperCase() === 'EPISODE'
      ? entry.card?.title || this.copy.titleUnavailable
      : '';
  }

  protected episodeCoordinates(entry: HomeRecentlyWatched): string {
    if (entry.content.type?.toUpperCase() !== 'EPISODE') return '';
    return [
      entry.content.seasonNumber !== null ? `S${entry.content.seasonNumber}` : null,
      entry.content.episodeNumber !== null ? `E${entry.content.episodeNumber}` : null,
    ].filter(Boolean).join(' · ');
  }

  protected runtimeLabel(entry: HomeRecentlyWatched): string {
    const runtime = entry.card?.runtimeMinutes ?? entry.content.runtimeMinutes;
    return runtime ? `${runtime} ${this.copy.minutes}` : '';
  }

  protected entryLabel(entry: HomeRecentlyWatched): string {
    const isEpisode = entry.content.type?.toUpperCase() === 'EPISODE';
    const details = isEpisode
      ? [this.episodeCoordinates(entry), this.episodeTitle(entry), this.runtimeLabel(entry)]
      : [this.runtimeLabel(entry), entry.card?.releaseYear ? String(entry.card.releaseYear) : ''];
    return [this.typeLabel(entry), this.title(entry), ...details].filter(Boolean).join(', ');
  }

  protected poster(entry: DiaryGridEntry): string | null {
    const type = entry.content.type?.toUpperCase();
    const path = (type === 'EPISODE' || type === 'SEASON' || type === 'SERIES' ? entry.seriesPosterPath : null)
      || entry.customPosterUrl || entry.card?.customPosterUrl || entry.card?.posterPath;
    return tmdbImageUrl(path, 'w342');
  }

  protected typeLabel(entry: HomeRecentlyWatched): string {
    const type = entry.content.type?.toUpperCase();
    if (type === 'EPISODE') return this.copy.episode;
    if (type === 'SEASON') return this.copy.season;
    if (type === 'SERIES') return this.copy.series;
    return this.copy.movie;
  }

  protected contentRoute(entry: HomeRecentlyWatched): string[] | null {
    const type = entry.content.type?.toUpperCase();
    if (this.isReviewsPage) {
      const reviewEntry = entry as DiaryGridEntry;
      if (reviewEntry.reviewSource === 'CONTENT_REVIEW') {
        const seriesTmdbId = entry.content.seriesTmdbId
          || (type === 'SERIES' ? entry.content.tmdbId : null);
        if (seriesTmdbId && (type === 'SERIES' || type === 'SEASON')) {
          return ['/content/series', seriesTmdbId];
        }
      }
      return ['/diary/entry', entry.id];
    }
    if (type === 'MOVIE' && entry.content.tmdbId) return ['/content/movie', entry.content.tmdbId];
    if (type === 'SERIES' && entry.content.seriesTmdbId) return ['/content/series', entry.content.seriesTmdbId];
    if (type === 'SEASON' && entry.content.seriesTmdbId && entry.content.seasonNumber !== null) {
      return ['/content/series', entry.content.seriesTmdbId, 'season', String(entry.content.seasonNumber)];
    }
    if (type === 'EPISODE' && entry.content.seriesTmdbId && entry.content.seasonNumber !== null && entry.content.episodeNumber !== null) {
      return ['/content/series', entry.content.seriesTmdbId, 'season', String(entry.content.seasonNumber), 'episode', String(entry.content.episodeNumber)];
    }
    return null;
  }

  protected imageRating(entry: HomeRecentlyWatched): string | null {
    const score = entry.card?.tmdbVoteAverage;
    return score === null || score === undefined ? null : this.formatScore(score);
  }

  protected imageRatingLabel(entry: HomeRecentlyWatched): string {
    const score = this.imageRating(entry);
    return score ? `${this.homeCopy.tmdbRating}: ${score}` : '';
  }

  protected posterActionsFor(entry: DiaryTimelineEntry): readonly ContentImageAction[] {
    const records = this.actionRecords(entry);
    return this.posterActions.map((action) => {
      if (action.id === 'remove-history') return { ...action, disabled: this.isReviewsPage || records.length === 0 || records.some(record => record.reviewSource !== 'DIARY') };
      if (action.id === 'edit-rating' || action.id === 'share-review') return { ...action, disabled: records.length === 0 };
      return action;
    });
  }

  protected handlePosterAction(entry: DiaryTimelineEntry, selection: ContentImageActionSelection): void {
    const target = this.representativeEntry(entry);
    if (selection.action.id === 'watch-again') {
      this.watchAgain(entry);
      return;
    }
    if (selection.action.id === 'edit-rating') {
      if (target) void this.router.navigate(['/diary/entry', target.id], { state: { openReviewEditor: true } });
      return;
    }
    if (selection.action.id === 'share-review') {
      if (!target) return;
      const actionButton = selection.event.currentTarget as HTMLElement;
      this.shareReviewOpener.set(actionButton.closest('app-content-image-actions')?.querySelector<HTMLElement>('.content-menu-trigger') ?? null);
      this.shareReviewTarget.set(target);
      return;
    }
    if (selection.action.id === 'remove-history') this.removeHistory(entry);
  }

  protected closeShareReviewPreview(): void {
    this.shareReviewTarget.set(null);
    this.shareReviewOpener()?.focus();
    this.shareReviewOpener.set(null);
  }

  private actionRecords(entry: DiaryTimelineEntry): DiaryGridEntry[] {
    if (this.isGroupedEntry(entry)) return entry.memberEntries;
    if (entry.derivedCompletion) return entry.sourceEntries ?? [];
    return [entry];
  }

  private representativeEntry(entry: DiaryTimelineEntry): DiaryGridEntry | null {
    if (!this.isGroupedEntry(entry)) {
      if (entry.derivedCompletion) {
        return entry.sourceEntries?.find(record => Boolean(record.comment?.trim()) || record.score !== null)
          ?? entry.sourceEntries?.[0]
          ?? null;
      }
      return entry;
    }
    return entry.memberEntries.find(record => Boolean(record.comment?.trim()) || record.score !== null)
      ?? entry.memberEntries[0]
      ?? {
        id: entry.id,
        reviewSource: 'DIARY',
        seriesPosterPath: entry.seriesPosterPath,
        content: { id: null, tmdbId: entry.content.tmdbId, type: 'SERIES', seriesTmdbId: entry.content.seriesTmdbId, seasonNumber: null, episodeNumber: null, runtimeMinutes: entry.totalRuntimeMinutes },
        watchedDate: entry.watchedDate,
        watchNumber: entry.watchNumber ?? 1,
        customPosterUrl: null,
        seriesTitle: entry.seriesTitle,
        companions: [],
        companionProfilePictures: [],
        card: null,
        score: entry.score,
        likesCount: 0,
        likedByMe: false,
        commentsCount: 0,
        comment: null,
        watchedInTheater: entry.watchedInTheater,
      };
  }

  private watchAgain(entry: DiaryTimelineEntry): void {
    if (this.diaryActionPending()) return;
    const records = this.actionRecords(entry);
    const requests = records
      .map(record => this.createRewatchRequest(record))
      .filter((request): request is Observable<unknown> => request !== null);
    if (!requests.length) {
      const route = this.isGroupedEntry(entry) ? this.groupedRoute(entry) : this.contentRoute(entry);
      if (route) void this.router.navigate(route);
      return;
    }
    this.diaryActionPending.set(true);
    this.actionRequests.add(forkJoin(requests).subscribe({
      next: () => {
        this.diaryActionPending.set(false);
        this.toasts.success(this.copy.watchAgainSaved);
        this.load();
      },
      error: () => {
        this.diaryActionPending.set(false);
        this.toasts.error(this.homeCopy.genericError);
      },
    }));
  }

  private createRewatchRequest(entry: DiaryGridEntry): Observable<unknown> | null {
    const type = (entry.content.type ?? '').toUpperCase();
    const watchedDate = this.localToday();
    if (type === 'MOVIE' && entry.content.tmdbId) {
      return this.contentApi.createDiaryEntry({ content: { type: 'MOVIE', tmdbId: entry.content.tmdbId }, watchedDate, isRewatch: true });
    }
    if (type === 'EPISODE' && entry.content.seriesTmdbId && entry.content.seasonNumber !== null && entry.content.episodeNumber !== null) {
      return this.contentApi.createSeriesDiaryEntry({
        content: { type: 'EPISODE', seriesTmdbId: entry.content.seriesTmdbId, seasonNumber: entry.content.seasonNumber, episodeNumber: entry.content.episodeNumber },
        watchedDate,
        isRewatch: true,
      });
    }
    return null;
  }

  private localToday(): string {
    const now = new Date();
    const pad = (value: number) => String(value).padStart(2, '0');
    return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
  }

  private removeHistory(entry: DiaryTimelineEntry): void {
    if (this.diaryActionPending()) return;
    const records = this.actionRecords(entry).filter(record => record.reviewSource === 'DIARY');
    if (!records.length || !window.confirm(this.copy.removeHistoryConfirm.replace('{count}', String(records.length)))) return;
    this.diaryActionPending.set(true);
    this.actionRequests.add(forkJoin(records.map(record => this.contentApi.deleteDiaryEntry(record.id))).subscribe({
      next: () => {
        this.diaryActionPending.set(false);
        this.toasts.success(this.copy.removeHistorySuccess);
        this.load();
      },
      error: () => {
        this.diaryActionPending.set(false);
        this.toasts.error(this.homeCopy.genericError);
      },
    }));
  }

  protected goToPage(page: number): void {
    this.page.set(Math.min(this.totalPages(), Math.max(1, page)));
  }

  protected formatScore(value: number): string {
    return new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 }).format(value);
  }

  protected formatUserScore(value: number): string {
    return new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 0 }).format(value);
  }

  protected formatDuration(minutes: number): string {
    const hours = Math.floor(minutes / 60);
    const remaining = minutes % 60;
    return hours ? `${hours}h ${remaining}min` : `${remaining} min`;
  }

  protected statsNumber(value: number | null | undefined): string {
    return new Intl.NumberFormat('pt-BR').format(value ?? 0);
  }

  protected statsDuration(minutes: number | null | undefined): string {
    const total = Math.max(0, minutes ?? 0);
    const days = Math.floor(total / 1440);
    const hours = Math.floor((total % 1440) / 60);
    const remainingMinutes = total % 60;

    if (days > 0) {
      return `${this.statsNumber(days)}${this.homeCopy.dayShort} ${this.statsNumber(hours)}${this.homeCopy.hourShort}`;
    }
    if (hours > 0) {
      return `${this.statsNumber(hours)}${this.homeCopy.hourShort} ${this.statsNumber(remainingMinutes)}${this.homeCopy.minuteShort}`;
    }
    return `${this.statsNumber(remainingMinutes)}${this.homeCopy.minuteShort}`;
  }

  protected statsHoursLabel(minutes: number | null | undefined): string {
    const hours = Math.floor(Math.max(0, minutes ?? 0) / 60);
    const label = hours === 1 ? this.homeCopy.hourSingular : this.homeCopy.hours;
    return `${this.statsNumber(hours)} ${label}`;
  }

  protected seriesCountLabel(count: number): string {
    return this.copy.fromSeries.replace('{count}', new Intl.NumberFormat('pt-BR').format(count));
  }

  protected moviePlaysLabel(count: number): string {
    return this.copy.moviePlays.replace('{count}', new Intl.NumberFormat('pt-BR').format(count));
  }

  protected showingLabel(): string {
    const format = new Intl.NumberFormat('pt-BR');
    return (this.isReviewsPage ? this.copy.showingReviews : this.copy.showingCount)
      .replace('{shown}', format.format(this.visibleEnd() - this.visibleStart() + 1))
      .replace('{total}', format.format(this.totalPlays()));
  }

  private readDiaryView(userId: string, grouped: boolean) {
    // Keep the existing history view usable while a local API/mock is updated to expose /diary/view.
    const api = this.diaryApi as DiaryApiService & {
      getAllDiaryViewItems?: (ownerId: string, grouped: boolean) => ReturnType<DiaryApiService['getAllDiaryViewItems']>;
    };
    return api.getAllDiaryViewItems?.(userId, grouped) ?? of([] as DiaryViewResponseItem[]);
  }

  private filteredTimelineEntries(): DiaryTimelineEntry[] {
    const filters = this.activeDiaryFilters();
    const rawEntries = this.diaryEntries();
    const source = this.diaryViewItems().length
      ? this.toTimelineEntries(this.diaryViewItems(), rawEntries)
      : rawEntries;
    const filtered = source.filter(entry => this.matchesTimelineFilters(entry, filters));

    if (filters.sort === 'newest') return filtered;
    return filtered.sort((left, right) => {
      if (filters.sort === 'highest' || filters.sort === 'lowest') {
        if (left.score === null && right.score !== null) return 1;
        if (right.score === null && left.score !== null) return -1;
        const scoreDiff = (left.score ?? 0) - (right.score ?? 0);
        if (scoreDiff) return filters.sort === 'highest' ? -scoreDiff : scoreDiff;
      }
      const dateDiff = localDiaryDay(left.watchedDate).localeCompare(localDiaryDay(right.watchedDate));
      if (dateDiff) return filters.sort === 'oldest' ? dateDiff : -dateDiff;
      return left.id.localeCompare(right.id);
    });
  }

  private matchesTimelineFilters(entry: DiaryTimelineEntry, filters: DiaryFilters): boolean {
    if (!this.isGroupedEntry(entry)) return filterDiaryEntries([entry], filters).length > 0;
    const day = localDiaryDay(entry.watchedDate);
    if (filters.dateFrom && (!day || day < filters.dateFrom)) return false;
    if (filters.dateTo && (!day || day > filters.dateTo)) return false;
    if (filters.seriesId && entry.content.tmdbId !== filters.seriesId) return false;
    if (filters.theaterOnly && !entry.memberEntries.some(member => member.watchedInTheater === true)) return false;

    const expectedType = ({ movies: 'MOVIE', series: 'SERIES', seasons: 'SEASON', episodes: 'EPISODE' } as const)[filters.type as 'movies' | 'series' | 'seasons' | 'episodes'];
    if (filters.type !== 'all' && entry.groupType !== expectedType
      && !entry.memberEntries.some(member => member.content.type === expectedType)) return false;
    if (filters.ratingMin > 1 || filters.ratingMax < 10) {
      return entry.memberEntries.some(member => member.score !== null
        && member.score >= filters.ratingMin && member.score <= filters.ratingMax);
    }
    return true;
  }

  private toTimelineEntries(items: DiaryViewResponseItem[], records: DiaryGridEntry[]): DiaryTimelineEntry[] {
    const consumedIds = new Set<string>();
    const result: DiaryTimelineEntry[] = [];
    const recordsById = new Map(records.map(record => [record.id, record]));

    for (const item of items) {
      if (item.kind === 'GROUPED') {
        const members = this.groupedRecords(item, records, consumedIds);
        for (const member of members) consumedIds.add(member.id);
        result.push(this.toGroupedGridEntry(item, members));
        continue;
      }

      if (item.kind === 'PERSISTED_ENTRY' && item.diaryEntryId) {
        const record = recordsById.get(item.diaryEntryId);
        if (record) {
          consumedIds.add(record.id);
          result.push(record);
          continue;
        }
      }
      if (item.kind === 'DERIVED_COMPLETION') result.push(this.toSyntheticGridEntry(item));
    }

    return result;
  }

  private groupedRecords(item: DiaryViewGroupedItem, records: DiaryGridEntry[], consumedIds: ReadonlySet<string>): DiaryGridEntry[] {
    const seriesId = item.content.tmdbId || item.content.seriesTmdbId;
    if (!seriesId) return [];
    const candidates = records.filter(record => {
      const recordSeriesId = record.content.seriesTmdbId
        || (record.content.type === 'SERIES' ? record.content.tmdbId : null);
      return !consumedIds.has(record.id)
        && recordSeriesId === seriesId
        && localDiaryDay(record.watchedDate) === item.groupDate
        && (item.watchNumber === null || record.watchNumber === item.watchNumber);
    });
    const episodes = candidates.filter(record => record.content.type === 'EPISODE');
    if (item.episodeCount > 0) return episodes.slice(0, item.episodeCount);
    const completions = candidates.filter(record => record.content.type === 'SEASON' || record.content.type === 'SERIES');
    return completions.slice(0, Math.max(1, item.seasonCount));
  }

  private toGroupedGridEntry(item: DiaryViewGroupedItem, members: DiaryGridEntry[]): DiaryGroupedGridEntry {
    const seriesId = item.content.tmdbId || item.content.seriesTmdbId;
    const matchingSeries = this.diarySeries().find(option => option.seriesTmdbId === seriesId);
    const seriesTitle = members.find(member => member.seriesTitle)?.seriesTitle || matchingSeries?.title || null;
    const seriesPosterPath = members.find(member => member.seriesPosterPath)?.seriesPosterPath
      || members.find(member => member.content.type === 'SERIES')?.card?.posterPath
      || null;
    const scores = members.map(member => member.score).filter((score): score is number => score !== null);
    return {
      kind: 'GROUPED',
      id: `group:${seriesId ?? 'unknown'}:${item.groupDate}:${item.watchNumber ?? 1}:${item.orderedAt}`,
      content: {
        type: item.groupType,
        tmdbId: seriesId,
        seriesTmdbId: seriesId,
        seasonNumber: null,
        episodeNumber: null,
        runtimeMinutes: item.totalRuntimeMinutes,
      },
      watchedDate: item.groupDate,
      score: scores.length ? Math.max(...scores) : null,
      watchedInTheater: members.some(member => member.watchedInTheater === true),
      seriesTitle,
      seriesPosterPath,
      backdropPath: item.backdropPath ?? null,
      groupType: item.groupType,
      seasonCount: item.seasonCount,
      seasonNumbers: item.seasonNumbers ?? [],
      episodeCount: item.episodeCount,
      totalRuntimeMinutes: item.totalRuntimeMinutes,
      watchNumber: item.watchNumber,
      memberEntries: members,
    };
  }

  private toSyntheticGridEntry(item: DiaryViewEntryItem): DiaryGridEntry {
    const watchedDate = item.watchedDate || item.orderedAt.slice(0, 10);
    const seriesTmdbId = item.content.seriesTmdbId
      || (item.content.type === 'SERIES' ? item.content.tmdbId : null);
    const relatedEntry = this.diaryEntries().find(entry =>
      (entry.content.seriesTmdbId || (entry.content.type === 'SERIES' ? entry.content.tmdbId : null)) === seriesTmdbId
      && localDiaryDay(entry.watchedDate) === localDiaryDay(watchedDate)
      && entry.watchNumber === (item.watchNumber ?? 1),
    );
    const sourceEntries = this.diaryEntries().filter(entry => {
      const recordSeriesId = entry.content.seriesTmdbId
        || (entry.content.type === 'SERIES' ? entry.content.tmdbId : null);
      if (!seriesTmdbId || recordSeriesId !== seriesTmdbId
        || localDiaryDay(entry.watchedDate) !== localDiaryDay(watchedDate)
        || entry.watchNumber !== (item.watchNumber ?? 1)) return false;
      if (item.content.type === 'SEASON') return entry.content.type === 'EPISODE'
        && entry.content.seasonNumber === item.content.seasonNumber;
      if (item.content.type === 'EPISODE') return entry.content.type === 'EPISODE'
        && entry.content.seasonNumber === item.content.seasonNumber
        && entry.content.episodeNumber === item.content.episodeNumber;
      return item.content.type === 'SERIES' && entry.content.type === 'EPISODE';
    });
    return {
      id: item.completionKey || `completion:${item.content.type}:${item.content.tmdbId ?? item.content.seriesTmdbId ?? item.orderedAt}`,
      reviewSource: 'DIARY',
      derivedCompletion: true,
      seriesPosterPath: relatedEntry?.seriesPosterPath ?? null,
      content: {
        id: item.content.id,
        tmdbId: item.content.tmdbId,
        type: item.content.type,
        seriesTmdbId,
        seasonNumber: item.content.seasonNumber,
        episodeNumber: item.content.episodeNumber,
        runtimeMinutes: item.content.runtimeMinutes,
      },
      watchedDate,
      watchNumber: item.watchNumber ?? 1,
      customPosterUrl: null,
      seriesTitle: relatedEntry?.seriesTitle
        ?? this.diarySeries().find(option => option.seriesTmdbId === seriesTmdbId)?.title
        ?? null,
      companions: [],
      companionProfilePictures: [],
      card: null,
      score: item.currentScore,
      likesCount: 0,
      likedByMe: false,
      commentsCount: 0,
      comment: null,
      watchedInTheater: null,
      sourceEntries,
    };
  }

  private groupByDay(entries: DiaryTimelineEntry[]): DiaryDayGroup[] {
    const map = new Map<string, DiaryDayGroup>();
    for (const entry of entries) {
      const day = localDiaryDay(entry.watchedDate);
      const key = day || 'unknown';
      let group = map.get(key);
      if (!group) {
        const [year, month, date] = day.split('-').map(Number);
        group = { key, date: day ? new Date(year, month - 1, date) : new Date(0), entries: [] };
        map.set(key, group);
      }
      group.entries.push(entry);
    }
    return [...map.values()];
  }

  private toGridEntry(record: DiaryRecord): DiaryGridEntry {
    const content = record.content;
    const card = record.card;
    const viewer = this.session.user();
    const viewerUsername = viewer?.username.trim().toLowerCase();
    const companions = (record.watchedWith ?? []).filter(user =>
      (!viewer?.id || user.id !== viewer.id)
      && (!viewerUsername || user.username?.trim().toLowerCase() !== viewerUsername),
    );
    return {
      id: record.id,
      reviewSource: record.reviewSource ?? 'DIARY',
      seriesPosterPath: record.seriesPosterPath ?? null,
      content: {
        id: content.id,
        tmdbId: content.tmdbId,
        type: content.type,
        seriesTmdbId: content.seriesTmdbId,
        seasonNumber: content.seasonNumber,
        episodeNumber: content.episodeNumber,
        runtimeMinutes: content.runtimeMinutes,
      },
      watchedDate: record.watchedDate || record.createdAt.slice(0, 10),
      watchNumber: record.watchNumber,
      customPosterUrl: record.customPosterUrl,
      seriesTitle: record.seriesTitle ?? null,
      companions: companions.map(user => ({
        name: user.name ?? null,
        username: user.username ?? null,
        profilePicture: user.profilePicture ?? null,
      })),
      companionProfilePictures: companions
        .map((user) => user.profilePicture)
        .filter((picture): picture is string => Boolean(picture)),
      card: card ? {
        contentId: content.id,
        type: content.type,
        tmdbId: content.tmdbId,
        seriesTmdbId: content.seriesTmdbId,
        seasonNumber: content.seasonNumber,
        episodeNumber: content.episodeNumber,
        title: card.title,
        posterPath: card.posterPath,
        backdropPath: card.backdropPath ?? null,
        customPosterUrl: card.customPosterUrl,
        releaseDate: card.releaseDate,
        releaseYear: card.releaseYear,
        runtimeMinutes: card.runtimeMinutes,
        totalRuntimeMinutes: null,
        numberOfSeasons: null,
        numberOfEpisodes: null,
        tmdbVoteAverage: card.tmdbVoteAverage ?? null,
        genres: null,
        previewStatus: card.previewStatus ?? null,
      } : null,
      score: record.score,
      likesCount: record.likesCount,
      likedByMe: record.likedByMe,
      commentsCount: record.commentsCount,
      comment: record.comment,
      watchedInTheater: record.watchedInTheater,
    };
  }
}
