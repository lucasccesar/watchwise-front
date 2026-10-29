import { HttpErrorResponse } from '@angular/common/http';
import { Component, ElementRef, HostListener, OnInit, ViewChild, computed, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { messageCatalog } from '../../../../shared/i18n/messages';
import { AuthSessionService } from '../../../../core/session/session.service';
import { AppShellStateService } from '../../../../core/ui/app-shell-state.service';
import {
  DailyWatchCount,
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

interface WatchLogTarget {
  kind: 'watch' | 'rating';
  title: string;
  subtitle: string;
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
  imports: [RouterLink],
  selector: 'app-home',
  standalone: true,
  templateUrl: './home.component.html',
})
export class HomeComponent implements OnInit {
  protected readonly copy = messageCatalog['pt-BR'].home;
  protected readonly copyrightYear = new Date().getFullYear();
  protected readonly summary = signal<HomeSummary | null>(null);
  protected readonly hoveredChartDayIndex = signal<number | null>(null);
  protected readonly status = signal<HomeStatus>('loading');
  protected readonly errorMessage = signal<string | null>(null);
  protected readonly openContentMenuId = signal<string | null>(null);
  protected readonly watchLogTarget = signal<WatchLogTarget | null>(null);
  protected readonly watchLogDate = signal(this.toDateKey(new Date()));
  protected readonly watchLogRewatch = signal(false);
  protected readonly watchLogRating = signal<number | null>(null);
  protected readonly watchLogReview = signal('');
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
  protected readonly genreBreakdown = computed(() =>
    this.createGenreBreakdown(
      this.summary()?.genreCountsEpisodesLast30Days ?? [],
      this.summary()?.genreCountsMoviesLast30Days ?? [],
    ),
  );
  protected readonly upcomingGroups = computed(() =>
    this.groupUpcoming(this.summary()?.upcomingReleases ?? []),
  );
  private watchLogOpener: HTMLElement | null = null;

  @ViewChild('watchLogCloseButton')
  protected set watchLogCloseButton(button: ElementRef<HTMLButtonElement> | undefined) {
    if (button && this.watchLogTarget()) {
      button.nativeElement.focus();
    }
  }

  constructor(
    private readonly api: HomeApiService,
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

  protected loadSummary(userId = this.session.user()?.id): void {
    if (!userId) {
      this.session.clear();
      void this.router.navigateByUrl('/login');
      return;
    }

    this.status.set('loading');
    this.errorMessage.set(null);
    this.shellState.clearHomeState();
    this.api.getHomeSummary(userId).subscribe({
      next: (summary) => {
        this.summary.set(summary);
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

  protected toggleContentMenu(event: MouseEvent, menuId: string): void {
    event.stopPropagation();
    this.openContentMenuId.update((openId) =>
      openId === menuId ? null : menuId,
    );
  }

  protected openWatchLogForEpisode(episode: NextEpisode): void {
    this.openContentMenuId.set(null);
    this.showWatchLog(
      episode.seriesTitle || this.copy.titleUnavailable,
      `${this.episodeLabel(episode)} · ${episode.episodeTitle || this.copy.episode}`,
      false,
    );
  }

  protected openWatchLogForRecentEntry(entry: HomeRecentlyWatched): void {
    this.openContentMenuId.set(null);
    const title = entry.content.type === 'EPISODE'
      ? this.recentEpisodeSeriesTitle(entry)
      : entry.card?.title || this.copy.titleUnavailable;
    const subtitle = entry.content.type === 'EPISODE'
      ? `${this.episodeLabelForEntry(entry)} · ${this.recentEpisodeTitle(entry)}`
      : this.copy.movie;
    this.showWatchLog(title, subtitle, true);
  }

  protected openRatingModal(entry: HomeRecentlyWatched): void {
    this.openContentMenuId.set(null);
    const title = entry.content.type === 'EPISODE'
      ? this.recentEpisodeSeriesTitle(entry)
      : entry.card?.title || this.copy.titleUnavailable;
    const subtitle = entry.content.type === 'EPISODE'
      ? `${this.episodeLabelForEntry(entry)} · ${this.recentEpisodeTitle(entry)}`
      : this.copy.movie;
    const opener = document.activeElement instanceof HTMLElement
      ? document.activeElement
      : null;
    this.showDialog({ kind: 'rating', title, subtitle }, opener);
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

  protected updateWatchLogReview(event: Event): void {
    this.watchLogReview.set((event.currentTarget as HTMLTextAreaElement).value);
  }

  protected closeWatchLog(): void {
    const opener = this.watchLogOpener;
    this.watchLogOpener = null;
    this.watchLogTarget.set(null);
    this.watchCalendarOpen.set(false);
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
    if (this.watchLogTarget()) {
      if (event.key === 'Escape') {
        event.preventDefault();
        this.closeWatchLog();
        return;
      }
      if (event.key !== 'Tab') {
        return;
      }

      const dialog = document.querySelector<HTMLElement>('.watch-log-dialog');
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

  private showWatchLog(title: string, subtitle: string, isRewatch: boolean): void {
    const opener = document.querySelector<HTMLElement>(
      '.content-menu-trigger[aria-expanded="true"]',
    );
    this.showDialog({ kind: 'watch', title, subtitle }, opener);
    this.watchLogDate.set(this.toDateKey(new Date()));
    this.watchLogRewatch.set(isRewatch);
  }

  private showDialog(target: WatchLogTarget, opener: HTMLElement | null): void {
    this.watchLogOpener = opener;
    this.watchLogTarget.set(target);
    this.watchLogRating.set(null);
    this.watchLogReview.set('');
    this.watchCalendarMonth.set(this.firstOfMonth(new Date()));
    this.watchCalendarOpen.set(false);
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
    return new Intl.DateTimeFormat('pt-BR', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
    }).format(new Date());
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
    return this.imageUrl(entry.customPosterUrl) ?? this.posterFor(entry.card);
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

  protected heroBackdrop(): string | null {
    const path = this.summary()?.latestWatchedBackdropPath;
    return path ? this.imageUrl(path, 'w1920') : null;
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
    } else if (event.eventType === 'SEASON' && event.content.seasonNumber !== null && event.content.seasonNumber !== undefined) {
      parts.push(`${this.copy.season} ${event.content.seasonNumber}`);
    } else if (event.eventType === 'SERIES' && event.content.episodeCount !== null && event.content.episodeCount !== undefined) {
      parts.push(this.quantityLabel(event.content.episodeCount, this.copy.episodeSingular, this.copy.episodes));
    }
    return parts.length ? parts.join(' · ') : null;
  }

  protected releaseSourceLabels(event: UpcomingRelease): string[] {
    return event.sources.map((source) =>
      source === 'WATCHLIST' ? this.copy.watchlist : this.copy.inProgress,
    );
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

  protected posterFor(card: HomeContentCard | null): string | null {
    if (!card || card.previewStatus === 'UNAVAILABLE') {
      return null;
    }
    return this.imageUrl(card.customPosterUrl || card.posterPath);
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

  protected socialSubtitle(activity: HomeSocialActivity): string {
    if (!activity.content) {
      return activity.targetLabel || '';
    }
    if (activity.content.type === 'EPISODE') {
      const parts = [
        activity.card?.type === 'SERIES' ? activity.card.title : null,
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

  protected watchActivitySummary(): string {
    const count = (this.summary()?.watchCountByDayLast30Days ?? [])
      .reduce((total, day) => total + day.count, 0);
    return this.quantityLabel(count, this.copy.activityRecordSingular, this.copy.activityRecords);
  }

  protected setHoveredChartDay(index: number): void {
    this.hoveredChartDayIndex.set(index);
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
    return new Intl.DateTimeFormat('pt-BR', {
      weekday: 'long',
      timeZone: 'UTC',
    }).format(releaseDate);
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
