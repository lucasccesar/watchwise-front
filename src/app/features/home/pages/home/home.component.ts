import { HttpErrorResponse } from '@angular/common/http';
import { Component, OnInit, computed, signal } from '@angular/core';
import { Router } from '@angular/router';
import { messageCatalog } from '../../../../shared/i18n/messages';
import { AuthSessionService } from '../../../../core/session/session.service';
import { AppShellStateService } from '../../../../core/ui/app-shell-state.service';
import {
  DailyWatchCount,
  GenreCount,
  HomeApiService,
  HomeContentCard,
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

interface GenreBar {
  genre: string;
  count: number;
  percentage: number;
}

interface UpcomingDateGroup {
  date: string;
  label: string;
  shortDate: string;
  releases: UpcomingRelease[];
}

type HomeStatus = 'loading' | 'ready' | 'error';

@Component({
  selector: 'app-home',
  standalone: true,
  templateUrl: './home.component.html',
})
export class HomeComponent implements OnInit {
  protected readonly copy = messageCatalog['pt-BR'].home;
  protected readonly summary = signal<HomeSummary | null>(null);
  protected readonly status = signal<HomeStatus>('loading');
  protected readonly errorMessage = signal<string | null>(null);
  protected readonly upcomingView = signal<'calendar' | 'next'>('calendar');
  protected readonly hasWatchHistory = computed(() =>
    this.chartDays().some((day) => day.count > 0),
  );
  protected readonly chartDays = computed(() =>
    this.createChartDays(this.summary()?.watchCountByDayLast30Days ?? []),
  );
  protected readonly movieGenres = computed(() =>
    this.createGenreBars(this.summary()?.genreCountsMoviesLast30Days ?? []),
  );
  protected readonly episodeGenres = computed(() =>
    this.createGenreBars(this.summary()?.genreCountsEpisodesLast30Days ?? []),
  );
  protected readonly upcomingGroups = computed(() =>
    this.groupUpcoming(this.summary()?.upcomingReleases ?? []),
  );
  protected readonly viewerName = computed(() => {
    const viewer = this.summary()?.viewer;
    const sessionUser = this.session.user();
    return viewer?.name?.trim() || sessionUser?.name || viewer?.username || sessionUser?.username || this.copy.welcome;
  });

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

  protected formatScore(value: number): string {
    return new Intl.NumberFormat('pt-BR', {
      minimumFractionDigits: 1,
      maximumFractionDigits: 1,
    }).format(value);
  }

  protected formatDuration(minutes: number | null | undefined): string {
    const total = Math.max(0, minutes ?? 0);
    const days = Math.floor(total / 1440);
    const hours = Math.floor((total % 1440) / 60);
    const remainingMinutes = total % 60;

    if (days > 0) {
      return `${this.formatNumber(days)} ${this.copy.dayShort} ${this.formatNumber(hours)} ${this.copy.hourShort}`;
    }
    if (hours > 0) {
      return `${this.formatNumber(hours)} ${this.copy.hourShort} ${this.formatNumber(remainingMinutes)} ${this.copy.minuteShort}`;
    }
    return `${this.formatNumber(remainingMinutes)} ${this.copy.minuteShort}`;
  }

  protected formatDate(value: string | null | undefined): string {
    if (!value) {
      return this.copy.dateUnavailable;
    }
    const date = new Date(`${value}T12:00:00Z`);
    if (Number.isNaN(date.getTime())) {
      return this.copy.dateUnavailable;
    }
    return new Intl.DateTimeFormat('pt-BR', {
      day: '2-digit',
      month: 'short',
      timeZone: 'UTC',
    }).format(date);
  }

  protected todayIsoDate(): string {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  protected formatActivityDate(value: string): string {
    return this.formatDate(value.slice(0, 10));
  }

  protected movieProgressLabel(episode: NextEpisode): string {
    const watched = this.formatNumber(episode.watchedEpisodeCount);
    const total = episode.totalEpisodeCount
      ? this.formatNumber(episode.totalEpisodeCount)
      : null;
    return total
      ? `${watched} ${this.copy.of} ${total} ${this.copy.episodes}`
      : `${watched} ${this.copy.episodesWatched}`;
  }

  protected episodeLabel(episode: NextEpisode): string {
    const season = episode.maxSeasonNumber;
    const number = episode.maxEpisodeNumber;
    if (season === null || number === null) {
      return this.copy.episode;
    }
    return `${this.copy.seasonShort} ${season} · ${this.copy.episodeShort} ${number}`;
  }

  protected progressPercent(episode: NextEpisode): number {
    return Math.round(Math.max(0, Math.min(100, episode.watchedPercentage ?? 0)));
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
        return this.copy.upcoming;
    }
  }

  protected releaseStatusLabel(event: UpcomingRelease): string {
    switch (event.releaseStatus) {
      case 'RELEASED':
        return this.copy.statusReleased;
      case 'UPCOMING':
        return this.copy.statusUpcoming;
      case 'UNKNOWN':
        return this.copy.statusUnknown;
      default:
        return this.copy.statusUnknown;
    }
  }

  protected watchStatusLabel(event: UpcomingRelease): string {
    switch (event.watchStatus) {
      case 'WATCHED':
        return this.copy.watchStatusWatched;
      case 'PARTIALLY_WATCHED':
        return this.copy.watchStatusPartial;
      case 'UNWATCHED':
        return this.copy.watchStatusUnwatched;
      case 'UNKNOWN':
        return this.copy.watchStatusUnknown;
      default:
        return this.copy.watchStatusUnknown;
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
        parts.push(`${this.copy.seasonShort} ${event.content.seasonNumber}`);
      }
      if (event.content.episodeNumber !== null && event.content.episodeNumber !== undefined) {
        parts.push(`${this.copy.episodeShort} ${event.content.episodeNumber}`);
      }
    } else if (event.eventType === 'SEASON' && event.content.seasonNumber !== null && event.content.seasonNumber !== undefined) {
      parts.push(`${this.copy.season} ${event.content.seasonNumber}`);
    } else if (event.eventType === 'SERIES' && event.content.episodeCount !== null && event.content.episodeCount !== undefined) {
      parts.push(`${this.formatNumber(event.content.episodeCount)} ${this.copy.episodes}`);
    }
    return parts.length ? parts.join(' · ') : null;
  }

  protected releaseSourceLabels(event: UpcomingRelease): string[] {
    return event.sources.map((source) =>
      source === 'WATCHLIST' ? this.copy.watchlist : this.copy.inProgress,
    );
  }

  protected imageUrl(path: string | null | undefined, size: 'w342' | 'w780' = 'w342'): string | null {
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

  protected trackByDate(_index: number, day: ChartDay): string {
    return day.date;
  }

  protected trackByGenre(_index: number, genre: GenreBar): string {
    return genre.genre;
  }

  protected trackByUpcoming(_index: number, release: UpcomingRelease): string {
    return `${release.eventType}-${release.date}-${release.content.tmdbId ?? ''}-${release.content.seasonNumber ?? ''}-${release.content.episodeNumber ?? ''}`;
  }

  protected genreColorClass(index: number): string {
    return `genre-color-${(index % 6) + 1}`;
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
    return dates.map(({ iso, date }, index) => {
      const count = counts.get(iso) ?? 0;
      const label = index % 5 === 0 || index === dates.length - 1
        ? new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: '2-digit', timeZone: 'UTC' }).format(date)
        : '';
      const description = new Intl.DateTimeFormat('pt-BR', { dateStyle: 'long', timeZone: 'UTC' }).format(date);
      return { date: iso, label, count, height: count === 0 ? 3 : Math.max(8, Math.round((count / maximum) * 100)), description };
    });
  }

  private createGenreBars(data: GenreCount[]): GenreBar[] {
    const maximum = Math.max(1, ...data.map((item) => item.count));
    return data.map((item) => ({
      genre: item.genre,
      count: item.count,
      percentage: Math.max(4, Math.round((item.count / maximum) * 100)),
    }));
  }

  private groupUpcoming(releases: UpcomingRelease[]): UpcomingDateGroup[] {
    const groups = new Map<string, UpcomingRelease[]>();
    for (const release of releases) {
      const group = groups.get(release.date) ?? [];
      group.push(release);
      groups.set(release.date, group);
    }
    return [...groups.entries()].map(([date, items]) => ({
      date,
      label: this.releaseDateLabel(date),
      shortDate: this.formatDate(date),
      releases: items,
    }));
  }

  private releaseDateLabel(value: string): string {
    const releaseDate = new Date(`${value}T12:00:00Z`);
    if (Number.isNaN(releaseDate.getTime())) {
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
    return new Intl.DateTimeFormat('pt-BR', { weekday: 'long', timeZone: 'UTC' }).format(releaseDate);
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
