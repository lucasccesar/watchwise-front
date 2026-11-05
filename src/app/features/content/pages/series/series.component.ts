import { HttpErrorResponse } from '@angular/common/http';
import { DOCUMENT, NgTemplateOutlet } from '@angular/common';
import {
  Component,
  ElementRef,
  HostListener,
  OnDestroy,
  OnInit,
  Renderer2,
  ViewChild,
  computed,
  inject,
  signal,
} from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { DomSanitizer, Title } from '@angular/platform-browser';
import { forkJoin, Observable, Subscription, of, switchMap, throwError } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { AuthSessionService } from '../../../../core/session/session.service';
import { DiaryApiService, SeriesInProgressRecord } from '../../../diary/data-access/diary-api.service';
import { ContentImageAction, ContentImageActionSelection, ContentImageActionsComponent } from '../../../../shared/components/content-image-actions/content-image-actions.component';
import {
  ContentApiService,
  ContentComment,
  ContentPageStats,
  ContentPageResult,
  ContentReview,
  MovieVideo,
  ReviewSort,
  SeriesDiaryBulkRequest,
  SeriesEpisodeSummary,
  SeriesPage,
  SeriesSeasonSummary,
  UserListSummary,
} from '../../data-access/content-api.service';
import { movieMessages } from '../../i18n/movie.messages';
import { getVideoPlatformLabel } from '../../utils/content-video.utils';
import { formatSeriesNumber, getSeriesWatchProgress } from './series-page.utils';
import { PageSkeletonComponent } from '../../../../shared/components/page-skeleton/page-skeleton.component';
import { ContentListSkeletonComponent } from '../../../../shared/components/content-list-skeleton/content-list-skeleton.component';
import { ResponsiveBannerComponent } from '../../../../shared/components/responsive-banner/responsive-banner.component';
import { CommentItemComponent } from '../../../../shared/components/comment-item/comment-item.component';
import { buildCommentTree } from '../../../../shared/components/comment-item/comment-tree';
import { ToastNotificationsService, ToastNotificationType } from '../../../../shared/components/toast-notifications/toast-notifications.service';
import { ModalFocusDirective } from '../../../../shared/directives/modal-focus.directive';
import { ModalScrollLockDirective } from '../../../../shared/directives/modal-scroll-lock.directive';
import { CheckIconComponent } from '../../../../shared/components/check-icon/check-icon.component';
import { ShareReviewDialogComponent, ShareReviewDialogModel } from '../../../../shared/components/share-review-dialog/share-review-dialog.component';
import { ContentPosterPickerComponent } from '../../../../shared/components/content-poster-picker/content-poster-picker.component';
import { tmdbImageUrl, type TmdbImageSize } from '../../../../shared/utils/tmdb-image-url';
import { resolveRating } from '../../../../shared/utils/community-rating';

type PageStatus = 'loading' | 'ready' | 'error';
type DialogState = 'bulk' | 'completed' | 'lists' | 'rating' | 'videos' | null;
type WatchDateMode = 'today' | 'specific' | 'release';
type RatingTarget =
  | { type: 'SERIES' }
  | { type: 'EPISODE'; episode: SeriesEpisodeSummary }
  | { type: 'SEASON'; season: SeriesSeasonSummary };

@Component({
  selector: 'app-series-content',
  standalone: true,
  imports: [NgTemplateOutlet, RouterLink, ContentImageActionsComponent, PageSkeletonComponent, ContentListSkeletonComponent, ResponsiveBannerComponent, CommentItemComponent, ModalFocusDirective, ModalScrollLockDirective, CheckIconComponent, ShareReviewDialogComponent, ContentPosterPickerComponent],
  templateUrl: './series.component.html',
})
export class SeriesComponent implements OnInit, OnDestroy {
  protected readonly copy = movieMessages['pt-BR'];
  protected readonly page = signal<SeriesPage | null>(null);
  protected readonly progressRecord = signal<SeriesInProgressRecord | null>(null);
  protected readonly watchProgress = computed(() => this.calculateWatchProgress(this.page()));
  protected readonly pageStatus = signal<PageStatus>('loading');
  protected readonly pageError = signal('');
  protected readonly contentId = signal('');
  protected readonly tmdbId = signal('');
  protected readonly reviews = signal<ContentReview[]>([]);
  protected readonly comments = signal<ContentComment[]>([]);
  protected readonly reviewPage = signal<ContentPageResult<ContentReview> | null>(null);
  protected readonly commentPage = signal<ContentPageResult<ContentComment> | null>(null);
  protected readonly commentThreads = computed(() => buildCommentTree(this.comments()));
  protected readonly reviewStatus = signal<PageStatus>('loading');
  protected readonly commentStatus = signal<PageStatus>('loading');
  protected readonly reviewError = signal('');
  protected readonly commentError = signal('');
  protected readonly reviewSort = signal<ReviewSort>('POPULAR');
  protected readonly reviewCount = computed(() => this.page()?.visibleReviewsCount ?? 0);
  protected readonly remainingEpisodes = computed(() => {
    const current = this.page();
    if (!current) return 0;
    const released = current.viewerState.releasedEpisodeCount ?? current.details.numberOfEpisodes ?? 0;
    const watched = this.watchProgress().watchedEpisodeCount;
    return Math.max(0, released - watched);
  });
  protected readonly dialog = signal<DialogState>(null);
  protected readonly selectedVideoKey = signal<string | null>(null);
  protected readonly videoPlaying = signal(false);
  protected readonly selectedVideo = computed(() => {
    const videos = this.page()?.details.videos ?? [];
    return videos.find((video) => video.key === this.selectedVideoKey()) ?? videos[0] ?? null;
  });
  protected readonly shareReviewOpen = signal(false);
  protected readonly shareModel = computed<ShareReviewDialogModel | null>(() => {
    const page = this.page();
    if (!page) return null;
    const user = this.session.user();
    return {
      title: page.details.title || this.copy.untitled,
      subtitle: page.details.releaseDate?.slice(0, 4) ?? null,
      rating: page.viewerState.myRating,
      review: page.viewerState.myReview,
      backgroundUrl: this.backdropUrl(),
      posterUrl: this.posterUrl(),
      username: user?.username ?? null,
      avatarUrl: user?.profilePicture ?? null,
      selectionType: 'SERIES',
      tmdbId: page.details.tmdbId || this.tmdbId() || null,
    };
  });
  protected readonly videoEmbedUrl = computed(() => {
    const video = this.selectedVideo();
    if (!video || !this.isYoutubeVideo(video)) return null;
    return this.sanitizer.bypassSecurityTrustResourceUrl(`https://www.youtube-nocookie.com/embed/${video.key}?autoplay=1`);
  });
  protected readonly actionPending = signal(false);
  protected readonly commentPending = signal(false);
  protected readonly commentDraft = signal('');
  protected readonly commentHasSpoiler = signal(false);
  protected readonly replyTo = signal<ContentComment | null>(null);
  protected readonly activeSeriesImageMenu = signal<string | null>(null);
  protected readonly detailsExpanded = signal(false);
  protected readonly castTab = signal<'cast' | 'crew'>('cast');
  protected readonly peoplePane = signal<'watched' | 'watching'>('watched');
  protected readonly providersExpanded = signal(false);
  protected readonly listsExpanded = signal(false);
  protected readonly listCreateOpen = signal(false);
  protected readonly newListName = signal('');
  protected readonly userLists = signal<UserListSummary[]>([]);
  protected readonly userListsPage = signal<ContentPageResult<UserListSummary> | null>(null);
  protected readonly userListsStatus = signal<PageStatus>('loading');
  protected readonly userListsError = signal('');
  protected readonly watchDateMode = signal<WatchDateMode>('today');
  protected readonly watchDate = signal(this.localDate(new Date()));
  protected readonly ratingTarget = signal<RatingTarget | null>(null);
  protected readonly ratingScore = signal(0);
  protected readonly ratingReview = signal('');
  protected readonly ratingOptions = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
  protected readonly episodes = computed(() => {
    const current = this.page();
    if (!current) return [];
    const summaries = current.details.recentEpisodes ?? [];
    const cards = current.sections.recentEpisodes ?? [];
    return summaries.length ? summaries : cards.map((card) => ({
      seasonNumber: card.seasonNumber,
      episodeNumber: card.episodeNumber,
      name: card.title,
      airDate: card.releaseDate,
      runtime: card.runtimeMinutes,
      stillPath: card.posterPath,
    }));
  });
  protected readonly seasons = computed(() => {
    const current = this.page();
    if (!current) return [];
    const summaries = current.details.seasons ?? [];
    const cards = current.sections.seasons ?? [];
    const items = summaries.length ? summaries : cards.map((card) => ({
      seasonNumber: card.seasonNumber,
      name: card.title,
      posterPath: card.posterPath,
      airDate: card.releaseDate,
      episodeCount: null,
      airedEpisodeCount: null,
    }));
    return items.filter((season) => season.seasonNumber !== 0);
  });

  private readonly document = inject(DOCUMENT);
  private readonly sanitizer = inject(DomSanitizer);
  private readonly renderer = inject(Renderer2);
  private readonly title = inject(Title);
  private readonly subscriptions = new Subscription();
  private requests = new Subscription();
  protected modalOpener: HTMLElement | null = null;
  private completionNeedsReload = false;
  private stylesheet: HTMLLinkElement | null = null;
  private readonly toasts = inject(ToastNotificationsService);

  @ViewChild('seriesDialog')
  private seriesDialog?: ElementRef<HTMLElement>;

  constructor(
    private readonly route: ActivatedRoute,
    private readonly router: Router,
    private readonly api: ContentApiService,
    private readonly diaryApi: DiaryApiService,
    protected readonly session: AuthSessionService,
  ) {}

  ngOnInit(): void {
    this.loadStylesheet();
    this.subscriptions.add(this.route.paramMap.subscribe((params) => this.loadSeries(params.get('tmdbId')?.trim() ?? '')));
  }

  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
    this.requests.unsubscribe();
    if (this.stylesheet) this.renderer.removeChild(this.document.head, this.stylesheet);
  }

  protected loadSeries(tmdbId: string, knownContentId = ''): void {
    this.requests.unsubscribe();
    this.requests = new Subscription();
    this.page.set(null);
    this.progressRecord.set(null);
    this.pageStatus.set('loading');
    this.pageError.set('');
    this.contentId.set('');
    this.tmdbId.set(tmdbId);
    this.reviews.set([]);
    this.comments.set([]);
    this.reviewPage.set(null);
    this.commentPage.set(null);
    this.reviewStatus.set('loading');
    this.commentStatus.set('loading');
    this.listsExpanded.set(false);
    this.userLists.set([]);
    this.userListsPage.set(null);

    if (!tmdbId) {
      this.pageError.set('Esta série não foi encontrada.');
      this.pageStatus.set('error');
      return;
    }

    const reference$ = knownContentId ? of({ id: knownContentId }) : this.api.createSeriesReference(tmdbId);
    this.requests.add(reference$.pipe(switchMap((reference) => {
      this.contentId.set(reference.id);
      return forkJoin({
        page: this.api.getSeriesPage(reference.id),
        progress: this.getSeriesProgressRecord(tmdbId),
      });
    })).subscribe({
      next: ({ page, progress }) => {
        if (page.details.type !== 'SERIES') {
          this.pageError.set('Esta série não foi encontrada.');
          this.pageStatus.set('error');
          return;
        }
        this.progressRecord.set(progress);
        this.page.set(page);
        this.tmdbId.set(page.details.tmdbId || tmdbId);
        this.title.setTitle(`${page.details.title?.trim() || 'Série'} | Watchwise`);
        this.pageStatus.set('ready');
        this.loadReviews(1);
        this.loadComments(1);
      },
      error: (error: unknown) => {
        if (this.handleSessionError(error)) return;
        this.pageError.set(this.errorMessage(error));
        this.pageStatus.set('error');
      },
    }));
  }

  protected reload(): void {
    this.loadSeries(this.tmdbId(), this.contentId());
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
        if (this.handleSessionError(error)) return;
        this.reviewError.set(this.errorMessage(error));
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

  protected changeReviewSort(sort: ReviewSort): void {
    if (sort === this.reviewSort()) return;
    this.reviewSort.set(sort);
    this.reviews.set([]);
    this.loadReviews(1);
  }

  protected imageUrl(path: string | null | undefined, size: TmdbImageSize = 'w500'): string | null {
    return tmdbImageUrl(path, size);
  }

  protected posterUrl(): string | null {
    const details = this.page()?.details;
    return this.imageUrl(details?.customPosterUrl || this.page()?.metadata.presentationPosterPath || details?.posterPath, 'w500');
  }

  protected applyCustomPoster(customPosterUrl: string): void {
    this.page.update((current) => current
      ? { ...current, details: { ...current.details, customPosterUrl } }
      : current);
  }

  protected backdropUrl(): string | null {
    return this.imageUrl(this.page()?.details.backdropPath, 'w1280');
  }

  protected formatNumber(value: number | null | undefined, maximumFractionDigits = 1): string {
    return formatSeriesNumber(value, maximumFractionDigits);
  }

  protected formatRating(value: number | null | undefined): string {
    return this.formatNumber(value, 1);
  }

  protected averageRating(stats: ContentPageStats): number | null {
    return resolveRating(stats.averageScore, stats.tmdbVoteAverage).value;
  }

  protected averageRatingCaption(stats: ContentPageStats): string {
    const rating = resolveRating(stats.averageScore, stats.tmdbVoteAverage);
    return rating.source === 'tmdb'
      ? this.copy.tmdbRating
      : this.copy.ratingsCount.replace('{count}', this.formatNumber(stats.ratingsCount, 0));
  }

  protected contentRatingLabel(stats: ContentPageStats | undefined): string {
    if (!stats) return '';
    const rating = resolveRating(stats.averageScore, stats.tmdbVoteAverage);
    if (rating.value === null) return '';
    const source = rating.source === 'tmdb' ? this.copy.tmdbRating : this.copy.averageRating;
    return `${source}: ${this.formatRating(rating.value)} de 10`;
  }

  protected formatDate(value: string | null | undefined): string {
    if (!value) return '';
    const [year, month, day] = value.slice(0, 10).split('-').map(Number);
    if (!year || !month || !day) return '';
    return new Intl.DateTimeFormat('pt-BR', { day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(year, month - 1, day));
  }

  protected formatRuntime(minutes: number | null | undefined): string {
    if (!minutes || minutes < 0) return '';
    const hours = Math.floor(minutes / 60);
    const rest = minutes % 60;
    if (hours && rest) return `${hours}h ${rest}min`;
    return hours ? `${hours}h` : `${rest} min`;
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
    return (name ?? '').trim().split(/\s+/).slice(0, 2).map((part) => part[0] ?? '').join('').toUpperCase();
  }

  protected providerInitials(name: string): string {
    const first = name.trim().split(/\s+/)[0] ?? '';
    return first.endsWith('+') ? `${first.charAt(0)}+` : first.charAt(0).toUpperCase();
  }

  protected openSeriesWatch(event?: Event): void {
    this.captureDialogOpener(event);
    this.ratingTarget.set(null);
    this.watchDateMode.set('today');
    this.watchDate.set(this.localDate(new Date()));
    this.dialog.set('bulk');
    queueMicrotask(() => this.seriesDialog?.nativeElement.focus());
  }

  protected openVideos(event?: Event): void {
    this.captureDialogOpener(event);
    this.selectedVideoKey.set(this.page()?.details.videos[0]?.key ?? null);
    this.videoPlaying.set(false);
    this.dialog.set('videos');
    queueMicrotask(() => this.seriesDialog?.nativeElement.focus());
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

  private isYoutubeVideo(video: MovieVideo): boolean {
    if (!/^[a-zA-Z0-9_-]{11}$/.test(video.key)) return false;
    try {
      const hostname = new URL(video.url).hostname.toLowerCase();
      return hostname === 'youtube.com' || hostname === 'www.youtube.com' || hostname === 'youtu.be';
    } catch {
      return false;
    }
  }

  protected openSeasonWatch(season: SeriesSeasonSummary, event?: Event): void {
    this.captureDialogOpener(event);
    this.ratingTarget.set({ type: 'SEASON', season });
    this.watchDateMode.set('today');
    this.watchDate.set(this.localDate(new Date()));
    this.dialog.set('bulk');
    queueMicrotask(() => this.seriesDialog?.nativeElement.focus());
  }

  protected episodeMenuKey(episode: SeriesEpisodeSummary): string {
    return `episode-${episode.seasonNumber ?? 0}-${episode.episodeNumber ?? 0}`;
  }

  protected episodeRoute(episode: SeriesEpisodeSummary): string[] {
    const id = this.tmdbId();
    if (episode.seasonNumber === null || episode.episodeNumber === null) return ['/content/series', id];
    return ['/content/series', id, 'season', String(episode.seasonNumber), 'episode', String(episode.episodeNumber)];
  }

  protected openEpisodeShareReview(episode: SeriesEpisodeSummary): void {
    this.activeSeriesImageMenu.set(null);
    void this.router.navigate(this.episodeRoute(episode), {
      state: { openShareReview: true, shareReturnUrl: this.router.url },
    });
  }

  protected seasonMenuKey(season: SeriesSeasonSummary): string {
    return `season-${season.seasonNumber ?? 0}`;
  }

  protected imageActionsFor(isWatched: boolean, type: 'episode' | 'season', hasRating = false): readonly ContentImageAction[] {
    if (type === 'episode') {
      return [
        { id: 'rate', label: hasRating ? this.copy.editRating : this.copy.rate, icon: 'star' },
        { id: 'rewatch', label: this.copy.rewatch, icon: 'rewatch', disabled: !isWatched },
        { id: 'share-review', label: this.copy.shareReview, icon: 'share', disabled: !isWatched },
      ];
    }
    return [
      { id: 'watch', label: isWatched ? this.copy.watchAgain : this.copy.markWatched, icon: 'check' },
      { id: 'rate', label: 'Avaliar temporada', icon: 'star' },
    ];
  }

  protected toggleSeriesImageMenu(key: string, event: MouseEvent): void {
    event.stopPropagation();
    this.activeSeriesImageMenu.update((active) => active === key ? null : key);
  }

  protected episodeImageAction(episode: SeriesEpisodeSummary, selection: ContentImageActionSelection): void {
    this.activeSeriesImageMenu.set(null);
    if (selection.action.id === 'rewatch') this.markEpisodeWatched(episode, true);
    else if (selection.action.id === 'rate') this.openRating({ type: 'EPISODE', episode }, selection.event);
    else if (selection.action.id === 'share-review') this.openEpisodeShareReview(episode);
  }

  protected seasonImageAction(season: SeriesSeasonSummary, selection: ContentImageActionSelection): void {
    this.activeSeriesImageMenu.set(null);
    if (selection.action.id === 'watch') this.openSeasonWatch(season, selection.event);
    else if (selection.action.id === 'rate') this.openRating({ type: 'SEASON', season }, selection.event);
  }

  protected saveBulkWatch(): void {
    const tmdbId = this.tmdbId().trim();
    if (!tmdbId || this.actionPending()) return;
    const date = this.watchDateMode() === 'release' ? null : this.watchDate();
    let request: SeriesDiaryBulkRequest;
    const target = this.ratingTarget();
    if (target?.type === 'SEASON' && target.season.seasonNumber !== null) {
      request = { content: { type: 'SEASON', seriesTmdbId: tmdbId, seasonNumber: target.season.seasonNumber }, watchedDate: date };
    } else {
      request = { content: { type: 'SERIES', tmdbId }, watchedDate: date };
    }
    const completedWholeSeries = target?.type !== 'SEASON';
    this.runAction(this.api.createBulkSeriesDiaryEntry(request, crypto.randomUUID()), () => {
      if (completedWholeSeries) {
        this.completionNeedsReload = true;
        this.ratingTarget.set(null);
        this.dialog.set('completed');
      } else {
        this.closeDialog();
      }
      this.reload();
    });
  }

  protected openRating(target: RatingTarget, event?: Event): void {
    this.captureDialogOpener(event);
    this.ratingTarget.set(target);
    const series = this.page();
    this.ratingScore.set(target.type === 'SERIES'
      ? series?.viewerState.myRating ?? 0
      : target.type === 'SEASON'
        ? this.seasonMyRating(target.season) ?? 0
        : this.episodeMyRating(target.episode) ?? 0);
    this.ratingReview.set(target.type === 'SERIES'
      ? series?.viewerState.myReview ?? ''
      : target.type === 'EPISODE'
        ? this.findEpisodeCard(target.episode)?.viewerState.myReview ?? ''
        : '');
    this.dialog.set('rating');
    queueMicrotask(() => this.seriesDialog?.nativeElement.focus());
  }

  protected rateCompletedSeries(event?: Event): void {
    this.openRating({ type: 'SERIES' }, event);
  }

  protected updateRatingReview(event: Event): void {
    this.ratingReview.set((event.currentTarget as HTMLTextAreaElement).value);
  }

  protected ratingDialogSubtitle(): string {
    const target = this.ratingTarget();
    const seriesTitle = this.page()?.details.title || this.copy.untitled;
    if (target?.type === 'EPISODE') {
      return `${seriesTitle} · T${target.episode.seasonNumber ?? 0} · E${target.episode.episodeNumber ?? 0} · ${target.episode.name || 'Episódio'}`;
    }
    if (target?.type === 'SEASON') return `${seriesTitle} · Temporada ${target.season.seasonNumber ?? ''}`;
    if (target?.type === 'SERIES') {
      const seasons = this.page()?.details.numberOfSeasons ?? 0;
      const episodes = this.page()?.details.numberOfEpisodes ?? 0;
      return `${seriesTitle} · ${formatSeriesNumber(seasons)} temporadas · ${formatSeriesNumber(episodes)} episódios`;
    }
    return seriesTitle;
  }

  protected ratingDialogHeading(): string {
    return this.ratingScore() > 0 ? this.copy.editRating : this.copy.rate;
  }

  protected canSaveRating(): boolean {
    const target = this.ratingTarget();
    return target?.type === 'EPISODE' || target?.type === 'SERIES'
      ? this.ratingScore() > 0 || this.ratingReview().trim().length > 0
      : this.ratingScore() > 0;
  }

  protected saveRating(): void {
    const target = this.ratingTarget();
    const score = this.ratingScore();
    const tmdbId = this.tmdbId().trim();
    if (!target || !this.canSaveRating() || !tmdbId) return;
    const currentPage = this.page();
    if (target.type === 'SERIES') {
      const contentId = currentPage?.details.contentId;
      if (!contentId) return;
      const comment = this.ratingReview().trim();
      const reviewId = currentPage.viewerState.reviewIds?.[0] ?? null;
      const currentScore = currentPage.viewerState.myRating ?? 0;
      const requests: Observable<unknown>[] = [];
      if (comment) {
        if (reviewId) {
          requests.push(this.api.updateContentReview(reviewId, comment));
          if (score > 0 && score !== currentScore) {
            requests.push(this.api.setContentRating(contentId, score, currentPage.viewerState.currentRatingVersion ?? null));
          }
        } else {
          requests.push(this.api.createContentReview(contentId, {
            comment,
            ...(score > 0 ? { score } : {}),
            ...(score > 0 ? { expectedRatingVersion: currentPage.viewerState.currentRatingVersion ?? null } : {}),
          }, crypto.randomUUID()));
        }
      } else {
        if (reviewId) requests.push(this.api.deleteContentReview(reviewId));
        if (score > 0 && score !== currentScore) {
          requests.push(this.api.setContentRating(contentId, score, currentPage.viewerState.currentRatingVersion ?? null));
        }
      }
      if (!requests.length) return;
      this.runAction(forkJoin(requests), () => {
        const completionRefreshHandledByClose = target.type === 'SERIES' && this.completionNeedsReload;
        this.closeDialog();
        this.showToast('Avaliação salva.');
        if (!completionRefreshHandledByClose) this.reload();
      });
      return;
    }
    const season = target.type === 'SEASON'
      ? this.page()?.sections.seasons.find(card => card.seasonNumber === target.season.seasonNumber)
      : null;
    if (target.type === 'SEASON' && (!season?.contentId || !season.seasonNumber || season.seasonNumber < 1)) {
      this.showToast('Esta temporada não está disponível para avaliação.', 'warning');
      return;
    }
    const request = target.type === 'SEASON'
      ? this.api.setContentRating(season!.contentId, score, season!.viewerState.currentRatingVersion ?? null)
      : (() => {
          const card = this.findEpisodeCard(target.episode);
          const comment = this.ratingReview().trim();
          const request = {
            ...(score > 0 ? { score } : {}),
            comment: comment || null,
          };
          if (card?.viewerState.latestDiaryEntryId) {
            return this.api.updateDiaryEntry(card.viewerState.latestDiaryEntryId, request);
          }
          return this.api.createSeriesDiaryEntry({
            content: { type: 'EPISODE', seriesTmdbId: tmdbId, seasonNumber: target.episode.seasonNumber ?? 1, episodeNumber: target.episode.episodeNumber ?? 1 },
            ...request,
            watchedDate: this.localDate(new Date()),
          });
        })();
    this.runAction(request, () => {
      this.closeDialog();
      this.showToast('Avaliação salva.');
      this.reload();
    });
  }

  protected markEpisodeWatched(episode: SeriesEpisodeSummary, isRewatch = false): void {
    const tmdbId = this.tmdbId().trim();
    if (!tmdbId || episode.seasonNumber === null || episode.episodeNumber === null) return;
    const request = this.api.createSeriesDiaryEntry({
      content: { type: 'EPISODE', seriesTmdbId: tmdbId, seasonNumber: episode.seasonNumber, episodeNumber: episode.episodeNumber },
      watchedDate: this.localDate(new Date()),
      isRewatch,
    });
    this.runAction(request, () => this.reload());
  }

  protected toggleListsPanel(event?: Event): void {
    if (window.matchMedia('(max-width: 800px)').matches) {
      this.openLists(event);
      return;
    }
    const expanded = !this.listsExpanded();
    this.listsExpanded.set(expanded);
    if (expanded && !this.userListsPage()) this.loadUserLists(1);
  }

  protected openLists(event?: Event): void {
    this.captureDialogOpener(event);
    this.dialog.set('lists');
    this.listCreateOpen.set(false);
    this.loadUserLists(1);
    queueMicrotask(() => this.seriesDialog?.nativeElement.focus());
  }

  protected loadUserLists(pageNumber: number): void {
    const userId = this.session.user()?.id;
    const contentId = this.contentId();
    if (!userId || !contentId) {
      this.userListsStatus.set('error');
      this.userListsError.set(this.copy.listLoadError);
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

  protected toggleSeriesInList(list: UserListSummary): void {
    if (this.actionPending() || (list.containsContent !== true && !this.canAddContentToList(list))) return;
    if (list.containsContent) {
      this.runAction(this.findSeriesItemInList(list.id, this.contentId(), 1).pipe(
        switchMap((itemId) => itemId ? this.api.removeListItem(list.id, itemId) : throwError(() => new Error('List item not found'))),
      ), () => {
        this.showToast('Série removida da lista.');
        this.updateSeriesListMembership(list, false);
      });
      return;
    }
    this.runAction(this.api.addSeriesToList(list.id, this.tmdbId()), () => {
      this.showToast('Série adicionada à lista.');
      this.updateSeriesListMembership(list, true);
    });
  }

  private updateSeriesListMembership(list: UserListSummary, containsContent: boolean): void {
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

  private refreshSeriesViewerState(): void {
    const contentId = this.contentId();
    if (!contentId) return;
    this.requests.add(this.api.getSeriesPage(contentId).subscribe({
      next: (page) => this.page.update((current) => current
        ? { ...current, viewerState: page.viewerState }
        : current),
      error: (error: unknown) => {
        if (!this.handleSessionError(error)) this.showToast(this.errorMessage(error), 'error');
      },
    }));
  }

  protected canAddContentToList(list: UserListSummary): boolean {
    return list.itemScope === null || list.itemScope === 'MOVIE_OR_SERIES';
  }

  protected createSeriesList(): void {
    const name = this.newListName().trim();
    if (!name || name.length > 255 || this.actionPending()) return;
    this.runAction(this.api.createSeriesList(name, this.tmdbId()), () => {
      this.newListName.set('');
      this.listCreateOpen.set(false);
      this.showToast('Lista criada.');
      this.loadUserLists(1);
      this.refreshSeriesViewerState();
    });
  }

  protected loadMoreLists(): void {
    const current = this.userListsPage();
    if (current?.hasNext) this.loadUserLists(current.page + 1);
  }

  protected toggleWatchlist(): void {
    const series = this.page();
    const viewer = series?.viewerState;
    if (!series || !viewer || this.actionPending()) return;
    if (viewer.inWatchlist) {
      if (!viewer.watchlistEntryId) {
        this.showToast(this.copy.actionUnavailable, 'warning');
        this.reload();
        return;
      }
      this.runAction(this.api.removeSeriesFromWatchlist(viewer.watchlistEntryId), () => this.reload());
      return;
    }
    this.runAction(this.api.addSeriesToWatchlist(this.tmdbId()), () => {
      this.showToast(this.copy.contentUpdated);
      this.reload();
    }, (error) => {
      if (error instanceof HttpErrorResponse && error.status === 409 &&
        error.error?.message === 'Content already has watched activity') {
        this.showToast('Não é possível adicionar esta série à watchlist porque ela já tem episódios assistidos.', 'warning');
        this.reload();
        return;
      }
      this.showToast(this.errorMessage(error), 'error');
    });
  }

  protected toggleDropped(): void {
    const dropped = this.page()?.viewerState.dropped;
    const request = dropped ? this.api.removeSeriesDropped(this.tmdbId()) : this.api.markSeriesDropped(this.tmdbId());
    this.runAction(request, () => this.reload());
  }

  protected submitComment(): void {
    const text = this.commentDraft().trim();
    const contentId = this.contentId();
    if (!text || text.length > 280 || !contentId || this.commentPending()) return;
    this.commentPending.set(true);
    this.commentError.set('');
    this.requests.add(this.api.createComment(contentId, {
      text,
      parentCommentId: this.replyTo()?.id ?? null,
      containsSpoiler: this.commentHasSpoiler(),
    }).subscribe({
      next: () => {
        this.commentPending.set(false);
        this.commentDraft.set('');
        this.commentHasSpoiler.set(false);
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

  protected toggleCommentLike(comment: ContentComment): void {
    this.runAction(this.api.setCommentLike(comment.id, !comment.likedByMe), () => this.loadComments(1));
  }

  protected toggleReviewLike(review: ContentReview): void {
    this.runAction(this.api.setReviewLike(review.id, review.source, !review.likedByMe), () => this.loadReviews(1));
  }

  protected deleteComment(comment: ContentComment): void {
    if (comment.user.id !== this.session.user()?.id || !window.confirm('Excluir este comentário?')) return;
    this.runAction(this.api.deleteComment(comment.id), () => this.loadComments(1));
  }

  protected setReplyTo(comment: ContentComment): void {
    this.replyTo.set(comment);
    this.document.getElementById('series-comment-input')?.focus();
  }

  protected clearReply(): void {
    this.replyTo.set(null);
  }

  protected commentAuthorName(comment: ContentComment): string {
    return comment.user.name || `@${comment.user.username}`;
  }

  protected reviewerName(review: ContentReview): string {
    return review.reviewer.name || `@${review.reviewer.username}`;
  }

  protected onCommentInput(event: Event): void {
    this.commentDraft.set((event.target as HTMLTextAreaElement).value);
  }

  protected loadMoreReviews(): void {
    const current = this.reviewPage();
    if (current?.hasNext) this.loadReviews(current.page + 1);
  }

  protected loadMoreComments(): void {
    const current = this.commentPage();
    if (current?.hasNext) this.loadComments(current.page + 1);
  }

  protected commentsFor(parentId: string | null): ContentComment[] {
    return this.comments().filter((comment) => comment.parentCommentId === parentId);
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
    queueMicrotask(() => this.document.getElementById(`series-${nextTab}-tab`)?.focus());
  }

  protected toggleDetails(): void {
    this.detailsExpanded.update((value) => !value);
  }

  protected closeDialog(): void {
    const shouldReloadAfterCompletion = this.completionNeedsReload
      && (this.dialog() === 'completed' || (this.dialog() === 'rating' && this.ratingTarget()?.type === 'SERIES'));
    if (shouldReloadAfterCompletion) this.completionNeedsReload = false;
    this.dialog.set(null);
    this.videoPlaying.set(false);
    this.ratingTarget.set(null);
    this.modalOpener?.focus();
    this.modalOpener = null;
    if (shouldReloadAfterCompletion) this.reload();
  }

  protected closeMobileActions(): void {
    const menu = this.document.querySelector<HTMLDetailsElement>('.movie-mobile-more-actions[open]');
    if (!menu) return;
    menu.open = false;
    menu.querySelector<HTMLElement>('summary')?.focus();
  }

  protected episodeRatingsMapRoute(): string[] | null {
    const username = this.session.user()?.username;
    const tmdbId = this.tmdbId();
    return username && tmdbId ? ['/users', username, 'episode-ratings-map', tmdbId] : null;
  }

  protected openEpisodeRatingsMap(): void {
    const route = this.episodeRatingsMapRoute();
    if (!route) return;
    this.closeMobileActions();
    void this.router.navigate(route);
  }

  protected openShareReview(event?: Event): void {
    this.captureDialogOpener(event);
    this.shareReviewOpen.set(true);
  }

  protected closeShareReview(): void {
    this.shareReviewOpen.set(false);
    this.modalOpener?.focus();
    this.modalOpener = null;
  }

  protected clearSeriesHistory(): void {
    const series = this.page();
    const tmdbId = this.tmdbId();
    if (!series || !tmdbId || this.actionPending()) return;
    const title = series.details.title || this.copy.untitled;
    const message = this.copy.removeSeriesHistoryConfirm.replace('{title}', title);
    if (!window.confirm(message)) return;
    this.closeMobileActions();
    this.runAction(this.diaryApi.deleteSeriesDiaryHistory(tmdbId), () => {
      this.showToast(this.copy.seriesHistoryRemoved);
      this.reload();
    });
  }

  protected onSeriesCardMenuToggle(event: Event): void {
    const details = event.currentTarget as HTMLDetailsElement;
    const menu = details.querySelector<HTMLElement>('.movie-mobile-more-menu');
    if (!menu) return;
    if (!details.open || window.innerWidth > 800) {
      menu.removeAttribute('style');
      return;
    }

    queueMicrotask(() => {
      const trigger = details.querySelector<HTMLElement>('summary');
      if (!details.open || !trigger) return;
      const triggerRect = trigger.getBoundingClientRect();
      const menuWidth = menu.offsetWidth;
      const menuHeight = menu.offsetHeight;
      const left = Math.max(12, Math.min(triggerRect.right - menuWidth, window.innerWidth - menuWidth - 12));
      const top = Math.max(12, Math.min(triggerRect.bottom + 8, window.innerHeight - menuHeight - 12));
      Object.assign(menu.style, { position: 'fixed', top: `${top}px`, right: 'auto', left: `${left}px` });
    });
  }

  private calculateWatchProgress(series: SeriesPage | null): { watchedEpisodeCount: number; totalEpisodeCount: number; percentage: number } {
    if (!series) return { watchedEpisodeCount: 0, totalEpisodeCount: 0, percentage: 0 };

    const savedProgress = this.progressRecord();
    if (savedProgress) {
      const totalEpisodeCount = savedProgress.totalReleasedEpisodeCount ??
        series.viewerState.releasedEpisodeCount ??
        savedProgress.totalEpisodeCount ??
        series.details.numberOfEpisodes;
      return {
        ...getSeriesWatchProgress(
          savedProgress.watchedPercentage === 100 ? 'WATCHED' : null,
          savedProgress.watchedEpisodeCount,
          totalEpisodeCount,
        ),
        totalEpisodeCount: totalEpisodeCount ?? 0,
      };
    }

    const seasons = series.details.seasons.map((season) => {
      const card = series.sections.seasons.find((entry) => entry.seasonNumber === season.seasonNumber);
      return {
        watchStatus: card?.viewerState.watchStatus,
        watchedEpisodeCount: card?.viewerState.watchedEpisodeCount,
        totalEpisodeCount: card?.viewerState.releasedEpisodeCount ?? season.airedEpisodeCount ?? season.episodeCount,
      };
    });
    const episodeStates = new Map<string, boolean>();
    for (const episode of [...series.sections.episodes, ...series.sections.recentEpisodes]) {
      if (episode.seasonNumber === null || episode.episodeNumber === null) continue;
      const key = `${episode.seasonNumber}:${episode.episodeNumber}`;
      episodeStates.set(key, (episodeStates.get(key) ?? false) || episode.viewerState.watchStatus === 'WATCHED');
    }
    const seasonTotal = seasons.reduce((count, season) => count + (season.totalEpisodeCount ?? 0), 0);

    const totalEpisodeCount = series.viewerState.releasedEpisodeCount ??
      (seasonTotal || series.details.numberOfEpisodes);

    return {
      ...getSeriesWatchProgress(
        series.viewerState.watchStatus,
        series.viewerState.watchedEpisodeCount,
        totalEpisodeCount,
        seasons,
        [...episodeStates.values()].filter(Boolean).length,
      ),
      totalEpisodeCount: totalEpisodeCount ?? 0,
    };
  }

  private getSeriesProgressRecord(tmdbId: string): Observable<SeriesInProgressRecord | null> {
    const userId = this.session.user()?.id;
    if (!userId) return of(null);

    return this.diaryApi.getSeriesInProgress(userId, {
      page: 1,
      size: 100,
      sortBy: 'LAST_WATCHED',
      direction: 'DESC',
    }).pipe(
      map((page) => page.content.find((item) => String(item.seriesTmdbId) === String(tmdbId)) ?? null),
      catchError(() => of(null)),
    );
  }

  protected dateLabel(value: string | null | undefined): string {
    return value ? this.formatDate(value) : '—';
  }

  protected providerLabel(type: 'flatrate' | 'rent' | 'buy'): string {
    return type === 'flatrate' ? this.copy.subscription : type === 'rent' ? this.copy.rent : this.copy.buy;
  }

  protected bulkDialogTitle(): string {
    const target = this.ratingTarget();
    const series = this.page();
    if (target?.type === 'SEASON') {
      return this.seasonIsWatched(target.season)
        ? `Registrar ${target.season.name || 'temporada'} novamente`
        : `Marcar ${target.season.name || 'temporada'} como assistida`;
    }
    return series && this.seriesIsWatched(series)
      ? `Registrar ${series.details.title || 'série'} novamente`
      : `Marcar ${series?.details.title || 'série'} como assistida`;
  }

  protected bulkTargetName(): string {
    const target = this.ratingTarget();
    return target?.type === 'SEASON'
      ? target.season.name || 'Temporada'
      : this.page()?.details.title || 'Série';
  }

  protected bulkEpisodeCount(): number {
    const series = this.page();
    const target = this.ratingTarget();
    if (target?.type === 'SEASON') {
      const card = series?.sections.seasons.find((entry) => entry.seasonNumber === target.season.seasonNumber);
      const total = card?.viewerState.releasedEpisodeCount ?? target.season.airedEpisodeCount ?? target.season.episodeCount ?? 0;
      const watched = card?.viewerState.watchedEpisodeCount ?? 0;
      return this.seasonIsWatched(target.season) ? total : Math.max(0, total - watched);
    }
    if (!series) return 0;
    return this.seriesIsWatched(series)
      ? series.details.numberOfEpisodes ?? 0
      : this.remainingEpisodes();
  }

  protected bulkIsRepeatWatch(): boolean {
    const target = this.ratingTarget();
    if (target?.type === 'SEASON') return this.seasonIsWatched(target.season);
    const series = this.page();
    return !!series && this.seriesIsWatched(series);
  }

  protected seasonProgress(season: SeriesSeasonSummary): number {
    const card = this.page()?.sections.seasons.find((entry) => entry.seasonNumber === season.seasonNumber);
    const total = card?.viewerState.releasedEpisodeCount ?? season.airedEpisodeCount ?? season.episodeCount ?? 0;
    const watched = card?.viewerState.watchedEpisodeCount ?? 0;
    return total > 0 ? Math.min(100, Math.round((watched / total) * 100)) : 0;
  }

  protected seasonWatched(season: SeriesSeasonSummary): number {
    return this.page()?.sections.seasons.find((entry) => entry.seasonNumber === season.seasonNumber)?.viewerState.watchedEpisodeCount ?? 0;
  }

  protected seasonScore(season: SeriesSeasonSummary): number | null {
    const stats = this.page()?.sections.seasons.find((entry) => entry.seasonNumber === season.seasonNumber)?.stats;
    return stats ? resolveRating(stats.averageScore, stats.tmdbVoteAverage).value : null;
  }

  protected seriesIsWatched(series: SeriesPage): boolean {
    return series.viewerState.watchStatus === 'WATCHED' || this.calculateWatchProgress(series).percentage >= 100;
  }

  protected seriesPlayCount(series: SeriesPage): number {
    const reportedCount = Math.max(0, series.viewerState.playsCount ?? 0);
    return Math.max(reportedCount, this.seriesIsWatched(series) ? 1 : 0);
  }

  protected seasonMyRating(season: SeriesSeasonSummary): number | null {
    return this.page()?.sections.seasons.find((entry) => entry.seasonNumber === season.seasonNumber)?.viewerState.myRating ?? null;
  }

  protected seasonLastWatchedDate(season: SeriesSeasonSummary): string | null {
    const series = this.page();
    if (!series) return null;
    const cardDate = series.sections.seasons.find((entry) => entry.seasonNumber === season.seasonNumber)?.viewerState.lastWatchedDate;
    if (cardDate) return cardDate;
    return [...series.sections.episodes, ...series.sections.recentEpisodes]
      .filter((episode) => episode.seasonNumber === season.seasonNumber && episode.viewerState.lastWatchedDate)
      .map((episode) => episode.viewerState.lastWatchedDate as string)
      .sort((left, right) => right.localeCompare(left))[0] ?? null;
  }

  protected seasonIsWatched(season: SeriesSeasonSummary): boolean {
    const card = this.page()?.sections.seasons.find((entry) => entry.seasonNumber === season.seasonNumber);
    return card?.viewerState.watchStatus === 'WATCHED' || this.seasonProgress(season) === 100;
  }

  protected episodeIsWatched(episode: SeriesEpisodeSummary): boolean {
    const card = this.findEpisodeCard(episode);
    return card?.viewerState.watchStatus === 'WATCHED' || Boolean(card?.viewerState.lastWatchedDate);
  }

  protected episodeScore(episode: SeriesEpisodeSummary): number | null {
    const stats = this.findEpisodeCard(episode)?.stats;
    return stats ? resolveRating(stats.averageScore, stats.tmdbVoteAverage).value : null;
  }

  protected episodeRatingLabel(episode: SeriesEpisodeSummary): string {
    const stats = this.findEpisodeCard(episode)?.stats;
    return this.contentRatingLabel(stats);
  }

  protected seasonRatingLabel(season: SeriesSeasonSummary): string {
    const stats = this.page()?.sections.seasons.find((entry) => entry.seasonNumber === season.seasonNumber)?.stats;
    return this.contentRatingLabel(stats);
  }

  protected episodeMyRating(episode: SeriesEpisodeSummary): number | null {
    return this.findEpisodeCard(episode)?.viewerState.myRating ?? null;
  }

  protected episodeLastWatchedDate(episode: SeriesEpisodeSummary): string | null {
    return this.findEpisodeCard(episode)?.viewerState.lastWatchedDate ?? null;
  }

  private findEpisodeCard(episode: SeriesEpisodeSummary): SeriesPage['sections']['episodes'][number] | undefined {
    const sections = this.page()?.sections;
    if (!sections) return undefined;
    const matches = [...sections.recentEpisodes, ...sections.episodes].filter((entry) =>
      entry.seasonNumber === episode.seasonNumber && entry.episodeNumber === episode.episodeNumber,
    );
    return matches.find((entry) => Boolean(entry.viewerState.lastWatchedDate))
      ?? matches.find((entry) => entry.viewerState.watchStatus === 'WATCHED')
      ?? matches.find((entry) => entry.viewerState.myRating !== null)
      ?? matches[0];
  }

  protected watchedPercentage(): number {
    return this.watchProgress().percentage;
  }

  protected watchedEpisodeCount(): number {
    return this.watchProgress().watchedEpisodeCount;
  }

  protected totalWatchedEpisodeCount(): number {
    return this.watchProgress().totalEpisodeCount;
  }

  @HostListener('document:keydown', ['$event'])
  protected onDocumentKeydown(event: KeyboardEvent): void {
    if (event.key === 'Escape') {
      const openImageMenu = this.activeSeriesImageMenu();
      if (openImageMenu) {
        const trigger = this.document.querySelector<HTMLElement>(`app-content-image-actions[data-menu-key="${openImageMenu}"] .content-menu-trigger`);
        this.activeSeriesImageMenu.set(null);
        trigger?.focus();
        event.preventDefault();
        return;
      }
      const menu = this.document.querySelector<HTMLDetailsElement>(
        '.movie-mobile-more-actions[open], .series-card-more-actions[open]',
      );
      if (menu) {
        menu.open = false;
        menu.querySelector<HTMLElement>('summary')?.focus();
        event.preventDefault();
        return;
      }
    }
    if (!this.dialog()) return;
    if (event.key === 'Escape') {
      event.preventDefault();
      this.closeDialog();
      return;
    }
    if (event.key !== 'Tab') return;
    const root = this.seriesDialog?.nativeElement;
    if (!root) return;
    const focusable = Array.from(root.querySelectorAll<HTMLElement>('button:not([disabled]), a[href], input:not([disabled]), textarea:not([disabled])'));
    if (!focusable.length) return;
    if (event.shiftKey && this.document.activeElement === focusable[0]) {
      event.preventDefault();
      focusable.at(-1)?.focus();
    } else if (!event.shiftKey && this.document.activeElement === focusable.at(-1)) {
      event.preventDefault();
      focusable[0].focus();
    }
  }

  @HostListener('document:click', ['$event'])
  protected onDocumentClick(event: MouseEvent): void {
    const target = event.target;
    if (!(target instanceof Node)) return;
    const menus = this.document.querySelectorAll<HTMLDetailsElement>(
      '.movie-mobile-more-actions[open], .series-card-more-actions[open]',
    );
    menus.forEach((menu) => {
      if (!menu.contains(target)) menu.open = false;
    });
    const activeImageMenu = this.activeSeriesImageMenu();
    if (activeImageMenu && (!(target instanceof Element) || !target.closest(`app-content-image-actions[data-menu-key="${activeImageMenu}"]`))) {
      this.activeSeriesImageMenu.set(null);
    }
  }

  private captureDialogOpener(event?: Event): void {
    const target = event?.currentTarget;
    if (!(target instanceof HTMLElement)) return;
    const menu = target.closest<HTMLDetailsElement>('.movie-mobile-more-actions');
    this.modalOpener = menu?.querySelector<HTMLElement>('summary') ?? target;
    if (menu) menu.open = false;
  }

  private runAction<T>(request: Observable<T>, success: () => void, failure?: (error: unknown) => void): void {
    if (this.actionPending()) return;
    this.actionPending.set(true);
    this.requests.add(request.subscribe({
      next: () => {
        this.actionPending.set(false);
        success();
      },
      error: (error: unknown) => {
        this.actionPending.set(false);
        if (this.handleSessionError(error)) return;
        if (failure) failure(error);
        else this.showToast(this.errorMessage(error), 'error');
      },
    }));
  }

  private findSeriesItemInList(listId: string, contentId: string, pageNumber: number): Observable<string | null> {
    return this.api.getListItems(listId, pageNumber, 'SERIES').pipe(switchMap((response) => {
      const item = response.items.find((candidate) => candidate.content?.id === contentId);
      if (item) return of(item.id);
      return response.itemsHasNext ? this.findSeriesItemInList(listId, contentId, pageNumber + 1) : of(null);
    }));
  }

  private handleSessionError(error: unknown): boolean {
    if (!(error instanceof HttpErrorResponse) || error.status !== 401) return false;
    this.session.clear();
    void this.router.navigateByUrl('/login');
    return true;
  }

  private errorMessage(error: unknown): string {
    if (!(error instanceof HttpErrorResponse)) return 'Não foi possível carregar a série.';
    if (error.status === 0) return 'Não foi possível conectar à API. Verifique sua conexão e tente novamente.';
    if (error.status === 400) return 'Confira os dados e tente novamente.';
    if (error.status === 403) return 'A API não autorizou esta ação.';
    if (error.status === 404) return 'Esta série não foi encontrada.';
    if (error.status === 429) return 'Muitas ações em pouco tempo. Aguarde e tente novamente.';
    if (error.status === 502) return 'Os dados desta série estão temporariamente indisponíveis.';
    return 'Não foi possível concluir esta ação.';
  }

  private showToast(message: string, type: ToastNotificationType = 'success'): void {
    this.toasts[type](message);
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
