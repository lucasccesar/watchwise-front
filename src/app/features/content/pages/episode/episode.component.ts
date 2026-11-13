import { DOCUMENT, NgTemplateOutlet } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, OnDestroy, Renderer2, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { DomSanitizer, SafeResourceUrl, Title } from '@angular/platform-browser';
import { forkJoin, Observable, of, Subscription, switchMap, throwError } from 'rxjs';
import { AuthSessionService } from '../../../../core/session/session.service';
import { ShareReviewDialogComponent, ShareReviewDialogModel } from '../../../../shared/components/share-review-dialog/share-review-dialog.component';
import { DialogBackdropComponent } from '../../../../shared/components/dialog-backdrop/dialog-backdrop.component';
import { messageCatalog } from '../../../../shared/i18n/messages';
import { ModalFocusDirective } from '../../../../shared/directives/modal-focus.directive';
import { ModalScrollLockDirective } from '../../../../shared/directives/modal-scroll-lock.directive';
import {
  ContentApiService,
  ContentComment,
  ContentReview,
  ContentPageResult,
  EpisodeContentPage,
  MovieVideo,
  SeriesChildCard,
  UserListDetail,
  UserListSummary,
} from '../../data-access/content-api.service';
import { PageSkeletonComponent } from '../../../../shared/components/page-skeleton/page-skeleton.component';
import { ResponsiveBannerComponent } from '../../../../shared/components/responsive-banner/responsive-banner.component';
import { CommentItemComponent } from '../../../../shared/components/comment-item/comment-item.component';
import { buildCommentTree } from '../../../../shared/components/comment-item/comment-tree';
import { ToastNotificationsService } from '../../../../shared/components/toast-notifications/toast-notifications.service';
import { CheckIconComponent } from '../../../../shared/components/check-icon/check-icon.component';
import { ContentListSkeletonComponent } from '../../../../shared/components/content-list-skeleton/content-list-skeleton.component';
import { WatchLogDialogComponent, WatchLogSubmission } from '../../../../shared/components/watch-log-dialog/watch-log-dialog.component';
import { tmdbImageUrl, type TmdbImageSize } from '../../../../shared/utils/tmdb-image-url';
import { resolveRating } from '../../../../shared/utils/community-rating';
import { getVideoPlatformLabel } from '../../utils/content-video.utils';
import { sortCrewByRole } from '../../utils/crew-order';
import { episodeContentNavigationState, episodeContentRoute } from '../../../../shared/utils/episode-content-route';
import { movieMessages } from '../../i18n/movie.messages';

type LoadState = 'loading' | 'ready' | 'error';
type EpisodeDialog = 'watch' | 'videos' | null;

@Component({
  selector: 'app-episode-content',
  standalone: true,
  imports: [NgTemplateOutlet, DialogBackdropComponent, ModalFocusDirective, ModalScrollLockDirective, RouterLink, ShareReviewDialogComponent, PageSkeletonComponent, ContentListSkeletonComponent, WatchLogDialogComponent, ResponsiveBannerComponent, CommentItemComponent, CheckIconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './episode.component.html',
  styleUrl: './episode.component.css',
})
export class EpisodeComponent implements OnDestroy {
  protected readonly watchCopy = movieMessages['pt-BR'];
  protected readonly shareCopy = this.watchCopy;
  protected readonly dialogCopy = messageCatalog['pt-BR'].home;
  protected readonly page = signal<EpisodeContentPage | null>(null);
  protected readonly reviews = signal<ContentReview[]>([]);
  protected readonly comments = signal<ContentComment[]>([]);
  protected readonly commentThreads = computed(() => buildCommentTree(this.comments()));
  protected readonly reviewPage = signal<ContentPageResult<ContentReview> | null>(null);
  protected readonly commentPage = signal<ContentPageResult<ContentComment> | null>(null);
  protected readonly reviewsLoading = signal(false);
  protected readonly commentsLoading = signal(false);
  protected readonly reviewsError = signal('');
  protected readonly commentsError = signal('');
  protected readonly commentMaxLength = 280;
  protected readonly maxWatchedDate = this.localDate(new Date());
  protected readonly canSubmitComment = computed(() => {
    const text = this.commentText().trim();
    return !!text && text.length <= this.commentMaxLength && !this.busy();
  });
  protected readonly status = signal<LoadState>('loading');
  protected readonly actionError = signal('');
  protected readonly dialog = signal<EpisodeDialog>(null);
  protected readonly watchLogOpen = signal(false);
  protected readonly watchDate = signal(this.localDate(new Date()));
  protected readonly watchCalendarOpen = signal(false);
  protected readonly watchCalendarMonth = signal(new Date(new Date().getFullYear(), new Date().getMonth(), 1));
  protected readonly calendarWeekdays = this.watchCopy.calendarWeekdays.split(' ');
  protected readonly watchCalendarMonthLabel = computed(() => new Intl.DateTimeFormat('pt-BR', { month: 'long', year: 'numeric' }).format(this.watchCalendarMonth()));
  protected readonly canAdvanceWatchCalendar = computed(() => {
    const month = this.watchCalendarMonth();
    const today = new Date();
    return month.getFullYear() * 12 + month.getMonth() < today.getFullYear() * 12 + today.getMonth();
  });
  protected readonly watchCalendarDays = computed(() => {
    const month = this.watchCalendarMonth();
    const firstDay = new Date(month.getFullYear(), month.getMonth(), 1);
    const start = new Date(month.getFullYear(), month.getMonth(), 1 - firstDay.getDay());
    return Array.from({ length: 42 }, (_, index) => {
      const date = new Date(start.getFullYear(), start.getMonth(), start.getDate() + index);
      const key = this.localDate(date);
      return {
        date: key,
        day: date.getDate(),
        inMonth: date.getMonth() === month.getMonth(),
        selected: key === this.watchDate(),
        disabled: key > this.maxWatchedDate,
        ariaLabel: new Intl.DateTimeFormat('pt-BR', { dateStyle: 'full', timeZone: 'UTC' }).format(new Date(`${key}T12:00:00Z`)),
      };
    });
  });
  protected readonly selectedRating = signal(0);
  protected readonly reviewText = signal('');
  protected readonly userLists = signal<UserListSummary[]>([]);
  protected readonly userListsPage = signal<ContentPageResult<UserListSummary> | null>(null);
  protected readonly userListsStatus = signal<LoadState>('loading');
  protected readonly userListsError = signal('');
  protected readonly listsExpanded = signal(false);
  protected readonly reviewSort = signal<'POPULAR' | 'RECENT' | 'FOLLOWING'>('POPULAR');
  protected readonly peopleTab = signal<'cast' | 'guests' | 'crew'>('cast');
  protected readonly detailsExpanded = signal(false);
  protected readonly videosOpen = computed(() => this.dialog() === 'videos');
  protected readonly selectedVideoKey = signal<string | null>(null);
  protected readonly videoPlaying = signal(false);
  protected readonly selectedVideo = computed(() => {
    const videos = this.page()?.details.videos ?? [];
    return videos.find(video => video.key === this.selectedVideoKey()) ?? videos[0] ?? null;
  });
  protected readonly videoEmbedUrl = computed<SafeResourceUrl | null>(() => {
    const video = this.selectedVideo();
    return video && this.isYoutubeVideo(video)
      ? this.sanitizer.bypassSecurityTrustResourceUrl(`https://www.youtube-nocookie.com/embed/${video.key}?autoplay=1`)
      : null;
  });
  protected readonly ratingOptions = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
  protected readonly commentText = signal('');
  protected readonly replyTo = signal<ContentComment | null>(null);
  protected readonly busy = signal(false);
  protected readonly shareReviewOpen = signal(false);
  protected readonly tmdbId = signal('');
  protected readonly seasonNumber = signal(0);
  protected readonly episodeNumber = signal(0);
  private readonly toasts = inject(ToastNotificationsService);
  private readonly document = inject(DOCUMENT);
  private readonly renderer = inject(Renderer2);
  private stylesheet?: HTMLLinkElement;
  protected readonly backdrop = computed(() => {
    const page = this.page();
    const path = page?.details.backdropPath || page?.metadata.presentationPosterPath || page?.details.posterPath;
    return this.imageUrl(path, 'w1280');
  });
  protected readonly episodeTitle = computed(() => this.page()?.details.title || 'Episódio');
  protected readonly seriesTitle = computed(() => this.page()?.details.parentTitle || 'Série');
  protected readonly alreadyWatched = computed(() => this.page()?.viewerState.watchStatus === 'WATCHED');
  protected readonly ratingDistribution = computed(() => this.page()?.stats.ratingsDistribution ?? []);
  protected readonly adjacentEpisodes = computed(() => ({
    previous: this.page()?.navigation?.previousEpisode ?? null,
    next: this.page()?.navigation?.nextEpisode ?? null,
  }));
  protected readonly seasonEpisodeItems = computed(() => {
    const navigation = this.page()?.navigation;
    const count = navigation?.seasonEpisodeCount;
    const seriesTmdbId = navigation?.seriesTmdbId || this.tmdbId();
    const seasonNumber = navigation?.seasonNumber ?? this.seasonNumber();
    if (count == null || !Number.isInteger(count) || count < 1 || !seriesTmdbId) return [];

    return Array.from({ length: count }, (_, index) => {
      const episodeNumber = index + 1;
      const route = episodeContentRoute({ seriesTmdbId, seasonNumber, episodeNumber });
      return route ? { episodeNumber, route } : null;
    }).filter((item): item is { episodeNumber: number; route: string[] } => item !== null);
  });
  protected readonly shareModel = computed<ShareReviewDialogModel>(() => {
    const page = this.page();
    const user = this.session.user();
    const seasonNumber = page?.details.seasonNumber ?? this.seasonNumber();
    const episodeNumber = page?.details.episodeNumber ?? this.episodeNumber();
    return {
      title: page?.details.title || this.episodeTitle(),
      subtitle: `${this.seriesTitle()} · T${seasonNumber} · E${episodeNumber}`,
      subtitleBelowTitle: true,
      rating: page?.viewerState.myRating ?? null,
      review: page?.viewerState.myReview ?? null,
      backgroundUrl: this.imageUrl(page?.details.backdropPath, 'w1280'),
      posterUrl: this.imageUrl(page?.details.backdropPath, 'w1280'),
      username: user?.username ?? null,
      avatarUrl: user?.profilePicture ?? null,
      selectionType: 'SERIES',
      tmdbId: page?.details.seriesTmdbId || this.tmdbId() || null,
      showPosterPicker: false,
      posterPreserveAspectRatio: true,
    };
  });

  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly title = inject(Title);
  private readonly api = inject(ContentApiService);
  protected readonly session = inject(AuthSessionService);
  private readonly sanitizer = inject(DomSanitizer);
  private openShareReviewAfterLoad = false;
  private profileContentActionAfterLoad: 'rate' | 'rewatch' | null = null;
  private shareReturnUrl: string | null = null;
  private profileActionReturnUrl: string | null = null;
  private request?: Subscription;
  private communityRequests = new Subscription();
  private routeRequest?: Subscription;

  constructor() {
    const navigationState = this.router.getCurrentNavigation()?.extras.state;
    this.openShareReviewAfterLoad = navigationState?.['openShareReview'] === true;
    const profileAction = navigationState?.['profileContentAction'];
    this.profileContentActionAfterLoad = profileAction === 'rate' || profileAction === 'rewatch' ? profileAction : null;
    this.profileActionReturnUrl = typeof navigationState?.['profileActionReturnUrl'] === 'string'
      ? navigationState['profileActionReturnUrl']
      : null;
    this.shareReturnUrl = typeof navigationState?.['shareReturnUrl'] === 'string'
      ? navigationState['shareReturnUrl']
      : null;
    this.loadStylesheet();
    this.routeRequest = this.route.paramMap.subscribe((params) => {
      const seriesTmdbId = params.get('tmdbId') ?? '';
      const season = Number(params.get('seasonNumber'));
      const episode = Number(params.get('episodeNumber'));
      this.load(seriesTmdbId, season, episode, this.routeContentId());
    });
  }

  ngOnDestroy(): void {
    this.routeRequest?.unsubscribe();
    this.request?.unsubscribe();
    this.communityRequests.unsubscribe();
    if (this.stylesheet) this.renderer.removeChild(this.document.head, this.stylesheet);
  }

  protected reload(): void {
    this.load(this.tmdbId(), this.seasonNumber(), this.episodeNumber());
  }

  protected openShareReview(): void {
    this.shareReviewOpen.set(true);
  }

  protected closeShareReview(): void {
    this.shareReviewOpen.set(false);
    const returnUrl = this.shareReturnUrl;
    this.shareReturnUrl = null;
    this.profileActionReturnUrl = null;
    if (returnUrl) void this.router.navigateByUrl(returnUrl, { replaceUrl: true });
  }

  protected imageUrl(path: string | null | undefined, size: TmdbImageSize = 'w500'): string | null {
    return tmdbImageUrl(path, size);
  }

  protected formatDate(value: string | null | undefined): string {
    if (!value) return '';
    const [year, month, day] = value.slice(0, 10).split('-').map(Number);
    if (!year || !month || !day) return '';
    return new Intl.DateTimeFormat('pt-BR', { day: 'numeric', month: 'long', year: 'numeric' }).format(new Date(year, month - 1, day));
  }

  protected crewNamesForRole(page: EpisodeContentPage, role: 'director' | 'writer'): string {
    const matching = this.episodeCrew(page)
      .filter(person => person.jobs.some(job => job.toLocaleLowerCase('pt-BR').includes(role === 'director' ? 'director' : 'writer')))
      .map(person => person.name.trim())
      .filter(Boolean);
    return [...new Set(matching)].join(', ');
  }

  protected episodeCrew(page: EpisodeContentPage): EpisodeContentPage['details']['crew'] {
    const crew = page.metadata.crewInherited && page.metadata.presentationCrew
      ? page.metadata.presentationCrew
      : page.details.crew;
    return sortCrewByRole(crew, 'EPISODE');
  }

  protected productionCompanyNames(page: EpisodeContentPage): string {
    return page.details.productionCompanies.map(company => company.name).join(', ');
  }

  protected formatRuntime(value: number | null | undefined): string {
    if (!value) return '';
    const hours = Math.floor(value / 60);
    const minutes = value % 60;
    return hours ? `${hours}h${minutes ? ` ${minutes}min` : ''}` : `${minutes} min`;
  }

  protected formatRating(value: number | null | undefined): string {
    return value === null || value === undefined ? '0' : value.toLocaleString('pt-BR', { maximumFractionDigits: 1 });
  }

  protected communityRating(): number | null {
    const stats = this.page()?.stats;
    return stats ? resolveRating(stats.averageScore, stats.tmdbVoteAverage).value : null;
  }

  protected communityRatingCaption(): string {
    const stats = this.page()?.stats;
    if (!stats) return '';
    const rating = resolveRating(stats.averageScore, stats.tmdbVoteAverage);
    return rating.source === 'tmdb' ? 'Nota no TMDB' : `${stats.ratingsCount} avaliações da comunidade`;
  }

  protected ratingBarWidth(value: number | null | undefined): number {
    return Math.min(100, Math.max(0, (value ?? 0) * 10));
  }

  protected ratingBarHeight(score: number): number {
    const distribution = this.ratingDistribution();
    const count = distribution.find(item => item.score === score)?.count ?? 0;
    const largest = Math.max(...distribution.map(item => item.count), 0);
    return largest ? Math.max(2, count / largest * 56) : 2;
  }

  protected ratingCount(score: number): number {
    return this.ratingDistribution().find(item => item.score === score)?.count ?? 0;
  }

  protected reviewComment(event: Event): void {
    this.reviewText.set((event.target as HTMLTextAreaElement).value);
  }

  protected commentDraft(event: Event): void {
    this.commentText.set((event.target as HTMLTextAreaElement).value);
  }

  protected openRating(): void {
    const page = this.page();
    if (!page) return;
    this.watchDate.set(page.viewerState.lastWatchedDate ?? this.localDate(new Date()));
    const selectedDate = new Date(`${this.watchDate()}T12:00:00Z`);
    this.watchCalendarMonth.set(new Date(selectedDate.getUTCFullYear(), selectedDate.getUTCMonth(), 1));
    this.watchCalendarOpen.set(false);
    this.selectedRating.set(page.viewerState.myRating ?? 0);
    this.reviewText.set(page.viewerState.myReview ?? '');
    this.dialog.set('watch');
  }

  private openProfileActionAfterLoad(): void {
    if (this.openShareReviewAfterLoad) {
      this.openShareReviewAfterLoad = false;
      if (this.page()?.viewerState.latestDiaryEntryId) this.openShareReview();
      else {
        this.toasts.info(this.watchCopy.shareReviewNeedsWatch);
        this.closeShareReview();
      }
      return;
    }
    const action = this.profileContentActionAfterLoad;
    this.profileContentActionAfterLoad = null;
    if (action === 'rewatch') this.markWatched();
    else if (action === 'rate') this.openRating();
  }

  protected closeWatchLogDialog(): void {
    if (this.busy()) return;
    this.watchLogOpen.set(false);
    this.returnToProfileAction();
  }

  protected saveWatchLog(submission: WatchLogSubmission): void {
    const page = this.page();
    if (!page || this.busy()) return;
    this.busy.set(true);
    this.api.createSeriesDiaryEntry({
      content: {
        type: 'EPISODE',
        seriesTmdbId: this.tmdbId(),
        seasonNumber: this.seasonNumber(),
        episodeNumber: this.episodeNumber(),
      },
      ...submission,
    }).subscribe({
      next: () => {
        this.watchLogOpen.set(false);
        this.busy.set(false);
        this.showToast(submission.isRewatch ? 'Episódio registrado novamente.' : 'Episódio marcado como assistido.');
        this.reload();
        this.returnToProfileAction();
      },
      error: (error: unknown) => { this.toasts.error(this.errorText(error)); this.busy.set(false); },
    });
  }

  protected closeDialog(): void {
    this.watchCalendarOpen.set(false);
    this.dialog.set(null);
    this.videoPlaying.set(false);
    this.returnToProfileAction();
  }

  private returnToProfileAction(): void {
    const returnUrl = this.profileActionReturnUrl;
    this.profileActionReturnUrl = null;
    if (returnUrl) void this.router.navigateByUrl(returnUrl, { replaceUrl: true });
  }

  protected toggleWatchCalendar(): void {
    this.watchCalendarOpen.update(open => !open);
  }

  protected changeWatchCalendarMonth(offset: number): void {
    const current = this.watchCalendarMonth();
    const next = new Date(current.getFullYear(), current.getMonth() + offset, 1);
    if (next > new Date(new Date().getFullYear(), new Date().getMonth(), 1)) return;
    this.watchCalendarMonth.set(next);
  }

  protected selectWatchDate(date: string): void {
    this.watchDate.set(date);
    this.watchCalendarOpen.set(false);
  }

  protected watchDateLabel(): string {
    return new Intl.DateTimeFormat('pt-BR', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' }).format(new Date(`${this.watchDate()}T12:00:00Z`));
  }

  protected saveWatch(): void {
    const page = this.page();
    const watchedDate = this.watchDate();
    if (!page || this.busy() || !watchedDate || watchedDate > this.localDate(new Date())) return;
    this.busy.set(true);
    const diaryEntryId = page.viewerState.latestDiaryEntryId;
    const changes = {
      watchedDate,
      score: this.selectedRating() || null,
      comment: this.reviewText().trim() || null,
    };
    const request = diaryEntryId
      ? this.api.updateDiaryEntry(diaryEntryId, changes)
      : this.api.createSeriesDiaryEntry({
          ...changes,
          content: { type: 'EPISODE', seriesTmdbId: this.tmdbId(), seasonNumber: this.seasonNumber(), episodeNumber: this.episodeNumber() },
        });
    request.subscribe({
      next: () => { this.closeDialog(); this.busy.set(false); this.showToast(this.selectedRating() ? 'Registro salvo no diário.' : 'Episódio registrado no diário.'); this.reload(); },
      error: (error: unknown) => { this.toasts.error(this.errorText(error)); this.busy.set(false); },
    });
  }

  protected markWatched(event?: Event): void {
    if (!this.page() || this.busy()) return;
    const currentTarget = event?.currentTarget;
    if (currentTarget instanceof HTMLElement) {
      const menu = currentTarget.closest<HTMLDetailsElement>('.movie-mobile-more-actions');
      if (menu) menu.open = false;
    }
    this.watchLogOpen.set(true);
  }

  protected toggleDetails(): void {
    this.detailsExpanded.update(expanded => !expanded);
  }

  protected openWatchedOptions(event: Event): void {
    const row = (event.currentTarget as HTMLElement | null)?.closest('.movie-action-primary-row');
    const menu = row?.querySelector<HTMLDetailsElement>('.episode-more-actions');
    if (menu) menu.open = !menu.open;
  }

  protected openListsFromMobileMenu(event: Event): void {
    event.stopPropagation();
    this.listsExpanded.set(true);
    if (!this.userListsPage()) this.loadUserLists(1);
    queueMicrotask(() => this.document.querySelector<HTMLElement>('.episode-lists-control')?.scrollIntoView({ block: 'nearest' }));
  }

  protected goToListCreate(): void {
    void this.router.navigateByUrl('/lists/create');
  }

  protected removeFromDiary(): void {
    const entryId = this.page()?.viewerState.latestDiaryEntryId;
    if (!entryId || this.busy()) return;
    this.busy.set(true);
    this.api.deleteDiaryEntry(entryId).subscribe({
      next: () => { this.busy.set(false); this.closeDialog(); this.showToast('Episódio removido do diário.'); this.reload(); },
      error: (error: unknown) => { this.toasts.error(this.errorText(error)); this.busy.set(false); },
    });
  }

  protected openVideos(): void {
    this.selectedVideoKey.set(this.page()?.details.videos[0]?.key ?? null);
    this.videoPlaying.set(false);
    this.dialog.set('videos');
  }

  protected selectVideo(video: MovieVideo): void {
    this.videoPlaying.set(false);
    this.selectedVideoKey.set(video.key);
  }

  protected playVideo(): void {
    if (this.videoEmbedUrl()) this.videoPlaying.set(true);
  }

  protected videoThumbnail(video: MovieVideo): string | null {
    return this.isYoutubeVideo(video) ? `https://i.ytimg.com/vi/${video.key}/hqdefault.jpg` : null;
  }

  protected videoPlatform(video: MovieVideo): string {
    return getVideoPlatformLabel(video);
  }

  protected loadUserLists(pageNumber = 1): void {
    const userId = this.session.user()?.id;
    const contentId = this.page()?.details.contentId;
    if (!userId || !contentId) return;
    this.userListsStatus.set('loading');
    this.userListsError.set('');
    this.communityRequests.add(this.api.getUserLists(userId, contentId, pageNumber).subscribe({
      next: response => {
        this.userListsPage.set(response);
        this.userLists.update(current => pageNumber === 1 ? response.content : [...current, ...response.content]);
        this.userListsStatus.set('ready');
      },
      error: error => { this.userListsStatus.set('error'); this.userListsError.set(this.errorText(error)); },
    }));
  }

  protected toggleListsPanel(): void {
    const expanded = !this.listsExpanded();
    this.listsExpanded.set(expanded);
    if (expanded && !this.userListsPage()) this.loadUserLists(1);
  }

  protected canAddEpisodeToList(list: UserListSummary): boolean {
    return list.itemScope === null || list.itemScope === 'EPISODE' || list.itemScope === 'MIXED';
  }

  protected toggleEpisodeInList(list: UserListSummary): void {
    const page = this.page();
    if (!page || this.busy() || (list.containsContent !== true && !this.canAddEpisodeToList(list))) return;
    this.busy.set(true);
    const request = list.containsContent === true
      ? this.findEpisodeItemInList(list.id, page.details.contentId, 1).pipe(
          switchMap(itemId => itemId
            ? this.api.removeListItem(list.id, itemId)
            : throwError(() => new Error('Não foi possível encontrar o episódio na lista.'))),
        )
      : this.api.addEpisodeToList(list.id, this.tmdbId(), this.seasonNumber(), this.episodeNumber());
    request.subscribe({
      next: () => {
        const containsContent = list.containsContent !== true;
        const update = (item: UserListSummary): UserListSummary => item.id === list.id
          ? { ...item, containsContent, ...(item.itemsCount === undefined ? {} : { itemsCount: Math.max(0, item.itemsCount + (containsContent ? 1 : -1)) }) }
          : item;
        this.userLists.update(items => items.map(update));
        this.userListsPage.update(current => current ? { ...current, content: current.content.map(update) } : current);
        this.page.update(current => {
          if (!current) return current;
          const lists = current.viewerState.lists.filter(item => item.listId !== list.id);
          if (containsContent) lists.push({ listId: list.id, name: list.name, visibility: list.visibility });
          return { ...current, viewerState: { ...current.viewerState, lists } };
        });
        this.busy.set(false);
        this.showToast(containsContent ? 'Episódio adicionado à lista.' : 'Episódio removido da lista.');
      },
      error: (error: unknown) => { this.toasts.error(this.errorText(error)); this.busy.set(false); },
    });
  }

  protected loadMoreLists(): void {
    const current = this.userListsPage();
    if (current?.hasNext) this.loadUserLists(current.page + 1);
  }

  protected changeReviewSort(sort: 'POPULAR' | 'RECENT' | 'FOLLOWING'): void {
    if (sort === this.reviewSort()) return;
    this.reviewSort.set(sort);
    this.reviews.set([]);
    this.reviewPage.set(null);
    const contentId = this.page()?.details.contentId;
    if (!contentId) return;
    this.reviewsLoading.set(true);
    this.communityRequests.add(this.api.getReviews(contentId, 1, sort).subscribe({
      next: response => { this.reviewPage.set(response); this.reviews.set(response.content); this.reviewsLoading.set(false); },
      error: error => { this.reviewsLoading.set(false); this.reviewsError.set(this.errorText(error)); },
    }));
  }

  protected setPeopleTab(tab: 'cast' | 'guests' | 'crew'): void {
    this.peopleTab.set(tab);
  }

  protected peopleTabKeydown(event: KeyboardEvent): void {
    if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
    event.preventDefault();
    const tabs = ['cast', 'guests', 'crew'] as const;
    const currentIndex = tabs.indexOf(this.peopleTab());
    const nextIndex = event.key === 'Home' ? 0 : event.key === 'End' ? tabs.length - 1 : Math.max(0, Math.min(tabs.length - 1, currentIndex + (event.key === 'ArrowRight' ? 1 : -1)));
    this.setPeopleTab(tabs[nextIndex]);
  }

  protected selectRating(score: number): void {
    this.selectedRating.set(this.selectedRating() === score ? 0 : score);
  }

  protected isYoutubeVideo(video: MovieVideo): boolean {
    if (!/^[a-zA-Z0-9_-]{11}$/.test(video.key)) return false;
    try {
      const hostname = new URL(video.url).hostname.toLowerCase();
      return hostname === 'youtube.com' || hostname === 'www.youtube.com' || hostname === 'youtu.be';
    } catch {
      return false;
    }
  }

  protected submitComment(event: SubmitEvent): void {
    event.preventDefault();
    const page = this.page();
    const text = this.commentText().trim();
    if (!page || !this.canSubmitComment()) return;
    this.busy.set(true);
    this.api.createComment(page.details.contentId, { text, parentCommentId: this.replyTo()?.id ?? null }).subscribe({
      next: (comment) => { this.mergeComments([comment]); this.commentText.set(''); this.replyTo.set(null); this.busy.set(false); },
      error: (error: unknown) => { this.toasts.error(this.errorText(error)); this.busy.set(false); },
    });
  }

  protected toggleCommentLike(comment: ContentComment): void {
    const liked = !comment.likedByMe;
    this.comments.update((items) => items.map((item) => item.id === comment.id ? { ...item, likedByMe: liked, likesCount: Math.max(0, item.likesCount + (liked ? 1 : -1)) } : item));
    this.api.setCommentLike(comment.id, liked).subscribe({
      error: () => this.comments.update((items) => items.map((item) => item.id === comment.id ? { ...item, likedByMe: !liked, likesCount: Math.max(0, item.likesCount + (liked ? -1 : 1)) } : item)),
    });
  }

  protected toggleReviewLike(review: ContentReview): void {
    const liked = !review.likedByMe;
    this.reviews.update((items) => items.map((item) => item.id === review.id ? { ...item, likedByMe: liked, likesCount: Math.max(0, item.likesCount + (liked ? 1 : -1)) } : item));
    this.api.setReviewLike(review.id, review.source, liked).subscribe({
      error: () => this.reviews.update((items) => items.map((item) => item.id === review.id ? { ...item, likedByMe: !liked, likesCount: Math.max(0, item.likesCount + (liked ? -1 : 1)) } : item)),
    });
  }

  protected episodeRoute(episode: SeriesChildCard): string[] | null {
    if (episode.type !== 'EPISODE') return null;
    return episodeContentRoute({
      seriesTmdbId: episode.seriesTmdbId || this.tmdbId(),
      seasonNumber: episode.seasonNumber,
      episodeNumber: episode.episodeNumber,
    });
  }

  protected episodeNavigationState(contentId: string | null | undefined): { contentId: string } | undefined {
    return episodeContentNavigationState(contentId);
  }

  protected navigationTitle(episode: SeriesChildCard): string {
    return episode.title?.trim() || `T${episode.seasonNumber ?? '?'} · E${episode.episodeNumber ?? '?'}`;
  }

  protected loadMoreReviews(): void {
    const current = this.reviewPage();
    const contentId = this.page()?.details.contentId;
    if (!contentId || !current?.hasNext || this.reviewsLoading()) return;
    this.reviewsLoading.set(true);
    this.reviewsError.set('');
    this.communityRequests.add(this.api.getReviews(contentId, current.page + 1, this.reviewSort()).subscribe({
      next: response => {
        this.reviewPage.set(response);
        this.reviews.update(items => [...items, ...response.content]);
        this.reviewsLoading.set(false);
      },
      error: error => { this.reviewsLoading.set(false); this.reviewsError.set(this.errorText(error)); },
    }));
  }

  protected loadMoreComments(): void {
    const current = this.commentPage();
    const contentId = this.page()?.details.contentId;
    if (!contentId || !current?.hasNext || this.commentsLoading()) return;
    this.commentsLoading.set(true);
    this.commentsError.set('');
    this.communityRequests.add(this.api.getComments(contentId, current.page + 1).subscribe({
      next: response => {
        this.commentPage.set(response);
        this.mergeComments(response.content);
        this.commentsLoading.set(false);
      },
      error: error => { this.commentsLoading.set(false); this.commentsError.set(this.errorText(error)); },
    }));
  }

  protected initials(value: string | null | undefined): string {
    return (value ?? '').trim().split(/\s+/).slice(0, 2).map((part) => part[0] ?? '').join('').toLocaleUpperCase('pt-BR') || 'W';
  }

  private mergeComments(incoming: ContentComment[]): void {
    this.comments.update(current => [...new Map([...current, ...incoming].map(comment => [comment.id, comment])).values()]
      .sort((a, b) => (a.createdAt ?? '').localeCompare(b.createdAt ?? '') || a.id.localeCompare(b.id)));
  }

  private findEpisodeItemInList(listId: string, contentId: string, pageNumber: number): Observable<string | null> {
    return this.api.getListItems(listId, pageNumber, 'EPISODE').pipe(
      switchMap((response: UserListDetail) => {
        const item = response.items.find(candidate => candidate.content?.id === contentId);
        if (item) return of(item.id);
        return response.itemsHasNext ? this.findEpisodeItemInList(listId, contentId, pageNumber + 1) : of(null);
      }),
    );
  }

  private localDate(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  protected showToast(message: string): void {
    this.toasts.success(message);
  }

  private load(tmdbId: string, seasonNumber: number, episodeNumber: number, contentId: string | null = null): void {
    this.request?.unsubscribe();
    this.communityRequests.unsubscribe();
    this.communityRequests = new Subscription();
    this.reviewPage.set(null);
    this.commentPage.set(null);
    this.reviewsLoading.set(false);
    this.commentsLoading.set(false);
    this.reviewsError.set('');
    this.commentsError.set('');
    this.tmdbId.set(tmdbId);
    this.seasonNumber.set(seasonNumber);
    this.episodeNumber.set(episodeNumber);
    this.status.set('loading');
    this.page.set(null);
    this.detailsExpanded.set(false);
    this.reviews.set([]);
    this.comments.set([]);
    this.userLists.set([]);
    this.userListsPage.set(null);
    this.userListsStatus.set('loading');
    this.userListsError.set('');
    this.dialog.set(null);
    this.selectedVideoKey.set(null);
    this.videoPlaying.set(false);
    if (!tmdbId || !Number.isInteger(seasonNumber) || !Number.isInteger(episodeNumber) || seasonNumber < 0 || episodeNumber < 1) {
      this.status.set('error');
      this.actionError.set('Este episódio não foi encontrado.');
      return;
    }
    const reference = contentId
      ? of({ id: contentId })
      : this.api.createEpisodeReference(tmdbId, seasonNumber, episodeNumber);
    this.request = reference.pipe(
      switchMap((episodeRef) => forkJoin({
        episode: this.api.getEpisodePage(episodeRef.id),
        reviews: this.api.getReviews(episodeRef.id, 1, 'POPULAR'),
        comments: this.api.getComments(episodeRef.id, 1),
      })),
    ).subscribe({
      next: ({ episode, reviews, comments }) => {
        if (episode.details.type !== 'EPISODE') {
          this.status.set('error');
          this.actionError.set('Este episódio não foi encontrado.');
          return;
        }
        this.page.set(episode);
        const seriesName = episode.details.parentTitle?.trim() || 'Série';
        this.title.setTitle(`${seriesName} • S${seasonNumber} E${episodeNumber} | Watchwise`);
        this.reviews.set(reviews.content);
        this.comments.set(comments.content);
        this.reviewPage.set(reviews);
        this.commentPage.set(comments);
        this.status.set('ready');
        if (this.openShareReviewAfterLoad) {
          this.openProfileActionAfterLoad();
        } else if (this.profileContentActionAfterLoad) {
          this.openProfileActionAfterLoad();
        }
      },
      error: (error: unknown) => { this.status.set('error'); this.actionError.set(this.errorText(error)); },
    });
  }

  private routeContentId(): string | null {
    const navigationState = this.router.getCurrentNavigation()?.extras.state;
    const historyState = this.document.defaultView?.history.state as Record<string, unknown> | null;
    const value = navigationState?.['contentId'] ?? historyState?.['contentId'];
    return typeof value === 'string' && value.trim() ? value : null;
  }

  private errorText(error: unknown): string {
    if (error instanceof HttpErrorResponse && error.status === 0) return 'Não foi possível conectar ao serviço. Tente novamente.';
    if (error instanceof HttpErrorResponse && error.status === 404) return 'Este episódio não está disponível.';
    return 'Não foi possível carregar esta tela agora. Tente novamente.';
  }

  private loadStylesheet(): void {
    const stylesheet = this.renderer.createElement('link') as HTMLLinkElement;
    this.renderer.setAttribute(stylesheet, 'rel', 'stylesheet');
    this.renderer.setAttribute(stylesheet, 'href', new URL('styles/movie-content.css', this.document.baseURI).href);
    this.renderer.appendChild(this.document.head, stylesheet);
    this.stylesheet = stylesheet;
  }
}
