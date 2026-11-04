import { DecimalPipe, LowerCasePipe } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { Subscription } from 'rxjs';
import { AuthSessionService } from '../../../../core/session/session.service';
import { ContentApiService } from '../../../content/data-access/content-api.service';
import { ContentImageAction, ContentImageActionsComponent } from '../../../../shared/components/content-image-actions/content-image-actions.component';
import { messageCatalog } from '../../../../shared/i18n/messages';
import { PageSkeletonComponent } from '../../../../shared/components/page-skeleton/page-skeleton.component';
import { ToastNotificationsService } from '../../../../shared/components/toast-notifications/toast-notifications.service';
import { tmdbImageUrl } from '../../../../shared/utils/tmdb-image-url';
import { ListProgressData, ListSeriesProgress, ListsApiService } from '../../data-access/lists-api.service';

type ProgressSort = 'watched' | 'remaining' | 'title';
type ListProgressItem = ListProgressData['items'][number];

@Component({
  selector: 'app-list-progress',
  standalone: true,
  imports: [DecimalPipe, LowerCasePipe, RouterLink, ContentImageActionsComponent, PageSkeletonComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './list-progress.component.html',
  styleUrl: './list-progress.component.css',
})
export class ListProgressComponent {
  protected readonly copy = messageCatalog['pt-BR'].listProgressPage;
  protected readonly homeCopy = messageCatalog['pt-BR'].home;
  protected readonly listId = inject(ActivatedRoute).snapshot.paramMap.get('listId') ?? '';
  protected readonly data = signal<ListProgressData | null>(null);
  protected readonly status = signal<'loading' | 'ready' | 'error'>('loading');
  protected readonly errorMessage = signal('');
  protected readonly sort = signal<ProgressSort>('watched');
  protected readonly descending = signal(true);
  protected readonly expanded = signal<ReadonlySet<string>>(new Set());
  protected readonly savingSeriesId = signal<string | null>(null);
  protected readonly seriesItems = computed(() => {
    const items = (this.data()?.items ?? []).filter((item) => item.content.type === 'SERIES' && item.seriesProgress);
    const ordered = [...items];
    const compareDate = (a: ListProgressItem, b: ListProgressItem) =>
      (a.seriesProgress?.lastWatchedDate ?? '').localeCompare(b.seriesProgress?.lastWatchedDate ?? '');
    const compareRemaining = (a: ListProgressItem, b: ListProgressItem) =>
      (a.seriesProgress?.remainingEpisodeCount ?? Number.MAX_SAFE_INTEGER) - (b.seriesProgress?.remainingEpisodeCount ?? Number.MAX_SAFE_INTEGER);
    const compareTitle = (a: ListProgressItem, b: ListProgressItem) => this.seriesTitle(a).localeCompare(this.seriesTitle(b), 'pt-BR');
    ordered.sort((a, b) => {
      const result = this.sort() === 'remaining' ? compareRemaining(a, b) : this.sort() === 'title' ? compareTitle(a, b) : compareDate(a, b);
      return this.descending() ? -result : result;
    });
    return ordered;
  });
  protected readonly posterActions: readonly ContentImageAction[] = [
    { id: 'open-series', label: this.copy.series, icon: 'eye' },
  ];

  private readonly api = inject(ListsApiService);
  private readonly contentApi = inject(ContentApiService);
  private readonly session = inject(AuthSessionService);
  private readonly router = inject(Router);
  private readonly toasts = inject(ToastNotificationsService);
  private request?: Subscription;

  constructor() {
    if (!this.listId || !this.session.user()) {
      void this.router.navigateByUrl('/login');
      return;
    }
    this.load();
  }

  protected load(): void {
    this.request?.unsubscribe();
    this.status.set('loading');
    this.errorMessage.set('');
    this.request = this.api.getProgress(this.listId).subscribe({
      next: (data) => {
        this.data.set(data);
        this.expanded.set(new Set(this.seriesItems()[0]?.id ? [this.seriesItems()[0].id] : []));
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

  protected chooseSort(sort: ProgressSort): void { this.sort.set(sort); }
  protected toggleDirection(): void { this.descending.update((value) => !value); }
  protected toggleSeasons(itemId: string): void {
    this.expanded.update((current) => {
      const next = new Set(current);
      if (next.has(itemId)) next.delete(itemId); else next.add(itemId);
      return next;
    });
  }
  protected seasonsExpanded(itemId: string): boolean { return this.expanded().has(itemId); }

  protected seriesProgress(item: ListProgressItem): ListSeriesProgress | null { return item.seriesProgress; }
  protected seriesTitle(item: ListProgressItem): string {
    const progress = item.seriesProgress;
    return progress?.seriesTitle || progress?.title || this.copy.titleUnavailable;
  }
  protected seriesPoster(item: ListProgressItem): string | null {
    const progress = item.seriesProgress;
    const source = item.customPosterUrl || progress?.customPosterUrl || progress?.seriesPosterPath || progress?.posterPath;
    return tmdbImageUrl(source, 'w500');
  }
  protected seriesRoute(item: ListProgressItem): string[] {
    return ['/content/series', item.seriesProgress?.seriesTmdbId ?? item.content.seriesTmdbId ?? item.content.tmdbId ?? ''];
  }
  protected openSeries(item: ListProgressItem): void { void this.router.navigate(this.seriesRoute(item)); }
  protected progressPercent(progress: ListSeriesProgress): number { return Math.max(0, Math.min(100, progress.watchedPercentage ?? 0)); }
  protected watchedCount(progress: ListSeriesProgress): number { return progress.watchedEpisodeCount ?? 0; }
  protected totalCount(progress: ListSeriesProgress): number { return progress.totalEpisodeCount ?? 0; }
  protected remainingCount(progress: ListSeriesProgress): number { return progress.remainingEpisodeCount ?? 0; }
  protected remainingLabel(progress: ListSeriesProgress): string { return `${this.remainingCount(progress)} ${this.copy.remaining}`; }
  protected duration(minutes: number | null | undefined): string {
    if (minutes === null || minutes === undefined) return '—';
    const days = Math.floor(minutes / 1440);
    const hours = Math.floor((minutes % 1440) / 60);
    const remainder = minutes % 60;
    if (days) return remainder ? `${days}d ${hours}h ${remainder}m` : `${days}d ${hours}h`;
    if (hours) return remainder ? `${hours}h ${remainder}m` : `${hours}h`;
    return `${remainder}m`;
  }
  protected lastWatched(progress: ListSeriesProgress): string {
    if (!progress.lastWatchedDate) return this.copy.notStarted;
    return this.date(progress.lastWatchedDate);
  }
  protected lastEpisodeLabel(progress: ListSeriesProgress): string {
    if (progress.lastWatchedSeasonNumber === null || progress.lastWatchedEpisodeNumber === null) return 'T0 · E0';
    return `T${progress.lastWatchedSeasonNumber} · E${progress.lastWatchedEpisodeNumber} “${progress.lastWatchedEpisodeTitle || this.copy.episodeUnavailable}”`;
  }
  protected date(value: string): string { return new Intl.DateTimeFormat('pt-BR', { day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(value)); }
  protected episodeDate(value: string | null): string { return value ? this.date(value) : this.copy.releaseUnknown; }
  protected episodeRoute(item: ListProgressItem): string[] | null {
    const episode = item.seriesProgress?.nextEpisode;
    const seriesId = item.seriesProgress?.seriesTmdbId;
    if (!episode || !seriesId) return null;
    return ['/content/series', seriesId, 'season', String(episode.seasonNumber), 'episode', String(episode.episodeNumber)];
  }
  protected episodeImage(item: ListProgressItem): string | null {
    const path = item.seriesProgress?.nextEpisode?.stillPath;
    return tmdbImageUrl(path, 'w500');
  }
  protected markWatched(item: ListProgressItem): void {
    const progress = item.seriesProgress;
    const episode = progress?.nextEpisode;
    if (!progress || !episode || episode.availableToWatch === false || this.savingSeriesId()) return;
    this.savingSeriesId.set(item.id);
    this.contentApi.createSeriesDiaryEntry({
      content: {
        type: 'EPISODE',
        seriesTmdbId: progress.seriesTmdbId,
        seasonNumber: episode.seasonNumber,
        episodeNumber: episode.episodeNumber,
      },
      watchedDate: new Date().toISOString().slice(0, 10),
    }).subscribe({
      next: () => { this.savingSeriesId.set(null); this.load(); },
      error: () => { this.savingSeriesId.set(null); this.toasts.error(this.copy.actionError); },
    });
  }
  protected progressHasRows(): boolean { return this.seriesItems().length > 0 || (this.data()?.movieProgress.totalItems ?? 0) > 0; }
  protected movieProgressPercent(): number {
    const movies = this.data()?.movieProgress;
    if (!movies?.totalItems) return 0;
    return Math.round((movies.watchedItems / movies.totalItems) * 100);
  }
  protected releaseYear(item: ListProgressItem): number | null { return item.seriesProgress?.releaseYear ?? null; }
}
