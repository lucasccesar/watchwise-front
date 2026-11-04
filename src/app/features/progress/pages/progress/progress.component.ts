import { DecimalPipe } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { Subscription } from 'rxjs';
import { AuthSessionService } from '../../../../core/session/session.service';
import { ContentApiService } from '../../../content/data-access/content-api.service';
import {
  DiaryApiService,
  ProgressSortBy,
  SeriesInProgressPage,
  SeriesInProgressRecord,
} from '../../../diary/data-access/diary-api.service';
import {
  ContentImageAction,
  ContentImageActionSelection,
  ContentImageActionsComponent,
} from '../../../../shared/components/content-image-actions/content-image-actions.component';
import { messageCatalog } from '../../../../shared/i18n/messages';
import { PageSkeletonComponent } from '../../../../shared/components/page-skeleton/page-skeleton.component';
import { ToastNotificationsService } from '../../../../shared/components/toast-notifications/toast-notifications.service';
import { tmdbImageUrl } from '../../../../shared/utils/tmdb-image-url';

type ProgressSort = 'watched' | 'remaining';

@Component({
  selector: 'app-progress',
  standalone: true,
  imports: [DecimalPipe, RouterLink, ContentImageActionsComponent, PageSkeletonComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './progress.component.html',
  styleUrl: './progress.component.css',
})
export class ProgressComponent {
  private readonly toasts = inject(ToastNotificationsService);
  protected readonly copy = messageCatalog['pt-BR'].progressPage;
  protected readonly homeCopy = messageCatalog['pt-BR'].home;
  protected readonly status = signal<'loading' | 'ready' | 'error'>('loading');
  protected readonly errorMessage = signal('');
  protected readonly summary = signal<SeriesInProgressPage | null>(null);
  protected readonly sort = signal<ProgressSort>('watched');
  protected readonly descending = signal(true);
  protected readonly currentPage = signal(1);
  protected readonly pageSize = 8;
  protected readonly visibleCount = computed(() => this.summary()?.totalElements ?? 0);
  protected readonly totalPages = computed(() => Math.max(1, this.summary()?.totalPages ?? 1));
  protected readonly pageNumbers = computed(() => Array.from({ length: this.totalPages() }, (_, index) => index + 1));
  protected readonly episodeLeftCount = computed(() => this.summary()?.aggregate.remainingEpisodeCount ?? 0);
  protected readonly items = computed(() => this.summary()?.content ?? []);
  protected readonly visibleEnd = computed(() => Math.min(this.currentPage() * this.pageSize, this.visibleCount()));
  protected readonly posterActions: readonly ContentImageAction[] = [
    { id: 'open-series', label: this.copy.openSeries, icon: 'eye' },
  ];
  protected readonly expandedIds = signal<ReadonlySet<string>>(new Set());
  protected readonly savingSeriesId = signal<string | null>(null);

  private readonly api = inject(DiaryApiService);
  private readonly contentApi = inject(ContentApiService);
  private readonly session = inject(AuthSessionService);
  private readonly router = inject(Router);
  private request?: Subscription;

  constructor() {
    this.load();
  }

  protected load(): void {
    const user = this.session.user();
    if (!user) {
      void this.router.navigateByUrl('/login');
      return;
    }
    this.request?.unsubscribe();
    this.status.set('loading');
    this.errorMessage.set('');
    this.request = this.api.getSeriesInProgress(user.id, {
      page: this.currentPage(),
      size: this.pageSize,
      sortBy: this.sortParameter(),
      direction: this.descending() ? 'DESC' : 'ASC',
    }).subscribe({
      next: (summary) => {
        this.summary.set(summary);
        const firstId = summary.content[0]?.seriesTmdbId;
        this.expandedIds.set(firstId ? new Set([firstId]) : new Set());
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

  protected showPage(page: number): void {
    const selected = Math.max(1, Math.min(this.totalPages(), page));
    this.currentPage.set(selected);
    this.load();
  }

  protected chooseSort(value: ProgressSort): void {
    this.sort.set(value);
    this.currentPage.set(1);
    this.load();
  }

  protected toggleDirection(): void {
    this.descending.update((value) => !value);
    this.load();
  }

  protected toggleExpanded(seriesTmdbId: string): void {
    this.expandedIds.update((ids) => {
      const next = new Set(ids);
      if (next.has(seriesTmdbId)) next.delete(seriesTmdbId);
      else next.add(seriesTmdbId);
      return next;
    });
  }

  protected isExpanded(seriesTmdbId: string): boolean {
    return this.expandedIds().has(seriesTmdbId);
  }

  protected progressPercent(episode: SeriesInProgressRecord): number {
    return Math.max(0, Math.min(100, episode.watchedPercentage ?? 0));
  }

  protected progressPercentLabel(value: number | null | undefined): number {
    return typeof value === 'number' && Number.isFinite(value) ? Math.round(Math.max(0, Math.min(100, value))) : 0;
  }

  protected remaining(episode: SeriesInProgressRecord): number {
    return episode.remainingEpisodeCount ?? 0;
  }

  protected watchedCount(episode: SeriesInProgressRecord): number {
    return episode.watchedEpisodeCount;
  }

  protected totalCount(episode: SeriesInProgressRecord): number {
    return episode.totalEpisodeCount ?? 0;
  }

  protected title(episode: SeriesInProgressRecord): string {
    return episode.seriesTitle || episode.title || this.copy.titleUnavailable;
  }

  protected episodeTitle(episode: SeriesInProgressRecord): string {
    return episode.nextEpisode?.title || this.copy.episodeUnavailable;
  }

  protected poster(episode: SeriesInProgressRecord): string | null {
    const path = episode.customPosterUrl || episode.posterPath || episode.seriesPosterPath;
    return tmdbImageUrl(path, 'w500');
  }

  protected episodeStill(path: string | null | undefined): string | null {
    return tmdbImageUrl(path, 'w500');
  }

  protected seriesRoute(episode: SeriesInProgressRecord): string[] {
    return ['/content/series', episode.seriesTmdbId];
  }

  protected episodeRoute(episode: SeriesInProgressRecord): string[] | null {
    if (!episode.nextEpisode) return null;
    return [
      '/content/series',
      episode.seriesTmdbId,
      'season',
      String(episode.nextEpisode.seasonNumber),
      'episode',
      String(episode.nextEpisode.episodeNumber),
    ];
  }

  protected lastWatchedRoute(episode: SeriesInProgressRecord): string[] | null {
    const season = episode.lastWatchedSeasonNumber;
    const number = episode.lastWatchedEpisodeNumber;
    if (season === null || number === null) return null;
    return ['/content/series', episode.seriesTmdbId, 'season', String(season), 'episode', String(number)];
  }

  protected nextEpisode(episode: SeriesInProgressRecord) {
    return episode.nextEpisode;
  }

  protected lastWatchedLabel(episode: SeriesInProgressRecord): string {
    if (!episode.lastWatchedDate) return this.copy.lastWatchedUnknown;
    return new Intl.DateTimeFormat('pt-BR', { day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(episode.lastWatchedDate));
  }

  protected imageAction(episode: SeriesInProgressRecord, selection: ContentImageActionSelection): void {
    if (selection.action.id === 'open-series') void this.router.navigate(this.seriesRoute(episode));
  }

  protected markEpisodeWatched(episode: SeriesInProgressRecord): void {
    const next = episode.nextEpisode;
    if (this.savingSeriesId() || !next || next.availableToWatch === false) return;
    this.savingSeriesId.set(episode.seriesTmdbId);
    this.contentApi.createSeriesDiaryEntry({
      content: {
        type: 'EPISODE',
        seriesTmdbId: episode.seriesTmdbId,
        seasonNumber: next.seasonNumber,
        episodeNumber: next.episodeNumber,
      },
      watchedDate: new Date().toISOString().slice(0, 10),
    }).subscribe({
      next: () => {
        this.savingSeriesId.set(null);
        this.load();
      },
      error: () => {
        this.savingSeriesId.set(null);
        this.toasts.error(this.copy.markWatchedError);
      },
    });
  }

  protected formatDuration(minutes: number | null): string {
    if (minutes === null) return '0 min';
    const hours = Math.floor(minutes / 60);
    const remainder = minutes % 60;
    return hours ? `${hours}h ${remainder}min` : `${remainder} min`;
  }

  protected inProgressLabel(): string {
    return this.copy.inProgress.replace('{count}', new Intl.NumberFormat('pt-BR').format(this.visibleCount()));
  }

  protected showingLabel(): string {
    const format = new Intl.NumberFormat('pt-BR');
    const start = this.visibleCount() === 0 ? 0 : (this.currentPage() - 1) * this.pageSize + 1;
    return this.copy.showing
      .replace('{start}', format.format(start))
      .replace('{end}', format.format(this.visibleEnd()))
      .replace('{total}', format.format(this.visibleCount()));
  }

  protected timeRemaining(): number | null {
    return this.summary()?.aggregate.remainingRuntimeMinutes ?? null;
  }

  private sortParameter(): ProgressSortBy {
    return this.sort() === 'remaining' ? 'REMAINING_EPISODES' : 'LAST_WATCHED';
  }
}
