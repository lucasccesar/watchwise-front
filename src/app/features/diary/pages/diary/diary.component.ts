import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, OnDestroy, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { forkJoin, Subscription } from 'rxjs';
import { AuthSessionService } from '../../../../core/session/session.service';
import { DiaryApiService, DiaryRecord, DiarySeriesOption } from '../../data-access/diary-api.service';
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
import { filterDiaryEntries, localDiaryDay, type DiarySort, type DiaryTypeFilter } from './diary-filtering';

type DiaryFilter = 'type' | 'series' | 'rating' | 'date' | 'sort' | null;

interface DiaryDayGroup {
  key: string;
  date: Date;
  entries: DiaryGridEntry[];
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
}

@Component({
  selector: 'app-diary',
  standalone: true,
  imports: [RouterLink, ContentImageActionsComponent, ResponsiveBannerComponent],
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
  protected readonly loadingPlaceholders = Array.from({ length: 12 }, (_, index) => index);
  protected readonly reviewLoadingPlaceholders = [0, 1, 2];
  protected readonly busyReviewLikeIds = signal<ReadonlySet<string>>(new Set());
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
  protected readonly collapsedDays = signal<ReadonlySet<string>>(new Set());
  protected readonly grouped = signal(true);
  protected readonly page = signal(1);
  protected readonly pageSize = 30;
  protected readonly reviewsPageSize = 15;
  protected readonly isReviewsPage = this.route.snapshot.data['mode'] === 'reviews';
  protected readonly currentPageSize = computed(() => this.isReviewsPage ? this.reviewsPageSize : this.pageSize);
  protected readonly entries = computed(() => filterDiaryEntries(this.diaryEntries(), {
    type: this.typeFilter(), ratingMin: this.ratingMin(), ratingMax: this.ratingMax(),
    seriesId: this.selectedSeriesId(), dateFrom: this.dateFrom(), dateTo: this.dateTo(),
    theaterOnly: this.theaterOnly(), sort: this.sortOrder(),
  }));
  protected readonly visibleEntries = computed(() => this.entries().slice(
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
    { id: 'open-content', label: this.copy.openContent, icon: 'eye' },
  ];

  private readonly session = inject(AuthSessionService);
  private readonly api = inject(HomeApiService);
  private readonly diaryApi = inject(DiaryApiService);
  private readonly contentApi = inject(ContentApiService);
  private readonly router = inject(Router);
  private request?: Subscription;
  private filterOpener?: HTMLButtonElement;
  private ratingDrag?: { pointerId: number; track: HTMLElement; handle: 'min' | 'max' | null };

  constructor() {
    this.load();
  }

  ngOnDestroy(): void { this.request?.unsubscribe(); }

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
      series: this.diaryApi.getDiarySeries(user.id),
    }).subscribe({
      next: ({ summary, diary, series }) => {
        this.summary.set(summary);
        const backdropPath = summary.latestWatchedBackdropPath;
        this.heroBackdropPath.set(backdropPath);
        this.heroBackdropLoading.set(backdropPath === null || Boolean(backdropPath.trim()));
        this.heroBackdropFailed.set(false);
        this.diarySeries.set(series);
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

  protected reviewWatchedDate(entry: DiaryGridEntry): string {
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

  protected toggleDay(key: string): void {
    this.collapsedDays.update((days) => {
      const next = new Set(days);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  protected toggleGrouping(): void {
    this.grouped.update(value => !value);
  }

  protected dayCollapsed(key: string): boolean {
    return this.collapsedDays().has(key);
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
    const runtime = group.entries.reduce((sum, item) => sum + (item.card?.runtimeMinutes ?? 0), 0);
    const plays = group.entries.length;
    const playLabel = plays === 1 ? this.copy.playSingular : this.copy.playPlural;
    const duration = runtime > 0 ? ` · ${this.formatDuration(runtime)}` : '';
    return `${plays} ${playLabel}${duration}`;
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
    const path = (type === 'EPISODE' || type === 'SEASON' ? entry.seriesPosterPath : null)
      || entry.customPosterUrl || entry.card?.customPosterUrl || entry.card?.posterPath;
    if (!path) return null;
    return /^https?:\/\//i.test(path)
      ? path
      : `https://image.tmdb.org/t/p/w342${path.startsWith('/') ? path : `/${path}`}`;
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

  protected handlePosterAction(entry: HomeRecentlyWatched, selection: ContentImageActionSelection): void {
    if (selection.action.id !== 'open-content') return;
    const route = this.contentRoute(entry);
    if (route) void this.router.navigate(route);
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

  private groupByDay(entries: DiaryGridEntry[]): DiaryDayGroup[] {
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
