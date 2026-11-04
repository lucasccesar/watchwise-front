import { DecimalPipe } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, HostListener, OnDestroy, computed, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { Observable, Subscription, of, switchMap, throwError } from 'rxjs';
import { AuthSessionService } from '../../../../core/session/session.service';
import { ContentApiService } from '../../../content/data-access/content-api.service';
import { ContentImageAction, ContentImageActionSelection, ContentImageActionsComponent } from '../../../../shared/components/content-image-actions/content-image-actions.component';
import { messageCatalog } from '../../../../shared/i18n/messages';
import { ResponsiveBannerComponent } from '../../../../shared/components/responsive-banner/responsive-banner.component';
import { ToastNotificationsService } from '../../../../shared/components/toast-notifications/toast-notifications.service';
import { DialogBackdropComponent } from '../../../../shared/components/dialog-backdrop/dialog-backdrop.component';
import { ModalFocusDirective } from '../../../../shared/directives/modal-focus.directive';
import { ModalScrollLockDirective } from '../../../../shared/directives/modal-scroll-lock.directive';
import { ContentPageResult, UserListDetailItem, UserListSummary } from '../../../content/data-access/content-api.service';
import { WatchlistApiService, WatchlistCard, WatchlistContentType, WatchlistSort, WatchlistStatus, WatchlistView } from '../../data-access/watchlist-api.service';
import { CheckIconComponent } from '../../../../shared/components/check-icon/check-icon.component';
import { tmdbImageUrl } from '../../../../shared/utils/tmdb-image-url';

type WatchlistMenu = 'genre' | 'sort' | 'visibility' | null;
type WatchlistUpcomingMode = 'ALL' | 'FADE' | 'HIDE';

interface WatchlistCalendarDay {
  date: string;
  day: number;
  inMonth: boolean;
  selected: boolean;
  disabled: boolean;
  ariaLabel: string;
}

@Component({
  selector: 'app-watchlist',
  standalone: true,
  imports: [DecimalPipe, RouterLink, ContentImageActionsComponent, ResponsiveBannerComponent, DialogBackdropComponent, ModalFocusDirective, ModalScrollLockDirective, CheckIconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './watchlist.component.html',
  styleUrl: './watchlist.component.css',
})
export class WatchlistComponent implements OnDestroy {
  protected readonly copy = messageCatalog['pt-BR'].watchlistPage;
  protected readonly homeCopy = messageCatalog['pt-BR'].home;
  protected readonly trendingCopy = messageCatalog['pt-BR'].trendingPage;
  protected readonly status = signal<'loading' | 'ready' | 'error'>('loading');
  protected readonly error = signal('');
  protected readonly loadingPlaceholders = Array.from({ length: 12 }, (_, index) => index);
  protected readonly view = signal<WatchlistView | null>(null);
  protected readonly heroBackdropPath = signal<string | null | undefined>(undefined);
  protected readonly heroBackdropLoading = signal(true);
  protected readonly heroBackdropFailed = signal(false);
  protected readonly viewMode = signal<'AUTO' | 'GRID' | 'LIST'>('AUTO');
  protected readonly mobileFiltersOpen = signal(false);
  protected readonly type = signal<WatchlistContentType | null>(null);
  protected readonly genre = signal<string | null>(null);
  protected readonly filterStatus = signal<WatchlistStatus>('ALL');
  protected readonly upcomingMode = signal<WatchlistUpcomingMode>('ALL');
  protected readonly sort = signal<WatchlistSort>('DATE_ADDED');
  protected readonly direction = signal<'ASC' | 'DESC'>('DESC');
  protected readonly page = signal(1);
  protected readonly pageSize = 18;
  protected readonly activeMenu = signal<WatchlistMenu>(null);
  protected readonly busyId = signal<string | null>(null);
  protected readonly posterMenuOpener = signal<HTMLElement | null>(null);
  protected readonly watchDialogCard = signal<WatchlistCard | null>(null);
  protected readonly watchDialogDate = signal(this.todayDate());
  protected readonly watchDialogScore = signal<number | null>(null);
  protected readonly watchDialogReview = signal('');
  protected readonly watchDialogRewatch = signal(false);
  protected readonly watchDialogWatchedInTheater = signal(false);
  protected readonly watchDialogCalendarOpen = signal(false);
  protected readonly watchDialogCalendarMonth = signal(this.firstOfMonth(new Date()));
  protected readonly watchDialogSaving = signal(false);
  protected readonly ratingOptions = Array.from({ length: 10 }, (_, index) => index + 1);
  protected readonly calendarWeekdays = this.homeCopy.calendarWeekdays.split(' ');
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
  protected readonly listDialogCard = signal<WatchlistCard | null>(null);
  protected readonly listPickerPosition = signal<{ top: number; right: number } | null>(null);
  protected readonly listDialogOpener = signal<HTMLElement | null>(null);
  protected readonly listSkeletonRows = [0, 1, 2];
  protected readonly listContentId = signal('');
  protected readonly userLists = signal<UserListSummary[]>([]);
  protected readonly userListsPage = signal<ContentPageResult<UserListSummary> | null>(null);
  protected readonly userListsStatus = signal<'loading' | 'ready' | 'error'>('loading');
  protected readonly userListsLoadingMore = signal(false);
  protected readonly userListsError = signal('');
  protected readonly busyListId = signal<string | null>(null);
  protected readonly listCreateOpen = signal(false);
  protected readonly listDraftName = signal('');
  protected readonly totalPages = computed(() => Math.max(1, this.view()?.totalPages ?? 1));
  protected readonly pageNumbers = computed(() => Array.from({ length: this.totalPages() }, (_, index) => index + 1));
  protected readonly visibleItems = computed(() => {
    const items = this.view()?.content ?? [];
    return this.upcomingMode() === 'HIDE' ? items.filter((item) => item.status !== 'UPCOMING') : items;
  });
  protected readonly genreOptions = signal<string[]>([]);
  private readonly session = inject(AuthSessionService);
  private readonly api = inject(WatchlistApiService);
  private readonly contentApi = inject(ContentApiService);
  private readonly router = inject(Router);
  private readonly toasts = inject(ToastNotificationsService);
  private request?: Subscription;
  private genreRequest?: Subscription;
  private listRequests = new Subscription();
  private cardActionRequests = new Subscription();
  private genreUserId = '';

  constructor() {
    this.load();
  }

  protected onHeroBackdropLoaded(): void {
    this.heroBackdropLoading.set(false);
  }

  protected onHeroBackdropError(): void {
    this.heroBackdropFailed.set(true);
    this.heroBackdropLoading.set(false);
  }

  protected updatedAt(): string {
    const date = this.view()?.content[0]?.createdAt;
    return date ? this.dateLabel(date) : '';
  }

  protected selectMobileType(event: Event): void {
    const value = (event.target as HTMLSelectElement).value;
    this.selectType(value === 'ALL' ? null : value as WatchlistContentType);
  }

  protected selectMobileGenre(event: Event): void {
    this.selectGenre((event.target as HTMLSelectElement).value || null);
  }

  protected selectMobileSort(event: Event): void {
    this.selectSort((event.target as HTMLSelectElement).value as WatchlistSort);
  }

  protected selectMobileDirection(event: Event): void {
    this.direction.set((event.target as HTMLSelectElement).value as 'ASC' | 'DESC');
    this.page.set(1);
    this.load();
  }

  protected selectMobileStatus(event: Event): void {
    this.selectStatus((event.target as HTMLSelectElement).value as WatchlistStatus);
  }

  protected selectMobileUpcomingMode(event: Event): void {
    this.setUpcomingMode((event.target as HTMLSelectElement).value as WatchlistUpcomingMode);
  }

  protected selectViewMode(event: Event): void {
    this.viewMode.set((event.target as HTMLSelectElement).value as 'GRID' | 'LIST');
  }

  ngOnDestroy(): void {
    this.request?.unsubscribe();
    this.genreRequest?.unsubscribe();
    this.listRequests.unsubscribe();
    this.cardActionRequests.unsubscribe();
  }

  protected load(): void {
    const user = this.session.user();
    if (!user) {
      void this.router.navigateByUrl('/login');
      return;
    }
    if (this.genreUserId !== user.id) {
      this.genreRequest?.unsubscribe(); this.genreUserId = user.id; this.genreOptions.set([]);
      this.genreRequest = this.api.getGenreOptions(user.id).subscribe({
        next: genres => this.genreOptions.set(genres),
        error: () => { this.genreUserId = ''; },
      });
    }
    this.request?.unsubscribe();
    this.status.set('loading');
    this.heroBackdropPath.set(undefined);
    this.heroBackdropLoading.set(true);
    this.heroBackdropFailed.set(false);
    this.error.set('');
    this.request = this.api.getView(user.id, {
      type: this.type(),
      genre: this.genre(),
      status: this.filterStatus(),
      sort: this.sort(),
      direction: this.direction(),
      page: this.page(),
      size: this.pageSize,
    }).subscribe({
      next: (view) => {
        const backdropPath = view.backdropPath ?? null;
        this.heroBackdropPath.set(backdropPath);
        this.heroBackdropLoading.set(backdropPath === null || Boolean(backdropPath?.trim()));
        this.heroBackdropFailed.set(false);
        this.view.set(view);
        this.status.set('ready');
      },
      error: (error: unknown) => {
        this.heroBackdropLoading.set(false);
        this.status.set('error');
        this.error.set(error instanceof HttpErrorResponse && error.status === 0
          ? this.homeCopy.actionConnectionError
          : this.homeCopy.genericError);
      },
    });
  }

  protected selectType(type: WatchlistContentType | null): void {
    this.type.set(type);
    this.activeMenu.set(null);
    this.page.set(1);
    this.load();
  }

  protected selectGenre(genre: string | null): void {
    this.genre.set(genre);
    this.activeMenu.set(null);
    this.page.set(1);
    this.load();
  }

  protected selectStatus(status: WatchlistStatus): void {
    this.filterStatus.set(status);
    this.activeMenu.set(null);
    this.page.set(1);
    this.load();
  }

  protected selectSort(sort: WatchlistSort): void {
    this.sort.set(sort);
    this.activeMenu.set(null);
    this.page.set(1);
    this.load();
  }

  protected toggleDirection(): void {
    this.direction.update((direction) => direction === 'DESC' ? 'ASC' : 'DESC');
    this.load();
  }

  protected toggleMenu(menu: Exclude<WatchlistMenu, null>): void {
    this.activeMenu.update((active) => active === menu ? null : menu);
  }

  protected posterActionsFor(item: WatchlistCard): readonly ContentImageAction[] {
    const watched = item.card.viewerState?.watchStatus === 'WATCHED';
    const busy = this.busyId() === item.id || this.busyListId() !== null || this.watchDialogSaving();
    return [
      {
        id: 'mark-watched',
        label: watched ? this.trendingCopy.watchAgain : this.trendingCopy.markWatched,
        icon: watched ? 'rewatch' : 'check',
        disabled: busy || this.isUpcoming(item),
      },
      { id: 'remove-watchlist', label: this.copy.remove, icon: 'bookmark-filled', disabled: busy },
      { id: 'add-to-list', label: this.trendingCopy.addToList, icon: 'list', disabled: busy },
    ];
  }

  protected goToPage(page: number): void {
    this.page.set(Math.max(1, Math.min(this.totalPages(), page)));
    this.load();
  }

  protected title(item: WatchlistCard): string {
    return item.card.title || this.copy.titleUnavailable;
  }

  protected poster(item: WatchlistCard): string | null {
    return this.imageUrl(item.card.customPosterUrl || item.card.posterPath);
  }

  protected cardRating(item: WatchlistCard): { label: string; value: string } | null {
    if (this.isUpcoming(item)) return null;
    const communityScore = item.card.stats?.averageScore;
    const score = communityScore ?? item.card.tmdbVoteAverage;
    if (score === null || score === undefined) return null;
    return {
      label: communityScore === null || communityScore === undefined
        ? this.homeCopy.tmdbRating
        : this.homeCopy.communityAverage,
      value: new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 }).format(score),
    };
  }

  protected route(item: WatchlistCard): string[] | null {
    const tmdbId = item.card.tmdbId || item.card.seriesTmdbId;
    if (!tmdbId) return null;
    return item.card.type === 'MOVIE' ? ['/content/movie', tmdbId] : ['/content/series', tmdbId];
  }

  protected handlePosterAction(item: WatchlistCard, selection: ContentImageActionSelection): void {
    if (selection.action.id === 'mark-watched') {
      this.openWatchedDialog(item, selection.event);
      return;
    }
    if (selection.action.id === 'add-to-list') {
      this.openAddToList(item, selection.event);
      return;
    }
    if (selection.action.id !== 'remove-watchlist' || this.busyId() || this.busyListId()) return;
    this.busyId.set(item.id);
    const remove = item.card.type === 'MOVIE'
      ? this.contentApi.removeFromWatchlist(item.id)
      : this.contentApi.removeSeriesFromWatchlist(item.id);
    remove.subscribe({
      next: () => { this.busyId.set(null); this.toasts.success(this.trendingCopy.watchlistRemoved); this.load(); },
      error: () => { this.busyId.set(null); this.toasts.error(this.copy.removeError); },
    });
  }

  protected openWatchedDialog(item: WatchlistCard, event?: MouseEvent): void {
    if (this.busyId() || this.busyListId() || this.isUpcoming(item)) return;
    if (!this.session.user()?.id) {
      void this.router.navigateByUrl('/login');
      return;
    }
    const action = event?.currentTarget as HTMLElement | null;
    this.posterMenuOpener.set(action?.closest('.content-menu-anchor')
      ?.querySelector<HTMLElement>('.content-menu-trigger') ?? null);
    this.watchDialogCard.set(item);
    this.watchDialogDate.set(this.todayDate());
    this.watchDialogScore.set(null);
    this.watchDialogReview.set('');
    this.watchDialogRewatch.set(item.card.viewerState?.watchStatus === 'WATCHED');
    this.watchDialogWatchedInTheater.set(false);
    this.watchDialogCalendarOpen.set(false);
    this.watchDialogCalendarMonth.set(this.firstOfMonth(new Date()));
    this.watchDialogSaving.set(false);
  }

  protected closeWatchedDialog(): void {
    if (this.watchDialogSaving()) return;
    this.watchDialogCard.set(null);
    this.watchDialogCalendarOpen.set(false);
    this.posterMenuOpener()?.focus();
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
      day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC',
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
    const item = this.watchDialogCard();
    const tmdbId = item ? this.tmdbId(item) : null;
    if (!item || !tmdbId || this.watchDialogSaving()) return;
    const watchedDate = this.watchDialogDate();
    const request = item.card.type === 'MOVIE'
      ? this.contentApi.createDiaryEntry({
          content: { type: 'MOVIE', tmdbId },
          watchedDate,
          watchedInTheater: this.watchDialogWatchedInTheater(),
          isRewatch: this.watchDialogRewatch(),
          score: this.watchDialogScore(),
          comment: this.watchDialogReview().trim() || null,
        })
      : this.contentApi.createBulkSeriesDiaryEntry({
          content: { type: 'SERIES', tmdbId },
          watchedDate,
        }, crypto.randomUUID());
    this.watchDialogSaving.set(true);
    this.cardActionRequests.add(request.subscribe({
      next: () => {
        this.watchDialogSaving.set(false);
        this.updateWatchlistCard(item.id, {
          watchStatus: 'WATCHED',
          watchedEpisodeCount: item.card.type === 'SERIES'
            ? item.card.numberOfEpisodes ?? item.card.viewerState?.watchedEpisodeCount ?? 0
            : item.card.viewerState?.watchedEpisodeCount ?? 0,
        });
        this.toasts.success(this.watchDialogRewatch() ? this.trendingCopy.watchAgainSuccess : this.trendingCopy.markWatchedSuccess);
        this.closeWatchedDialog();
      },
      error: (error: unknown) => {
        this.watchDialogSaving.set(false);
        if (this.handleSessionError(error)) return;
        this.toasts.error(this.trendingCopy.actionError);
      },
    }));
  }

  protected openAddToList(item: WatchlistCard, event?: MouseEvent): void {
    const userId = this.session.user()?.id;
    const tmdbId = this.tmdbId(item);
    if (!userId) {
      void this.router.navigateByUrl('/login');
      return;
    }
    if (!tmdbId || this.busyId() || this.busyListId()) return;

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
    this.listDialogCard.set(item);
    this.listContentId.set('');
    this.userLists.set([]);
    this.userListsPage.set(null);
    this.userListsStatus.set('loading');
    this.userListsLoadingMore.set(false);
    this.userListsError.set('');
    this.listCreateOpen.set(false);
    this.listDraftName.set('');
    this.listRequests.unsubscribe();
    this.listRequests = new Subscription();
    const referenceRequest = item.card.type === 'MOVIE'
      ? this.contentApi.createMovieReference(tmdbId)
      : this.contentApi.createSeriesReference(tmdbId);
    this.listRequests.add(referenceRequest.subscribe({
      next: (reference) => {
        this.listContentId.set(reference.id);
        this.loadUserLists(1);
      },
      error: (error: unknown) => {
        if (this.handleSessionError(error)) return;
        this.userListsStatus.set('error');
        this.userListsError.set(this.trendingCopy.listLoadError);
      },
    }));
  }

  protected canAddToList(list: UserListSummary): boolean {
    return list.itemScope === null || list.itemScope === 'MOVIE_OR_SERIES';
  }

  protected canToggleList(list: UserListSummary): boolean {
    return list.containsContent === true || this.canAddToList(list);
  }

  protected addCardToList(list: UserListSummary): void {
    const item = this.listDialogCard();
    const removing = list.containsContent === true;
    const tmdbId = item ? this.tmdbId(item) : null;
    if (!item || !tmdbId || (!removing && !this.canAddToList(list)) || this.busyListId()) return;
    this.busyListId.set(list.id);
    const request = removing
      ? this.findCardInList(list.id, item).pipe(
          switchMap((itemId) => itemId
            ? this.contentApi.removeListItem(list.id, itemId)
            : throwError(() => new Error('O conteúdo indicado não foi encontrado na lista.'))),
        )
      : item.card.type === 'MOVIE'
        ? this.contentApi.addMovieToList(list.id, tmdbId)
        : this.contentApi.addSeriesToList(list.id, tmdbId);
    this.listRequests.add(request.subscribe({
      next: () => {
        this.busyListId.set(null);
        this.userLists.update((lists) => lists.map((candidate) => candidate.id === list.id
          ? { ...candidate, containsContent: !removing, itemsCount: Math.max(0, (candidate.itemsCount ?? 0) + (removing ? -1 : 1)) }
          : candidate));
        this.closeListDialog();
        this.toasts.success(removing ? this.trendingCopy.listRemoved : this.trendingCopy.listAdded);
      },
      error: (error: unknown) => {
        this.busyListId.set(null);
        if (this.handleSessionError(error)) return;
        this.toasts.error(this.trendingCopy.actionError);
      },
    }));
  }

  protected loadMoreUserLists(): void {
    const page = this.userListsPage();
    if (!page?.hasNext || this.userListsLoadingMore()) return;
    this.loadUserLists(page.page + 1);
  }

  protected retryUserLists(): void {
    const item = this.listDialogCard();
    if (!item) return;
    if (this.listContentId()) this.loadUserLists(1);
    else this.openAddToList(item);
  }

  protected closeListDialog(): void {
    if (this.busyListId()) return;
    this.listDialogCard.set(null);
    this.listPickerPosition.set(null);
    this.listCreateOpen.set(false);
    this.listDraftName.set('');
    this.listDialogOpener()?.focus();
    this.listDialogOpener.set(null);
    this.listRequests.unsubscribe();
    this.listRequests = new Subscription();
  }

  protected updateListDraft(event: Event): void {
    this.listDraftName.set((event.currentTarget as HTMLInputElement).value);
  }

  protected openListCreate(): void {
    this.listCreateOpen.set(true);
    this.listDraftName.set('');
  }

  protected createListWithCard(): void {
    const item = this.listDialogCard();
    const name = this.listDraftName().trim();
    const tmdbId = item ? this.tmdbId(item) : null;
    if (!item || !tmdbId || !name || this.busyListId()) return;
    this.busyListId.set('new-list');
    const request = item.card.type === 'MOVIE'
      ? this.contentApi.createMovieList(name, tmdbId)
      : this.contentApi.createSeriesList(name, tmdbId);
    this.listRequests.add(request.subscribe({
      next: () => {
        this.busyListId.set(null);
        this.listCreateOpen.set(false);
        this.listDraftName.set('');
        this.toasts.success(this.trendingCopy.listAdded);
        this.loadUserLists(1);
      },
      error: (error: unknown) => {
        this.busyListId.set(null);
        if (this.handleSessionError(error)) return;
        this.toasts.error(this.trendingCopy.actionError);
      },
    }));
  }

  @HostListener('document:click', ['$event'])
  protected dismissListPicker(event: MouseEvent): void {
    if (!this.listDialogCard()) return;
    const target = event.target;
    if (target instanceof Element && target.closest('.watchlist-list-picker, .content-menu-anchor')) return;
    this.closeListDialog();
  }

  @HostListener('document:keydown.escape', ['$event'])
  protected closeListPickerOnEscape(event: Event): void {
    if (!this.listDialogCard()) return;
    event.stopPropagation();
    this.closeListDialog();
  }

  protected sortLabel(): string {
    const labels: Record<WatchlistSort, string> = {
      DATE_ADDED: this.copy.sortDateAdded,
      RELEASE_DATE: this.copy.sortReleaseDate,
      RUNTIME: this.copy.sortRuntime,
      RATING: this.copy.sortRating,
      TITLE: this.copy.sortTitle,
    };
    return labels[this.sort()];
  }

  protected statusLabel(): string {
    const labels: Record<WatchlistStatus, string> = {
      ALL: this.copy.all,
      NEW: this.copy.new,
      IN_PROGRESS: this.copy.inProgress,
      UPCOMING: this.copy.upcoming,
    };
    return labels[this.filterStatus()];
  }

  protected upcomingModeLabel(): string {
    if (this.upcomingMode() === 'FADE') return this.copy.fadeUpcoming;
    if (this.upcomingMode() === 'HIDE') return this.copy.hideUpcoming;
    return this.copy.all;
  }

  protected setUpcomingMode(mode: WatchlistUpcomingMode): void {
    this.upcomingMode.set(mode);
    this.activeMenu.set(null);
  }

  protected isUpcoming(item: WatchlistCard): boolean {
    return item.status === 'UPCOMING';
  }

  protected cardMeta(item: WatchlistCard): string {
    if (this.isUpcoming(item) && item.releaseDate) {
      return `${this.trendingCopy.releaseDatePrefix} ${this.releaseDateLong(item.releaseDate)}`;
    }
    return [item.card.releaseYear, ...(item.card.genres ?? []).slice(0, 2)].filter(Boolean).join(' · ');
  }

  protected releaseDateShort(value: string): string {
    const [year, month, day] = value.slice(0, 10).split('-').map(Number);
    return new Intl.DateTimeFormat('pt-BR', { day: 'numeric', month: 'short' }).format(new Date(year, month - 1, day));
  }

  private releaseDateLong(value: string): string {
    const [year, month, day] = value.slice(0, 10).split('-').map(Number);
    return new Intl.DateTimeFormat('pt-BR', { day: 'numeric', month: 'long', year: 'numeric' })
      .format(new Date(year, month - 1, day));
  }

  protected runtimeLabel(item: WatchlistCard): string {
    if (item.card.type === 'SERIES') {
      const episodes = item.card.numberOfEpisodes;
      return episodes ? `${episodes} ${this.copy.episodesShort}` : '';
    }
    const minutes = item.card.runtimeMinutes;
    if (minutes === null || minutes === undefined || minutes <= 0) return '';
    const hours = Math.floor(minutes / 60);
    const remainder = minutes % 60;
    return hours ? `${hours}h${remainder ? ` ${remainder}min` : ''}` : `${remainder}min`;
  }

  protected todayDate(): string {
    const date = new Date();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${date.getFullYear()}-${month}-${day}`;
  }

  private createWatchDialogDays(month: Date, selectedDate: string): WatchlistCalendarDay[] {
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
        ariaLabel: new Intl.DateTimeFormat('pt-BR', { dateStyle: 'full', timeZone: 'UTC' })
          .format(new Date(`${dateKey}T00:00:00Z`)),
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

  private tmdbId(item: WatchlistCard): string | null {
    return item.card.tmdbId || item.card.seriesTmdbId || null;
  }

  private updateWatchlistCard(
    id: string,
    change: Partial<NonNullable<WatchlistCard['card']['viewerState']>>,
  ): void {
    this.view.update((view) => view ? {
      ...view,
      content: view.content.map((item) => item.id === id
        ? {
            ...item,
            card: {
              ...item.card,
              viewerState: {
                watchStatus: null,
                watchedEpisodeCount: null,
                releasedEpisodeCount: null,
                ...item.card.viewerState,
                ...change,
              },
            },
          }
        : item),
    } : view);
  }

  private loadUserLists(pageNumber: number): void {
    const userId = this.session.user()?.id;
    const contentId = this.listContentId();
    if (!userId || !contentId) {
      this.userListsStatus.set('error');
      this.userListsError.set(this.trendingCopy.listLoadError);
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
        this.userListsError.set(this.trendingCopy.listLoadError);
      },
    }));
  }

  private findCardInList(listId: string, item: WatchlistCard, pageNumber = 1): Observable<string | null> {
    const tmdbId = this.tmdbId(item);
    if (!tmdbId) return of(null);
    return this.contentApi.getListItems(listId, pageNumber, item.card.type).pipe(
      switchMap((page) => {
        const match = page.items.find((listItem: UserListDetailItem) =>
          listItem.content?.type === item.card.type && listItem.content.tmdbId === tmdbId,
        );
        if (match) return of(match.id);
        return page.itemsHasNext ? this.findCardInList(listId, item, pageNumber + 1) : of(null);
      }),
    );
  }

  private handleSessionError(error: unknown): boolean {
    if (error instanceof HttpErrorResponse && error.status === 401) {
      this.session.clear();
      void this.router.navigateByUrl('/login');
      return true;
    }
    return false;
  }

  private imageUrl(path: string | null | undefined): string | null {
    return tmdbImageUrl(path, 'w500');
  }

  protected dateLabel(value: string | null): string {
    if (!value) return this.copy.dateUnknown;
    return new Intl.DateTimeFormat('pt-BR', { day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(value));
  }

  protected runtimeTotal(minutes: number): string {
    const day = Math.floor(minutes / 1440);
    const hours = Math.floor((minutes % 1440) / 60);
    const remainder = minutes % 60;
    if (day) return `${day}d ${hours}h`;
    return hours ? `${hours}h ${remainder}min` : `${remainder} min`;
  }

  protected pageLabel(): string {
    return this.copy.pageLabel
      .replace('{page}', String(this.view()?.page ?? this.page()))
      .replace('{total}', String(this.totalPages()));
  }
}
