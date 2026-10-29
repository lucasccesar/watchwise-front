import { HttpErrorResponse } from '@angular/common/http';
import {
  Component,
  ElementRef,
  HostListener,
  OnDestroy,
  OnInit,
  ViewChild,
  computed,
  signal,
} from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { Subscription } from 'rxjs';
import { AuthSessionService } from '../../../../core/session/session.service';
import { messageCatalog } from '../../../../shared/i18n/messages';
import {
  TrendingApiService,
  TrendingCard,
  TrendingSectionPage,
  TrendingType,
  TrendingWindow,
} from '../../data-access/trending-api.service';

interface SectionState {
  cards: TrendingCard[];
  page: TrendingSectionPage | null;
  visibleCount: number;
  loading: boolean;
  error: boolean;
}

type Sections = Record<TrendingType, SectionState>;

const INITIAL_SECTION_SIZE = 12;
const EXPANDED_SECTION_SIZE = 21;

function emptySection(loading = false): SectionState {
  return {
    cards: [],
    page: null,
    visibleCount: INITIAL_SECTION_SIZE,
    loading,
    error: false,
  };
}

@Component({
  selector: 'app-trending',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './trending.component.html',
})
export class TrendingComponent implements OnInit, OnDestroy {
  protected readonly copy = messageCatalog['pt-BR'].trendingPage;
  protected readonly footerCopy = messageCatalog['pt-BR'].home;
  protected readonly copyrightYear = new Date().getFullYear();
  protected readonly period = signal<TrendingWindow>('week');
  protected readonly view = signal<'grid' | 'list'>('grid');
  protected readonly filterOpen = signal(false);
  protected readonly status = signal<'loading' | 'ready' | 'error'>('loading');
  protected readonly errorMessage = signal('');
  protected readonly sections = signal<Sections>({ MOVIE: emptySection(), SERIES: emptySection() });
  protected readonly sectionTypes: TrendingType[] = ['MOVIE', 'SERIES'];
  protected readonly periodRange = computed(() => this.formatPeriod(this.period()));
  protected readonly heroBackdropLoading = signal(true);
  private readonly heroBackdropFailed = signal(false);
  protected readonly heroBackdropUrl = computed(() => {
    if (this.heroBackdropFailed()) return null;
    const path = this.sections().MOVIE.cards[0]?.backdropPath;
    return path ? this.tmdbImageUrl(path) : null;
  });

  private loadRequest?: Subscription;
  private readonly sectionRequests: Partial<Record<TrendingType, Subscription>> = {};
  private filterOpener: HTMLElement | null = null;

  private tmdbImageUrl(path: string): string {
    if (/^https?:\/\//i.test(path)) return path;
    return `https://image.tmdb.org/t/p/w1920${path.startsWith('/') ? path : `/${path}`}`;
  }

  @ViewChild('filterCloseButton')
  protected set filterCloseButton(button: ElementRef<HTMLButtonElement> | undefined) {
    if (button && this.filterOpen()) button.nativeElement.focus();
  }

  @ViewChild('filterDialog')
  private filterDialog?: ElementRef<HTMLElement>;

  constructor(
    private readonly api: TrendingApiService,
    private readonly session: AuthSessionService,
    private readonly router: Router,
  ) {}

  ngOnInit(): void {
    this.load();
  }

  ngOnDestroy(): void {
    this.cancelRequests();
  }

  protected load(): void {
    this.cancelRequests();
    this.sections.set({ MOVIE: emptySection(true), SERIES: emptySection(true) });
    this.status.set('loading');
    this.errorMessage.set('');
    this.heroBackdropFailed.set(false);
    this.heroBackdropLoading.set(true);
    this.loadRequest = this.api.getTrending(this.period()).subscribe({
      next: (response) => {
        this.heroBackdropLoading.set(Boolean(response.movies[0]?.backdropPath));
        this.sections.set({
          MOVIE: {
            cards: response.movies,
            page: response.moviesPage,
            visibleCount: INITIAL_SECTION_SIZE,
            loading: false,
            error: false,
          },
          SERIES: {
            cards: response.series,
            page: response.seriesPage,
            visibleCount: INITIAL_SECTION_SIZE,
            loading: false,
            error: false,
          },
        });
        this.status.set('ready');
      },
      error: (error: unknown) => {
        if (this.handleSessionError(error)) return;
        this.heroBackdropLoading.set(false);
        this.errorMessage.set(this.errorFor(error));
        this.status.set('error');
      },
    });
  }

  protected changePeriod(period: TrendingWindow): void {
    if (period === this.period()) return;
    this.period.set(period);
    this.closeFilters();
    this.load();
  }

  protected openFilters(event: Event): void {
    this.filterOpener = event.currentTarget as HTMLElement;
    this.filterOpen.set(true);
  }

  protected closeFilters(): void {
    this.filterOpen.set(false);
    this.filterOpener?.focus();
  }

  @HostListener('document:keydown', ['$event'])
  protected handleFilterKeydown(event: KeyboardEvent): void {
    if (!this.filterOpen()) return;
    if (event.key === 'Escape') {
      this.closeFilters();
      return;
    }
    if (event.key !== 'Tab') return;
    const focusable = Array.from(
      this.filterDialog?.nativeElement.querySelectorAll<HTMLButtonElement | HTMLInputElement>(
        'button:not([disabled]), input:not([disabled])',
      ) ?? [],
    );
    if (focusable.length === 0) return;
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  }

  protected visibleCards(type: TrendingType): TrendingCard[] {
    const state = this.sections()[type];
    return state.cards.slice(0, state.visibleCount);
  }

  protected loadingPlaceholders(type: TrendingType): number[] {
    const state = this.section(type);
    if (!state.loading) return [];
    const targetCount = this.status() === 'loading' ? INITIAL_SECTION_SIZE : EXPANDED_SECTION_SIZE;
    const count = Math.max(0, targetCount - state.cards.length);
    return Array.from({ length: count }, (_, index) => index);
  }

  protected onHeroBackdropLoaded(): void {
    this.heroBackdropLoading.set(false);
  }

  protected onHeroBackdropError(): void {
    this.heroBackdropFailed.set(true);
    this.heroBackdropLoading.set(false);
  }

  protected section(type: TrendingType): SectionState {
    return this.sections()[type];
  }

  protected canShowMore(type: TrendingType): boolean {
    const state = this.section(type);
    return (
      state.visibleCount > INITIAL_SECTION_SIZE ||
      state.cards.length > state.visibleCount ||
      (state.page?.size === INITIAL_SECTION_SIZE &&
        (state.page.totalResults > state.cards.length || state.page.hasNext))
    );
  }

  protected moreButtonLabel(type: TrendingType): string {
    const state = this.section(type);
    if (state.loading) return this.copy.loadingMore;
    return state.visibleCount > INITIAL_SECTION_SIZE ? this.copy.showFewer : this.copy.showMore;
  }

  protected toggleMore(type: TrendingType): void {
    const state = this.section(type);
    if (state.loading) return;
    if (state.visibleCount > INITIAL_SECTION_SIZE) {
      this.updateSection(type, { visibleCount: INITIAL_SECTION_SIZE });
      return;
    }
    if (state.cards.length > state.visibleCount) {
      this.updateSection(type, { visibleCount: state.cards.length });
      return;
    }
    const firstExpandedPage = state.page?.size === INITIAL_SECTION_SIZE;
    const nextPage = firstExpandedPage ? 1 : (state.page?.page ?? 0) + 1;
    if (nextPage > 500 || (!firstExpandedPage && !state.page?.hasNext)) return;
    this.updateSection(type, { loading: true, error: false });
    this.sectionRequests[type]?.unsubscribe();
    this.sectionRequests[type] = this.api.getSection(type, this.period(), nextPage).subscribe({
      next: (response) => {
        const newCards = type === 'MOVIE' ? response.movies : response.series;
        const page = type === 'MOVIE' ? response.moviesPage : response.seriesPage;
        const cards = firstExpandedPage
          ? newCards
          : [
              ...this.section(type).cards,
              ...newCards.filter(
                (card) => !this.section(type).cards.some((loaded) => loaded.tmdbId === card.tmdbId),
              ),
            ];
        this.updateSection(type, { cards, page, visibleCount: cards.length, loading: false });
      },
      error: (error: unknown) => {
        if (this.handleSessionError(error)) return;
        this.updateSection(type, { loading: false, error: true });
      },
    });
  }

  protected title(type: TrendingType): string {
    return type === 'MOVIE' ? this.copy.movies : this.copy.series;
  }

  protected cardTitle(card: TrendingCard): string {
    return card.title || this.copy.untitled;
  }

  protected cardRating(card: TrendingCard): { label: string; value: string } | null {
    const hasCommunityScore = card.communityAverageScore != null;
    const score = card.communityAverageScore ?? card.tmdbVoteAverage;
    if (score === null) return null;
    return {
      label: hasCommunityScore ? this.footerCopy.communityAverage : this.copy.tmdbRating,
      value: new Intl.NumberFormat('pt-BR', {
        minimumFractionDigits: 1,
        maximumFractionDigits: 1,
      }).format(score),
    };
  }

  protected cardMeta(card: TrendingCard): string {
    return [card.year, ...(card.genres ?? []).slice(0, 2)].filter(Boolean).join(' · ');
  }

  protected cardLength(card: TrendingCard): string {
    if (card.type === 'MOVIE' && card.runtimeMinutes) {
      const hours = Math.floor(card.runtimeMinutes / 60);
      const minutes = card.runtimeMinutes % 60;
      return hours ? `${hours}h${minutes ? ` ${minutes}min` : ''}` : `${minutes}min`;
    }
    if (card.type === 'SERIES' && card.numberOfSeasons) {
      return `${card.numberOfSeasons} ${card.numberOfSeasons === 1 ? this.copy.season : this.copy.seasons}`;
    }
    return '';
  }

  protected watchedDate(card: TrendingCard): string | null {
    const value = card.viewerState?.lastWatchedDate;
    if (!value) return null;
    const [year, month, day] = value.split('-').map(Number);
    return new Intl.DateTimeFormat('pt-BR', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    }).format(new Date(year, month - 1, day));
  }

  protected stateLabel(card: TrendingCard): string | null {
    const viewer = card.viewerState;
    if (viewer?.watchStatus === 'WATCHED') return this.copy.watched;
    if (viewer?.watchStatus === 'PARTIALLY_WATCHED') return this.copy.partlyWatched;
    if (viewer?.inWatchlist) return this.copy.inWatchlist;
    if (viewer?.dropped) return this.copy.dropped;
    return null;
  }

  private updateSection(type: TrendingType, change: Partial<SectionState>): void {
    this.sections.update((sections) => ({
      ...sections,
      [type]: { ...sections[type], ...change },
    }));
  }

  private cancelRequests(): void {
    this.loadRequest?.unsubscribe();
    this.sectionRequests.MOVIE?.unsubscribe();
    this.sectionRequests.SERIES?.unsubscribe();
  }

  private handleSessionError(error: unknown): boolean {
    if (error instanceof HttpErrorResponse && error.status === 401) {
      this.session.clear();
      void this.router.navigateByUrl('/login');
      return true;
    }
    return false;
  }

  private errorFor(error: unknown): string {
    if (error instanceof HttpErrorResponse && error.status === 0) return this.copy.connectionError;
    return this.copy.loadError;
  }

  private formatPeriod(period: TrendingWindow): string {
    const now = new Date();
    const format = (date: Date) =>
      new Intl.DateTimeFormat('pt-BR', { day: 'numeric', month: 'short', year: 'numeric' }).format(
        date,
      );
    if (period === 'day') return format(now);
    const monday = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate() - ((now.getDay() + 6) % 7),
    );
    const sunday = new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() + 6);
    return `${format(monday)} – ${format(sunday)}`;
  }
}
