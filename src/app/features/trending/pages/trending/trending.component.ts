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
import { Observable, Subscription, of, switchMap, throwError } from 'rxjs';
import { AuthSessionService } from '../../../../core/session/session.service';
import { messageCatalog } from '../../../../shared/i18n/messages';
import {
  ContentImageAction,
  ContentImageActionSelection,
  ContentImageActionsComponent,
} from '../../../../shared/components/content-image-actions/content-image-actions.component';
import { PageSkeletonComponent } from '../../../../shared/components/page-skeleton/page-skeleton.component';
import { DialogBackdropComponent } from '../../../../shared/components/dialog-backdrop/dialog-backdrop.component';
import { ModalFocusDirective } from '../../../../shared/directives/modal-focus.directive';
import { ContentApiService, ContentPageResult, UserListDetailItem, UserListSummary } from '../../../content/data-access/content-api.service';
import {
  TrendingApiService,
  TrendingCard,
  TrendingSectionPage,
  TrendingType,
  TrendingViewerState,
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
interface TrendingActionFeedback { message: string; error: boolean; }
interface TrendingCalendarDay {
  date: string;
  day: number;
  inMonth: boolean;
  selected: boolean;
  disabled: boolean;
  ariaLabel: string;
}

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
  imports: [RouterLink, ContentImageActionsComponent, DialogBackdropComponent, ModalFocusDirective, PageSkeletonComponent],
  templateUrl: './trending.component.html',
  styleUrl: './trending.component.css',
})
export class TrendingComponent implements OnInit, OnDestroy {
  protected readonly copy = messageCatalog['pt-BR'].trendingPage;
  protected readonly footerCopy = messageCatalog['pt-BR'].home;
  protected readonly period = signal<TrendingWindow>('week');
  protected readonly view = signal<'grid' | 'list'>(
    typeof window !== 'undefined' && window.matchMedia('(max-width: 800px)').matches ? 'list' : 'grid',
  );
  protected readonly filterOpen = signal(false);
  protected readonly filterSubpage = signal<'view' | 'period' | null>(null);
  protected readonly status = signal<'loading' | 'ready' | 'error'>('loading');
  protected readonly errorMessage = signal('');
  protected readonly sections = signal<Sections>({ MOVIE: emptySection(), SERIES: emptySection() });
  protected readonly actionFeedback = signal<TrendingActionFeedback | null>(null);
  protected readonly busyCardActionIds = signal<ReadonlySet<string>>(new Set());
  protected readonly listDialogCard = signal<TrendingCard | null>(null);
  protected readonly listPickerPosition = signal<{ top: number; right: number } | null>(null);
  protected readonly listDialogOpener = signal<HTMLElement | null>(null);
  protected readonly listContentId = signal('');
  protected readonly userLists = signal<UserListSummary[]>([]);
  protected readonly userListsPage = signal<ContentPageResult<UserListSummary> | null>(null);
  protected readonly userListsStatus = signal<'loading' | 'ready' | 'error'>('loading');
  protected readonly userListsLoadingMore = signal(false);
  protected readonly userListsError = signal('');
  protected readonly listActionError = signal('');
  protected readonly busyListId = signal<string | null>(null);
  protected readonly listCreateOpen = signal(false);
  protected readonly listDraftName = signal('');
  protected readonly watchDialogCard = signal<TrendingCard | null>(null);
  protected readonly watchDialogDate = signal(this.todayDate());
  protected readonly watchDialogScore = signal<number | null>(null);
  protected readonly watchDialogReview = signal('');
  protected readonly watchDialogRewatch = signal(false);
  protected readonly watchDialogWatchedInTheater = signal(false);
  protected readonly watchDialogCalendarOpen = signal(false);
  protected readonly watchDialogCalendarMonth = signal(this.firstOfMonth(new Date()));
  protected readonly watchDialogSaving = signal(false);
  protected readonly watchDialogError = signal('');
  protected readonly ratingOptions = Array.from({ length: 10 }, (_, index) => index + 1);
  protected readonly calendarWeekdays = this.footerCopy.calendarWeekdays.split(' ');
  protected readonly watchDialogDays = computed(() =>
    this.createWatchDialogDays(this.watchDialogCalendarMonth(), this.watchDialogDate()),
  );
  protected readonly watchDialogMonthLabel = computed(() =>
    new Intl.DateTimeFormat('pt-BR', { month: 'long', year: 'numeric' }).format(this.watchDialogCalendarMonth()),
  );
  protected readonly canAdvanceWatchDialogCalendar = computed(() => {
    const month = this.watchDialogCalendarMonth();
    const today = new Date();
    return month.getFullYear() * 12 + month.getMonth() < today.getFullYear() * 12 + today.getMonth();
  });
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
  private readonly cardActionRequests = new Subscription();
  private listRequests = new Subscription();
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
    private readonly contentApi: ContentApiService,
    private readonly session: AuthSessionService,
    private readonly router: Router,
  ) {}

  ngOnInit(): void {
    this.load();
  }

  ngOnDestroy(): void {
    this.cancelRequests();
    this.cardActionRequests.unsubscribe();
    this.listRequests.unsubscribe();
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

  protected selectFilterPeriod(period: TrendingWindow): void {
    if (period !== this.period()) {
      this.period.set(period);
      this.load();
    }
    this.filterSubpage.set(null);
  }

  protected selectFilterView(view: 'grid' | 'list'): void {
    this.view.set(view);
    this.filterSubpage.set(null);
  }

  protected openFilterSubpage(page: 'view' | 'period'): void {
    this.filterSubpage.set(page);
  }

  protected backToFilters(): void {
    this.filterSubpage.set(null);
  }

  protected openFilters(event: Event): void {
    this.filterOpener = event.currentTarget as HTMLElement;
    this.filterOpen.set(true);
  }

  protected closeFilters(): void {
    this.filterOpen.set(false);
    this.filterSubpage.set(null);
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

  protected posterActionsFor(card: TrendingCard): readonly ContentImageAction[] {
    const busy = this.isCardActionBusy(card);
    const inWatchlist = card.viewerState?.inWatchlist === true;
    const watched = card.viewerState?.watchStatus === 'WATCHED';
    return [
      {
        id: 'mark-watched',
        label: watched ? this.copy.watchAgain : this.copy.markWatched,
        icon: watched ? 'rewatch' : 'check',
        disabled: busy || this.isUpcoming(card),
      },
      {
        id: 'watchlist',
        label: inWatchlist ? this.copy.removeFromWatchlist : this.copy.wantToWatch,
        icon: inWatchlist ? 'bookmark-filled' : 'bookmark',
        disabled: busy || (!inWatchlist && card.viewerState?.watchStatus === 'WATCHED'),
      },
      { id: 'add-to-list', label: this.copy.addToList, icon: 'list', disabled: busy },
    ];
  }

  protected handlePosterAction(card: TrendingCard, selection: ContentImageActionSelection): void {
    switch (selection.action.id) {
      case 'mark-watched':
        this.openWatchedDialog(card, selection.event);
        break;
      case 'watchlist':
        this.toggleCardWatchlist(card);
        break;
      case 'add-to-list':
        this.openAddToList(card, selection.event);
        break;
    }
  }

  protected isCardActionBusy(card: TrendingCard): boolean {
    return this.busyCardActionIds().has(this.cardActionKey(card));
  }

  protected canAddToList(list: UserListSummary): boolean {
    return list.itemScope === null || list.itemScope === 'MOVIE_OR_SERIES';
  }

  protected addCardToList(list: UserListSummary): void {
    const card = this.listDialogCard();
    const removing = list.containsContent === true;
    if (!card || (!removing && !this.canAddToList(list)) || this.busyListId()) return;
    this.busyListId.set(list.id);
    this.listActionError.set('');
    const request = removing
      ? this.findCardInList(list.id, card).pipe(
          switchMap((itemId) => itemId
            ? this.contentApi.removeListItem(list.id, itemId)
            : throwError(() => new Error('O conteúdo indicado não foi encontrado na lista.'))),
        )
      : card.type === 'MOVIE'
        ? this.contentApi.addMovieToList(list.id, card.tmdbId)
        : this.contentApi.addSeriesToList(list.id, card.tmdbId);
    this.listRequests.add(request.subscribe({
      next: () => {
        this.busyListId.set(null);
        this.userLists.update((lists) => lists.map((item) => item.id === list.id
          ? { ...item, containsContent: !removing, itemsCount: Math.max(0, (item.itemsCount ?? 0) + (removing ? -1 : 1)) }
          : item));
        this.listActionError.set('');
        this.actionFeedback.set({ message: removing ? this.copy.listRemoved : this.copy.listAdded, error: false });
      },
      error: (error: unknown) => {
        this.busyListId.set(null);
        if (this.handleSessionError(error)) return;
        this.listActionError.set(this.copy.actionError);
      },
    }));
  }

  protected loadMoreUserLists(): void {
    const page = this.userListsPage();
    if (!page?.hasNext || this.userListsLoadingMore()) return;
    this.loadUserLists(page.page + 1);
  }

  protected retryUserLists(): void {
    const card = this.listDialogCard();
    if (!card) return;
    if (this.listContentId()) {
      this.loadUserLists(1);
    } else {
      this.openAddToList(card);
    }
  }

  protected closeListDialog(): void {
    if (this.busyListId()) return;
    this.listDialogCard.set(null);
    this.listPickerPosition.set(null);
    this.listCreateOpen.set(false);
    this.listDraftName.set('');
    this.listDialogOpener.set(null);
    this.listRequests.unsubscribe();
    this.listRequests = new Subscription();
  }

  protected openAddToList(card: TrendingCard, event?: MouseEvent): void {
    const userId = this.session.user()?.id;
    if (!userId) {
      void this.router.navigateByUrl('/login');
      return;
    }

    const action = event?.currentTarget as HTMLElement | null;
    const poster = action?.closest<HTMLElement>('.tr-poster');
    if (action && poster) {
      const actionBounds = action.getBoundingClientRect();
      const posterBounds = poster.getBoundingClientRect();
      this.listPickerPosition.set({
        top: actionBounds.bottom - posterBounds.top + 8,
        right: Math.max(0, posterBounds.right - actionBounds.right),
      });
    } else {
      this.listPickerPosition.set(null);
    }
    const menuTrigger = action?.closest('.content-menu-anchor')
      ?.querySelector<HTMLElement>('.content-menu-trigger') ?? null;
    if (event) this.listDialogOpener.set(menuTrigger);
    this.listDialogCard.set(card);
    this.listContentId.set('');
    this.userLists.set([]);
    this.userListsPage.set(null);
    this.userListsStatus.set('loading');
    this.userListsLoadingMore.set(false);
    this.userListsError.set('');
    this.listActionError.set('');
    this.listCreateOpen.set(false);
    this.listDraftName.set('');
    this.actionFeedback.set(null);
    this.listRequests.unsubscribe();
    this.listRequests = new Subscription();

    const referenceRequest = card.type === 'MOVIE'
      ? this.contentApi.createMovieReference(card.tmdbId)
      : this.contentApi.createSeriesReference(card.tmdbId);
    this.listRequests.add(referenceRequest.subscribe({
      next: (reference) => {
        this.listContentId.set(reference.id);
        this.loadUserLists(1);
      },
      error: (error: unknown) => {
        if (this.handleSessionError(error)) return;
        this.userListsStatus.set('error');
        this.userListsError.set(this.copy.listLoadError);
      },
    }));
  }

  protected openWatchedDialog(card: TrendingCard, event?: MouseEvent): void {
    if (this.isCardActionBusy(card) || this.isUpcoming(card)) return;
    if (!this.session.user()?.id) {
      void this.router.navigateByUrl('/login');
      return;
    }
    const action = event?.currentTarget as HTMLElement | null;
    this.listDialogOpener.set(action?.closest('.content-menu-anchor')
      ?.querySelector<HTMLElement>('.content-menu-trigger') ?? null);
    this.watchDialogCard.set(card);
    this.watchDialogDate.set(this.todayDate());
    this.watchDialogScore.set(null);
    this.watchDialogReview.set('');
    this.watchDialogRewatch.set(card.viewerState?.watchStatus === 'WATCHED');
    this.watchDialogWatchedInTheater.set(false);
    this.watchDialogCalendarOpen.set(false);
    this.watchDialogCalendarMonth.set(this.firstOfMonth(new Date()));
    this.watchDialogError.set('');
    this.watchDialogSaving.set(false);
  }

  protected closeWatchedDialog(): void {
    if (this.watchDialogSaving()) return;
    this.watchDialogCard.set(null);
    this.watchDialogCalendarOpen.set(false);
    this.watchDialogError.set('');
    this.listDialogOpener()?.focus();
  }

  protected toggleWatchDialogCalendar(): void {
    this.watchDialogCalendarOpen.update((open) => !open);
  }

  protected changeWatchDialogMonth(offset: number): void {
    const current = this.watchDialogCalendarMonth();
    const candidate = new Date(current.getFullYear(), current.getMonth() + offset, 1);
    const today = new Date();
    if (candidate.getFullYear() * 12 + candidate.getMonth() > today.getFullYear() * 12 + today.getMonth()) return;
    this.watchDialogCalendarMonth.set(candidate);
  }

  protected selectWatchDialogDate(date: string): void {
    this.watchDialogDate.set(date);
    this.watchDialogCalendarOpen.set(false);
  }

  protected watchDialogDateLabel(): string {
    const [year, month, day] = this.watchDialogDate().split('-').map(Number);
    return new Intl.DateTimeFormat('pt-BR', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      timeZone: 'UTC',
    }).format(new Date(Date.UTC(year, month - 1, day)));
  }

  protected updateWatchedReview(event: Event): void {
    this.watchDialogReview.set((event.currentTarget as HTMLTextAreaElement).value);
  }

  protected setWatchedRating(score: number): void {
    this.watchDialogScore.set(this.watchDialogScore() === score ? null : score);
  }

  protected setWatchedRewatch(event: Event): void {
    this.watchDialogRewatch.set((event.currentTarget as HTMLInputElement).checked);
  }

  protected setWatchedInTheater(event: Event): void {
    this.watchDialogWatchedInTheater.set((event.currentTarget as HTMLInputElement).checked);
  }

  protected saveWatchedCard(): void {
    const card = this.watchDialogCard();
    if (!card || this.watchDialogSaving()) return;
    const watchedDate = this.watchDialogDate();
    const request = card.type === 'MOVIE'
      ? this.contentApi.createDiaryEntry({
          content: { type: 'MOVIE', tmdbId: card.tmdbId },
          watchedDate,
          watchedInTheater: this.watchDialogWatchedInTheater(),
          isRewatch: this.watchDialogRewatch(),
          score: this.watchDialogScore(),
          comment: this.watchDialogReview().trim() || null,
        })
      : this.contentApi.createBulkSeriesDiaryEntry({
          content: { type: 'SERIES', tmdbId: card.tmdbId },
          watchedDate,
        }, crypto.randomUUID());
    this.watchDialogSaving.set(true);
    this.watchDialogError.set('');
    this.cardActionRequests.add(request.subscribe({
      next: () => {
        this.watchDialogSaving.set(false);
        this.updateCardViewerState(card, { watchStatus: 'WATCHED', lastWatchedDate: watchedDate });
        this.actionFeedback.set({
          message: this.watchDialogRewatch() ? this.copy.watchAgainSuccess : this.copy.markWatchedSuccess,
          error: false,
        });
        this.closeWatchedDialog();
      },
      error: (error: unknown) => {
        this.watchDialogSaving.set(false);
        if (this.handleSessionError(error)) return;
        this.watchDialogError.set(this.copy.actionError);
      },
    }));
  }

  protected toggleCardWatchlist(card: TrendingCard): void {
    if (this.isCardActionBusy(card)) return;
    const removing = card.viewerState?.inWatchlist === true;
    if (!removing && card.viewerState?.watchStatus === 'WATCHED') return;
    if (!removing) {
      const request = card.type === 'MOVIE'
        ? this.contentApi.addToWatchlist(card.tmdbId)
        : this.contentApi.addSeriesToWatchlist(card.tmdbId);
      this.runCardAction(card, request, this.copy.watchlistSuccess, () => {
        this.updateCardViewerState(card, { inWatchlist: true });
      });
      return;
    }

    const entryIdRequest = card.type === 'MOVIE'
      ? this.contentApi.createMovieReference(card.tmdbId).pipe(
          switchMap((reference) => this.contentApi.getPage(reference.id)),
          switchMap((page) => of(page.viewerState.watchlistEntryId)),
        )
      : this.contentApi.createSeriesReference(card.tmdbId).pipe(
          switchMap((reference) => this.contentApi.getSeriesPage(reference.id)),
          switchMap((page) => of(page.viewerState.watchlistEntryId)),
        );
    const request = entryIdRequest.pipe(
      switchMap((entryId) => entryId
        ? card.type === 'MOVIE'
          ? this.contentApi.removeFromWatchlist(entryId)
          : this.contentApi.removeSeriesFromWatchlist(entryId)
        : throwError(() => new Error('A API não retornou o registro da watchlist.'))),
    );
    this.runCardAction(card, request, this.copy.watchlistRemoved, () => {
      this.updateCardViewerState(card, { inWatchlist: false });
    });
  }

  protected updateListDraft(event: Event): void {
    this.listDraftName.set((event.currentTarget as HTMLInputElement).value);
  }

  protected createListWithCard(): void {
    const card = this.listDialogCard();
    const name = this.listDraftName().trim();
    if (!card || !name || this.busyListId()) return;
    this.busyListId.set('new-list');
    this.listActionError.set('');
    const request = card.type === 'MOVIE'
      ? this.contentApi.createMovieList(name, card.tmdbId)
      : this.contentApi.createSeriesList(name, card.tmdbId);
    this.listRequests.add(request.subscribe({
      next: () => {
        this.busyListId.set(null);
        this.listCreateOpen.set(false);
        this.listDraftName.set('');
        this.actionFeedback.set({ message: this.copy.listAdded, error: false });
        this.loadUserLists(1);
      },
      error: (error: unknown) => {
        this.busyListId.set(null);
        if (this.handleSessionError(error)) return;
        this.listActionError.set(this.copy.actionError);
      },
    }));
  }

  protected openListCreate(): void {
    this.listCreateOpen.set(true);
    this.listDraftName.set('');
  }

  protected canToggleList(list: UserListSummary): boolean {
    return list.containsContent === true || this.canAddToList(list);
  }

  @HostListener('document:click', ['$event'])
  protected dismissListPicker(event: MouseEvent): void {
    if (!this.listDialogCard()) return;
    const target = event.target;
    if (target instanceof Element && target.closest('.tr-list-picker, .content-menu-anchor')) return;
    this.closeListDialog();
  }

  @HostListener('document:keydown.escape', ['$event'])
  protected closeListPickerOnEscape(event: Event): void {
    if (!this.listDialogCard()) return;
    event.stopPropagation();
    const opener = this.listDialogOpener();
    this.closeListDialog();
    opener?.focus();
  }

  private loadUserLists(pageNumber: number): void {
    const userId = this.session.user()?.id;
    const contentId = this.listContentId();
    if (!userId || !contentId) {
      this.userListsStatus.set('error');
      this.userListsError.set(this.copy.listLoadError);
      return;
    }

    if (pageNumber === 1) {
      this.userListsStatus.set('loading');
      this.userListsError.set('');
      this.userLists.set([]);
    } else {
      this.userListsLoadingMore.set(true);
    }

    this.listRequests.add(this.contentApi.getUserLists(userId, contentId, pageNumber).subscribe({
      next: (response) => {
        this.userListsPage.set(response);
        this.userLists.update((lists) => pageNumber === 1 ? response.content : [...lists, ...response.content]);
        this.userListsStatus.set('ready');
        this.userListsLoadingMore.set(false);
      },
      error: (error: unknown) => {
        this.userListsLoadingMore.set(false);
        if (this.handleSessionError(error)) return;
        this.userListsStatus.set(pageNumber === 1 ? 'error' : 'ready');
        this.userListsError.set(this.copy.listLoadError);
      },
    }));
  }

  private findCardInList(listId: string, card: TrendingCard, pageNumber = 1): Observable<string | null> {
    return this.contentApi.getListItems(listId, pageNumber, card.type).pipe(
      switchMap((page) => {
        const match = page.items.find((item: UserListDetailItem) =>
          item.content?.type === card.type && item.content.tmdbId === card.tmdbId,
        );
        if (match) return of(match.id);
        return page.itemsHasNext
          ? this.findCardInList(listId, card, pageNumber + 1)
          : of(null);
      }),
    );
  }

  private runCardAction(
    card: TrendingCard,
    request: Observable<unknown>,
    successMessage: string,
    onSuccess: () => void,
  ): void {
    const key = this.cardActionKey(card);
    if (this.busyCardActionIds().has(key)) return;
    this.busyCardActionIds.update((ids) => new Set(ids).add(key));
    this.actionFeedback.set(null);
    this.cardActionRequests.add(request.subscribe({
      next: () => {
        this.busyCardActionIds.update((ids) => {
          const next = new Set(ids);
          next.delete(key);
          return next;
        });
        onSuccess();
        this.actionFeedback.set({ message: successMessage, error: false });
      },
      error: (error: unknown) => {
        this.busyCardActionIds.update((ids) => {
          const next = new Set(ids);
          next.delete(key);
          return next;
        });
        if (this.handleSessionError(error)) return;
        this.actionFeedback.set({ message: this.copy.actionError, error: true });
      },
    }));
  }

  private updateCardViewerState(card: TrendingCard, change: Partial<TrendingViewerState>): void {
    const cards = this.section(card.type).cards.map((item) => {
      if (item.tmdbId !== card.tmdbId) return item;
      const viewerState: TrendingViewerState = item.viewerState ?? {
        watchStatus: null,
        myRating: null,
        lastWatchedDate: null,
        playsCount: null,
        inWatchlist: false,
        dropped: false,
      };
      return { ...item, viewerState: { ...viewerState, ...change } };
    });
    this.updateSection(card.type, { cards });
  }

  private cardActionKey(card: TrendingCard): string {
    return `${card.type}:${card.tmdbId}`;
  }

  protected todayDate(): string {
    const date = new Date();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${date.getFullYear()}-${month}-${day}`;
  }

  private createWatchDialogDays(month: Date, selectedDate: string): TrendingCalendarDay[] {
    const firstDay = new Date(month.getFullYear(), month.getMonth(), 1);
    const gridStart = new Date(month.getFullYear(), month.getMonth(), 1 - firstDay.getDay());
    const today = this.todayDate();
    return Array.from({ length: 42 }, (_, index) => {
      const date = new Date(gridStart.getFullYear(), gridStart.getMonth(), gridStart.getDate() + index);
      const dateKey = this.dateKey(date);
      return {
        date: dateKey,
        day: date.getDate(),
        inMonth: date.getMonth() === month.getMonth(),
        selected: dateKey === selectedDate,
        disabled: dateKey > today,
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

  private dateKey(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  protected cardRating(card: TrendingCard): { label: string; value: string } | null {
    if (this.isUpcoming(card)) return null;
    const hasCommunityScore = card.communityAverageScore != null;
    const score = card.communityAverageScore ?? card.tmdbVoteAverage;
    if (score === null || score === undefined) return null;
    return {
      label: hasCommunityScore ? this.footerCopy.communityAverage : this.copy.tmdbRating,
      value: new Intl.NumberFormat('pt-BR', {
        minimumFractionDigits: 1,
        maximumFractionDigits: 1,
      }).format(score),
    };
  }

  protected cardMeta(card: TrendingCard): string {
    const upcoming = this.upcomingRelease(card);
    if (upcoming) return `${this.copy.releaseDatePrefix} ${upcoming.long}`;
    return [card.year, ...(card.genres ?? []).slice(0, 2)].filter(Boolean).join(' · ');
  }

  protected isUpcoming(card: TrendingCard): boolean {
    return this.upcomingRelease(card) !== null;
  }

  protected upcomingRelease(card: TrendingCard): { short: string; long: string } | null {
    const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(card.releaseDate ?? '');
    if (!match) return null;

    const year = Number(match[1]);
    const month = Number(match[2]);
    const day = Number(match[3]);
    const release = new Date(year, month - 1, day);
    if (
      release.getFullYear() !== year ||
      release.getMonth() !== month - 1 ||
      release.getDate() !== day
    ) {
      return null;
    }

    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    if (release.getTime() <= today.getTime()) return null;

    return {
      short: new Intl.DateTimeFormat('pt-BR', { day: 'numeric', month: 'short' }).format(release),
      long: new Intl.DateTimeFormat('pt-BR', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      }).format(release),
    };
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
    if (viewer?.inWatchlist) return this.copy.inWatchlist;
    if (viewer?.watchStatus === 'PARTIALLY_WATCHED') return this.copy.partlyWatched;
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
