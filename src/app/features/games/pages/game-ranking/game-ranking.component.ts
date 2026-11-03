import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { GamesApiService, DailyGameType, DailyGameRankingEntry, DailyGameRankingView } from '../../data-access/games-api.service';
import { messageCatalog } from '../../../../shared/i18n/messages';
import { PageSkeletonComponent } from '../../../../shared/components/page-skeleton/page-skeleton.component';

@Component({
  selector: 'app-game-ranking',
  standalone: true,
  imports: [RouterLink, PageSkeletonComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './game-ranking.component.html',
  styleUrl: './game-ranking.component.css',
})
export class GameRankingComponent {
  protected readonly copy = messageCatalog['pt-BR'].gameRankingPage;
  protected readonly gamesCopy = messageCatalog['pt-BR'].gamesPage;
  protected readonly status = signal<'loading' | 'ready' | 'error'>('loading');
  protected readonly view = signal<DailyGameRankingView | null>(null);
  protected readonly page = signal(1);
  protected readonly gameType = signal<DailyGameType | null>(null);
  protected readonly error = signal('');
  protected readonly totalPages = computed(() => Math.max(1, this.view()?.totalPages ?? 1));
  protected readonly pageNumbers = computed(() => Array.from({ length: Math.min(10, this.totalPages()) }, (_, index) => index + Math.max(1, this.page() - 4)));
  protected readonly dateUpdated = new Intl.DateTimeFormat('pt-BR', { hour: '2-digit', minute: '2-digit' }).format(new Date());
  protected readonly gameOptions: Array<{ value: DailyGameType; label: string }> = [
    { value: 'MOVIE_BY_POSTER', label: this.gamesCopy.gameTypes.moviePosterTitle },
    { value: 'SERIES_BY_POSTER', label: this.gamesCopy.gameTypes.seriesPosterTitle },
    { value: 'PERSON_BY_FACE', label: this.gamesCopy.gameTypes.personFaceTitle },
    { value: 'EPISODE_BY_FRAME', label: this.gamesCopy.gameTypes.episodeFrameTitle },
    { value: 'MOVIE_BY_INFO', label: this.gamesCopy.gameTypes.movieInfoTitle },
    { value: 'SERIES_BY_INFO', label: this.gamesCopy.gameTypes.seriesInfoTitle },
    { value: 'ACTOR_BY_MOVIE_FILMOGRAPHY', label: this.gamesCopy.gameTypes.actorMovieTitle },
    { value: 'ACTOR_BY_SERIES_FILMOGRAPHY', label: this.gamesCopy.gameTypes.actorSeriesTitle },
  ];

  private readonly api = inject(GamesApiService);

  constructor() { this.load(); }

  protected load(): void {
    this.status.set('loading'); this.error.set('');
    this.api.getRanking({ gameType: this.gameType(), page: this.page(), size: 20 }).subscribe({
      next: (view) => { this.view.set(view); this.status.set('ready'); },
      error: (error: unknown) => { this.status.set('error'); this.error.set(error instanceof HttpErrorResponse && error.status === 0 ? this.copy.connectionError : this.copy.loadError); },
    });
  }
  protected selectGame(event: Event): void { const value = (event.target as HTMLSelectElement).value as DailyGameType | ''; this.gameType.set(value || null); this.page.set(1); this.load(); }
  protected goToPage(page: number): void { this.page.set(Math.max(1, Math.min(this.totalPages(), page))); this.load(); }
  protected rankLabel(value: number | null): string { return value === null ? this.copy.unranked : `#${new Intl.NumberFormat('pt-BR').format(value)}`; }
  protected number(value: number): string { return new Intl.NumberFormat('pt-BR').format(value); }
  protected percent(value: number): string { return `${new Intl.NumberFormat('pt-BR').format(value)}%`; }
  protected rowName(row: DailyGameRankingEntry): string { return row.name || row.username; }
  protected profileRoute(username: string): string[] { return ['/users', username]; }
  protected viewerRoute(): string[] { return ['/users', this.view()?.viewer?.username ?? '']; }
  protected rangeLabel(): string {
    const view = this.view();
    if (!view?.totalElements) return this.copy.emptyRange;
    const start = (view.page - 1) * view.size + 1;
    return this.copy.range.replace('{start}', this.number(start)).replace('{end}', this.number(Math.min(view.totalElements, view.page * view.size))).replace('{total}', this.number(view.totalElements));
  }
}
