import { ModalFocusDirective } from '../../../../shared/directives/modal-focus.directive';
import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { GamesApiService, DailyGameHistory, DailyGameOverviewCard, DailyGameType, DailyGamesOverview } from '../../data-access/games-api.service';
import { messageCatalog } from '../../../../shared/i18n/messages';

type GamesStatus = 'loading' | 'ready' | 'error';
type GamesGroup = 'image' | 'info' | 'actor';

interface GameDefinition {
  type: DailyGameType;
  group: GamesGroup;
  title: string;
  description: string;
  subject: string;
}

interface CalendarDay { date: string; day: number; played: boolean; today: boolean; future: boolean; }

@Component({
  selector: 'app-games',
  standalone: true,
  imports: [ModalFocusDirective, RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './games.component.html',
  styleUrl: './games.component.css',
})
export class GamesComponent {
  protected readonly copy = messageCatalog['pt-BR'].gamesPage;
  protected readonly status = signal<GamesStatus>('loading');
  protected readonly overview = signal<DailyGamesOverview | null>(null);
  protected readonly history = signal<DailyGameHistory[]>([]);
  protected readonly error = signal('');
  protected readonly calendarOpen = signal(false);
  protected readonly calendarMonth = signal(this.monthStart(new Date()));
  protected readonly loadingHistory = signal(false);
  protected readonly historicalDate = inject(ActivatedRoute).snapshot.paramMap.get('challengeDate');
  protected readonly currentDate = computed(() => this.overview()?.date ?? this.dateKey(new Date()));
  protected readonly date = computed(() => this.parseDate(this.currentDate()));
  protected readonly availableGroups = [
    { id: 'image' as const, title: this.copy.fromImage, description: this.copy.fromImageDescription },
    { id: 'info' as const, title: this.copy.fromInfo, description: this.copy.fromInfoDescription },
    { id: 'actor' as const, title: this.copy.guessActor, description: this.copy.guessActorDescription },
  ];
  protected readonly games = computed<GameDefinition[]>(() => {
    const labels = this.copy.gameTypes;
    return [
      { type: 'MOVIE_BY_POSTER', group: 'image', title: labels.moviePosterTitle, description: labels.moviePosterDescription, subject: this.copy.movie },
      { type: 'SERIES_BY_POSTER', group: 'image', title: labels.seriesPosterTitle, description: labels.seriesPosterDescription, subject: this.copy.series },
      { type: 'PERSON_BY_FACE', group: 'image', title: labels.personFaceTitle, description: labels.personFaceDescription, subject: this.copy.person },
      { type: 'EPISODE_BY_FRAME', group: 'image', title: labels.episodeFrameTitle, description: labels.episodeFrameDescription, subject: this.copy.episode },
      { type: 'MOVIE_BY_INFO', group: 'info', title: labels.movieInfoTitle, description: labels.movieInfoDescription, subject: this.copy.movie },
      { type: 'SERIES_BY_INFO', group: 'info', title: labels.seriesInfoTitle, description: labels.seriesInfoDescription, subject: this.copy.series },
      { type: 'ACTOR_BY_MOVIE_FILMOGRAPHY', group: 'actor', title: labels.actorMovieTitle, description: labels.actorMovieDescription, subject: this.copy.movieCast },
      { type: 'ACTOR_BY_SERIES_FILMOGRAPHY', group: 'actor', title: labels.actorSeriesTitle, description: labels.actorSeriesDescription, subject: this.copy.seriesCast },
    ];
  });
  protected readonly scoreLabel = computed(() => this.copy.scoreToday.replace('{score}', String(this.overview()?.currentScore ?? 0)).replace('{total}', String(this.overview()?.totalMaxScore ?? 0)));
  protected readonly calendarLabel = computed(() => new Intl.DateTimeFormat('pt-BR', { month: 'long', year: 'numeric' }).format(this.calendarMonth()));
  protected readonly calendarDays = computed<CalendarDay[]>(() => {
    const month = this.calendarMonth();
    const first = new Date(month.getFullYear(), month.getMonth(), 1);
    const startOffset = first.getDay();
    const daysInMonth = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate();
    const today = this.dateKey(this.parseDate(this.overview()?.date ?? this.dateKey(new Date())));
    const currentMonth = this.parseDate(this.overview()?.date ?? this.dateKey(new Date()));
    const playedDates = new Set(this.history().map((item) => item.challengeDate));
    return Array.from({ length: Math.ceil((startOffset + daysInMonth) / 7) * 7 }, (_, index) => {
      const day = index - startOffset + 1;
      if (day < 1 || day > daysInMonth) return null;
      const date = this.dateKey(new Date(month.getFullYear(), month.getMonth(), day));
      const candidate = this.parseDate(date);
      return { date, day, played: playedDates.has(date), today: date === today, future: candidate > currentMonth };
    }).filter((entry): entry is CalendarDay => entry !== null);
  });

  private readonly api = inject(GamesApiService);
  private readonly router = inject(Router);

  constructor() { this.load(); }

  protected load(): void {
    this.status.set('loading'); this.error.set('');
    const request = this.historicalDate ? this.api.getDay(this.historicalDate) : this.api.getOverview();
    request.subscribe({
      next: (data) => {
        if ('totalMaxScore' in data) this.overview.set(data as DailyGamesOverview);
        else {
          const games: DailyGameOverviewCard[] = data.games.map((item) => ({ ...item, targetKind: item.targetKind as DailyGameOverviewCard['targetKind'] }));
          this.overview.set({ date: data.date, nextResetAt: '', totalMaxScore: games.reduce((sum, game) => sum + game.maxAttempts, 0), currentScore: games.reduce((sum, game) => sum + game.score, 0), games });
        }
        this.calendarMonth.set(this.monthStart(this.parseDate(this.overview()!.date)));
        this.status.set('ready');
      },
      error: (error: unknown) => { this.status.set('error'); this.error.set(error instanceof HttpErrorResponse && error.status === 0 ? this.copy.connectionError : this.copy.loadError); },
    });
  }

  protected card(type: DailyGameType): DailyGameOverviewCard | undefined { return this.overview()?.games.find((game) => game.gameType === type); }
  protected definitions(group: GamesGroup): GameDefinition[] { return this.games().filter((game) => game.group === group); }
  protected gameRoute(type: DailyGameType): string[] { return ['/games/play', type]; }
  protected progressLabel(card: DailyGameOverviewCard | undefined): string { return this.copy.attemptsUsed.replace('{used}', String(card?.attemptsUsed ?? 0)).replace('{max}', String(card?.maxAttempts ?? 0)); }
  protected statusLabel(card: DailyGameOverviewCard | undefined): string {
    switch (card?.status) {
      case 'COMPLETED': return this.copy.completed;
      case 'FAILED': return this.copy.failed;
      case 'IN_PROGRESS': return this.copy.inProgress;
      default: return this.copy.notStarted;
    }
  }
  protected imageUrl(card: DailyGameOverviewCard | undefined): string | null { return card?.visibleImageUrls?.[0] ?? card?.imageUrl ?? null; }
  protected openCalendar(): void {
    this.calendarOpen.set(true);
    if (!this.history().length && !this.loadingHistory()) {
      this.loadingHistory.set(true);
      this.api.getHistory().subscribe({ next: (page) => { this.history.set(page.content); this.loadingHistory.set(false); }, error: () => this.loadingHistory.set(false) });
    }
  }
  protected closeCalendar(): void { this.calendarOpen.set(false); }
  protected shiftMonth(amount: number): void { this.calendarMonth.update((month) => new Date(month.getFullYear(), month.getMonth() + amount, 1)); }
  protected previousMonthDisabled(): boolean { return this.calendarMonth().getFullYear() <= 2025 && this.calendarMonth().getMonth() === 0; }
  protected nextMonthDisabled(): boolean { const max = this.monthStart(this.parseDate(this.overview()?.date ?? this.dateKey(new Date()))); return this.calendarMonth() >= max; }
  protected chooseDate(day: CalendarDay): void {
    if (day.future) return;
    this.calendarOpen.set(false);
    void this.router.navigate(['/games/day', day.date]);
  }
  protected goToToday(): void { this.calendarOpen.set(false); void this.router.navigateByUrl('/games'); }
  protected gameLinkLabel(game: GameDefinition): string { return this.copy.continue.replace('{game}', game.title); }
  protected number(value: number | null | undefined): string { return String(value ?? 0); }
  protected dateLabel(value: Date): string { return new Intl.DateTimeFormat('pt-BR', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' }).format(value); }

  private dateKey(date: Date): string { return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`; }
  private parseDate(value: string): Date { return new Date(`${value}T12:00:00`); }
  private monthStart(date: Date): Date { return new Date(date.getFullYear(), date.getMonth(), 1); }
}
