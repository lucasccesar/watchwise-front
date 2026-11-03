import { HttpErrorResponse } from '@angular/common/http';
import {
  AfterViewInit,
  Component,
  ElementRef,
  HostListener,
  OnDestroy,
  OnInit,
  QueryList,
  ViewChild,
  ViewChildren,
  computed,
  signal,
} from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { DialogBackdropComponent } from '../../../../shared/components/dialog-backdrop/dialog-backdrop.component';
import { ResponsiveBannerComponent } from '../../../../shared/components/responsive-banner/responsive-banner.component';
import { ModalFocusDirective } from '../../../../shared/directives/modal-focus.directive';
import { Observable, Subscription } from 'rxjs';
import { formatHomeHeroDate, homeContentRoute } from './home-display.utils';
import { messageCatalog } from '../../../../shared/i18n/messages';
import { AuthSessionService } from '../../../../core/session/session.service';
import { AppShellStateService } from '../../../../core/ui/app-shell-state.service';
import { ContentApiService } from '../../../content/data-access/content-api.service';
import { FeedApiService } from '../../../social/data-access/feed-api.service';
import {
  ContentImageAction,
  ContentImageActionSelection,
  ContentImageActionsComponent,
} from '../../../../shared/components/content-image-actions/content-image-actions.component';
import {
  DailyWatchCount,
  DiaryEntryCreationRequest,
  DiaryEntryUpdateRequest,
  GenreCount,
  HomeApiService,
  HomeContentCard,
  HomeRecentlyWatched,
  HomeSocialActivity,
  HomeSummary,
  NextEpisode,
  UpcomingRelease,
} from '../../data-access/home-api.service';

interface ChartDay {
  date: string;
  label: string;
  count: number;
  height: number;
  description: string;
}

interface GenreBreakdown {
  genre: string;
  episodes: number;
  movies: number;
  weight: number;
}

interface UpcomingDateGroup {
  date: string;
  label: string;
  shortDate: string;
  releases: UpcomingRelease[];
}

interface WatchLogDialogTarget {
  dialogTitle: string;
  title: string;
  subtitle: string;
  content: DiaryEntryCreationRequest['content'];
}

interface RatingDialogTarget {
  title: string;
  subtitle: string;
  diaryEntryId: string;
  editing: boolean;
}

interface WatchCalendarDay {
  date: string;
  day: number;
  inMonth: boolean;
  selected: boolean;
  disabled: boolean;
  ariaLabel: string;
}

type HomeStatus = 'loading' | 'ready' | 'error';
const GENRE_CHART_COLOR_ORDER = [1, 3, 4, 5, 2, 6] as const;

@Component({
  imports: [DialogBackdropComponent, ModalFocusDirective, RouterLink, ContentImageActionsComponent, ResponsiveBannerComponent],
  selector: 'app-home',
  standalone: true,
  templateUrl: './home.component.html',
  styleUrl: './home.component.css',
})
export class HomeComponent implements OnInit, AfterViewInit, OnDestroy {
  protected readonly copy = messageCatalog['pt-BR'].home;
  protected readonly socialCopy = messageCatalog['pt-BR'].socialPage;
  protected readonly copyrightYear = new Date().getFullYear();
  protected readonly contentRoute = homeContentRoute;
  protected readonly upcomingContentActions: readonly ContentImageAction[] = [
    { id: 'drop-series', label: this.copy.dropSeries, icon: 'ban' },
  ];
  protected readonly socialContentActions: readonly ContentImageAction[] = [
    { id: 'open-content', label: this.copy.openContent, icon: 'eye' },
  ];
  protected readonly summary = signal<HomeSummary | null>(null);
  protected readonly socialActivityDetailsLoaded = signal(false);
  protected readonly busySocialLikeIds = signal<ReadonlySet<string>>(new Set());
  protected readonly hoveredChartDayIndex = signal<number | null>(null);
  protected readonly status = signal<HomeStatus>('loading');
  protected readonly errorMessage = signal<string | null>(null);
  protected readonly actionFeedback = signal<{ message: string; error: boolean } | null>(null);
  protected readonly openContentMenuId = signal<string | null>(null);
  protected readonly watchLogTarget = signal<WatchLogDialogTarget | null>(null);
  protected readonly ratingTarget = signal<RatingDialogTarget | null>(null);
  protected readonly isSaving = signal(false);
  protected readonly dialogErrorMessage = signal<string | null>(null);
  protected readonly watchLogDate = signal(this.toDateKey(new Date()));
  protected readonly watchLogRewatch = signal(false);
  protected readonly watchLogRating = signal<number | null>(null);
  protected readonly watchLogReview = signal('');
  protected readonly ratingModalScore = signal<number | null>(null);
  protected readonly ratingModalReview = signal('');
  protected readonly watchCalendarOpen = signal(false);
  protected readonly watchCalendarMonth = signal(this.firstOfMonth(new Date()));
  protected readonly ratingOptions = Array.from({ length: 10 }, (_, index) => index + 1);
  protected readonly calendarWeekdays = this.copy.calendarWeekdays.split(' ');
  protected readonly watchCalendarDays = computed(() =>
    this.createWatchCalendarDays(this.watchCalendarMonth(), this.watchLogDate()),
  );
  protected readonly watchCalendarMonthLabel = computed(() =>
    new Intl.DateTimeFormat('pt-BR', { month: 'long', year: 'numeric' }).format(
      this.watchCalendarMonth(),
    ),
  );
  protected readonly canAdvanceWatchCalendar = computed(() => {
    const month = this.watchCalendarMonth();
    const today = new Date();
    return month.getFullYear() * 12 + month.getMonth() < today.getFullYear() * 12 + today.getMonth();
  });
  protected readonly upcomingView = signal<'calendar' | 'next'>('calendar');
  protected readonly chartDays = computed(() =>
    this.createChartDays(this.summary()?.watchCountByDayLast30Days ?? []),
  );
  protected readonly hasWatchHistory = computed(() =>
    this.chartDays().some((day) => day.count > 0),
  );
  protected readonly hoveredGenreIndex = signal<number | null>(null);
  protected readonly genreMinimumWidths = signal<number[]>([]);
  protected readonly genreBreakdown = computed(() =>
    this.createGenreBreakdown(
      this.summary()?.genreCountsEpisodesLast30Days ?? [],
      this.summary()?.genreCountsMoviesLast30Days ?? [],
    ),
  );
  protected readonly upcomingGroups = computed(() =>
    this.groupUpcoming(this.summary()?.upcomingReleases ?? []),
  );
  private activeDialogOpener: HTMLElement | null = null;
  private genreLabelObserver: ResizeObserver | null = null;
  private genreLabelChanges?: Subscription;
  private socialDetailsRequestSequence = 0;

  @ViewChildren('genreItemLabel')
  private genreItemLabels!: QueryList<ElementRef<HTMLElement>>;

  @ViewChild('dialogCloseButton')
  protected set dialogCloseButton(button: ElementRef<HTMLButtonElement> | undefined) {
    if (button && (this.watchLogTarget() || this.ratingTarget())) {
      button.nativeElement.focus();
    }
  }

  constructor(
    private readonly api: HomeApiService,
    private readonly contentApi: ContentApiService,
    private readonly feedApi: FeedApiService,
    private readonly session: AuthSessionService,
    private readonly shellState: AppShellStateService,
    private readonly router: Router,
  ) {}

  ngOnInit(): void {
    const user = this.session.user();
    if (user) {
      this.loadSummary(user.id);
    }
  }

  ngAfterViewInit(): void {
    if (typeof ResizeObserver !== 'undefined') {
      this.genreLabelObserver = new ResizeObserver(() => this.updateGenreMinimumWidths());
    }
    this.genreLabelChanges = this.genreItemLabels.changes.subscribe(() => this.observeGenreLabels());
    this.observeGenreLabels();
  }

  ngOnDestroy(): void {
    this.genreLabelChanges?.unsubscribe();
    this.genreLabelObserver?.disconnect();
  }

  protected loadSummary(userId = this.session.user()?.id): void {
    if (!userId) {
      this.session.clear();
      void this.router.navigateByUrl('/login');
      return;
    }

    this.status.set('loading');
    this.errorMessage.set(null);
    this.actionFeedback.set(null);
    this.socialActivityDetailsLoaded.set(false);
    this.socialDetailsRequestSequence += 1;
    this.shellState.clearHomeState();
    this.api.getHomeSummary(userId).subscribe({
      next: (summary) => {
        this.summary.set(summary);
        this.loadSocialActivityDetails(summary.socialActivities);
        this.shellState.updateHomeState(
          summary.viewer,
          summary.hasUnreadNotifications,
        );
        this.status.set('ready');
      },
      error: (error: unknown) => this.handleLoadError(error),
    });
  }

  protected formatNumber(value: number | null | undefined): string {
    return new Intl.NumberFormat('pt-BR').format(value ?? 0);
  }

  protected quantityLabel(count: number | null | undefined, singular: string, plural: string): string {
    return `${this.formatNumber(count)} ${count === 1 ? singular : plural}`;
  }

  protected formatScore(value: number): string {
    return new Intl.NumberFormat('pt-BR', {
      minimumFractionDigits: 1,
      maximumFractionDigits: 1,
    }).format(value);
  }

  protected nextEpisodeRating(
    episode: NextEpisode,
  ): { label: string; value: string } | null {
    if (this.hasUpcomingRelease(episode.releaseDate)) {
      return null;
    }

    const hasCommunityScore = episode.communityAverageScore != null;
    const score = episode.communityAverageScore ?? episode.tmdbVoteAverage;
    if (score == null) {
      return null;
    }

    return {
      label: hasCommunityScore ? this.copy.communityAverage : this.copy.tmdbRating,
      value: this.formatScore(score),
    };
  }

  protected recentTmdbRating(
    entry: HomeRecentlyWatched,
  ): { label: string; value: string } | null {
    if (this.hasUpcomingRelease(entry.card?.releaseDate)) {
      return null;
    }

    const score = entry.card?.tmdbVoteAverage;
    if (score == null) {
      return null;
    }

    return {
      label: this.copy.tmdbRating,
      value: this.formatScore(score),
    };
  }

  protected formatUserScore(value: number): string {
    return new Intl.NumberFormat('pt-BR', {
      maximumFractionDigits: 0,
    }).format(value);
  }

  protected setHoveredGenre(index: number): void {
    this.hoveredGenreIndex.set(index);
  }

  protected clearGenreHover(): void {
    this.hoveredGenreIndex.set(null);
  }

  protected genrePercentage(genre: GenreBreakdown): string {
    return `${Math.round(genre.weight * 100)}%`;
  }

  protected toggleContentMenu(event: MouseEvent, menuId: string): void {
    event.stopPropagation();
    this.openContentMenuId.update((openId) =>
      openId === menuId ? null : menuId,
    );
  }

  protected handleEpisodeContentAction(
    episode: NextEpisode,
    selection: ContentImageActionSelection,
  ): void {
    if (selection.action.id === 'mark-watched') {
      this.openWatchLogForEpisode(episode, selection.event);
    } else if (selection.action.id === 'drop-series') {
      this.abandonSeries(episode.seriesTmdbId);
    }
  }

  protected continueEpisodeRoute(episode: NextEpisode): (string | number)[] | null {
    return homeContentRoute({
      type: 'EPISODE',
      seriesTmdbId: episode.seriesTmdbId,
      seasonNumber: episode.maxSeasonNumber,
      episodeNumber: episode.maxEpisodeNumber,
    });
  }

  protected handleUpcomingContentAction(
    release: UpcomingRelease,
    selection: ContentImageActionSelection,
  ): void {
    if (selection.action.id !== 'drop-series') return;
    const seriesTmdbId = this.upcomingSeriesTmdbId(release);
    if (seriesTmdbId) this.abandonSeries(seriesTmdbId);
  }

  protected handleSocialContentAction(
    activity: HomeSocialActivity,
    selection: ContentImageActionSelection,
  ): void {
    if (selection.action.id !== 'open-content' || !activity.content) return;
    this.openContentMenuId.set(null);
    this.navigateToContent(
      activity.content.type,
      activity.content.tmdbId,
      activity.content.seriesTmdbId,
      activity.content.seasonNumber,
      activity.content.episodeNumber,
    );
  }

  protected markWatchedLabel(episode: NextEpisode): string {
    const target = [episode.seriesTitle, this.episodeLabel(episode)].filter(Boolean).join(' · ');
    return `${this.copy.markWatched}: ${target}`;
  }

  protected handleRecentContentAction(
    entry: HomeRecentlyWatched,
    selection: ContentImageActionSelection,
  ): void {
    if (selection.action.id === 'rate') {
      this.openRatingModal(entry, selection.event);
    } else if (selection.action.id === 'rewatch') {
      this.openRecentRewatch(entry, selection.event);
    } else if (selection.action.id === 'share-review') {
      this.shareRecentReview(entry);
    }
  }

  protected continueContentActions(episode: NextEpisode): readonly ContentImageAction[] {
    return [
      {
        id: 'mark-watched',
        label: this.copy.markWatched,
        icon: 'check',
        disabled: !this.diaryContentForEpisode(episode),
      },
      { id: 'drop-series', label: this.copy.dropSeries, icon: 'ban' },
    ];
  }

  protected recentContentActions(entry: HomeRecentlyWatched): readonly ContentImageAction[] {
    return [
      {
        id: 'rate',
        label: entry.score === null ? this.copy.rate : this.copy.editRating,
        icon: 'star',
      },
      {
        id: 'rewatch',
        label: this.copy.rewatch,
        icon: 'rewatch',
        disabled: !this.diaryContentForEntry(entry),
      },
      {
        id: 'share-review',
        label: this.copy.shareReview,
        icon: 'share',
        disabled: !this.contentRoute(entry.content),
      },
    ];
  }

  protected upcomingSeriesTmdbId(release: UpcomingRelease): string | null {
    if (release.eventType === 'MOVIE') return null;
    return release.eventType === 'SERIES'
      ? release.content.tmdbId ?? release.content.seriesTmdbId ?? null
      : release.content.seriesTmdbId ?? null;
  }

  protected openWatchLogForEpisode(episode: NextEpisode, event?: MouseEvent): void {
    const content = this.diaryContentForEpisode(episode);
    if (!content) return;
    this.showWatchLog({
      dialogTitle: this.copy.markWatched,
      title: episode.seriesTitle || this.copy.titleUnavailable,
      subtitle: `${this.episodeLabel(episode)} · ${episode.episodeTitle || this.copy.episode}`,
      content,
    }, event);
  }

  protected openRecentRewatch(entry: HomeRecentlyWatched, event?: MouseEvent): void {
    const content = this.diaryContentForEntry(entry);
    if (!content) return;
    this.showWatchLog({
      dialogTitle: this.copy.rewatch,
      title: entry.content.type === 'EPISODE'
        ? this.recentEpisodeSeriesTitle(entry)
        : entry.card?.title || this.copy.titleUnavailable,
      subtitle: entry.content.type === 'EPISODE'
        ? `${this.episodeLabelForEntry(entry)} · ${this.recentEpisodeTitle(entry)}`
        : this.copy.movie,
      content,
    }, event);
    this.watchLogRewatch.set(true);
  }

  protected shareRecentReview(entry: HomeRecentlyWatched): void {
    const route = this.contentRoute(entry.content);
    if (!route) return;
    this.openContentMenuId.set(null);
    void this.router.navigate(route, {
      state: { openShareReview: true, shareReturnUrl: this.router.url },
    });
  }

  protected abandonSeries(seriesTmdbId: string): void {
    if (this.isSaving()) return;
    this.openContentMenuId.set(null);
    this.isSaving.set(true);
    this.actionFeedback.set(null);
    this.contentApi.markSeriesDropped(seriesTmdbId).subscribe({
      next: () => {
        this.isSaving.set(false);
        this.loadSummary();
        this.actionFeedback.set({ message: this.copy.seriesDropped, error: false });
      },
      error: (error: unknown) => {
        this.isSaving.set(false);
        this.actionFeedback.set({ message: this.actionErrorMessage(error), error: true });
      },
    });
  }

  protected openRatingModal(entry: HomeRecentlyWatched, event?: MouseEvent): void {
    this.openContentMenuId.set(null);
    const title = entry.content.type === 'EPISODE'
      ? this.recentEpisodeSeriesTitle(entry)
      : entry.card?.title || this.copy.titleUnavailable;
    const subtitle = entry.content.type === 'EPISODE'
      ? `${this.episodeLabelForEntry(entry)} · ${this.recentEpisodeTitle(entry)}`
      : this.copy.movie;
    const menuTrigger = (event?.currentTarget as HTMLElement | null)
      ?.closest('.content-menu-anchor')
      ?.querySelector<HTMLElement>('.content-menu-trigger');
    const opener = menuTrigger ?? (document.activeElement instanceof HTMLElement
      ? document.activeElement
      : null);
    this.activeDialogOpener = opener;
    this.watchLogTarget.set(null);
    this.ratingTarget.set({ title, subtitle, diaryEntryId: entry.id, editing: entry.score !== null });
    this.dialogErrorMessage.set(null);
    this.isSaving.set(false);
    this.ratingModalScore.set(entry.score);
    this.ratingModalReview.set('');
    this.watchCalendarOpen.set(false);
  }

  protected toggleWatchCalendar(): void {
    this.watchCalendarOpen.update((open) => !open);
  }

  protected changeWatchCalendarMonth(offset: number): void {
    const current = this.watchCalendarMonth();
    const candidate = new Date(current.getFullYear(), current.getMonth() + offset, 1);
    const today = new Date();
    if (candidate.getFullYear() * 12 + candidate.getMonth() > today.getFullYear() * 12 + today.getMonth()) {
      return;
    }
    this.watchCalendarMonth.set(candidate);
  }

  protected selectWatchLogDate(date: string): void {
    this.watchLogDate.set(date);
    this.watchCalendarOpen.set(false);
  }

  protected watchLogDateLabel(): string {
    const date = this.parseDate(this.watchLogDate());
    return date
      ? new Intl.DateTimeFormat('pt-BR', {
          day: 'numeric',
          month: 'short',
          year: 'numeric',
          timeZone: 'UTC',
        }).format(date)
      : this.copy.dateUnavailable;
  }

  protected setWatchLogRewatch(event: Event): void {
    this.watchLogRewatch.set((event.currentTarget as HTMLInputElement).checked);
  }

  protected setWatchLogRating(rating: number): void {
    this.watchLogRating.set(this.watchLogRating() === rating ? null : rating);
  }

  protected setRatingModalScore(rating: number): void {
    this.ratingModalScore.set(this.ratingModalScore() === rating ? null : rating);
  }

  protected updateWatchLogReview(event: Event): void {
    this.watchLogReview.set((event.currentTarget as HTMLTextAreaElement).value);
  }

  protected updateRatingModalReview(event: Event): void {
    this.ratingModalReview.set((event.currentTarget as HTMLTextAreaElement).value);
  }

  protected canSaveWatchLog(): boolean {
    return Boolean(this.watchLogTarget()?.content);
  }

  protected canSaveRating(): boolean {
    return this.ratingModalScore() !== null || this.ratingModalReview().trim().length > 0;
  }

  protected saveWatchLog(): void {
    const target = this.watchLogTarget();
    if (!target) return;

    const request: DiaryEntryCreationRequest = {
      content: target.content,
      watchedDate: this.watchLogDate(),
      isRewatch: this.watchLogRewatch(),
    };
    const score = this.watchLogRating();
    if (score !== null) {
      request.score = score;
    }
    const comment = this.watchLogReview().trim();
    if (comment) {
      request.comment = comment;
    }
    this.submitDiaryAction(this.api.createDiaryEntry(request));
  }

  protected saveRating(): void {
    const target = this.ratingTarget();
    if (!target || !this.canSaveRating()) {
      return;
    }

    const request: DiaryEntryUpdateRequest = {};
    const score = this.ratingModalScore();
    const comment = this.ratingModalReview().trim();
    if (score !== null) {
      request.score = score;
    }
    if (comment) {
      request.comment = comment;
    }
    this.submitDiaryAction(this.api.updateDiaryEntry(target.diaryEntryId, request));
  }

  protected closeDialog(): void {
    if (this.isSaving()) {
      return;
    }
    const opener = this.activeDialogOpener;
    this.activeDialogOpener = null;
    this.watchLogTarget.set(null);
    this.ratingTarget.set(null);
    this.watchCalendarOpen.set(false);
    this.dialogErrorMessage.set(null);
    if (opener) {
      window.setTimeout(() => {
        if (opener.isConnected) {
          opener.focus();
        }
      });
    }
  }

  @HostListener('document:click')
  protected closeContentMenuOnDocumentClick(): void {
    this.openContentMenuId.set(null);
  }

  @HostListener('document:keydown', ['$event'])
  protected handleDocumentKeydown(event: KeyboardEvent): void {
    if (this.watchLogTarget() || this.ratingTarget()) {
      if (event.key === 'Escape') {
        event.preventDefault();
        this.closeDialog();
        return;
      }
      if (event.key !== 'Tab') {
        return;
      }

      const dialog = document.querySelector<HTMLElement>('.watch-log-dialog, .rating-dialog');
      if (!dialog) {
        return;
      }
      const focusable = Array.from(
        dialog.querySelectorAll<HTMLElement>(
          'a[href], button:not(:disabled), input:not(:disabled), select:not(:disabled), textarea:not(:disabled), [tabindex]:not([tabindex="-1"])',
        ),
      );
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (!first || !last) {
        event.preventDefault();
        dialog.focus();
      } else if (!dialog.contains(document.activeElement)) {
        event.preventDefault();
        first.focus();
      } else if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
      return;
    }

    if (event.key === 'Escape') {
      this.openContentMenuId.set(null);
    }
  }

  private showWatchLog(target: WatchLogDialogTarget, event?: MouseEvent): void {
    const menuTrigger = (event?.currentTarget as HTMLElement | null)
      ?.closest('.content-menu-anchor')
      ?.querySelector<HTMLElement>('.content-menu-trigger');
    this.activeDialogOpener = menuTrigger ?? document.querySelector<HTMLElement>(
      '.content-menu-trigger[aria-expanded="true"]',
    );
    this.openContentMenuId.set(null);
    this.ratingTarget.set(null);
    this.watchLogTarget.set(target);
    this.dialogErrorMessage.set(null);
    this.isSaving.set(false);
    this.watchLogDate.set(this.toDateKey(new Date()));
    this.watchLogRewatch.set(false);
    this.watchLogRating.set(null);
    this.watchLogReview.set('');
    this.watchCalendarMonth.set(this.firstOfMonth(new Date()));
    this.watchCalendarOpen.set(false);
  }

  private diaryContentForEpisode(episode: NextEpisode): DiaryEntryCreationRequest['content'] | null {
    if (
      episode.availableToWatch === false ||
      episode.maxSeasonNumber === null ||
      episode.maxEpisodeNumber === null
    ) return null;
    return {
      type: 'EPISODE',
      seriesTmdbId: episode.seriesTmdbId,
      seasonNumber: episode.maxSeasonNumber,
      episodeNumber: episode.maxEpisodeNumber,
    };
  }

  private diaryContentForEntry(entry: HomeRecentlyWatched): DiaryEntryCreationRequest['content'] | null {
    if (entry.content.type === 'MOVIE') {
      const tmdbId = entry.content.tmdbId || entry.card?.tmdbId;
      return tmdbId ? { type: 'MOVIE', tmdbId } : null;
    }
    if (
      entry.content.type === 'EPISODE' &&
      entry.content.seriesTmdbId &&
      entry.content.seasonNumber !== null &&
      entry.content.episodeNumber !== null
    ) {
      return {
        type: 'EPISODE',
        seriesTmdbId: entry.content.seriesTmdbId,
        seasonNumber: entry.content.seasonNumber,
        episodeNumber: entry.content.episodeNumber,
      };
    }
    return null;
  }

  private submitDiaryAction(request: Observable<unknown>): void {
    if (this.isSaving()) {
      return;
    }
    this.isSaving.set(true);
    this.dialogErrorMessage.set(null);
    request.subscribe({
      next: () => {
        this.isSaving.set(false);
        this.closeDialog();
        this.loadSummary();
      },
      error: (error: unknown) => {
        this.isSaving.set(false);
        this.dialogErrorMessage.set(this.actionErrorMessage(error));
      },
    });
  }

  private actionErrorMessage(error: unknown): string {
    if (!(error instanceof HttpErrorResponse)) {
      return this.copy.actionSaveError;
    }
    if (error.status === 0) {
      return this.copy.actionConnectionError;
    }

    return this.actionStatusMessage(error.status);
  }

  private actionStatusMessage(status: number): string {
    switch (status) {
      case 400:
        return this.copy.actionInvalidError;
      case 401:
        return this.copy.actionSessionError;
      case 403:
        return this.copy.actionForbiddenError;
      case 404:
        return this.copy.actionNotFoundError;
      case 409:
        return this.copy.actionConflictError;
      case 429:
        return this.copy.actionRateLimitError;
      default:
        return this.copy.actionSaveError;
    }
  }

  private createWatchCalendarDays(month: Date, selectedDate: string): WatchCalendarDay[] {
    const firstDay = new Date(month.getFullYear(), month.getMonth(), 1);
    const gridStart = new Date(month.getFullYear(), month.getMonth(), 1 - firstDay.getDay());
    const todayKey = this.toDateKey(new Date());
    return Array.from({ length: 42 }, (_, index) => {
      const date = new Date(gridStart.getFullYear(), gridStart.getMonth(), gridStart.getDate() + index);
      const dateKey = this.toDateKey(date);
      return {
        date: dateKey,
        day: date.getDate(),
        inMonth: date.getMonth() === month.getMonth(),
        selected: dateKey === selectedDate,
        disabled: dateKey > todayKey,
        ariaLabel: new Intl.DateTimeFormat('pt-BR', {
          dateStyle: 'full',
          timeZone: 'UTC',
        }).format(new Date(`${dateKey}T00:00:00Z`)),
      };
    });
  }

  private firstOfMonth(date: Date): Date {
    return new Date(date.getFullYear(), date.getMonth(), 1);
  }

  private toDateKey(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  protected formatDuration(minutes: number | null | undefined): string {
    const total = Math.max(0, minutes ?? 0);
    const days = Math.floor(total / 1440);
    const hours = Math.floor((total % 1440) / 60);
    const remainingMinutes = total % 60;

    if (days > 0) {
      return `${this.formatNumber(days)}${this.copy.dayShort} ${this.formatNumber(hours)}${this.copy.hourShort}`;
    }
    if (hours > 0) {
      return `${this.formatNumber(hours)}${this.copy.hourShort} ${this.formatNumber(remainingMinutes)}${this.copy.minuteShort}`;
    }
    return `${this.formatNumber(remainingMinutes)}${this.copy.minuteShort}`;
  }

  protected totalHoursLabel(minutes: number | null | undefined): string {
    const hours = Math.floor(Math.max(0, minutes ?? 0) / 60);
    return this.quantityLabel(hours, this.copy.hourSingular, this.copy.hours);
  }

  protected formatRuntime(minutes: number | null | undefined): string {
    if (!minutes) {
      return '';
    }
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    if (hours > 0 && remainingMinutes > 0) {
      return `${hours}${this.copy.hourShort} ${remainingMinutes} ${this.copy.minuteShort}`;
    }
    if (hours > 0) {
      return `${hours}${this.copy.hourShort}`;
    }
    return `${remainingMinutes} ${this.copy.minuteShort}`;
  }

  protected heroDate(): string {
    return formatHomeHeroDate(new Date());
  }

  protected formatDate(value: string | null | undefined): string {
    const date = this.parseDate(value);
    if (!date) {
      return this.copy.dateUnavailable;
    }
    return new Intl.DateTimeFormat('pt-BR', {
      day: '2-digit',
      month: 'short',
      timeZone: 'UTC',
    }).format(date);
  }

  protected formatReleaseShortDate(value: string | null | undefined): string {
    const date = this.parseDate(value);
    if (!date) {
      return this.copy.dateUnavailable;
    }
    return new Intl.DateTimeFormat('pt-BR', {
      day: 'numeric',
      month: 'short',
      timeZone: 'UTC',
    })
      .format(date)
      .replace(' de ', ' ')
      .replace(/\.$/, '');
  }

  protected releaseCountdown(event: UpcomingRelease): string {
    if (event.releaseStatus === 'UNKNOWN') {
      return this.copy.statusUnknown;
    }
    const date = this.parseDate(event.date);
    if (!date) {
      return this.copy.statusUnknown;
    }

    const today = new Date();
    const todayUtc = Date.UTC(today.getFullYear(), today.getMonth(), today.getDate());
    const releaseUtc = Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());
    const daysUntilRelease = Math.round((releaseUtc - todayUtc) / 86_400_000);
    if (daysUntilRelease < 0) {
      return this.copy.statusReleased;
    }
    if (daysUntilRelease === 0) {
      return this.copy.today;
    }
    if (daysUntilRelease === 1) {
      return this.copy.tomorrow;
    }
    return this.copy.inDays.replace('{days}', this.formatNumber(daysUntilRelease));
  }

  protected formatLongDate(value: string | null | undefined): string {
    const date = this.parseDate(value);
    if (!date) {
      return this.copy.dateUnavailable;
    }
    return new Intl.DateTimeFormat('pt-BR', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      timeZone: 'UTC',
    }).format(date);
  }

  protected formatReleaseTime(value: string | null | undefined): string {
    if (!value) {
      return '';
    }
    const timeMatch = value.match(/^(\d{1,2}:\d{2})/);
    if (timeMatch) {
      return timeMatch[1];
    }
    const time = new Date(value);
    if (Number.isNaN(time.getTime())) {
      return value;
    }
    return new Intl.DateTimeFormat('pt-BR', {
      hour: '2-digit',
      minute: '2-digit',
    }).format(time);
  }

  protected episodeLabel(episode: NextEpisode): string {
    const season = episode.maxSeasonNumber;
    const number = episode.maxEpisodeNumber;
    if (season === null || number === null) {
      return this.copy.episode;
    }
    return `${this.copy.seasonShort}${season} · ${this.copy.episodeShort}${number}`;
  }

  protected episodeLabelForEntry(entry: HomeRecentlyWatched): string {
    const season = entry.content.seasonNumber;
    const episode = entry.content.episodeNumber;
    if (season === null || episode === null) {
      return `${this.copy.seasonShort}—${this.copy.episodeShort}—`;
    }
    return `${this.copy.seasonShort}${season}${this.copy.episodeShort}${episode}`;
  }

  protected recentPoster(entry: HomeRecentlyWatched): string | null {
    if (entry.content.type === 'MOVIE') {
      const backdrop = this.imageUrl(entry.card?.backdropPath, 'w780');
      if (backdrop) {
        return backdrop;
      }
    }

    return this.imageUrl(entry.customPosterUrl, 'w780') ?? this.posterFor(entry.card, 'w780');
  }

  protected recentSeriesTitle(entry: HomeRecentlyWatched): string | null {
    return entry.seriesTitle;
  }

  protected recentEpisodeSeriesTitle(entry: HomeRecentlyWatched): string {
    return this.recentSeriesTitle(entry) ?? this.copy.titleUnavailable;
  }

  protected recentEpisodeTitle(entry: HomeRecentlyWatched): string {
    return entry.card?.title || this.copy.titleUnavailable;
  }

  protected recentRuntime(entry: HomeRecentlyWatched): number | null {
    const cardRuntime = entry.card?.runtimeMinutes;
    return cardRuntime && cardRuntime > 0 ? cardRuntime : entry.content.runtimeMinutes;
  }

  protected recentEpisodeRuntime(entry: HomeRecentlyWatched): string {
    const runtime = this.recentRuntime(entry);
    return runtime && runtime > 0 ? this.formatRuntime(runtime) : '—';
  }

  protected recentSubtitle(entry: HomeRecentlyWatched): string {
    const firstGenre = entry.card?.genres?.[0];
    if (firstGenre) {
      return firstGenre;
    }
    return entry.content.type === 'EPISODE' ? this.copy.episode : this.copy.movie;
  }

  protected progressPercent(episode: NextEpisode): number {
    return Math.round(Math.max(0, Math.min(100, episode.watchedPercentage ?? 0)));
  }

  private hasUpcomingRelease(value: string | null | undefined): boolean {
    const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(value ?? '');
    if (!match) {
      return false;
    }

    const year = Number(match[1]);
    const month = Number(match[2]);
    const day = Number(match[3]);
    const release = new Date(year, month - 1, day);
    if (
      release.getFullYear() !== year ||
      release.getMonth() !== month - 1 ||
      release.getDate() !== day
    ) {
      return false;
    }

    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    return release.getTime() > today.getTime();
  }

  protected episodeRemainingLabel(episode: NextEpisode): string | null {
    const watched = episode.watchedEpisodeCount;
    const total = episode.totalEpisodeCount;
    if (watched === null || total === null) {
      return null;
    }

    const remaining = Math.max(0, total - watched);
    const message = remaining === 1
      ? this.copy.episodeRemainingSingular
      : this.copy.episodesRemainingPlural;
    return message.replace('{count}', this.formatNumber(remaining));
  }

  protected releaseTypeLabel(event: UpcomingRelease): string {
    switch (event.eventType) {
      case 'MOVIE':
        return this.copy.movie;
      case 'EPISODE':
        return this.copy.episode;
      case 'SEASON':
        return this.copy.season;
      case 'SERIES':
        return this.copy.series;
      default:
        return this.copy.upcomingShort;
    }
  }

  protected releaseTitle(event: UpcomingRelease): string {
    return event.content.seriesTitle || event.content.title || this.copy.titleUnavailable;
  }

  private navigateToContent(
    type: string | null,
    tmdbId: string | null,
    seriesTmdbId: string | null,
    seasonNumber: number | null,
    episodeNumber: number | null,
  ): void {
    const route = homeContentRoute({ type, tmdbId, seriesTmdbId, seasonNumber, episodeNumber });
    if (route) void this.router.navigate(route);
  }

  protected releaseSubtitle(event: UpcomingRelease): string | null {
    const parts: string[] = [];
    if (event.eventType === 'EPISODE') {
      if (event.content.title && event.content.title !== event.content.seriesTitle) {
        parts.push(event.content.title);
      }
      if (event.content.seasonNumber !== null && event.content.seasonNumber !== undefined) {
        parts.push(`${this.copy.seasonShort}${event.content.seasonNumber}`);
      }
      if (event.content.episodeNumber !== null && event.content.episodeNumber !== undefined) {
        parts.push(`${this.copy.episodeShort}${event.content.episodeNumber}`);
      }
    } else if (event.eventType === 'SEASON') {
      if (event.content.seasonNumber !== null && event.content.seasonNumber !== undefined) {
        parts.push(`${this.copy.season} ${event.content.seasonNumber}`);
      }
      if (event.content.episodeCount !== null && event.content.episodeCount !== undefined) {
        parts.push(this.quantityLabel(event.content.episodeCount, this.copy.episodeSingular, this.copy.episodes));
      }
    } else if (event.eventType === 'SERIES') {
      parts.push(this.copy.seriesPremiere);
      if (event.content.episodeCount !== null && event.content.episodeCount !== undefined) {
        parts.push(this.quantityLabel(event.content.episodeCount, this.copy.episodeSingular, this.copy.episodes));
      }
    }
    return parts.length ? parts.join(' · ') : null;
  }

  protected releaseDetail(event: UpcomingRelease): string | null {
    return this.releaseSubtitle(event) || event.releaseContext?.network || null;
  }

  protected releaseSourceLabels(event: UpcomingRelease): string[] {
    return event.sources.includes('WATCHLIST') ? [this.copy.watchlist] : [];
  }

  protected imageUrl(
    path: string | null | undefined,
    size: 'w342' | 'w780' | 'w1920' = 'w342',
  ): string | null {
    if (!path) {
      return null;
    }
    if (/^https?:\/\//i.test(path)) {
      return path;
    }
    return `https://image.tmdb.org/t/p/${size}${path.startsWith('/') ? path : `/${path}`}`;
  }

  protected posterFor(
    card: HomeContentCard | null,
    size: 'w342' | 'w780' | 'w1920' = 'w342',
  ): string | null {
    if (!card || card.previewStatus === 'UNAVAILABLE') {
      return null;
    }
    return this.imageUrl(card.customPosterUrl || card.posterPath, size);
  }

  protected activityVerb(activity: HomeSocialActivity): string {
    switch (activity.eventType) {
      case 'DIARY_ENTRY':
        return this.copy.activityDiary;
      case 'CONTENT_REVIEW':
        return this.copy.activityReview;
      case 'DROPPED':
        return this.copy.activityDropped;
      case 'TOP5_UPDATE':
        return this.copy.activityTopFive;
      case 'PICK_CREATED':
        return this.copy.activityPick;
      case 'PICKS_TEMPLATE_CREATED':
        return this.copy.activityTemplate;
      case 'DAILY_GAME_RESULT':
        return this.copy.activityGame;
    }
  }

  protected activityUser(activity: HomeSocialActivity): string {
    return activity.user.name || activity.user.username || this.copy.someone;
  }

  protected socialLikeUnavailable(activity: HomeSocialActivity): boolean {
    return !this.socialActivityDetailsLoaded() || activity.likedByMe == null;
  }

  protected socialLikeBusy(activity: HomeSocialActivity): boolean {
    return this.busySocialLikeIds().has(activity.id);
  }

  protected toggleDiaryLike(activity: HomeSocialActivity): void {
    if (
      activity.eventType !== 'DIARY_ENTRY' ||
      this.socialLikeUnavailable(activity) ||
      this.socialLikeBusy(activity)
    ) {
      return;
    }

    const nextLiked = !activity.likedByMe;
    this.busySocialLikeIds.update((current) => new Set(current).add(activity.id));
    this.actionFeedback.set(null);
    this.contentApi.setReviewLike(activity.id, 'DIARY', nextLiked).subscribe({
      next: () => {
        this.summary.update((current) => current ? {
          ...current,
          socialActivities: current.socialActivities.map((item) => item.id === activity.id
            ? {
                ...item,
                likedByMe: nextLiked,
                likesCount: Math.max(0, (item.likesCount ?? 0) + (nextLiked ? 1 : -1)),
              }
            : item),
        } : current);
        this.busySocialLikeIds.update((current) => {
          const next = new Set(current);
          next.delete(activity.id);
          return next;
        });
      },
      error: () => {
        this.busySocialLikeIds.update((current) => {
          const next = new Set(current);
          next.delete(activity.id);
          return next;
        });
        this.actionFeedback.set({ message: this.socialCopy.likeError, error: true });
      },
    });
  }

  protected socialSubtitle(activity: HomeSocialActivity): string {
    if (!activity.content) {
      return activity.targetLabel || '';
    }
    if (activity.content.type === 'EPISODE') {
      const parts = [
        activity.seriesTitle || (activity.card?.type === 'SERIES' ? activity.card.title : null),
        activity.content.seasonNumber === null ? null : `${this.copy.seasonShort}${activity.content.seasonNumber}`,
        activity.content.episodeNumber === null ? null : `${this.copy.episodeShort}${activity.content.episodeNumber}`,
      ].filter((part): part is string => Boolean(part));
      return parts.join(' · ');
    }
    return activity.card?.releaseYear
      ? String(activity.card.releaseYear)
      : activity.card?.type === 'MOVIE'
        ? this.copy.movie
        : activity.targetLabel || '';
  }

  protected socialActivityTitle(activity: HomeSocialActivity): string {
    if (activity.eventType === 'DIARY_ENTRY' && activity.content?.type === 'EPISODE') {
      return activity.episodeTitle || activity.card?.title || activity.targetLabel || this.copy.titleUnavailable;
    }
    return activity.card?.title || activity.targetLabel || this.copy.titleUnavailable;
  }

  protected relativeActivityDate(value: string): string {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      return this.copy.dateUnavailable;
    }
    const minutes = Math.max(0, Math.floor((Date.now() - date.getTime()) / 60_000));
    if (minutes < 1) {
      return this.copy.justNow;
    }
    if (minutes < 60) {
      return this.copy.minutesAgo.replace('{count}', this.formatNumber(minutes));
    }
    const hours = Math.floor(minutes / 60);
    if (hours < 24) {
      return this.copy.hoursAgo.replace('{count}', this.formatNumber(hours));
    }
    const days = Math.floor(hours / 24);
    if (days < 7) {
      const message = days === 1 ? this.copy.dayAgoSingular : this.copy.daysAgo;
      return message.replace('{count}', this.formatNumber(days));
    }
    return this.formatLongDate(value);
  }

  private loadSocialActivityDetails(activities: HomeSocialActivity[]): void {
    const requestSequence = ++this.socialDetailsRequestSequence;
    if (!activities.some((activity) => activity.eventType === 'DIARY_ENTRY')) {
      this.socialActivityDetailsLoaded.set(true);
      return;
    }

    this.socialActivityDetailsLoaded.set(false);
    this.feedApi.getFeed({ size: 3 }).subscribe({
      next: (feed) => {
        if (requestSequence !== this.socialDetailsRequestSequence) return;
        const detailsById = new Map(feed.content.map((activity) => [activity.id, activity] as const));
        this.summary.update((current) => current ? {
          ...current,
          socialActivities: current.socialActivities.map((activity) => {
            const details = detailsById.get(activity.id);
            return details ? {
              ...activity,
              user: {
                ...activity.user,
                profilePicture: details.user.profilePicture ?? activity.user.profilePicture,
              },
              score: details.score,
              comment: details.comment,
              likedByMe: details.likedByMe,
              likesCount: details.likesCount,
              commentsCount: details.commentsCount,
            } : activity;
          }),
        } : current);
        this.loadEpisodeActivityTitles(feed.content, requestSequence);
        this.socialActivityDetailsLoaded.set(true);
      },
      error: () => {
        if (requestSequence === this.socialDetailsRequestSequence) {
          this.socialActivityDetailsLoaded.set(false);
        }
      },
    });
  }

  private loadEpisodeActivityTitles(activities: HomeSocialActivity[], requestSequence: number): void {
    for (const activity of activities) {
      const contentId = activity.content?.id;
      if (
        activity.eventType !== 'DIARY_ENTRY' ||
        activity.content?.type !== 'EPISODE' ||
        !contentId
      ) {
        continue;
      }

      this.contentApi.getEpisodePage(contentId).subscribe({
        next: (page) => {
          if (requestSequence !== this.socialDetailsRequestSequence) return;
          this.summary.update((current) => current ? {
            ...current,
            socialActivities: current.socialActivities.map((item) => item.id === activity.id
              ? {
                  ...item,
                  episodeTitle: page.details.title,
                  seriesTitle: page.details.parentTitle,
                }
              : item),
          } : current);
        },
        error: () => {},
      });
    }
  }

  protected watchActivitySummary(): string {
    const count = (this.summary()?.watchCountByDayLast30Days ?? [])
      .reduce((total, day) => total + day.count, 0);
    return this.quantityLabel(count, this.copy.activityRecordSingular, this.copy.activityRecords);
  }

  protected setHoveredChartDay(index: number, count: number): void {
    this.hoveredChartDayIndex.set(count > 0 ? index : null);
  }

  protected clearHoveredChartDay(): void {
    this.hoveredChartDayIndex.set(null);
  }

  protected chartDayCountLabel(day: ChartDay): string {
    const message = day.count === 1
      ? this.copy.watchRecordSingular
      : this.copy.watchRecordsPlural;
    return message.replace('{count}', this.formatNumber(day.count));
  }

  protected chartDayCountValue(day: ChartDay): string {
    const message = day.count === 1
      ? this.copy.watchChartCountSingular
      : this.copy.watchChartCountPlural;
    return message.replace('{count}', this.formatNumber(day.count));
  }

  protected trackByDate(_index: number, day: ChartDay): string {
    return day.date;
  }

  protected trackByUpcoming(_index: number, release: UpcomingRelease): string {
    return `${release.eventType}-${release.date}-${release.content.tmdbId ?? ''}-${release.content.seasonNumber ?? ''}-${release.content.episodeNumber ?? ''}`;
  }

  protected genreColorToken(index: number): string {
    return `var(--color-chartb-${GENRE_CHART_COLOR_ORDER[index % GENRE_CHART_COLOR_ORDER.length]})`;
  }

  private parseDate(value: string | null | undefined): Date | null {
    if (!value) {
      return null;
    }
    const date = new Date(`${value.slice(0, 10)}T12:00:00Z`);
    return Number.isNaN(date.getTime()) ? null : date;
  }

  private createChartDays(data: DailyWatchCount[]): ChartDay[] {
    const counts = new Map(data.map((item) => [item.watchedDate, item.count]));
    const today = new Date();
    const dates: { iso: string; date: Date }[] = [];
    for (let offset = 29; offset >= 0; offset -= 1) {
      const date = new Date(Date.UTC(today.getFullYear(), today.getMonth(), today.getDate() - offset));
      dates.push({ iso: date.toISOString().slice(0, 10), date });
    }
    const maximum = Math.max(1, ...dates.map(({ iso }) => counts.get(iso) ?? 0));
    return dates.map(({ iso, date }) => {
      const count = counts.get(iso) ?? 0;
      const description = new Intl.DateTimeFormat('pt-BR', {
        dateStyle: 'long',
        timeZone: 'UTC',
      }).format(date);
      return {
        date: iso,
        label: String(date.getUTCDate()),
        count,
        height: count === 0 ? 0 : Math.max(8, Math.round((count / maximum) * 100)),
        description,
      };
    });
  }

  private createGenreBreakdown(
    episodes: GenreCount[],
    movies: GenreCount[],
  ): GenreBreakdown[] {
    const genres = new Map<string, GenreBreakdown>();
    for (const item of episodes) {
      const genre = genres.get(item.genre) ?? {
        genre: item.genre,
        episodes: 0,
        movies: 0,
        weight: 0,
      };
      genre.episodes = item.count;
      genres.set(item.genre, genre);
    }
    for (const item of movies) {
      const genre = genres.get(item.genre) ?? {
        genre: item.genre,
        episodes: 0,
        movies: 0,
        weight: 0,
      };
      genre.movies = item.count;
      genres.set(item.genre, genre);
    }
    const sorted = [...genres.values()]
      .sort((a, b) => b.episodes + b.movies - (a.episodes + a.movies))
      .slice(0, 6);
    const total = Math.max(1, sorted.reduce((sum, genre) => sum + genre.episodes + genre.movies, 0));
    return sorted.map((genre) => ({
      ...genre,
      weight: Math.max(1, genre.episodes + genre.movies) / total,
    }));
  }

  private observeGenreLabels(): void {
    this.genreLabelObserver?.disconnect();
    if (this.genreItemLabels.length === 0) {
      this.genreMinimumWidths.set([]);
      return;
    }
    this.genreItemLabels.forEach((label) => this.genreLabelObserver?.observe(label.nativeElement));
    if (!this.genreLabelObserver) {
      window.requestAnimationFrame(() => this.updateGenreMinimumWidths());
    }
  }

  private updateGenreMinimumWidths(): void {
    const widths = this.genreItemLabels
      .toArray()
      .map((label) => Math.ceil(label.nativeElement.getBoundingClientRect().width));
    const currentWidths = this.genreMinimumWidths();
    if (widths.length !== currentWidths.length || widths.some((width, index) => width !== currentWidths[index])) {
      this.genreMinimumWidths.set(widths);
    }
  }

  private groupUpcoming(releases: UpcomingRelease[]): UpcomingDateGroup[] {
    const groups = new Map<string, UpcomingRelease[]>();
    const today = new Date();
    for (let offset = 0; offset < 5; offset += 1) {
      const date = new Date(Date.UTC(today.getFullYear(), today.getMonth(), today.getDate() + offset));
      groups.set(date.toISOString().slice(0, 10), []);
    }
    for (const release of releases) {
      const group = groups.get(release.date);
      if (group) {
        group.push(release);
      }
    }
    return [...groups.entries()].map(([date, items]) => ({
      date,
      label: this.releaseDateLabel(date),
      shortDate: this.formatDate(date),
      releases: items,
    }));
  }

  private releaseDateLabel(value: string): string {
    const releaseDate = this.parseDate(value);
    if (!releaseDate) {
      return this.copy.dateUnavailable;
    }
    const today = new Date();
    const todayKey = new Date(Date.UTC(today.getFullYear(), today.getMonth(), today.getDate())).toISOString().slice(0, 10);
    const tomorrow = new Date(Date.UTC(today.getFullYear(), today.getMonth(), today.getDate() + 1)).toISOString().slice(0, 10);
    if (value === todayKey) {
      return this.copy.today;
    }
    if (value === tomorrow) {
      return this.copy.tomorrow;
    }
    return this.capitalizeInitial(new Intl.DateTimeFormat('pt-BR', {
      weekday: 'long',
      timeZone: 'UTC',
    }).format(releaseDate));
  }

  private capitalizeInitial(value: string): string {
    return value.charAt(0).toLocaleUpperCase('pt-BR') + value.slice(1);
  }

  private handleLoadError(error: unknown): void {
    this.shellState.clearHomeState();
    if (error instanceof HttpErrorResponse && error.status === 401) {
      this.session.clear();
      void this.router.navigateByUrl('/login');
      return;
    }
    if (error instanceof HttpErrorResponse && error.status === 403) {
      this.errorMessage.set(this.copy.forbiddenError);
    } else if (error instanceof HttpErrorResponse && error.status === 404) {
      this.errorMessage.set(this.copy.notFoundError);
    } else {
      this.errorMessage.set(this.copy.genericError);
    }
    this.status.set('error');
  }
}
