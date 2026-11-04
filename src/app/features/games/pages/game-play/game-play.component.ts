import { ModalFocusDirective } from '../../../../shared/directives/modal-focus.directive';
import { DialogBackdropComponent } from '../../../../shared/components/dialog-backdrop/dialog-backdrop.component';
import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, computed, DestroyRef, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { interval, Subscription } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { GamesApiService, DailyGameEpisodeOption, DailyGameInfoFeedback, DailyGameMediaRef, DailyGamePlayView, DailyGameSeasonOption, DailyGameSearchResult, DailyGameType } from '../../data-access/games-api.service';
import { messageCatalog } from '../../../../shared/i18n/messages';
import { ToastNotificationsService } from '../../../../shared/components/toast-notifications/toast-notifications.service';
import { PageSkeletonComponent } from '../../../../shared/components/page-skeleton/page-skeleton.component';
import { ResponsiveBannerComponent } from '../../../../shared/components/responsive-banner/responsive-banner.component';
import { tmdbImageUrl } from '../../../../shared/utils/tmdb-image-url';

type PageStatus = 'loading' | 'ready' | 'error';
interface FeedbackCell { label: string; status: string; value: string; }

const supportedTypes: DailyGameType[] = ['MOVIE_BY_POSTER', 'SERIES_BY_POSTER', 'PERSON_BY_FACE', 'EPISODE_BY_FRAME', 'MOVIE_BY_INFO', 'SERIES_BY_INFO', 'ACTOR_BY_MOVIE_FILMOGRAPHY', 'ACTOR_BY_SERIES_FILMOGRAPHY'];

@Component({
  selector: 'app-game-play',
  standalone: true,
  imports: [DialogBackdropComponent, ModalFocusDirective, FormsModule, RouterLink, PageSkeletonComponent, ResponsiveBannerComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './game-play.component.html',
  styleUrl: './game-play.component.css',
})
export class GamePlayComponent {
  protected readonly copy = messageCatalog['pt-BR'].gamesPlayPage;
  protected readonly gamesCopy = messageCatalog['pt-BR'].gamesPage;
  private readonly route = inject(ActivatedRoute);
  protected readonly gameType = this.readGameType();
  protected readonly state = signal<DailyGamePlayView | null>(null);
  protected readonly status = signal<PageStatus>('loading');
  protected readonly error = signal('');
  protected readonly searchText = signal('');
  protected readonly searchResults = signal<DailyGameSearchResult[]>([]);
  protected readonly selected = signal<DailyGameSearchResult | null>(null);
  protected readonly searchOpen = signal(false);
  protected readonly seasons = signal<DailyGameSeasonOption[]>([]);
  protected readonly episodes = signal<DailyGameEpisodeOption[]>([]);
  protected readonly selectedSeason = signal<number | null>(null);
  protected readonly selectedEpisode = signal<number | null>(null);
  protected readonly searchBusy = signal(false);
  protected readonly submitting = signal(false);
  protected readonly majorRoles = signal(true);
  protected readonly shareOnCompletion = signal(false);
  protected readonly howToPlayOpen = signal(false);
  protected readonly giveUpOpen = signal(false);
  protected readonly actionError = signal('');
  private readonly toasts = inject(ToastNotificationsService);
  protected readonly selectedFrameSlot = signal<string | null>(null);
  protected readonly clockTick = signal(0);
  protected readonly statusCompleted = computed(() => ['COMPLETED', 'FAILED'].includes(this.state()?.status ?? ''));
  protected readonly displayMedia = computed(() => (this.state()?.media ?? []).filter((media) => media.revealed));
  protected readonly attemptSegments = computed(() => Array.from({ length: this.state()?.maxAttempts ?? 0 }, (_, index) => index));
  protected readonly frameSlots = computed(() => Array.from({ length: Math.max(6, this.state()?.media.length ?? 0) }, (_, index) => index));
  protected readonly activeFrame = computed(() => {
    const visible = this.displayMedia();
    return visible.find((media) => media.slot === this.selectedFrameSlot()) || visible[visible.length - 1] || null;
  });
  protected readonly newChallengeCountdown = computed(() => {
    this.clockTick();
    const resetAt = this.state()?.nextResetAt;
    const remainingMs = resetAt ? Date.parse(resetAt) - Date.now() : Number.NaN;
    if (!Number.isFinite(remainingMs)) return this.copy.newChallengeCountdown;
    const remainingMinutes = Math.max(0, Math.ceil(remainingMs / 60_000));
    const hours = Math.floor(remainingMinutes / 60);
    const minutes = String(remainingMinutes % 60).padStart(2, '0');
    return this.gamesCopy.newChallenges.replace('{time}', `${hours}h ${minutes}m`);
  });
  protected readonly gameName = computed(() => {
    const type = this.gameType;
    const names = this.gamesCopy.gameTypes;
    if (!type) return this.gamesCopy.title;
    const map: Record<DailyGameType, string> = {
      MOVIE_BY_POSTER: names.moviePosterTitle,
      SERIES_BY_POSTER: names.seriesPosterTitle,
      PERSON_BY_FACE: names.personFaceTitle,
      EPISODE_BY_FRAME: names.episodeFrameTitle,
      MOVIE_BY_INFO: names.movieInfoTitle,
      SERIES_BY_INFO: names.seriesInfoTitle,
      ACTOR_BY_MOVIE_FILMOGRAPHY: names.actorMovieTitle,
      ACTOR_BY_SERIES_FILMOGRAPHY: names.actorSeriesTitle,
    };
    return map[type];
  });
  protected readonly description = computed(() => {
    const type = this.gameType;
    const names = this.gamesCopy.gameTypes;
    if (!type) return '';
    const map: Record<DailyGameType, string> = {
      MOVIE_BY_POSTER: names.moviePosterDescription,
      SERIES_BY_POSTER: names.seriesPosterDescription,
      PERSON_BY_FACE: names.personFaceDescription,
      EPISODE_BY_FRAME: names.episodeFrameDescription,
      MOVIE_BY_INFO: names.movieInfoDescription,
      SERIES_BY_INFO: names.seriesInfoDescription,
      ACTOR_BY_MOVIE_FILMOGRAPHY: names.actorMovieDescription,
      ACTOR_BY_SERIES_FILMOGRAPHY: names.actorSeriesDescription,
    };
    return map[type];
  });

  private readonly api = inject(GamesApiService);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);
  private searchRequest?: Subscription;

  constructor() {
    if (!this.gameType) { void this.router.navigateByUrl('/games'); return; }
    this.load();
    interval(60_000).pipe(takeUntilDestroyed(this.destroyRef)).subscribe(() => this.clockTick.update((tick) => tick + 1));
  }

  protected load(): void {
    if (!this.gameType) return;
    this.status.set('loading'); this.error.set('');
    this.api.getPlay(this.gameType, this.majorRoles()).subscribe({
      next: (state) => { this.state.set(state); this.selectedFrameSlot.set(null); this.status.set('ready'); },
      error: (error: unknown) => { this.status.set('error'); this.error.set(error instanceof HttpErrorResponse && error.status === 0 ? this.copy.connectionError : this.copy.loadError); },
    });
  }

  protected updateSearch(event: Event): void { this.searchText.set((event.target as HTMLInputElement).value); }
  protected search(event?: Event): void {
    event?.preventDefault();
    const query = this.searchText().trim();
    if (!query || !this.gameType || this.searchBusy()) return;
    this.searchRequest?.unsubscribe(); this.searchBusy.set(true); this.searchOpen.set(true);
    const request = this.gameType === 'EPISODE_BY_FRAME' ? this.api.searchEpisodeSeries(query) : this.api.search(this.gameType, query);
    this.searchRequest = request.subscribe({
      next: (page) => { this.searchResults.set(page.content); this.searchBusy.set(false); },
      error: (error: unknown) => { this.searchResults.set([]); this.searchBusy.set(false); this.actionError.set(error instanceof HttpErrorResponse && error.status === 429 ? this.copy.searchLimitError : this.copy.searchError); },
    });
  }
  protected searchOrGuess(): void {
    if (this.selected() && this.gameType !== 'EPISODE_BY_FRAME') this.submitGuess();
    else this.search();
  }
  protected searchOrGuessDisabled(): boolean {
    if (this.searchBusy()) return true;
    if (this.selected() && this.gameType !== 'EPISODE_BY_FRAME') return !this.canSubmit();
    return !this.searchText().trim();
  }
  protected chooseResult(result: DailyGameSearchResult): void {
    if (this.gameType === 'EPISODE_BY_FRAME') {
      const seriesId = result.seriesTmdbId || result.tmdbId;
      if (!seriesId) return;
      this.selected.set({ ...result, seriesTmdbId: seriesId }); this.searchOpen.set(false); this.searchResults.set([]); this.selectedSeason.set(null); this.selectedEpisode.set(null); this.episodes.set([]);
      this.api.getEpisodeSeasons(seriesId).subscribe({ next: (seasons) => this.seasons.set(seasons), error: () => this.actionError.set(this.copy.searchError) });
      return;
    }
    this.selected.set(result); this.searchText.set(result.title); this.searchOpen.set(false); this.searchResults.set([]); this.actionError.set('');
  }
  protected changeSeason(event: Event): void {
    const seasonNumber = Number((event.target as HTMLSelectElement).value);
    const seriesId = this.selected()?.seriesTmdbId;
    this.selectedSeason.set(Number.isFinite(seasonNumber) ? seasonNumber : null); this.selectedEpisode.set(null); this.episodes.set([]);
    if (seriesId && Number.isFinite(seasonNumber)) this.api.getEpisodeOptions(seriesId, seasonNumber).subscribe({ next: (episodes) => this.episodes.set(episodes), error: () => this.actionError.set(this.copy.searchError) });
  }
  protected changeEpisode(event: Event): void { const value = Number((event.target as HTMLSelectElement).value); this.selectedEpisode.set(Number.isFinite(value) ? value : null); }
  protected clearSelection(): void { this.selected.set(null); this.searchText.set(''); this.selectedSeason.set(null); this.selectedEpisode.set(null); this.seasons.set([]); this.episodes.set([]); }
  protected canSubmit(): boolean {
    if (this.searchBusy() || this.submitting() || !this.state()?.canAttempt || !this.selected()) return false;
    return this.gameType !== 'EPISODE_BY_FRAME' || (this.selectedSeason() !== null && this.selectedEpisode() !== null);
  }
  protected submitGuess(): void {
    if (!this.gameType || !this.canSubmit()) return;
    const candidate = this.selected()!;
    const request: { tmdbId?: string; personTmdbId?: string; seriesTmdbId?: string; seasonNumber?: number; episodeNumber?: number; shareOnCompletion?: boolean } = { shareOnCompletion: this.shareOnCompletion() };
    if (this.gameType === 'EPISODE_BY_FRAME') {
      request.seriesTmdbId = candidate.seriesTmdbId || candidate.tmdbId || undefined;
      request.seasonNumber = this.selectedSeason() ?? undefined;
      request.episodeNumber = this.selectedEpisode() ?? undefined;
    } else if (candidate.personTmdbId || candidate.targetKind === 'PERSON') request.personTmdbId = candidate.personTmdbId || candidate.tmdbId || undefined;
    else request.tmdbId = candidate.tmdbId || undefined;
    this.submitting.set(true); this.actionError.set('');
    this.api.submitPlayAttempt(this.gameType, request, this.majorRoles()).subscribe({
      next: (result) => { this.state.set(result.state); this.selectedFrameSlot.set(null); this.submitting.set(false); this.clearSelection(); },
      error: (error: unknown) => { this.submitting.set(false); this.toasts.error(error instanceof HttpErrorResponse && error.status === 429 ? this.copy.attemptLimitError : this.copy.guessError); },
    });
  }
  protected confirmGiveUp(): void { this.giveUpOpen.set(true); }
  protected cancelGiveUp(): void { this.giveUpOpen.set(false); }
  protected giveUp(): void {
    if (!this.gameType || !this.state()?.canGiveUp) return;
    this.submitting.set(true); this.actionError.set('');
    this.api.giveUp(this.gameType, this.majorRoles()).subscribe({
      next: (result) => { this.state.set(result.state); this.submitting.set(false); this.giveUpOpen.set(false); },
      error: () => { this.submitting.set(false); this.toasts.error(this.copy.guessError); },
    });
  }
  protected toggleMajorRoles(event: Event): void { this.majorRoles.set((event.target as HTMLInputElement).checked); this.load(); }
  protected toggleShare(event: Event): void { this.shareOnCompletion.set((event.target as HTMLInputElement).checked); }
  protected closeHowToPlay(): void { this.howToPlayOpen.set(false); }
  protected visibleImageUrl(media: DailyGameMediaRef): string { return tmdbImageUrl(media.url, 'w780') ?? ''; }
  protected imageUrl(path: string | null | undefined): string | null { return tmdbImageUrl(path, 'w500'); }
  protected mediaBlur(media: DailyGameMediaRef): boolean { return media.variant.toUpperCase().includes('BLUR'); }
  protected selectFrame(media: DailyGameMediaRef): void { if (media.revealed) this.selectedFrameSlot.set(media.slot); }
  protected frameProgressLabel(media: DailyGameMediaRef): string {
    const index = (this.state()?.media ?? []).findIndex((entry) => entry.slot === media.slot);
    const max = Math.max(6, this.state()?.media.length ?? 0);
    return this.gamesCopy.frameProgress.replace('{revealed}', String(index + 1)).replace('{max}', String(max));
  }
  protected revealProgressLabel(): string {
    const state = this.state();
    return this.gamesCopy.revealProgress
      .replace('{revealed}', String(Math.min((state?.attemptsUsed ?? 0) + 1, state?.maxAttempts ?? 1)))
      .replace('{max}', String(state?.maxAttempts ?? 0));
  }
  protected frameSlotLabel(index: number): string { return this.gamesCopy.frameProgress.replace('{revealed}', String(index + 1)).replace('{max}', String(Math.max(6, this.state()?.media.length ?? 0))); }
  protected candidateMeta(candidate: DailyGamePlayView['attempts'][number]['candidate']): string {
    if (candidate.targetKind === 'EPISODE') return [candidate.year, candidate.seasonNumber !== null ? `T${candidate.seasonNumber}` : null, candidate.episodeNumber !== null ? `E${candidate.episodeNumber}` : null].filter((value) => value !== null).join(' · ');
    return [candidate.year, candidate.genres?.join(', ')].filter(Boolean).join(' · ');
  }
  protected answerImage(): DailyGameMediaRef | null { return this.state()?.answer?.image ?? null; }
  protected statusLabel(): string { return this.state()?.status === 'COMPLETED' ? this.copy.correct : this.state()?.status === 'FAILED' ? this.copy.revealResult : ''; }
  protected feedbackCells(info: DailyGameInfoFeedback | null): FeedbackCell[] {
    if (!info) return [];
    const fields: Array<[string, Exclude<keyof DailyGameInfoFeedback, 'candidateEpisodeCount'>]> = [
      [this.copy.platforms, 'platforms'], [this.copy.genres, 'genres'], [this.copy.year, 'year'], [this.copy.certification, 'certification'],
      [this.copy.directorCreators, 'directorOrCreators'], [this.copy.cast, 'cast'], [this.copy.productionCompanies, 'productionCompanies'], [this.copy.revenueSeasons, 'revenueOrSeasons'],
    ];
    return fields.flatMap(([label, key]) => { const cell = info[key]; return cell ? [{ label, status: cell.status.toLowerCase(), value: this.displayValue(cell.displayValue) }] : []; });
  }
  protected attemptLabel(attempt: number): string { return this.copy.attemptNumber.replace('{number}', String(attempt)); }
  protected candidateLabel(candidate: DailyGameSearchResult): string { return [candidate.title, candidate.date?.slice(0, 4)].filter(Boolean).join(' · '); }
  protected gameHref(): string[] { return ['/games']; }
  protected canChooseEpisode(): boolean { return Boolean(this.selected()?.seriesTmdbId); }
  protected showHowToPlay(): void { this.howToPlayOpen.set(true); }
  protected number(value: number | null | undefined): string { return String(value ?? 0); }
  protected currentAttemptNumber(): string { const state = this.state(); return String(Math.min((state?.attemptsUsed ?? 0) + 1, state?.maxAttempts ?? 0)); }
  protected formatChallengeDate(value: string): string { return new Intl.DateTimeFormat('pt-BR', { day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(`${value}T12:00:00`)); }

  private displayValue(value: unknown): string {
    if (value === null || value === undefined || value === '') return '—';
    if (Array.isArray(value)) return value.map((item) => String(item)).join(', ');
    if (typeof value === 'object') return Object.values(value as Record<string, unknown>).filter(Boolean).map((item) => String(item)).join(' · ');
    return String(value);
  }
  private readGameType(): DailyGameType | null {
    const value = this.route.snapshot.paramMap.get('gameType');
    return value && supportedTypes.includes(value as DailyGameType) ? value as DailyGameType : null;
  }
}
