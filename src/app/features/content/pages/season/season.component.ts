import { DOCUMENT, NgTemplateOutlet } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  HostListener,
  OnDestroy,
  Renderer2,
  ViewChild,
  computed,
  inject,
  signal,
} from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { Title } from '@angular/platform-browser';
import { concatMap, forkJoin, from, map, Observable, Subscription, of, switchMap, throwError, toArray } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { AuthSessionService } from '../../../../core/session/session.service';
import { DialogBackdropComponent } from '../../../../shared/components/dialog-backdrop/dialog-backdrop.component';
import { CheckIconComponent } from '../../../../shared/components/check-icon/check-icon.component';
import { CommentItemComponent } from '../../../../shared/components/comment-item/comment-item.component';
import { buildCommentTree } from '../../../../shared/components/comment-item/comment-tree';
import { ContentImageAction, ContentImageActionSelection, ContentImageActionsComponent } from '../../../../shared/components/content-image-actions/content-image-actions.component';
import { ConfirmationDialogService } from '../../../../shared/components/confirmation-dialog/confirmation-dialog.service';
import { ContentListSkeletonComponent } from '../../../../shared/components/content-list-skeleton/content-list-skeleton.component';
import { PageSkeletonComponent } from '../../../../shared/components/page-skeleton/page-skeleton.component';
import { ResponsiveBannerComponent } from '../../../../shared/components/responsive-banner/responsive-banner.component';
import { ShareReviewDialogComponent, ShareReviewDialogModel } from '../../../../shared/components/share-review-dialog/share-review-dialog.component';
import { ToastNotificationType, ToastNotificationsService } from '../../../../shared/components/toast-notifications/toast-notifications.service';
import { ModalFocusDirective } from '../../../../shared/directives/modal-focus.directive';
import { ModalScrollLockDirective } from '../../../../shared/directives/modal-scroll-lock.directive';
import { DiaryApiService } from '../../../diary/data-access/diary-api.service';
import { movieMessages } from '../../i18n/movie.messages';
import { ContentApiService, ContentComment, ContentPageStats, ContentPageResult, ContentReview, ContentSeasonSelection, ReviewSort, SeasonContentPage, SeasonEpisodeCard, SeriesChildCard, UserListSummary } from '../../data-access/content-api.service';
import { tmdbImageUrl, type TmdbImageSize } from '../../../../shared/utils/tmdb-image-url';
import { resolveRating } from '../../../../shared/utils/community-rating';
import { WatchLogDialogComponent, WatchLogSubmission } from '../../../../shared/components/watch-log-dialog/watch-log-dialog.component';
import { episodeContentNavigationState, episodeContentRoute } from '../../../../shared/utils/episode-content-route';

type PageStatus = 'loading' | 'ready' | 'error';
type WatchDateMode = 'today' | 'specific' | 'release';
type SeasonListItem = ContentSeasonSelection & {
  contentId: string;
  airedEpisodeCount?: number | null;
  stats: ContentPageStats;
  viewerState: SeriesChildCard['viewerState'];
};
type RatingTarget = { type: 'SEASON'; season?: SeasonListItem } | { type: 'EPISODE'; episode: SeasonEpisodeCard };
type EpisodeWatchTarget = { episode: SeasonEpisodeCard; isRewatch: boolean };

@Component({
  selector: 'app-season-content',
  standalone: true,
  imports: [NgTemplateOutlet, RouterLink, DialogBackdropComponent, ModalFocusDirective, ModalScrollLockDirective, CheckIconComponent, CommentItemComponent, ContentImageActionsComponent, ContentListSkeletonComponent, PageSkeletonComponent, ResponsiveBannerComponent, ShareReviewDialogComponent, WatchLogDialogComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './season.component.html',
  styleUrl: './season.component.css',
})
export class SeasonComponent implements OnDestroy {
  protected readonly copy = movieMessages['pt-BR'];
  protected readonly page = signal<SeasonContentPage | null>(null);
  protected readonly seasons = signal<SeasonListItem[]>([]);
  protected readonly status = signal<PageStatus>('loading');
  protected readonly pageError = signal('');
  protected readonly tmdbId = signal('');
  protected readonly seasonNumber = signal(0);
  protected readonly contentId = signal('');
  protected readonly episodes = computed(() => this.page()?.sections?.episodes ?? []);
  protected readonly cast = computed(() => this.page()?.details.cast ?? []);
  protected readonly castTab = signal<'cast' | 'crew'>('cast');
  protected readonly comments = signal<ContentComment[]>([]);
  protected readonly commentThreads = computed(() => buildCommentTree(this.comments()));
  protected readonly reviews = signal<ContentReview[]>([]);
  protected readonly latestOwnSeasonReview = signal<ContentReview | null>(null);
  protected readonly reviewPage = signal<ContentPageResult<ContentReview> | null>(null);
  protected readonly commentPage = signal<ContentPageResult<ContentComment> | null>(null);
  protected readonly reviewStatus = signal<PageStatus>('loading');
  protected readonly commentStatus = signal<PageStatus>('loading');
  protected readonly reviewError = signal('');
  protected readonly commentError = signal('');
  protected readonly reviewSort = signal<ReviewSort>('POPULAR');
  protected readonly activeSeasonMenu = signal<string | null>(null);
  protected readonly activeEpisodeMenu = signal<string | null>(null);
  protected readonly userLists = signal<UserListSummary[]>([]);
  protected readonly userListsPage = signal<ContentPageResult<UserListSummary> | null>(null);
  protected readonly userListsStatus = signal<PageStatus>('loading');
  protected readonly userListsError = signal('');
  protected readonly listsOpen = signal(false);
  protected readonly listCreateOpen = signal(false);
  protected readonly newListName = signal('');
  protected readonly watchDialogOpen = signal(false);
  protected readonly bulkWatchSeason = signal<SeasonListItem | null>(null);
  protected readonly seasonHistoryConfirmOpen = signal(false);
  protected readonly ratingPromptSeason = signal<SeasonListItem | null>(null);
  protected readonly ratingDialogOpen = signal(false);
  protected readonly shareReviewOpen = signal(false);
  protected readonly ratingTarget = signal<RatingTarget | null>(null);
  protected readonly episodeWatchTarget = signal<EpisodeWatchTarget | null>(null);
  protected readonly ratingScore = signal(0);
  protected readonly ratingReview = signal('');
  protected readonly ratingReviewLoading = signal(false);
  protected readonly ratingOptions = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
  protected readonly watchDateMode = signal<WatchDateMode>('today');
  protected readonly watchDate = signal(this.localDate(new Date()));
  protected readonly commentDraft = signal('');
  protected readonly replyTo = signal<ContentComment | null>(null);
  protected readonly detailsExpanded = signal(false);
  protected readonly actionPending = signal(false);
  protected readonly commentPending = signal(false);
  protected readonly reviewCount = computed(() => this.page()?.visibleReviewsCount ?? 0);
  protected readonly backdropUrl = computed(() => this.imageUrl(this.page()?.details.backdropPath, 'w1280'));
  protected readonly posterUrl = computed(() => {
    const season = this.seasons().find((item) => item.seasonNumber === this.seasonNumber());
    return this.imageUrl(season?.posterUrl, 'w500');
  });
  protected readonly shareModel = computed<ShareReviewDialogModel | null>(() => {
    const page = this.page();
    if (!page) return null;
    const user = this.session.user();
    return {
      title: this.seriesName(),
      subtitle: this.seasonName(),
      subtitleBelowTitle: true,
      rating: this.latestOwnSeasonReview()?.score ?? page.viewerState.myRating,
      review: this.latestOwnSeasonReview()?.comment ?? page.viewerState.myReview,
      backgroundUrl: this.backdropUrl(),
      posterUrl: this.posterUrl(),
      username: user?.username ?? null,
      avatarUrl: user?.profilePicture ?? null,
      selectionType: 'SERIES',
      tmdbId: page.details.seriesTmdbId || this.tmdbId(),
    };
  });
  protected readonly seasonName = computed(() => this.page()?.details.title?.trim() || `Temporada ${this.seasonNumber()}`);
  protected readonly seriesName = computed(() => this.page()?.details.parentTitle?.trim() || 'Série');
  protected readonly watchedEpisodeCount = computed(() => Math.max(
    0,
    this.page()?.viewerState.watchedEpisodeCount ?? 0,
    this.episodes().filter((episode) => this.episodeIsWatched(episode)).length,
  ));
  protected readonly episodeCount = computed(() => {
    const reportedCount = this.page()?.details.episodeCount ?? 0;
    return reportedCount > 0 ? reportedCount : this.episodes().length;
  });
  protected readonly releasedEpisodeCount = computed(() => {
    const reportedCount = this.page()?.viewerState.releasedEpisodeCount ?? 0;
    return reportedCount > 0 ? reportedCount : this.episodeCount();
  });
  protected readonly watched = computed(() => {
    const episodeCount = this.episodeCount();
    return this.page()?.viewerState.watchStatus === 'WATCHED'
      || (episodeCount > 0 && this.watchedEpisodeCount() >= episodeCount);
  });
  protected readonly watchedPercentage = computed(() => {
    const total = this.releasedEpisodeCount();
    return total > 0 ? Math.min(100, Math.round((this.watchedEpisodeCount() / total) * 100)) : 0;
  });
  protected readonly averageRuntime = computed(() => {
    const fromPage = this.page()?.details.runtimeMinutes;
    if (fromPage) return fromPage;
    const runtimes = this.episodes().map((episode) => episode.runtimeMinutes).filter((value): value is number => value !== null && value > 0);
    return runtimes.length ? Math.round(runtimes.reduce((sum, value) => sum + value, 0) / runtimes.length) : null;
  });
  protected readonly providers = computed(() => this.page()?.metadata.watchProviders ?? []);
  protected readonly crew = computed(() => this.page()?.details.crew ?? []);
  protected readonly creators = computed(() => this.page()?.details.creators ?? []);
  protected readonly genres = computed(() => this.page()?.details.genres ?? []);
  protected readonly countries = computed(() => this.page()?.details.countries ?? []);
  protected readonly commentMaxLength = 280;
  protected readonly canSubmitComment = computed(() => !!this.commentDraft().trim() && this.commentDraft().trim().length <= this.commentMaxLength && !this.commentPending());

  private readonly document = inject(DOCUMENT);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly api = inject(ContentApiService);
  private readonly diaryApi = inject(DiaryApiService);
  private readonly title = inject(Title);
  private readonly renderer = inject(Renderer2);
  protected readonly session = inject(AuthSessionService);
  private readonly toasts = inject(ToastNotificationsService);
  private readonly confirmation = inject(ConfirmationDialogService);
  private routeRequest?: Subscription;
  private request?: Subscription;
  private requests = new Subscription();
  private stylesheet: HTMLLinkElement | null = null;
  private openShareReviewAfterLoad = false;
  private ratingPromptSeasonAfterLoad: { seriesTmdbId: string; seasonNumber: number } | null = null;
  private shareReturnUrl: string | null = null;

  @ViewChild('seasonDialog')
  private seasonDialog?: ElementRef<HTMLElement>;

  @ViewChild('seasonRatingPromptDialog')
  private seasonRatingPromptDialog?: ElementRef<HTMLElement>;

  @ViewChild('seasonHistoryDialog')
  private seasonHistoryDialog?: ElementRef<HTMLElement>;

  constructor() {
    const navigationState = this.router.getCurrentNavigation()?.extras.state;
    this.openShareReviewAfterLoad = navigationState?.['openShareReview'] === true;
    this.shareReturnUrl = typeof navigationState?.['shareReturnUrl'] === 'string'
      ? navigationState['shareReturnUrl']
      : null;
    this.loadStylesheet();
    this.routeRequest = this.route.paramMap.subscribe((params) => {
      const tmdbId = params.get('tmdbId')?.trim() ?? '';
      const season = Number(params.get('seasonNumber'));
      this.loadSeason(tmdbId, season);
    });
  }

  ngOnDestroy(): void {
    this.routeRequest?.unsubscribe();
    this.request?.unsubscribe();
    this.requests.unsubscribe();
    if (this.stylesheet) this.renderer.removeChild(this.document.head, this.stylesheet);
  }

  protected reload(): void {
    this.loadSeason(this.tmdbId(), this.seasonNumber());
  }

  protected imageUrl(path: string | null | undefined, size: TmdbImageSize = 'w500'): string | null {
    return tmdbImageUrl(path, size);
  }

  protected formatNumber(value: number | null | undefined, maximumFractionDigits = 1): string {
    return new Intl.NumberFormat('pt-BR', { maximumFractionDigits }).format(value ?? 0);
  }

  protected formatRating(value: number | null | undefined): string {
    return value === null || value === undefined ? '0' : this.formatNumber(value, 1);
  }

  protected averageRating(stats: ContentPageStats): number | null {
    return resolveRating(stats.averageScore, stats.tmdbVoteAverage).value;
  }

  protected averageRatingCaption(stats: ContentPageStats): string {
    const rating = resolveRating(stats.averageScore, stats.tmdbVoteAverage);
    return rating.source === 'tmdb' ? 'Nota no TMDB' : `${this.formatNumber(stats.ratingsCount, 0)} avaliações`;
  }

  protected episodeRating(episode: SeasonEpisodeCard): number | null {
    return resolveRating(episode.stats.averageScore, episode.stats.tmdbVoteAverage).value;
  }

  protected episodeRatingLabel(episode: SeasonEpisodeCard): string {
    const rating = resolveRating(episode.stats.averageScore, episode.stats.tmdbVoteAverage);
    if (rating.value === null) return '';
    const source = rating.source === 'tmdb' ? 'Nota no TMDB' : 'Nota média da comunidade';
    return `${source}: ${this.formatRating(rating.value)} de 10`;
  }

  protected formatDate(value: string | null | undefined, options: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'short', year: 'numeric' }): string {
    if (!value) return '';
    const [year, month, day] = value.slice(0, 10).split('-').map(Number);
    if (!year || !month || !day) return '';
    return new Intl.DateTimeFormat('pt-BR', options).format(new Date(year, month - 1, day));
  }

  protected lastWatchedDate(): string | null {
    const dates = [
      this.page()?.viewerState.lastWatchedDate,
      ...this.episodes().map((episode) => episode.viewerState.lastWatchedDate),
    ].filter((date): date is string => Boolean(date));

    return dates.sort((left, right) => right.localeCompare(left))[0] ?? null;
  }

  protected seasonItemLastWatchedDate(season: SeasonListItem): string | null {
    return season.viewerState.lastWatchedDate ?? null;
  }

  protected localDateForInput(): string {
    return this.localDate(new Date());
  }

  protected formatRuntime(minutes: number | null | undefined): string {
    if (!minutes || minutes < 0) return '';
    const hours = Math.floor(minutes / 60);
    const rest = minutes % 60;
    if (hours && rest) return `${hours}h ${rest}min`;
    return hours ? `${hours}h` : `${rest} min`;
  }

  protected ratingBarWidth(value: number | null | undefined): number {
    return Math.min(100, Math.max(0, (value ?? 0) * 10));
  }

  protected ratingCount(score: number): number {
    return this.page()?.stats.ratingsDistribution.find((entry) => entry.score === score)?.count ?? 0;
  }

  protected ratingBarHeight(score: number): number {
    const distribution = this.page()?.stats.ratingsDistribution ?? [];
    const maximum = Math.max(1, ...distribution.map((entry) => entry.count));
    return Math.max(2, Math.round((this.ratingCount(score) / maximum) * 56));
  }

  protected personInitials(name: string | null | undefined): string {
    return (name ?? '').trim().split(/\s+/).slice(0, 2).map((part) => part[0] ?? '').join('').toLocaleUpperCase('pt-BR') || 'W';
  }

  protected providerInitials(name: string): string {
    const first = name.trim().split(/\s+/)[0] ?? '';
    return first.endsWith('+') ? `${first.charAt(0)}+` : first.charAt(0).toLocaleUpperCase('pt-BR');
  }

  protected parentYear(): string {
    const year = this.page()?.details.parentReleaseYear;
    return year ? String(year) : this.page()?.details.releaseDate?.slice(0, 4) ?? '';
  }

  protected seasonRoute(season: SeasonListItem): string[] {
    return ['/content/series', this.tmdbId(), 'season', String(season.seasonNumber)];
  }

  protected seasonMenuKey(season: SeasonListItem): string {
    return `season-${season.seasonNumber}`;
  }

  private seasonItemEpisodeCount(season: SeasonListItem): number {
    return Math.max(0, season.airedEpisodeCount ?? season.viewerState.releasedEpisodeCount ?? season.episodeCount ?? 0);
  }

  private seasonItemWatchedCount(season: SeasonListItem): number {
    return Math.max(0, season.viewerState.watchedEpisodeCount ?? 0);
  }

  protected seasonItemIsWatched(season: SeasonListItem): boolean {
    return season.viewerState.watchStatus === 'WATCHED';
  }

  protected seasonItemHasWatchActivity(season: SeasonListItem): boolean {
    return season.viewerState.watchStatus === 'WATCHED'
      || season.viewerState.watchStatus === 'PARTIALLY_WATCHED';
  }

  protected seasonItemMyRating(season: SeasonListItem): number | null {
    return season.viewerState.myRating ?? null;
  }

  protected seasonMenuRatingValue(season: SeasonListItem): string | null {
    const rating = resolveRating(season.stats.averageScore, season.stats.tmdbVoteAverage).value;
    return rating === null ? null : this.formatRating(rating);
  }

  protected seasonMenuRatingLabel(season: SeasonListItem): string {
    const rating = resolveRating(season.stats.averageScore, season.stats.tmdbVoteAverage);
    if (rating.value === null) return '';
    const source = rating.source === 'tmdb' ? 'Nota no TMDB' : 'Nota média da comunidade';
    return `${source}: ${this.formatRating(rating.value)} de 10`;
  }

  private saveSeasonSelectionRating(season: SeasonListItem, score: number): Observable<{ score: number; version: number }> {
    return this.api.setContentRating(season.contentId, score, season.viewerState.currentRatingVersion ?? null);
  }

  protected seasonActions(season: SeasonListItem): readonly ContentImageAction[] {
    if (!this.seasonItemIsWatched(season)) {
      return [{
        id: 'watch',
        label: this.copy.markWatched,
        icon: 'check',
        disabled: this.actionPending() || this.seasonItemEpisodeCount(season) === 0,
      }];
    }

    return [
      { id: 'rate', label: this.seasonItemMyRating(season) === null ? this.copy.rate : this.copy.editRating, icon: 'star', disabled: this.actionPending() },
      { id: 'rewatch', label: this.copy.rewatch, icon: 'rewatch', disabled: this.actionPending() },
      { id: 'share-review', label: this.copy.shareReview, icon: 'share', disabled: this.actionPending() },
    ];
  }

  protected toggleSeasonMenu(key: string, event: MouseEvent): void {
    event.stopPropagation();
    this.activeEpisodeMenu.set(null);
    this.activeSeasonMenu.update((active) => active === key ? null : key);
  }

  protected seasonAction(season: SeasonListItem, selection: ContentImageActionSelection): void {
    this.activeSeasonMenu.set(null);
    if (selection.action.id === 'watch' || selection.action.id === 'rewatch') this.openBulkWatch(season);
    else if (selection.action.id === 'rate') this.openRating({ type: 'SEASON', season });
    else if (selection.action.id === 'share-review') this.openSeasonShareReview(season);
  }

  protected promptSeasonRating(season: SeasonListItem): void {
    this.ratingPromptSeason.set(season);
    queueMicrotask(() => this.seasonRatingPromptDialog?.nativeElement.focus());
  }

  protected confirmSeasonRating(): void {
    const season = this.ratingPromptSeason();
    if (!season) return;
    this.ratingPromptSeason.set(null);
    this.openRating({ type: 'SEASON', season });
  }

  protected openSeasonShareReview(season: SeasonListItem): void {
    this.activeSeasonMenu.set(null);
    if (season.seasonNumber === this.seasonNumber()) {
      this.openShareLatestSeasonReview();
      return;
    }
    void this.router.navigate(this.seasonRoute(season), {
      state: { openShareReview: true, shareReturnUrl: this.router.url },
    });
  }

  protected openSeasonRewatch(event: Event): void {
    this.closeSeasonWatchedMenu(event);
    this.openBulkWatch();
  }

  private closeSeasonWatchedMenu(event: Event): void {
    const menu = (event.currentTarget as HTMLElement | null)?.closest<HTMLDetailsElement>('.season-watched-actions');
    if (menu) menu.open = false;
  }

  protected bulkWatchEpisodeCount(): number {
    const target = this.bulkWatchSeason();
    if (!target) return this.bulkEpisodeCount();
    const total = this.seasonItemEpisodeCount(target);
    return this.seasonItemIsWatched(target) ? total : Math.max(0, total - this.seasonItemWatchedCount(target));
  }

  protected bulkWatchIsRepeat(): boolean {
    const target = this.bulkWatchSeason();
    return target ? this.seasonItemIsWatched(target) : this.watched();
  }

  protected bulkWatchSeasonName(): string {
    const target = this.bulkWatchSeason();
    return target?.name?.trim() || (target ? `Temporada ${target.seasonNumber}` : this.seasonName());
  }

  protected episodeRoute(episode: SeasonEpisodeCard): string[] | null {
    return episodeContentRoute({
      seriesTmdbId: episode.seriesTmdbId || this.tmdbId(),
      seasonNumber: episode.seasonNumber ?? this.seasonNumber(),
      episodeNumber: episode.episodeNumber,
    });
  }

  protected episodeNavigationState(episode: SeasonEpisodeCard): { contentId: string } | undefined {
    return episodeContentNavigationState(episode.contentId);
  }

  protected stopEpisodeCardClick(event: MouseEvent): void {
    event.stopPropagation();
  }

  protected openEpisodeRating(episode: SeasonEpisodeCard, event: MouseEvent): void {
    event.stopPropagation();
    this.openRating({ type: 'EPISODE', episode });
  }

  protected openEpisodeFromCard(episode: SeasonEpisodeCard, event: MouseEvent): void {
    const target = event.target;
    if (target instanceof Element && target.closest('a, button, app-content-image-actions')) return;
    const route = this.episodeRoute(episode);
    if (!route) return;
    void this.router.navigate(route, { state: this.episodeNavigationState(episode) });
  }

  protected handleEpisodeCardKeydown(episode: SeasonEpisodeCard, event: KeyboardEvent): void {
    if (event.key !== 'Enter' && event.key !== ' ') return;
    if (event.target !== event.currentTarget) return;
    event.preventDefault();
    const route = this.episodeRoute(episode);
    if (!route) return;
    void this.router.navigate(route, { state: this.episodeNavigationState(episode) });
  }

  protected setCastTab(tab: 'cast' | 'crew'): void {
    this.castTab.set(tab);
  }

  protected castTabKeydown(event: KeyboardEvent): void {
    const tabs = ['cast', 'crew'] as const;
    const currentIndex = tabs.indexOf(this.castTab());
    let nextIndex = currentIndex;
    if (event.key === 'ArrowLeft') nextIndex = (currentIndex + tabs.length - 1) % tabs.length;
    else if (event.key === 'ArrowRight') nextIndex = (currentIndex + 1) % tabs.length;
    else if (event.key === 'Home') nextIndex = 0;
    else if (event.key === 'End') nextIndex = tabs.length - 1;
    else return;

    event.preventDefault();
    const nextTab = tabs[nextIndex];
    this.setCastTab(nextTab);
    queueMicrotask(() => this.document.getElementById(`season-${nextTab}-tab`)?.focus());
  }

  protected episodeKey(episode: SeasonEpisodeCard): string {
    return `${episode.seasonNumber ?? this.seasonNumber()}-${episode.episodeNumber ?? 0}`;
  }

  protected episodeIsWatched(episode: SeasonEpisodeCard): boolean {
    return episode.viewerState.watchStatus === 'WATCHED';
  }

  protected episodeMyRating(episode: SeasonEpisodeCard): number | null {
    return episode.viewerState.myRating ?? null;
  }

  protected episodeActions(episode: SeasonEpisodeCard): readonly ContentImageAction[] {
    if (!this.episodeIsWatched(episode)) {
      return [
        { id: 'watch', label: this.copy.markWatched, icon: 'check' },
      ];
    }

    const actions: ContentImageAction[] = [
      { id: 'rewatch', label: this.copy.watchAgainAction, icon: 'rewatch' },
      { id: 'rate', label: this.episodeMyRating(episode) === null ? this.copy.rate : this.copy.editRating, icon: 'star' },
    ];
    if (episode.viewerState.latestDiaryEntryId) {
      actions.push({ id: 'remove-history', label: this.copy.removeEpisodeHistory, icon: 'trash' });
    }
    return actions;
  }

  protected bulkEpisodeCount(): number {
    const released = this.releasedEpisodeCount();
    return this.watched() ? released : Math.max(0, released - this.watchedEpisodeCount());
  }

  protected toggleEpisodeMenu(key: string, event: MouseEvent): void {
    event.stopPropagation();
    this.activeSeasonMenu.set(null);
    this.activeEpisodeMenu.update((active) => active === key ? null : key);
  }

  @HostListener('document:click', ['$event'])
  protected closeOpenMenus(event: MouseEvent): void {
    const target = event.target;
    const targetElement = target instanceof Element ? target : null;
    const watchedMenu = this.document.querySelector<HTMLDetailsElement>('.season-watched-actions[open]');
    const isWatchedMenuTrigger = !!targetElement?.closest('[data-ww-watched-menu-trigger]');
    if (watchedMenu && (!targetElement || (!watchedMenu.contains(targetElement) && !isWatchedMenuTrigger))) watchedMenu.open = false;
    if (targetElement?.closest('.season-lists-control, .season-card-menu, .season-navigation-menu')) return;
    this.activeSeasonMenu.set(null);
    this.activeEpisodeMenu.set(null);
    this.listsOpen.set(false);
  }

  protected episodeAction(episode: SeasonEpisodeCard, selection: ContentImageActionSelection): void {
    this.activeEpisodeMenu.set(null);
    if (selection.action.id === 'watch') this.openEpisodeWatchDialog(episode);
    else if (selection.action.id === 'rewatch') this.openEpisodeWatchDialog(episode, true);
    else if (selection.action.id === 'rate') this.openRating({ type: 'EPISODE', episode });
    else if (selection.action.id === 'remove-history') this.removeEpisodeHistory(episode);
  }

  protected async removeEpisodeHistory(episode: SeasonEpisodeCard): Promise<void> {
    const diaryEntryId = episode.viewerState.latestDiaryEntryId;
    if (!diaryEntryId || this.actionPending()) return;
    const confirmed = await this.confirmation.requestConfirmation({
      message: this.copy.removeWatchConfirm,
      confirmLabel: this.copy.removeEpisodeHistory,
    });
    if (!confirmed || this.actionPending()) return;
    this.runAction(this.api.deleteDiaryEntry(diaryEntryId), () => {
      this.showToast(this.copy.episodeHistoryRemoved);
      this.reload();
    });
  }

  protected episodeWatchSubtitle(episode: SeasonEpisodeCard): string {
    const season = episode.seasonNumber ?? this.seasonNumber();
    const number = episode.episodeNumber ?? 1;
    const title = episode.title?.trim();
    return `T${season} · E${number}${title ? ` · ${title}` : ''}`;
  }

  protected openEpisodeWatchDialog(episode: SeasonEpisodeCard, isRewatch = false): void {
    if (episode.seasonNumber === null || episode.episodeNumber === null) return;
    this.episodeWatchTarget.set({ episode, isRewatch });
  }

  protected closeEpisodeWatchDialog(): void {
    if (!this.actionPending()) this.episodeWatchTarget.set(null);
  }

  protected saveEpisodeWatch(submission: WatchLogSubmission): void {
    const target = this.episodeWatchTarget();
    if (!target || target.episode.seasonNumber === null || target.episode.episodeNumber === null) return;
    this.runAction(this.api.createSeriesDiaryEntry({
      content: {
        type: 'EPISODE',
        seriesTmdbId: target.episode.seriesTmdbId || this.tmdbId(),
        seasonNumber: target.episode.seasonNumber,
        episodeNumber: target.episode.episodeNumber,
        runtimeMinutes: target.episode.runtimeMinutes ?? undefined,
      },
      ...submission,
    }), () => {
      this.episodeWatchTarget.set(null);
      this.showToast(target.isRewatch ? 'Episódio registrado novamente.' : 'Episódio marcado como assistido.');
      this.reload();
    });
  }

  protected closeShareReview(): void {
    this.shareReviewOpen.set(false);
    const returnUrl = this.shareReturnUrl;
    this.shareReturnUrl = null;
    if (returnUrl) void this.router.navigateByUrl(returnUrl, { replaceUrl: true });
  }

  protected openBulkWatch(season?: SeasonListItem): void {
    this.bulkWatchSeason.set(season ?? null);
    if (!this.bulkWatchEpisodeCount()) {
      this.bulkWatchSeason.set(null);
      return;
    }
    this.watchDateMode.set('today');
    this.watchDate.set(this.localDate(new Date()));
    this.watchDialogOpen.set(true);
    queueMicrotask(() => this.seasonDialog?.nativeElement.focus());
  }

  protected openSeasonHistoryConfirmation(event: Event): void {
    const menu = (event.currentTarget as HTMLElement | null)?.closest<HTMLDetailsElement>('.season-watched-actions');
    if (menu) menu.open = false;
    this.seasonHistoryConfirmOpen.set(true);
    queueMicrotask(() => this.seasonHistoryDialog?.nativeElement.focus());
  }

  protected confirmRemoveSeasonHistory(): void {
    const userId = this.session.user()?.id;
    const seriesTmdbId = this.tmdbId();
    const seasonNumber = this.seasonNumber();
    if (!userId || !seriesTmdbId || this.actionPending()) return;

    const request = this.diaryApi.getEpisodeDiaryEntriesForSeries(userId, seriesTmdbId).pipe(
      switchMap((entries) => {
        const diaryEntryIds = entries
          .filter((entry) => entry.content.seasonNumber === seasonNumber)
          .map((entry) => entry.id);
        if (!diaryEntryIds.length) return of({ deletedCount: 0, failedCount: 0 });

        return from(diaryEntryIds).pipe(
          concatMap((diaryEntryId) => this.api.deleteDiaryEntry(diaryEntryId).pipe(
            map(() => true),
            catchError((error: unknown) => error instanceof HttpErrorResponse && error.status === 401
              ? throwError(() => error)
              : of(false)),
          )),
          toArray(),
          map((results) => ({
            deletedCount: results.filter(Boolean).length,
            failedCount: results.filter((deleted) => !deleted).length,
          })),
        );
      }),
    );

    if (this.actionPending()) return;
    this.actionPending.set(true);
    this.requests.add(request.subscribe({
      next: ({ deletedCount, failedCount }) => {
        this.actionPending.set(false);
        this.seasonHistoryConfirmOpen.set(false);
        this.reload();
        if (failedCount) this.showToast(this.copy.seasonHistoryRemovalPartial, 'error');
        else if (deletedCount) this.showToast(this.copy.seasonHistoryRemoved);
        else this.showToast(this.copy.seasonHistoryEmpty, 'error');
      },
      error: (error: unknown) => {
        this.actionPending.set(false);
        this.seasonHistoryConfirmOpen.set(false);
        if (this.handleSessionError(error)) return;
        this.reload();
        this.showToast(this.copy.seasonHistoryRemovalFailed, 'error');
      },
    }));
  }

  protected openWatchedOptions(event: Event): void {
    const row = (event.currentTarget as HTMLElement | null)?.closest('.movie-action-primary-row');
    const menu = row?.querySelector<HTMLDetailsElement>('.season-watched-actions');
    if (menu) menu.open = !menu.open;
  }

  protected saveBulkWatch(): void {
    const page = this.page();
    const targetSeason = this.bulkWatchSeason();
    if (!page || this.actionPending() || !this.bulkWatchEpisodeCount()) return;
    const wasWatched = this.bulkWatchIsRepeat();
    const watchedDate = this.watchDateMode() === 'release' ? null : this.watchDate();
    this.runAction(this.api.createBulkSeriesDiaryEntry({
      content: { type: 'SEASON', seriesTmdbId: this.tmdbId(), seasonNumber: targetSeason?.seasonNumber ?? this.seasonNumber() },
      watchedDate,
    }, crypto.randomUUID()), () => {
      this.watchDialogOpen.set(false);
      this.bulkWatchSeason.set(null);
      if (targetSeason && !wasWatched) {
        this.ratingPromptSeasonAfterLoad = {
          seriesTmdbId: targetSeason.seriesTmdbId,
          seasonNumber: targetSeason.seasonNumber,
        };
      } else {
        this.showToast(wasWatched ? 'Temporada registrada novamente no diário.' : 'Temporada adicionada ao diário.');
      }
      this.reload();
    });
  }

  protected openRating(target: RatingTarget = { type: 'SEASON' }): void {
    this.ratingReviewLoading.set(false);
    this.ratingTarget.set(target);
    this.ratingScore.set(target.type === 'SEASON'
      ? (target.season ? this.seasonItemMyRating(target.season) : this.page()?.viewerState.myRating) ?? 0
      : target.episode.viewerState.myRating ?? 0);
    if (target.type === 'EPISODE') {
      this.ratingReview.set(target.episode.viewerState.myReview ?? '');
    } else {
      const passNumber = this.seasonReviewPassNumber(target.season);
      const contentId = target.season?.contentId ?? this.contentId();
      const currentReview = passNumber === null || contentId !== this.contentId() ? null : this.reviews().find((review) =>
        review.source === 'CONTENT_REVIEW'
        && review.reviewer.id === this.session.user()?.id
        && review.watchNumber === passNumber,
      ) ?? null;
      this.ratingReview.set(currentReview?.comment ?? '');
      const userId = this.session.user()?.id;
      if (!currentReview && contentId && userId && passNumber !== null) {
        this.ratingReviewLoading.set(true);
        this.requests.add(this.findSeasonReview(contentId, (review) =>
          review.source === 'CONTENT_REVIEW'
          && review.reviewer.id === userId
          && review.watchNumber === passNumber,
        ).subscribe({
          next: (review) => {
            this.ratingReviewLoading.set(false);
            const activeTarget = this.ratingTarget();
            const activeContentId = activeTarget?.type === 'SEASON'
              ? activeTarget.season?.contentId ?? this.contentId()
              : null;
            if (review && activeContentId === contentId && this.ratingReview() === '') {
              this.ratingReview.set(review.comment ?? '');
              this.latestOwnSeasonReview.set(review);
            }
          },
          error: (error: unknown) => {
            this.ratingReviewLoading.set(false);
            if (!this.handleSessionError(error)) this.showToast(this.errorMessage(error), 'error');
          },
        }));
      }
    }
    this.ratingDialogOpen.set(true);
    queueMicrotask(() => this.seasonDialog?.nativeElement.focus());
  }

  protected ratingDialogSubtitle(): string {
    const target = this.ratingTarget();
    if (target?.type === 'EPISODE') {
      const season = target.episode.seasonNumber ?? this.seasonNumber();
      const episode = target.episode.episodeNumber ?? 0;
      const title = target.episode.title?.trim();
      return `${this.seriesName()} · T${season} · E${episode}${title ? ` · ${title}` : ''}`;
    }
    if (target?.type === 'SEASON' && target.season) {
      return `${this.seriesName()} · ${target.season.name?.trim() || `Temporada ${target.season.seasonNumber}`}`;
    }
    return `${this.seriesName()} · ${this.seasonName()}`;
  }

  protected setRatingScore(score: number): void {
    this.ratingScore.update((current) => current === score ? 0 : score);
  }

  protected updateRatingReview(event: Event): void {
    this.ratingReview.set((event.currentTarget as HTMLTextAreaElement).value);
  }

  protected saveRating(): void {
    const target = this.ratingTarget();
    const page = this.page();
    const score = this.ratingScore();
    if (!target || !page || this.actionPending()) return;
    if (target.type === 'SEASON') {
      this.saveSeasonRating(target, score);
      return;
    }
    if (!score) return;
    const request = (() => {
      const diaryRequest = { score, comment: this.ratingReview().trim() || null };
      const diaryEntryId = target.episode.viewerState.latestDiaryEntryId;
      if (diaryEntryId) return this.api.updateDiaryEntry(diaryEntryId, diaryRequest);
      return this.api.createSeriesDiaryEntry({
        content: {
          type: 'EPISODE',
          seriesTmdbId: this.tmdbId(),
          seasonNumber: target.episode.seasonNumber ?? this.seasonNumber(),
          episodeNumber: target.episode.episodeNumber ?? 1,
          runtimeMinutes: target.episode.runtimeMinutes ?? undefined,
        },
        ...diaryRequest,
        watchedDate: this.localDate(new Date()),
      });
    })();
    this.runAction(request, () => {
      this.ratingDialogOpen.set(false);
      this.showToast('Avaliação salva.');
      this.reload();
    });
  }

  protected openShareLatestSeasonReview(event?: Event): void {
    if (event) this.closeSeasonWatchedMenu(event);
    this.latestOwnSeasonReview.set(null);
    this.shareReviewOpen.set(true);
    const contentId = this.contentId();
    const userId = this.session.user()?.id;
    if (!contentId || !userId) return;
    this.requests.add(this.findSeasonReview(contentId, (review) =>
      review.source === 'CONTENT_REVIEW' && review.reviewer.id === userId,
    ).subscribe({
      next: (review) => {
        this.latestOwnSeasonReview.set(review);
      },
      error: (error: unknown) => {
        if (!this.handleSessionError(error)) this.showToast(this.errorMessage(error), 'error');
      },
    }));
  }

  private saveSeasonRating(target: Extract<RatingTarget, { type: 'SEASON' }>, score: number): void {
    const contentId = target.season?.contentId ?? this.contentId();
    const userId = this.session.user()?.id;
    const passNumber = this.seasonReviewPassNumber(target.season);
    const comment = this.ratingReview().trim();
    const state = target.season?.viewerState ?? this.page()?.viewerState;
    const currentRating = state?.myRating ?? 0;
    const ratingVersion = state?.currentRatingVersion ?? this.page()?.viewerState.currentRatingVersion ?? null;
    if (!contentId || (!score && !comment) || (comment && (!userId || passNumber === null))) return;

    const reviewRequest = this.findSeasonReview(contentId, (review) =>
      review.source === 'CONTENT_REVIEW'
      && review.reviewer.id === userId
      && review.watchNumber === passNumber,
    ).pipe(switchMap((existingReview) => {
      const requests: Observable<unknown>[] = [];
      if (comment) {
        if (existingReview) {
          if (existingReview.comment !== comment) requests.push(this.api.updateContentReview(existingReview.id, comment));
          if (score > 0 && score !== currentRating) requests.push(this.api.setContentRating(contentId, score, ratingVersion));
        } else {
          requests.push(this.api.createContentReview(contentId, {
            comment,
            ...(score > 0 ? { score, expectedRatingVersion: ratingVersion } : {}),
          }, crypto.randomUUID()));
        }
      } else {
        if (existingReview) requests.push(this.api.deleteContentReview(existingReview.id));
        if (score > 0 && score !== currentRating) requests.push(this.api.setContentRating(contentId, score, ratingVersion));
      }
      return requests.length ? forkJoin(requests) : of(null);
    }));

    this.runAction(reviewRequest, () => {
      this.ratingDialogOpen.set(false);
      this.latestOwnSeasonReview.set(null);
      this.showToast('Avaliação salva.');
      this.reload();
    });
  }

  private seasonReviewPassNumber(season?: SeasonListItem): number | null {
    const state = season?.viewerState ?? this.page()?.viewerState;
    const passNumber = state?.lastWatchNumber ?? state?.playsCount;
    if (passNumber != null && passNumber > 0) return passNumber;
    return state?.watchStatus === 'WATCHED' ? 1 : null;
  }

  private findSeasonReview(
    contentId: string,
    predicate: (review: ContentReview) => boolean,
    pageNumber = 1,
  ): Observable<ContentReview | null> {
    return this.api.getReviews(contentId, pageNumber, 'RECENT').pipe(switchMap((response) => {
      const review = response.content.find(predicate);
      return review || !response.hasNext
        ? of(review ?? null)
        : this.findSeasonReview(contentId, predicate, pageNumber + 1);
    }));
  }

  protected toggleLists(): void {
    const isOpen = !this.listsOpen();
    this.listsOpen.set(isOpen);
    if (isOpen && this.userListsStatus() !== 'ready') this.loadUserLists(1);
  }

  protected createList(): void {
    const name = this.newListName().trim();
    if (!name || this.actionPending()) return;
    this.runAction(this.api.createSeasonList(name, this.tmdbId(), this.seasonNumber()), () => {
      this.newListName.set('');
      this.listCreateOpen.set(false);
      this.showToast('Lista criada e temporada adicionada.');
      this.loadUserLists(1);
      this.refreshSeasonViewerState();
    });
  }

  protected loadUserLists(pageNumber: number): void {
    const userId = this.session.user()?.id;
    const contentId = this.contentId();
    if (!userId || !contentId) {
      this.userListsStatus.set('error');
      this.userListsError.set('Entre na sua conta para adicionar temporadas às listas.');
      return;
    }
    this.userListsStatus.set('loading');
    this.userListsError.set('');
    this.requests.add(this.api.getUserLists(userId, contentId, pageNumber).subscribe({
      next: (response) => {
        this.userListsPage.set(response);
        this.userLists.update((current) => pageNumber === 1 ? response.content : [...current, ...response.content]);
        this.userListsStatus.set('ready');
      },
      error: (error: unknown) => {
        if (!this.handleSessionError(error)) this.userListsError.set(this.errorMessage(error));
        this.userListsStatus.set('error');
      },
    }));
  }

  protected canAddToList(list: UserListSummary): boolean {
    return list.itemScope === null || list.itemScope === 'SEASON' || list.itemScope === 'MIXED';
  }

  protected toggleSeasonInList(list: UserListSummary): void {
    if (this.actionPending() || (list.containsContent !== true && !this.canAddToList(list))) return;
    this.listsOpen.set(false);
    this.listCreateOpen.set(false);
    this.newListName.set('');
    if (list.containsContent) {
      this.runAction(this.findSeasonItemInList(list.id, this.contentId(), 1).pipe(
        switchMap((itemId) => itemId ? this.api.removeListItem(list.id, itemId) : throwError(() => new Error('List item not found'))),
      ), () => {
        this.showToast('Temporada removida da lista.');
        this.updateSeasonListMembership(list, false);
      });
      return;
    }
    this.runAction(this.api.addSeasonToList(list.id, this.tmdbId(), this.seasonNumber()), () => {
      this.showToast('Temporada adicionada à lista.');
      this.updateSeasonListMembership(list, true);
    });
  }

  private updateSeasonListMembership(list: UserListSummary, containsContent: boolean): void {
    const updateList = (current: UserListSummary): UserListSummary => {
      if (current.id !== list.id) return current;
      const wasInList = current.containsContent === true;
      const countDelta = Number(containsContent) - Number(wasInList);
      return {
        ...current,
        containsContent,
        ...(current.itemsCount === undefined ? {} : { itemsCount: Math.max(0, current.itemsCount + countDelta) }),
      };
    };

    this.userLists.update((current) => current.map(updateList));
    this.userListsPage.update((current) => current
      ? { ...current, content: current.content.map(updateList) }
      : current);
    this.page.update((current) => {
      if (!current) return current;
      const lists = current.viewerState.lists.filter((item) => item.listId !== list.id);
      if (containsContent) lists.push({ listId: list.id, name: list.name, visibility: list.visibility });
      return { ...current, viewerState: { ...current.viewerState, lists } };
    });
  }

  private refreshSeasonViewerState(): void {
    const contentId = this.contentId();
    if (!contentId) return;
    this.requests.add(this.api.getSeasonPage(contentId).subscribe({
      next: (page) => this.page.update((current) => current
        ? { ...current, viewerState: page.viewerState }
        : current),
      error: (error: unknown) => {
        if (!this.handleSessionError(error)) this.showToast(this.errorMessage(error), 'error');
      },
    }));
  }

  protected loadMoreLists(): void {
    const current = this.userListsPage();
    if (current?.hasNext && this.userListsStatus() !== 'loading') this.loadUserLists(current.page + 1);
  }

  protected changeReviewSort(sort: ReviewSort): void {
    if (sort === this.reviewSort()) return;
    this.reviewSort.set(sort);
    this.reviews.set([]);
    this.loadReviews(1);
  }

  protected loadReviews(pageNumber: number): void {
    const contentId = this.contentId();
    if (!contentId) return;
    this.reviewStatus.set('loading');
    this.reviewError.set('');
    this.requests.add(this.api.getReviews(contentId, pageNumber, this.reviewSort()).subscribe({
      next: (response) => {
        this.reviewPage.set(response);
        this.reviews.update((current) => pageNumber === 1 ? response.content : [...current, ...response.content]);
        this.reviewStatus.set('ready');
      },
      error: (error: unknown) => {
        if (!this.handleSessionError(error)) this.reviewError.set(this.errorMessage(error));
        this.reviewStatus.set('error');
      },
    }));
  }

  protected loadComments(pageNumber: number): void {
    const contentId = this.contentId();
    if (!contentId) return;
    this.commentStatus.set('loading');
    this.commentError.set('');
    this.requests.add(this.api.getComments(contentId, pageNumber).subscribe({
      next: (response) => {
        this.commentPage.set(response);
        this.comments.update((current) => pageNumber === 1 ? response.content : [...current, ...response.content]);
        this.commentStatus.set('ready');
      },
      error: (error: unknown) => {
        if (!this.handleSessionError(error)) this.commentError.set(this.errorMessage(error));
        this.commentStatus.set('error');
      },
    }));
  }

  protected loadMoreReviews(): void {
    const current = this.reviewPage();
    if (current?.hasNext) this.loadReviews(current.page + 1);
  }

  protected loadMoreComments(): void {
    const current = this.commentPage();
    if (current?.hasNext) this.loadComments(current.page + 1);
  }

  protected reviewerName(review: ContentReview): string {
    return review.reviewer.name || `@${review.reviewer.username}`;
  }

  protected commentAuthorName(comment: ContentComment): string {
    return comment.user.name || `@${comment.user.username}`;
  }

  protected initials(value: string | null | undefined): string {
    return (value ?? '').trim().split(/\s+/).slice(0, 2).map((part) => part[0] ?? '').join('').toLocaleUpperCase('pt-BR') || 'W';
  }

  protected onCommentInput(event: Event): void {
    this.commentDraft.set((event.target as HTMLTextAreaElement).value);
  }

  protected submitComment(): void {
    const text = this.commentDraft().trim();
    if (!text || text.length > this.commentMaxLength || !this.contentId() || this.commentPending()) return;
    this.commentPending.set(true);
    this.requests.add(this.api.createComment(this.contentId(), { text, parentCommentId: this.replyTo()?.id ?? null }).subscribe({
      next: () => {
        this.commentPending.set(false);
        this.commentDraft.set('');
        this.replyTo.set(null);
        this.loadComments(1);
        this.reload();
      },
      error: (error: unknown) => {
        this.commentPending.set(false);
        if (!this.handleSessionError(error)) this.showToast(this.errorMessage(error), 'error');
      },
    }));
  }

  protected setReplyTo(comment: ContentComment): void {
    this.replyTo.set(comment);
    this.document.getElementById('season-comment-input')?.focus();
  }

  protected toggleCommentLike(comment: ContentComment): void {
    this.runAction(this.api.setCommentLike(comment.id, !comment.likedByMe), () => this.loadComments(1));
  }

  protected toggleReviewLike(review: ContentReview): void {
    this.runAction(this.api.setReviewLike(review.id, review.source, !review.likedByMe), () => this.loadReviews(1));
  }

  protected async deleteComment(comment: ContentComment): Promise<void> {
    if (comment.user.id !== this.session.user()?.id) return;
    const confirmed = await this.confirmation.requestConfirmation({
      message: this.copy.commentDeleteConfirm,
      confirmLabel: this.copy.commentDelete,
    });
    if (!confirmed || comment.user.id !== this.session.user()?.id) return;
    this.runAction(this.api.deleteComment(comment.id), () => this.loadComments(1));
  }

  protected closeDialog(): void {
    this.watchDialogOpen.set(false);
    this.bulkWatchSeason.set(null);
    this.seasonHistoryConfirmOpen.set(false);
    this.ratingPromptSeason.set(null);
    this.ratingDialogOpen.set(false);
    this.ratingTarget.set(null);
    this.ratingReviewLoading.set(false);
  }

  protected providerLabel(type: 'flatrate' | 'rent' | 'buy'): string {
    return type === 'flatrate' ? 'Assinatura' : type === 'rent' ? 'Aluguel' : 'Compra';
  }

  protected showToast(message: string, type: ToastNotificationType = 'success'): void {
    this.toasts[type](message);
  }

  private loadSeason(tmdbId: string, seasonNumber: number): void {
    if (this.ratingPromptSeasonAfterLoad?.seriesTmdbId !== tmdbId) {
      this.ratingPromptSeasonAfterLoad = null;
    }
    this.request?.unsubscribe();
    this.requests.unsubscribe();
    this.requests = new Subscription();
    this.page.set(null);
    this.seasons.set([]);
    this.status.set('loading');
    this.pageError.set('');
    this.tmdbId.set(tmdbId);
    this.seasonNumber.set(seasonNumber);
    this.activeSeasonMenu.set(null);
    this.bulkWatchSeason.set(null);
    this.contentId.set('');
    this.latestOwnSeasonReview.set(null);
    this.actionPending.set(false);
    this.ratingReviewLoading.set(false);
    this.reviews.set([]);
    this.comments.set([]);
    this.reviewPage.set(null);
    this.commentPage.set(null);
    this.reviewStatus.set('loading');
    this.commentStatus.set('loading');
    this.userLists.set([]);
    this.userListsPage.set(null);
    this.userListsStatus.set('loading');
    this.listsOpen.set(false);
    this.listCreateOpen.set(false);
    this.newListName.set('');
    this.activeEpisodeMenu.set(null);
    this.detailsExpanded.set(false);
    if (!tmdbId || !Number.isInteger(seasonNumber) || seasonNumber < 1) {
      this.pageError.set('Esta temporada não foi encontrada.');
      this.status.set('error');
      return;
    }
    this.request = this.api.createSeasonReference(tmdbId, seasonNumber).pipe(
      switchMap((reference) => {
        this.contentId.set(reference.id);
        return forkJoin({
          page: this.api.getSeasonPage(reference.id),
        });
      }),
    ).subscribe({
      next: ({ page }) => {
        if (page.details.type !== 'SEASON') {
          this.pageError.set('Esta temporada não foi encontrada.');
          this.status.set('error');
          return;
        }
        this.page.set(page);
        this.seasons.set((page.sections?.seasons ?? [])
          .filter((season): season is SeriesChildCard & { type: 'SEASON'; seasonNumber: number } =>
            season.type === 'SEASON' && season.seasonNumber !== null && season.seasonNumber > 0)
          .map((season) => ({
            contentId: season.contentId,
            seriesTmdbId: season.seriesTmdbId ?? tmdbId,
            seasonNumber: season.seasonNumber,
            name: season.title,
            episodeCount: season.episodeCount ?? season.viewerState.releasedEpisodeCount ?? null,
            airedEpisodeCount: season.airedEpisodeCount ?? null,
            posterUrl: season.posterPath,
            releaseDate: season.releaseDate,
            stats: season.stats,
            viewerState: season.viewerState,
          })));
        this.title.setTitle(`${page.details.parentTitle || 'Série'} · ${page.details.title || `Temporada ${seasonNumber}`} | Watchwise`);
        this.status.set('ready');
        if (this.ratingPromptSeasonAfterLoad?.seriesTmdbId === tmdbId) {
          const targetSeasonNumber = this.ratingPromptSeasonAfterLoad.seasonNumber;
          this.ratingPromptSeasonAfterLoad = null;
          const targetSeason = this.seasons().find((season) => season.seasonNumber === targetSeasonNumber);
          if (targetSeason) this.promptSeasonRating(targetSeason);
          else this.showToast('A temporada foi marcada como assistida, mas não foi possível carregar seus dados para avaliação.', 'warning');
        }
        this.loadReviews(1);
        this.loadComments(1);
        if (this.listsOpen()) this.loadUserLists(1);
        if (this.openShareReviewAfterLoad) {
          this.openShareReviewAfterLoad = false;
          this.openShareLatestSeasonReview();
        }
      },
      error: (error: unknown) => {
        if (!this.handleSessionError(error)) this.pageError.set(this.errorMessage(error));
        this.status.set('error');
      },
    });
  }

  private findSeasonItemInList(listId: string, contentId: string, pageNumber: number): Observable<string | null> {
    return this.api.getListItems(listId, pageNumber, 'SEASON').pipe(switchMap((response) => {
      const item = response.items.find((candidate) => candidate.content?.id === contentId);
      if (item) return of(item.id);
      return response.itemsHasNext ? this.findSeasonItemInList(listId, contentId, pageNumber + 1) : of(null);
    }));
  }

  private runAction<T>(request: Observable<T>, success: () => void): void {
    if (this.actionPending()) return;
    this.actionPending.set(true);
    this.requests.add(request.subscribe({
      next: () => {
        this.actionPending.set(false);
        success();
      },
      error: (error: unknown) => {
        this.actionPending.set(false);
        if (!this.handleSessionError(error)) this.showToast(this.errorMessage(error), 'error');
      },
    }));
  }

  private handleSessionError(error: unknown): boolean {
    if (!(error instanceof HttpErrorResponse) || error.status !== 401) return false;
    this.session.clear();
    void this.router.navigateByUrl('/login');
    return true;
  }

  private errorMessage(error: unknown): string {
    if (!(error instanceof HttpErrorResponse)) return 'Não foi possível carregar esta temporada.';
    if (error.status === 0) return 'Não foi possível conectar à API. Verifique sua conexão e tente novamente.';
    if (error.status === 400) return 'Confira os dados e tente novamente.';
    if (error.status === 403) return 'A API não autorizou esta ação.';
    if (error.status === 404) return 'Esta temporada não foi encontrada.';
    if (error.status === 429) return 'Muitas ações em pouco tempo. Aguarde e tente novamente.';
    return 'Não foi possível concluir esta ação.';
  }

  private localDate(date: Date): string {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  }

  private loadStylesheet(): void {
    const stylesheet = this.renderer.createElement('link') as HTMLLinkElement;
    this.renderer.setAttribute(stylesheet, 'rel', 'stylesheet');
    this.renderer.setAttribute(stylesheet, 'href', '/styles/movie-content.css');
    this.renderer.appendChild(this.document.head, stylesheet);
    this.stylesheet = stylesheet;
  }
}
