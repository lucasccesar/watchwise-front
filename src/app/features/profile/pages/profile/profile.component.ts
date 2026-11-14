import { DecimalPipe, NgTemplateOutlet } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  HostListener,
  OnDestroy,
  QueryList,
  ViewChild,
  ViewChildren,
  computed,
  inject,
  signal,
} from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { CdkDrag, CdkDragHandle, CdkDropList, moveItemInArray, type CdkDragDrop } from '@angular/cdk/drag-drop';
import { combineLatest, firstValueFrom, forkJoin, Observable, of, Subject, Subscription, switchMap, timer } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { AuthSessionService } from '../../../../core/session/session.service';
import { DiaryApiService, DiaryRecord, DiaryRecordPage, DiarySortBy, ProgressSortBy, SeriesInProgressPage, SeriesInProgressRecord } from '../../../diary/data-access/diary-api.service';
import { ListItemType, ListsApiService, UserListCard, UserListCardPage } from '../../../lists/data-access/lists-api.service';
import { PicksApiService, UserPickPreviewPage } from '../../../picks/data-access/picks-api.service';
import { SearchApiService, SearchContentView, SearchUserView, SearchView } from '../../../search-content/data-access/search-api.service';
import { WatchlistApiService, WatchlistContentType, WatchlistSort, WatchlistStatus, WatchlistView } from '../../../watchlist/data-access/watchlist-api.service';
import { ContentApiService, type ContentReviewSource, type ContentViewerState } from '../../../content/data-access/content-api.service';
import { ContentImageAction, ContentImageActionSelection, ContentImageActionsComponent, ContentListTarget } from '../../../../shared/components/content-image-actions/content-image-actions.component';
import { DialogBackdropComponent } from '../../../../shared/components/dialog-backdrop/dialog-backdrop.component';
import { ResponsiveBannerComponent } from '../../../../shared/components/responsive-banner/responsive-banner.component';
import { PageSkeletonComponent } from '../../../../shared/components/page-skeleton/page-skeleton.component';
import { PostWatchRatingPromptComponent } from '../../../../shared/components/post-watch-rating-prompt/post-watch-rating-prompt.component';
import { ModalFocusDirective } from '../../../../shared/directives/modal-focus.directive';
import { ToastNotificationsService } from '../../../../shared/components/toast-notifications/toast-notifications.service';
import { ConfirmationDialogService } from '../../../../shared/components/confirmation-dialog/confirmation-dialog.service';
import { ShareCardModel, SharePreviewComponent } from '../../../../shared/components/share-preview/share-preview.component';
import { ShareReviewDialogComponent, type ShareReviewDialogCopy, type ShareReviewDialogModel } from '../../../../shared/components/share-review-dialog/share-review-dialog.component';
import { ProfileCountryMapComponent } from '../../components/profile-country-map/profile-country-map.component';
import { EpisodeRatingsMapItem, ProfileApiService, ProfileAllTimeEdition, ProfileAllTimeStats, ProfileContentCard, ProfileContentMode, ProfileDiaryPreview, ProfileMonthReview, ProfileSummary, ProfileSummaryTopFiveEntry, ProfileYearReview, PublicUserProfile, TopFiveContentType, TopFiveEntry } from '../../data-access/profile-api.service';
import { messageCatalog } from '../../../../shared/i18n/messages';
import { movieMessages } from '../../../content/i18n/movie.messages';
import { tmdbImageUrl, type TmdbImageSize } from '../../../../shared/utils/tmdb-image-url';
import { resolveRating, type RatingSource } from '../../../../shared/utils/community-rating';
import { episodeContentNavigationState, episodeContentRoute } from '../../../../shared/utils/episode-content-route';
import { WatchLogDialogComponent, WatchLogSubmission } from '../../../../shared/components/watch-log-dialog/watch-log-dialog.component';
import { RatingDialogComponent, type RatingDialogCompanion, type RatingDialogLabels, type RatingDialogSubmission, type RatingDialogValue } from '../../../../shared/components/rating-dialog/rating-dialog.component';
import { SeriesBulkWatchDialogComponent, type SeriesBulkWatchSubmission } from '../../../../shared/components/series-bulk-watch-dialog/series-bulk-watch-dialog.component';

type ProfileSection = 'profile' | 'progress' | 'history' | 'reviews' | 'lists' | 'watchlist' | 'picks' | 'episode-ratings-map' | 'episode-ratings-map-show' | 'month-in-review' | 'year-in-review' | 'all-time-stats';
type ProfileTabKey = keyof typeof messageCatalog['pt-BR']['profilePage']['tabs'];
type LoadState = 'loading' | 'ready' | 'private' | 'error';
type ProfilePageMetadata = { page: number; size: number; totalElements: number; totalPages: number; hasNext: boolean };
type ProfileListSort = 'updatedAt' | 'rank' | 'name' | 'likesCount' | 'itemsCount' | 'commentsCount';
type ProfileActionViewerState = Pick<ContentViewerState, 'myRating' | 'myReview' | 'latestDiaryEntryId' | 'currentRatingVersion' | 'lastWatchedDate' | 'lastWatchNumber' | 'watchedInTheater' | 'playsCount'> & { reviewIds?: string[] };
type ResolvedTopFive = TopFiveEntry & { hasWatched: boolean; viewerHasWatched: boolean | null; card: ProfileContentCard | null; title: string; posterPath: string | null; backdropPath: string | null; releaseYear: number | null; averageScore: number | null; ratingSource: RatingSource; viewerRating: number | null | undefined; viewerReview: string | null; contentType: 'MOVIE' | 'SERIES' };
type ProfileActionContent = {
  type: 'MOVIE' | 'SERIES' | 'SEASON' | 'EPISODE';
  contentId: string | null;
  tmdbId: string | null;
  seriesTmdbId: string | null;
  seasonNumber: number | null;
  episodeNumber: number | null;
  title: string;
  subtitle: string;
  episodeCount?: number | null;
  diaryEntryId?: string | null;
  reviewId?: string | null;
  initialValue?: Partial<RatingDialogValue>;
  companions?: RatingDialogCompanion[];
  viewerState?: ProfileActionViewerState;
};
type ProfileRatingDialogTarget = ProfileActionContent & { viewerState: ProfileActionViewerState };
type TopFiveSearchRequest = { query: string; scope: 'MOVIE' | 'SERIES' };
type TopFiveSearchResult = { request: TopFiveSearchRequest; response: SearchView } | { request: TopFiveSearchRequest; error: unknown } | null;
type RecentSeriesCard = {
  activityId: string;
  contentId: string | null;
  canShareReview: boolean;
  hasWatched: boolean | null;
  viewerRating: number | null | undefined;
  seriesTmdbId: string;
  title: string;
  posterPath: string | null;
  backdropPath: string | null;
  releaseYear: number | null;
  watchedEpisodeCount: number;
  episodeCount: number | null;
  lastWatchedDate: string | null;
  score: number | null;
  currentRatingVersion: number | null;
  reviewIds: string[];
  lastWatchNumber: number | null;
  canEditRating: boolean;
};
type ProfileShareReviewRecord = {
  id: string;
  source?: 'DIARY' | 'CONTENT_REVIEW' | null;
  content: DiaryRecord['content'];
  card: (NonNullable<DiaryRecord['card']> & { viewerState?: ProfileContentCard['viewerState'] }) | null;
  comment: string | null;
  score: number | null;
  watchNumber: number | null;
  customPosterUrl: string | null;
  seriesTitle?: string | null;
};

const SECTION_KEYS: Array<{ key: ProfileTabKey; section: ProfileSection; path: string }> = [
  { key: 'profile', section: 'profile', path: '' },
  { key: 'progress', section: 'progress', path: 'progress' },
  { key: 'history', section: 'history', path: 'history' },
  { key: 'reviews', section: 'reviews', path: 'reviews' },
  { key: 'lists', section: 'lists', path: 'lists' },
  { key: 'watchlist', section: 'watchlist', path: 'watchlist' },
  { key: 'picks', section: 'picks', path: 'picks' },
  { key: 'episodeRatingsMap', section: 'episode-ratings-map', path: 'episode-ratings-map' },
  { key: 'monthInReview', section: 'month-in-review', path: 'month-in-review' },
  { key: 'yearInReview', section: 'year-in-review', path: 'year-in-review' },
  { key: 'allTimeStats', section: 'all-time-stats', path: 'all-time-stats' },
];

const SECTION_TAB_KEYS: Record<ProfileSection, ProfileTabKey> = {
  profile: 'profile',
  progress: 'progress',
  history: 'history',
  reviews: 'reviews',
  lists: 'lists',
  watchlist: 'watchlist',
  picks: 'picks',
  'episode-ratings-map': 'episodeRatingsMap',
  'episode-ratings-map-show': 'episodeRatingsMap',
  'month-in-review': 'monthInReview',
  'year-in-review': 'yearInReview',
  'all-time-stats': 'allTimeStats',
};

const PROFILE_OVERVIEW_TAB_KEYS = new Set<ProfileTabKey>([
  'profile',
  'progress',
  'episodeRatingsMap',
]);

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [DecimalPipe, NgTemplateOutlet, RouterLink, CdkDrag, CdkDragHandle, CdkDropList, ContentImageActionsComponent, DialogBackdropComponent, ModalFocusDirective, ProfileCountryMapComponent, SharePreviewComponent, ShareReviewDialogComponent, ResponsiveBannerComponent, PageSkeletonComponent, PostWatchRatingPromptComponent, WatchLogDialogComponent, RatingDialogComponent, SeriesBulkWatchDialogComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './profile.component.html',
  styleUrl: './profile.component.css',
})
export class ProfileComponent implements AfterViewInit, OnDestroy {
  private readonly toasts = inject(ToastNotificationsService);
  private readonly confirmation = inject(ConfirmationDialogService);
  @ViewChild('profileMenuButton') protected profileMenuTrigger?: ElementRef<HTMLElement>;
  protected readonly shareReturnFocus = signal<HTMLElement | null>(null);
  protected openSharePreview(event?: Event): void {
    this.shareReturnFocus.set(event?.currentTarget as HTMLElement ?? this.profileMenuTrigger?.nativeElement ?? null);
    this.profileMenuOpen.set(false); this.sharePreviewOpen.set(true);
  }
  protected readonly copy = messageCatalog['pt-BR'].profilePage;
  protected readonly listsCopy = messageCatalog['pt-BR'].listsPage;
  protected readonly watchlistCopy = messageCatalog['pt-BR'].watchlistPage;
  protected readonly picksCopy = messageCatalog['pt-BR'].picksPage;
  protected readonly homeCopy = messageCatalog['pt-BR'].home;
  protected readonly shareReviewCopy: ShareReviewDialogCopy = movieMessages['pt-BR'];
  protected readonly progressCopy = messageCatalog['pt-BR'].progressPage;
  protected readonly section = signal<ProfileSection>('profile');
  protected readonly status = signal<LoadState>('loading');
  protected readonly profileOverviewLoading = signal(false);
  protected readonly profile = signal<PublicUserProfile | null>(null);
  protected readonly foundUser = signal<SearchUserView | null>(null);
  protected readonly username = signal('');
  protected readonly mode = signal<ProfileContentMode>('MOVIE');
  protected readonly summary = signal<ProfileSummary | null>(null);
  protected readonly profileOverviewGenreCounts = computed(() =>
    [...(this.summary()?.genreCounts ?? [])]
      .sort((first, second) => second.count - first.count)
      .slice(0, 6),
  );
  protected readonly recentMovieEntries = signal<DiaryRecord[]>([]);
  protected readonly recentEpisodeEntries = signal<DiaryRecord[]>([]);
  protected readonly allDiaryEntries = signal<DiaryRecord[]>([]);
  protected readonly ratedEpisodeEntries = signal<DiaryRecord[]>([]);
  protected readonly reviewComments = signal<Record<string, string>>({});
  protected readonly profileShareReviews = signal<ProfileShareReviewRecord[]>([]);
  protected readonly shareReviewDialogModel = signal<ShareReviewDialogModel | null>(null);
  protected readonly profileWatchTarget = signal<ProfileActionContent | null>(null);
  protected readonly profileWatchIsRewatch = signal(true);
  protected readonly profileWatchOpener = signal<HTMLElement | null>(null);
  protected readonly profileWatchSaving = signal(false);
  protected readonly profilePostWatchRatingTarget = signal<ProfileRatingDialogTarget | null>(null);
  protected readonly profilePostWatchOpener = signal<HTMLElement | null>(null);
  protected readonly profileRatingTarget = signal<ProfileRatingDialogTarget | null>(null);
  protected readonly profileRatingInitialValue = computed<Partial<RatingDialogValue>>(() => {
    const target = this.profileRatingTarget();
    return target?.initialValue ?? (target ? {
      score: target.viewerState.myRating,
      comment: target.viewerState.myReview ?? '',
      watchedDate: target.viewerState.lastWatchedDate,
      isRewatch: target.viewerState.lastWatchNumber === null ? undefined : target.viewerState.lastWatchNumber > 1,
      watchedInTheater: undefined,
    } : {});
  });
  protected readonly profileRatingFriends = computed<RatingDialogCompanion[]>(() => this.profileRatingTarget()?.companions ?? []);
  protected readonly profileRatingOpener = signal<HTMLElement | null>(null);
  protected readonly profileRatingLoading = signal(false);
  protected readonly profileRatingLoadError = signal('');
  protected readonly profileRatingSaving = signal(false);
  protected readonly shareReviewDialogReturnFocus = signal<HTMLElement | null>(null);
  protected readonly recentReviewLikeBusyIds = signal<ReadonlySet<string>>(new Set());
  private readonly latestMovieReviewBackdropPath = signal<string | null | undefined>(undefined);
  protected readonly episodeStillPaths = signal<Record<string, string>>({});
  protected readonly summarySlide = signal(0);
  protected readonly historySummarySlide = signal(0);
  protected readonly hoveredProfileGenreIndex = signal<number | null>(null);
  protected readonly profileGenreMinimumWidths = signal<number[]>([]);
  protected readonly hoveredOverviewRatingIndex = signal<number | null>(null);
  protected readonly topFive = signal<ResolvedTopFive[]>([]);
  protected readonly topFiveEditorOpen = signal(false);
  protected readonly topFiveEditorItems = signal<ResolvedTopFive[]>([]);
  protected readonly topFiveSaving = signal(false);
  protected readonly topFiveSearchOpen = signal(false);
  protected readonly topFiveSearchQuery = signal('');
  protected readonly topFiveSearchLoading = signal(false);
  protected readonly topFiveSearchResults = signal<SearchContentView[]>([]);
  protected readonly topFiveSearchError = signal<string | null>(null);
  protected readonly topFiveEmptySlots = computed(() => Array.from(
    { length: Math.max(0, 5 - this.topFiveEditorItems().length) },
    (_, index) => this.topFiveEditorItems().length + index + 1,
  ));
  protected readonly topFiveDisplayEmptySlots = computed(() => Array.from(
    { length: Math.max(0, 5 - this.topFive().length) },
    (_, index) => this.topFive().length + index + 1,
  ));
  protected readonly topFiveEditorOpener = signal<HTMLElement | null>(null);
  protected readonly topFiveEditorDragStartDelay = { touch: 150, mouse: 0 };
  protected readonly diary = signal<DiaryRecordPage | null>(null);
  protected readonly progress = signal<SeriesInProgressPage | null>(null);
  private profileLoadVersion = 0;
  protected readonly lists = signal<UserListCardPage | null>(null);
  protected readonly listItemType = signal<ListItemType | null>(null);
  protected readonly listSort = signal<ProfileListSort>('rank');
  protected readonly listSortDirection = signal<'asc' | 'desc'>('asc');
  protected readonly listSource = signal<'ALL' | 'CREATED' | 'LIKED'>('ALL');
  protected readonly watchlist = signal<WatchlistView | null>(null);
  protected readonly watchlistType = signal<WatchlistContentType | null>(null);
  protected readonly watchlistGenre = signal<string | null>(null);
  protected readonly watchlistStatus = signal<WatchlistStatus>('ALL');
  protected readonly watchlistSort = signal<WatchlistSort>('DATE_ADDED');
  protected readonly watchlistDirection = signal<'ASC' | 'DESC'>('DESC');
  protected readonly profileFiltersOpen = signal(false);
  protected readonly picks = signal<UserPickPreviewPage | null>(null);
  protected readonly episodeMap = signal<import('../../data-access/profile-api.service').EpisodeRatingsMap | null>(null);
  protected readonly episodeGrid = signal<import('../../data-access/profile-api.service').EpisodeRatingsGrid | null>(null);
  protected readonly monthReview = signal<ProfileMonthReview | null>(null);
  protected readonly yearReview = signal<ProfileYearReview | null>(null);
  protected readonly allTime = signal<ProfileAllTimeStats | null>(null);
  protected readonly allTimeEdition = signal<ProfileAllTimeEdition | null>(null);
  protected readonly followState = signal<'SELF' | 'FOLLOWING' | 'PENDING' | 'NOT_FOLLOWING'>('NOT_FOLLOWING');
  protected readonly followsViewer = signal(false);
  protected readonly profileMenuOpen = signal(false);
  protected readonly sharePreviewOpen = signal(false);
  protected readonly savingProgressSeriesId = signal<string | null>(null);
  protected readonly currentPage = signal(1);

  @ViewChild('summaryGrid') private summaryGrid?: ElementRef<HTMLElement>;
  @ViewChild('historySummaryGrid') private historySummaryGrid?: ElementRef<HTMLElement>;
  @ViewChild('topFiveSearchInput') private topFiveSearchInput?: ElementRef<HTMLInputElement>;
  @ViewChild('topFiveEditorSave') private topFiveEditorSave?: ElementRef<HTMLButtonElement>;
  @ViewChildren('profileGenreLabel') private profileGenreLabels!: QueryList<ElementRef<HTMLElement>>;
  private profileGenreLabelObserver: ResizeObserver | null = null;
  private profileGenreLabelChanges?: Subscription;
  protected readonly historySort = signal<DiarySortBy>('NEWEST');
  protected readonly historyType = signal<'ALL' | 'MOVIE' | 'EPISODE'>('ALL');
  protected readonly historySeries = signal('');
  protected readonly historyScore = signal('');
  protected readonly historyDateFrom = signal('');
  protected readonly historyDateTo = signal('');
  protected readonly collapsedHistoryDays = signal<ReadonlySet<string>>(new Set());
  protected readonly progressSort = signal<ProgressSortBy>('LAST_WATCHED');
  protected readonly progressSortOpen = signal(false);
  protected readonly progressSortOptions: Array<{ value: ProgressSortBy; label: string }> = [
    { value: 'LAST_WATCHED', label: this.copy.progressSortWatched },
    { value: 'LAST_RELEASED', label: this.copy.progressSortRelease },
    { value: 'REMAINING_EPISODES', label: this.copy.progressSortEpisodesLeft },
    { value: 'REMAINING_RUNTIME', label: this.copy.progressSortTimeLeft },
  ];
  protected readonly progressDirection = signal<'ASC' | 'DESC'>('DESC');
  protected readonly expandedProgress = signal<ReadonlySet<string>>(new Set());
  protected readonly mapRatingMode = signal<'PERSONAL' | 'COMMUNITY'>('PERSONAL');
  protected readonly selectedMonth = signal(new Date().toISOString().slice(0, 7));
  protected readonly selectedYear = signal(new Date().getFullYear());
  protected readonly followBusy = signal(false);
  protected readonly activePosterMenu = signal<string | null>(null);
  protected readonly pageSize = 20;
  protected readonly progressPageSize = 6;
  protected readonly watchlistGenreOptions = signal<string[]>([]);
  private genreUserId = '';
  private genreRequest?: Subscription;
  protected readonly ratingScores = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
  protected readonly tabEntries = SECTION_KEYS.filter(({ key }) => PROFILE_OVERVIEW_TAB_KEYS.has(key));
  protected readonly overviewRatingsDistribution = computed(() => {
    if (this.mode() === 'MOVIE') return this.summary()?.ratingsDistribution ?? [];
    const counts = new Map<number, number>();
    for (const entry of this.ratedEpisodeEntries()) {
      if (entry.score === null || !Number.isFinite(entry.score)) continue;
      counts.set(entry.score, (counts.get(entry.score) ?? 0) + 1);
    }
    return [...counts].map(([score, count]) => ({ score, count })).sort((a, b) => a.score - b.score);
  });
  protected readonly overviewRatingsSummary = computed(() => {
    if (this.mode() === 'MOVIE') return this.summary()?.ratingsSummary ?? null;
    const entries = this.ratedEpisodeEntries().filter((entry) => entry.score !== null && Number.isFinite(entry.score));
    return {
      totalRatings: entries.length,
      averageScore: entries.length ? entries.reduce((sum, entry) => sum + (entry.score ?? 0), 0) / entries.length : null,
    };
  });
  protected readonly userName = computed(() => this.profile()?.name || this.foundUser()?.name || this.profile()?.username || this.foundUser()?.username || this.username());
  protected readonly recentSeriesItems = computed<RecentSeriesCard[]>(() => {
    const episodesBySeries = new Map<string, Set<string>>();
    for (const entry of [...this.allDiaryEntries(), ...this.recentEpisodeEntries()]) {
      const { type, seriesTmdbId, seasonNumber, episodeNumber } = entry.content;
      if (type !== 'EPISODE' || !seriesTmdbId || seasonNumber === null || episodeNumber === null) continue;
      const episodes = episodesBySeries.get(seriesTmdbId) ?? new Set<string>();
      episodes.add(`${seasonNumber}:${episodeNumber}`);
      episodesBySeries.set(seriesTmdbId, episodes);
    }

    return (this.summary()?.recentActivity ?? [])
      .filter((activity) => String(activity.type ?? activity.content?.type ?? activity.card?.type ?? '').toUpperCase() === 'SERIES')
      .map((activity) => {
        const card = activity.card;
        const seriesTmdbId = activity.content?.tmdbId
          ?? activity.content?.seriesTmdbId
          ?? activity.tmdbId
          ?? activity.seriesTmdbId
          ?? card?.tmdbId
          ?? card?.seriesTmdbId;
        if (!card || !seriesTmdbId) return null;
        const hasOwnerWatched = activity.source !== 'DROPPED_ENTRY' || (activity.timesWatched ?? 0) > 0;
        const hasWatched = this.profileViewerWatched(
          card.viewerState?.watchStatus,
          this.isOwnProfile() ? hasOwnerWatched : null,
        );
        const lastWatchNumber = activity.timesWatched ?? card.viewerState?.lastWatchNumber ?? null;
        const currentWatchNumber = card.viewerState?.lastWatchNumber ?? activity.timesWatched ?? null;
        return {
          activityId: activity.id,
          contentId: activity.content?.id ?? null,
          canShareReview: hasWatched === true,
          hasWatched,
          viewerRating: activity.score ?? this.profileViewerRating(card.viewerState?.myRating, null),
          seriesTmdbId: String(seriesTmdbId),
          title: card.title || this.copy.unavailable,
          posterPath: card.customPosterUrl || card.posterPath || null,
          backdropPath: card.backdropPath ?? null,
          releaseYear: card.releaseYear ?? null,
          watchedEpisodeCount: episodesBySeries.get(String(seriesTmdbId))?.size ?? 0,
          episodeCount: hasWatched === true ? episodesBySeries.get(String(seriesTmdbId))?.size ?? null : card.numberOfEpisodes ?? null,
          lastWatchedDate: activity.activityDate ?? activity.watchedDate ?? activity.lastWatchedDate ?? null,
          score: activity.score ?? card.viewerState?.myRating ?? null,
          currentRatingVersion: card.viewerState?.currentRatingVersion ?? null,
          reviewIds: card.viewerState?.reviewIds ?? [],
          lastWatchNumber,
          canEditRating: lastWatchNumber !== null && lastWatchNumber === currentWatchNumber,
        };
      })
      .filter((item): item is RecentSeriesCard => item !== null)
      .sort((a, b) => (b.lastWatchedDate || '').localeCompare(a.lastWatchedDate || ''))
      .slice(0, 6);
  });
  protected readonly recentReviewComment = (review: ProfileDiaryPreview): string | null =>
    this.reviewComments()[review.id] || review.comment || null;
  protected recentReviewTitle(review: ProfileDiaryPreview): string {
    const type = review.content?.type?.toUpperCase();
    if (type === 'EPISODE' || type === 'SEASON') {
      return review.seriesTitle || this.recentReviewSeriesTitle(review) || review.card?.title || this.copy.unavailable;
    }
    return review.card?.title || this.copy.unavailable;
  }
  protected recentReviewPoster(review: ProfileDiaryPreview): string | null {
    return this.imageUrl(review.customPosterUrl || review.card?.posterPath);
  }
  protected recentReviewDate(review: ProfileDiaryPreview): string | null {
    const type = review.content?.type?.toUpperCase();
    return type === 'SERIES'
      ? review.activityDate || review.watchedDate || null
      : review.watchedDate || review.activityDate || null;
  }
  protected recentReviewContext(review: ProfileDiaryPreview): string {
    const content = review.content;
    const type = content?.type?.toUpperCase();
    const year = review.card?.releaseYear ? String(review.card.releaseYear) : '';
    if (type === 'EPISODE') {
      const coordinates = [
        content?.seasonNumber !== null && content?.seasonNumber !== undefined ? `S${content.seasonNumber}` : null,
        content?.episodeNumber !== null && content?.episodeNumber !== undefined ? `E${content.episodeNumber}` : null,
      ].filter(Boolean).join(' · ');
      return review.seriesTitle || this.recentReviewSeriesTitle(review)
        ? [coordinates, review.card?.title || ''].filter(Boolean).join(' · ')
        : coordinates;
    }
    if (type === 'SEASON') {
      const season = content?.seasonNumber !== null && content?.seasonNumber !== undefined
        ? `${this.copy.season} ${content.seasonNumber}`
        : this.copy.season;
      return [season, year].filter(Boolean).join(' · ');
    }
    return year;
  }
  protected readonly canToggleRecentReviewLike = (review: ProfileDiaryPreview): boolean =>
    this.recentReviewLikeSource(review) !== null && typeof review.likedByMe === 'boolean';
  protected isRecentReviewLikeBusy(reviewId: string): boolean {
    return this.recentReviewLikeBusyIds().has(reviewId);
  }
  protected toggleRecentReviewLike(review: ProfileDiaryPreview): void {
    const source = this.recentReviewLikeSource(review);
    if (!source || typeof review.likedByMe !== 'boolean' || this.isRecentReviewLikeBusy(review.id)) return;

    const liked = !review.likedByMe;
    this.updateRecentReviewLikeState(review.id, liked);
    this.recentReviewLikeBusyIds.update((current) => new Set(current).add(review.id));
    this.contentApi.setReviewLike(review.id, source, liked)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => this.finishRecentReviewLikeRequest(review.id),
        error: () => {
          this.updateRecentReviewLikeState(review.id, !liked);
          this.finishRecentReviewLikeRequest(review.id);
          this.toasts.error(this.copy.likeError);
        },
      });
  }
  private recentReviewLikeSource(review: ProfileDiaryPreview): ContentReviewSource | null {
    if (review.source === 'DIARY_ENTRY') return 'DIARY';
    if (review.source === 'CONTENT_REVIEW') return 'CONTENT_REVIEW';
    return null;
  }
  private updateRecentReviewLikeState(reviewId: string, liked: boolean): void {
    this.summary.update((summary) => summary ? {
      ...summary,
      recentReviews: summary.recentReviews.map((review) => {
        if (review.id !== reviewId || review.likedByMe === liked) return review;
        return {
          ...review,
          likedByMe: liked,
          likesCount: Math.max(0, (review.likesCount ?? 0) + (liked ? 1 : -1)),
        };
      }),
    } : summary);
  }
  private finishRecentReviewLikeRequest(reviewId: string): void {
    this.recentReviewLikeBusyIds.update((current) => {
      const next = new Set(current);
      next.delete(reviewId);
      return next;
    });
  }
  protected readonly profileHeroBackdrop = computed(() => {
    if (this.status() !== 'ready') return undefined;
    const profile = this.profile();
    if (!profile) return undefined;
    if (profile.banner) return profile.banner;
    return this.latestMovieReviewBackdropPath();
  });
  protected readonly shareModel = computed<ShareCardModel>(() => {
    const profile = this.profile();
    return {
      kind: 'profile',
      title: profile?.name || profile?.username || this.username(),
      subtitle: `@${profile?.username ?? this.username()}`,
      authorName: profile?.name || profile?.username || 'Watchwise',
      username: profile?.username || this.username(),
      avatarUrl: profile?.profilePicture,
      backgroundUrl: this.imageUrl(profile?.banner, 'w1280'),
      description: profile?.description,
      items: this.topFive().slice(0, 5).map((entry) => ({
        title: entry.title || this.copy.unavailable,
        imageUrl: this.imageUrl(entry.posterPath, 'w342'),
        label: entry.title || this.copy.unavailable,
      })),
      recentItems: (this.mode() === 'MOVIE' ? this.summary()?.recentReviews : this.summary()?.recentEpisodes ?? [])
        ?.slice(0, 5)
        .map((entry) => ({
          title: entry.card?.title || this.copy.unavailable,
          imageUrl: this.imageUrl(entry.customPosterUrl || entry.card?.customPosterUrl || entry.card?.posterPath, 'w342'),
          rating: entry.score,
        })) ?? [],
    };
  });
  protected readonly mapShareModel = computed<ShareCardModel>(() => {
    const grid = this.episodeGrid();
    const profile = this.profile();
    const seasons = this.episodeSeasons();
    const episodeNumbers = this.episodeNumbers();
    const isCommunity = this.mapRatingMode() === 'COMMUNITY';
    return {
      kind: 'ratings-map',
      title: grid?.title || this.copy.unavailable,
      subtitle: this.copy.mapTitle,
      description: `Como ${profile?.name || profile?.username || this.username()} avaliou cada episódio, temporada por temporada.`,
      authorName: profile?.name || profile?.username || this.username(),
      username: profile?.username || this.username(),
      avatarUrl: profile?.profilePicture,
      backgroundUrl: this.imageUrl(grid?.backdropPath, 'w1280') || this.imageUrl(grid?.posterPath, 'w780'),
      ratingsMatrix: {
        columnLabels: seasons.map((season) => `T${season.seasonNumber}`),
        rowLabels: episodeNumbers.map((episodeNumber) => `E${episodeNumber}`),
        cells: episodeNumbers.map((episodeNumber) => seasons.map((season) => {
          const episode = this.episodeAt(episodeNumber, season.seasonNumber);
          return episode ? (isCommunity ? episode.averageScore : episode.score) : null;
        })),
        averages: seasons.map((season) => {
          const rated = season.episodes.filter((episode) => isCommunity
            ? episode.averageScore !== null && episode.ratingCount > 0
            : episode.score !== null);
          if (!rated.length) return null;
          if (isCommunity) {
            const count = rated.reduce((sum, episode) => sum + episode.ratingCount, 0);
            return count ? rated.reduce((sum, episode) => sum + (episode.averageScore ?? 0) * episode.ratingCount, 0) / count : null;
          }
          return rated.reduce((sum, episode) => sum + (episode.score ?? 0), 0) / rated.length;
        }),
      },
    };
  });
  protected readonly activeShareModel = computed(() => this.section() === 'episode-ratings-map-show' ? this.mapShareModel() : this.shareModel());
  protected readonly shareUrl = computed(() => {
    const grid = this.episodeGrid();
    const path = this.section() === 'episode-ratings-map-show' && grid
      ? this.selectedSectionUrl(`episode-ratings-map/${encodeURIComponent(grid.seriesTmdbId)}`).join('/')
      : this.selectedSectionUrl('').join('/');
    return `${window.location.origin}${path}`;
  });
  protected readonly titleKey = computed(() => this.copy.tabs[SECTION_TAB_KEYS[this.section()]]);
  protected readonly isFollowing = computed(() => this.followState() === 'FOLLOWING' || this.followState() === 'SELF');
  protected readonly profileImageActions: readonly ContentImageAction[] = [
    { id: 'open-content', label: 'Abrir conteúdo', icon: 'eye' },
  ];
  protected listTargetForContent(content: {
    id?: string | null;
    type?: string | null;
    tmdbId?: string | null;
    seriesTmdbId?: string | null;
    seasonNumber?: number | null;
    episodeNumber?: number | null;
  } | null): ContentListTarget | null {
    if (!content) return null;
    const type = content.type?.toUpperCase();
    if (type === 'MOVIE' && content.tmdbId) return { type, tmdbId: content.tmdbId, contentId: content.id };
    if (type === 'SERIES' && (content.tmdbId || content.seriesTmdbId)) return { type, tmdbId: content.tmdbId || content.seriesTmdbId!, contentId: content.id };
    if (type === 'SEASON' && content.seriesTmdbId && content.seasonNumber != null) return { type, seriesTmdbId: content.seriesTmdbId, seasonNumber: content.seasonNumber, contentId: content.id };
    if (type === 'EPISODE' && content.seriesTmdbId && content.seasonNumber != null && content.episodeNumber != null) {
      return { type, seriesTmdbId: content.seriesTmdbId, seasonNumber: content.seasonNumber, episodeNumber: content.episodeNumber, contentId: content.id };
    }
    return null;
  }
  protected listTargetForProfileCard(type: string | null, tmdbId: string | null, seriesTmdbId: string | null): ContentListTarget | null {
    if (type === 'MOVIE' && tmdbId) return { type: 'MOVIE', tmdbId };
    if (type === 'SERIES' && (tmdbId || seriesTmdbId)) return { type: 'SERIES', tmdbId: tmdbId || seriesTmdbId! };
    return null;
  }
  protected profileContentActionsFor(
    score: number | null | undefined,
    canShareReview = true,
    hasWatched: boolean | null = null,
  ): readonly ContentImageAction[] {
    const hasRating = score !== null && score !== undefined;
    const actions: ContentImageAction[] = [];
    if (hasRating) {
      actions.push({ id: 'edit-rating', label: this.homeCopy.editRating, icon: 'star' });
    } else if (hasWatched === true) {
      actions.push({ id: 'rate', label: this.homeCopy.rate, icon: 'star' });
    }
    if (hasWatched === false) actions.push({ id: 'mark-watched', label: this.homeCopy.markWatched, icon: 'check' });
    if (hasWatched === true) {
      actions.push({ id: 'rewatch', label: this.homeCopy.rewatch, icon: 'rewatch' });
      if (canShareReview) actions.push({ id: 'share-review', label: this.homeCopy.shareReview, icon: 'share' });
    }
    return actions;
  }

  protected profileDiaryActionsFor(entry: DiaryRecord): readonly ContentImageAction[] {
    const viewerState = this.profileViewerStateForDiaryEntry(entry);
    const fallbackWatched = this.isOwnProfile() ? true : null;
    const hasWatched = this.profileViewerWatched(viewerState?.watchStatus, fallbackWatched);
    const viewerRating = this.profileViewerRating(viewerState?.myRating, entry.score);
    return this.profileContentActionsFor(viewerRating, hasWatched === true, hasWatched);
  }

  protected profileRecentSeriesActionsFor(entry: RecentSeriesCard): readonly ContentImageAction[] {
    const actions = this.profileContentActionsFor(entry.viewerRating, entry.canShareReview, entry.hasWatched);
    return entry.canEditRating
      ? actions
      : actions.filter((action) => action.id !== 'rate' && action.id !== 'edit-rating');
  }

  private profileViewerStateForDiaryEntry(entry: DiaryRecord): ProfileContentCard['viewerState'] | null {
    const summary = this.summary();
    const activityCard = summary?.recentActivity.find((activity) =>
      activity.source === 'DIARY_ENTRY' && activity.id === entry.id,
    )?.card;
    if (activityCard?.viewerState) return activityCard.viewerState;
    const preview = [...(summary?.recentEpisodes ?? []), ...(summary?.recentReviews ?? [])]
      .find((item) => item.id === entry.id);
    return preview?.card?.viewerState ?? null;
  }

  private profileViewerWatched(status: string | null | undefined, fallback: boolean | null): boolean | null {
    if (status === 'WATCHED') return true;
    if (status === 'UNWATCHED' || status === 'PARTIALLY_WATCHED') return false;
    return fallback;
  }

  private profileViewerRating(viewerRating: number | null | undefined, fallback: number | null): number | null | undefined {
    if (viewerRating !== undefined) return viewerRating;
    return this.isOwnProfile() ? fallback : undefined;
  }

  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly session = inject(AuthSessionService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly searchApi = inject(SearchApiService);
  private readonly topFiveSearchRequests = new Subject<TopFiveSearchRequest | null>();
  protected readonly topFiveSearchOpener = signal<HTMLElement | null>(null);
  private readonly profileApi = inject(ProfileApiService);
  private readonly diaryApi = inject(DiaryApiService);
  private readonly listsApi = inject(ListsApiService);
  private readonly watchlistApi = inject(WatchlistApiService);
  private readonly picksApi = inject(PicksApiService);
  private readonly contentApi = inject(ContentApiService);

  constructor() {
    this.destroyRef.onDestroy(() => this.genreRequest?.unsubscribe());
    this.topFiveSearchRequests
      .pipe(
        switchMap((request) => request
          ? timer(300).pipe(
            switchMap(() => this.searchApi.search(request.query, request.scope).pipe(
              map((response): TopFiveSearchResult => ({ request, response })),
              catchError((error: unknown) => of({ request, error })),
            )),
          )
          : of(null)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((result) => this.applyTopFiveSearchResult(result));
    combineLatest([this.route.paramMap, this.route.data])
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(([params, data]) => {
        const section = (data['profileSection'] as ProfileSection) || 'profile';
        this.username.set(params.get('username') ?? (section === 'progress' ? this.session.user()?.username ?? '' : ''));
        this.section.set(section);
        this.historyType.set('ALL');
        this.historySeries.set('');
        this.historyScore.set('');
        this.historyDateFrom.set('');
        this.historyDateTo.set('');
        this.historySort.set('NEWEST');
        this.listItemType.set(null);
        this.listSort.set('rank');
        this.listSortDirection.set('asc');
        this.listSource.set('ALL');
        this.watchlistType.set(null);
        this.watchlistGenre.set(null);
        this.watchlistStatus.set('ALL');
        this.watchlistSort.set('DATE_ADDED');
        this.watchlistDirection.set('DESC');
        this.profileFiltersOpen.set(false);
        this.topFiveEditorOpen.set(false);
        this.topFiveEditorItems.set([]);
        this.topFiveEditorOpener.set(null);
        this.progressSort.set('LAST_WATCHED');
        this.progressDirection.set('DESC');
        this.mapRatingMode.set('PERSONAL');
        this.collapsedHistoryDays.set(new Set());
        this.mode.set(
          section === 'month-in-review' || section === 'year-in-review' || section === 'all-time-stats'
            ? 'EPISODE'
            : 'MOVIE',
        );
        this.currentPage.set(1);
        this.resetSectionData();
        this.loadProfile();
      });
  }

  ngAfterViewInit(): void {
    if (typeof ResizeObserver !== 'undefined') {
      this.profileGenreLabelObserver = new ResizeObserver(() => this.updateProfileGenreMinimumWidths());
    }
    this.profileGenreLabelChanges = this.profileGenreLabels.changes.subscribe(() => this.observeProfileGenreLabels());
    this.observeProfileGenreLabels();
  }

  ngOnDestroy(): void {
    this.profileGenreLabelChanges?.unsubscribe();
    this.profileGenreLabelObserver?.disconnect();
  }

  protected chooseMode(mode: ProfileContentMode): void {
    if (this.mode() === mode) return;
    this.topFiveEditorOpen.set(false);
    this.topFiveEditorItems.set([]);
    this.resetTopFiveSearch();
    this.mode.set(mode);
    this.currentPage.set(1);
    const profile = this.profile();
    if (profile) this.loadSection(profile.id);
  }

  protected toggleProfileFilters(): void { this.profileFiltersOpen.update((open) => !open); }
  protected closeProfileFilters(): void { this.profileFiltersOpen.set(false); }
  protected openTopFiveEditor(event: Event): void {
    if (this.followState() !== 'SELF') return;
    this.topFiveEditorOpener.set(event.currentTarget as HTMLElement);
    this.topFiveEditorItems.set([...this.topFive()].sort((a, b) => a.position - b.position));
    this.topFiveEditorOpen.set(true);
  }
  protected closeTopFiveEditor(): void { if (!this.topFiveSaving()) this.cancelTopFiveEditor(); }
  protected cancelTopFiveEditor(): void {
    if (this.topFiveSaving()) return;
    this.resetTopFiveSearch();
    this.topFiveEditorItems.set([]);
    this.topFiveEditorOpen.set(false);
  }
  protected async saveTopFiveEditor(): Promise<void> {
    if (this.topFiveSaving() || this.followState() !== 'SELF') return;
    const userId = this.profile()?.id;
    if (!userId) return;

    const mode = this.mode();
    const type: TopFiveContentType = mode === 'MOVIE' ? 'MOVIE' : 'SERIES';
    const draft = this.topFiveEditorItems().map((entry, index) => ({ ...entry, position: index + 1 }));
    this.topFiveSaving.set(true);
    try {
      const savedEntries = await this.persistTopFiveDraft(type, draft);
      this.topFive.set(this.mergeResolvedTopFive(savedEntries, [...this.topFive(), ...draft]));
      this.resetTopFiveSearch();
      this.topFiveEditorItems.set([]);
      this.topFiveEditorOpen.set(false);
      try {
        await this.refreshTopFiveFromSummary(userId, mode);
      } catch {
        // The Top 5 write succeeded; a later Summary load will refresh card and watched state.
      }
      this.toasts.success(this.copy.topFiveSaveSuccess);
    } catch {
      this.toasts.error(this.copy.topFiveSaveError);
      try {
        await this.refreshTopFiveFromSummary(userId, mode);
      } catch {
        // Keep the editor draft available so the user can retry.
      }
    } finally {
      this.topFiveSaving.set(false);
    }
  }
  protected openTopFiveSearch(event: Event): void {
    if (this.topFiveEditorItems().length >= 5) return;
    this.topFiveSearchOpener.set(event.currentTarget as HTMLElement);
    this.topFiveSearchQuery.set('');
    this.topFiveSearchResults.set([]);
    this.topFiveSearchError.set(null);
    this.topFiveSearchLoading.set(false);
    this.topFiveSearchRequests.next(null);
    this.topFiveSearchOpen.set(true);
    requestAnimationFrame(() => this.topFiveSearchInput?.nativeElement.focus());
  }
  protected closeTopFiveSearch(): void {
    this.resetTopFiveSearch();
  }
  protected onTopFiveSearchInput(value: string): void {
    this.topFiveSearchQuery.set(value);
    this.topFiveSearchResults.set([]);
    this.topFiveSearchError.set(null);
    const query = value.trim();
    if (!this.topFiveSearchOpen() || query.length < 3) {
      this.topFiveSearchLoading.set(false);
      this.topFiveSearchRequests.next(null);
      return;
    }
    this.topFiveSearchLoading.set(true);
    this.topFiveSearchRequests.next({
      query,
      scope: this.mode() === 'EPISODE' ? 'SERIES' : 'MOVIE',
    });
  }
  protected preventTopFiveSearchSubmit(event: SubmitEvent): void { event.preventDefault(); }
  protected topFiveSearchPlaceholder(): string {
    return this.mode() === 'EPISODE' ? this.homeCopy.searchPlaceholderSeries : this.homeCopy.searchPlaceholderMovies;
  }
  protected isTopFiveSearchResultAdded(result: SearchContentView): boolean {
    return this.topFiveEditorItems().some((entry) => entry.content.type === result.type && entry.content.tmdbId === result.tmdbId);
  }
  protected selectTopFiveSearchResult(result: SearchContentView): void {
    if (this.isTopFiveSearchResultAdded(result) || this.topFiveEditorItems().length >= 5) return;
    const type = this.mode() === 'EPISODE' ? 'SERIES' : 'MOVIE';
    if (result.type !== type) return;
    const draftId = `draft:${type}:${result.tmdbId}`;
    const rating = resolveRating(null, result.voteAverage);
    const entry: ResolvedTopFive = {
      id: draftId,
      type,
      content: { id: draftId, tmdbId: result.tmdbId, type },
      position: this.topFiveEditorItems().length + 1,
      customPosterUrl: null,
      score: null,
      hasWatched: false,
      viewerHasWatched: null,
      card: null,
      title: result.title || this.copy.unavailable,
      posterPath: result.posterUrl ?? null,
      backdropPath: null,
      releaseYear: result.releaseYear ?? null,
      averageScore: rating.value,
      ratingSource: rating.source,
      viewerRating: null,
      viewerReview: null,
      contentType: type,
    };
    this.topFiveEditorItems.update((items) => [...items, { ...entry, position: items.length + 1 }]);
    this.topFiveSearchOpener.set(this.topFiveEditorSave?.nativeElement ?? this.topFiveSearchOpener());
    this.closeTopFiveSearch();
  }
  protected removeTopFiveEditorEntry(entryId: string): void {
    if (this.topFiveSaving()) return;
    const remaining = this.topFiveEditorItems().filter((entry) => entry.id !== entryId);
    this.topFiveEditorItems.set(remaining.map((entry, index) => ({ ...entry, position: index + 1 })));
  }
  protected dropTopFiveEntry(event: CdkDragDrop<ResolvedTopFive[]>): void {
    if (this.topFiveSaving()) return;
    if (event.previousContainer !== event.container) return;
    const reordered = [...this.topFiveEditorItems()];
    moveItemInArray(reordered, event.previousIndex, event.currentIndex);
    const ranked = reordered.map((entry, index) => ({ ...entry, position: index + 1 }));
    this.topFiveEditorItems.set(ranked);
  }

  private resetTopFiveSearch(): void {
    this.topFiveSearchRequests.next(null);
    this.topFiveSearchOpen.set(false);
    this.topFiveSearchQuery.set('');
    this.topFiveSearchLoading.set(false);
    this.topFiveSearchResults.set([]);
    this.topFiveSearchError.set(null);
  }

  private async persistTopFiveDraft(
    type: TopFiveContentType,
    draft: ResolvedTopFive[],
  ): Promise<TopFiveEntry[]> {
    let current: TopFiveEntry[] = this.topFive()
      .map(({ id, type: entryType, content, position, customPosterUrl, score }) => ({
        id, type: entryType, content, position, customPosterUrl, score,
      }))
      .sort((first, second) => first.position - second.position);
    const desiredKeys = new Set(draft.map((entry) => this.topFiveContentKey(entry)));

    for (const entry of [...current].reverse()) {
      if (desiredKeys.has(this.topFiveContentKey(entry))) continue;
      await firstValueFrom(this.profileApi.removeTopFive(type, entry.id));
      current = current
        .filter((item) => item.id !== entry.id)
        .map((item, index) => ({ ...item, position: index + 1 }));
    }

    for (let index = 0; index < draft.length; index += 1) {
      const entry = draft[index];
      const contentKey = this.topFiveContentKey(entry);
      const currentIndex = current.findIndex((item) => this.topFiveContentKey(item) === contentKey);
      if (currentIndex === index) continue;

      if (currentIndex >= 0) {
        const existing = current[currentIndex];
        await firstValueFrom(this.profileApi.removeTopFive(type, existing.id));
        current = current
          .filter((item) => item.id !== existing.id)
          .map((item, itemIndex) => ({ ...item, position: itemIndex + 1 }));
      }

      const created = await firstValueFrom(this.profileApi.addTopFive(type, {
        tmdbId: entry.content.tmdbId,
        position: index + 1,
        customPosterUrl: entry.customPosterUrl,
      }));
      current.splice(index, 0, created);
      current = current.map((item, itemIndex) => ({ ...item, position: itemIndex + 1 }));
    }

    return current;
  }

  private async refreshTopFiveFromSummary(userId: string, mode: ProfileContentMode): Promise<void> {
    const summary = await firstValueFrom(this.profileApi.getSummary(userId, mode));
    if (this.profile()?.id !== userId || this.mode() !== mode || this.section() !== 'profile') return;
    this.summary.set(summary);
    this.topFive.set(this.resolveTopFive(summary.top5 ?? []));
  }

  private topFiveContentKey(entry: Pick<TopFiveEntry, 'type' | 'content'>): string {
    return `${entry.type}:${entry.content.tmdbId}`;
  }

  private mergeResolvedTopFive(entries: TopFiveEntry[], candidates: ResolvedTopFive[]): ResolvedTopFive[] {
    return entries
      .map((entry) => {
        const candidate = candidates.find((item) => this.topFiveContentKey(item) === this.topFiveContentKey(entry));
        if (!candidate) {
          return {
            ...entry,
            hasWatched: false,
            viewerHasWatched: null,
            card: null,
            title: this.copy.unavailable,
            posterPath: entry.customPosterUrl,
            backdropPath: null,
            releaseYear: null,
            averageScore: null,
            ratingSource: 'none' as const,
            viewerRating: this.profileViewerRating(undefined, entry.score),
            viewerReview: null,
            contentType: entry.type,
          };
        }
        return {
          ...candidate,
          ...entry,
          title: candidate.title,
          posterPath: entry.customPosterUrl || candidate.posterPath,
          releaseYear: candidate.releaseYear,
          averageScore: candidate.averageScore,
          ratingSource: candidate.ratingSource,
          contentType: entry.type,
        };
      })
      .sort((first, second) => first.position - second.position);
  }

  private applyTopFiveSearchResult(result: TopFiveSearchResult): void {
    if (!result || !this.topFiveSearchOpen()) return;
    this.topFiveSearchLoading.set(false);
    if ('error' in result) {
      this.topFiveSearchError.set(this.topFiveSearchErrorMessage(result.error));
      return;
    }
    this.topFiveSearchResults.set(result.response.contents
      .filter((content) => content.type === result.request.scope)
      .slice(0, 5));
  }

  private topFiveSearchErrorMessage(error: unknown): string {
    if (error instanceof HttpErrorResponse && error.status === 401) return this.homeCopy.searchSessionError;
    if (error instanceof HttpErrorResponse && error.status === 429) return this.homeCopy.searchRateLimitError;
    return this.homeCopy.searchError;
  }

  protected setProfileListSource(value: string): void {
    if (value !== 'ALL' && value !== 'CREATED' && value !== 'LIKED') return;
    this.listSource.set(value);
  }

  protected setProfileListType(value: string): void {
    const types: Array<ListItemType | 'ALL'> = ['ALL', 'MOVIE', 'SERIES', 'SEASON', 'EPISODE', 'LIST'];
    if (!types.includes(value as ListItemType | 'ALL')) return;
    const next = value === 'ALL' ? null : value as ListItemType;
    if (this.listItemType() === next) return;
    this.listItemType.set(next);
    this.currentPage.set(1);
    this.loadSectionData();
  }

  protected setProfileListSort(value: string): void {
    const sorts: ProfileListSort[] = ['rank', 'updatedAt', 'name', 'likesCount', 'itemsCount', 'commentsCount'];
    if (!sorts.includes(value as ProfileListSort)) return;
    const next = value as ProfileListSort;
    if (this.listSort() === next) return;
    this.listSort.set(next);
    if (next === 'rank') this.listSortDirection.set('asc');
    this.currentPage.set(1);
    this.loadSectionData();
  }

  protected toggleProfileListDirection(): void {
    this.listSortDirection.update((direction) => direction === 'asc' ? 'desc' : 'asc');
    this.currentPage.set(1);
    this.loadSectionData();
  }

  protected profileListEntries(): UserListCard[] {
    const profileId = this.profile()?.id;
    return (this.lists()?.content ?? []).filter((list) => {
      if (this.listSource() === 'CREATED') return list.user.id === profileId;
      if (this.listSource() === 'LIKED') return list.user.id !== profileId;
      return true;
    });
  }

  protected setWatchlistType(value: string): void {
    if (value !== '' && value !== 'MOVIE' && value !== 'SERIES') return;
    const next = value ? value as WatchlistContentType : null;
    if (this.watchlistType() === next) return;
    this.watchlistType.set(next);
    this.reloadWatchlist();
  }

  protected setWatchlistGenre(value: string): void {
    const next = value || null;
    if (this.watchlistGenre() === next) return;
    this.watchlistGenre.set(next);
    this.reloadWatchlist();
  }

  protected setWatchlistStatus(value: string): void {
    if (!['ALL', 'NEW', 'IN_PROGRESS', 'UPCOMING'].includes(value)) return;
    const next = value as WatchlistStatus;
    if (this.watchlistStatus() === next) return;
    this.watchlistStatus.set(next);
    this.reloadWatchlist();
  }

  protected setWatchlistSort(value: string): void {
    if (!['DATE_ADDED', 'RELEASE_DATE', 'RUNTIME', 'RATING', 'TITLE'].includes(value)) return;
    const next = value as WatchlistSort;
    if (this.watchlistSort() === next) return;
    this.watchlistSort.set(next);
    this.reloadWatchlist();
  }

  protected toggleWatchlistDirection(): void {
    this.watchlistDirection.update((direction) => direction === 'DESC' ? 'ASC' : 'DESC');
    this.reloadWatchlist();
  }

  private reloadWatchlist(): void {
    this.currentPage.set(1);
    this.loadSectionData();
  }

  protected setHistorySort(value: string): void {
    if (value !== 'NEWEST' && value !== 'OLDEST' && value !== 'RATING_DESC' && value !== 'RATING_ASC') return;
    if (this.historySort() === value) return;
    this.historySort.set(value);
    this.reloadHistory();
  }

  protected setHistoryType(value: string): void {
    if (value !== 'ALL' && value !== 'MOVIE' && value !== 'EPISODE') return;
    this.historyType.set(value);
    this.reloadHistory();
  }

  protected setHistorySeries(value: string): void {
    this.historySeries.set(value);
    this.reloadHistory();
  }

  protected setHistoryScore(value: string): void {
    this.historyScore.set(value);
    this.reloadHistory();
  }

  protected setHistoryDate(field: 'from' | 'to', value: string): void {
    if (field === 'from') this.historyDateFrom.set(value);
    else this.historyDateTo.set(value);
    this.reloadHistory();
  }

  protected historyPageRuntime(): number {
    return (this.diary()?.content ?? []).reduce(
      (total, entry) => total + (entry.content.runtimeMinutes ?? entry.card?.runtimeMinutes ?? 0),
      0,
    );
  }

  protected setProgressSort(value: string): void {
    if (value !== 'LAST_WATCHED' && value !== 'LAST_RELEASED' && value !== 'REMAINING_EPISODES' && value !== 'REMAINING_RUNTIME') return;
    this.progressSortOpen.set(false);
    if (this.progressSort() === value) return;
    this.progressSort.set(value);
    this.currentPage.set(1);
    this.loadSectionData();
  }

  protected progressSortLabel(): string {
    return this.progressSortOptions.find((option) => option.value === this.progressSort())?.label ?? this.copy.progressSortWatched;
  }

  protected toggleProgressSort(): void {
    this.progressSortOpen.update((open) => !open);
  }

  @HostListener('document:click', ['$event'])
  protected closeProgressSortOutside(event: MouseEvent): void {
    if (!(event.target instanceof Element) || !event.target.closest('.profile-progress-sort-control')) {
      this.progressSortOpen.set(false);
    }
  }

  @HostListener('document:keydown.escape')
  protected closeProgressSortOnEscape(): void {
    this.progressSortOpen.set(false);
  }

  protected toggleProgressDirection(): void {
    this.progressDirection.update((direction) => direction === 'DESC' ? 'ASC' : 'DESC');
    this.currentPage.set(1);
    this.loadSectionData();
  }

  protected markProgressEpisodeWatched(item: SeriesInProgressRecord): void {
    const next = item.nextEpisode;
    if (this.followState() !== 'SELF' || this.savingProgressSeriesId() || !next || next.availableToWatch === false) return;
    this.savingProgressSeriesId.set(item.seriesTmdbId);
    this.contentApi.createSeriesDiaryEntry({
      content: {
        type: 'EPISODE',
        seriesTmdbId: item.seriesTmdbId,
        seasonNumber: next.seasonNumber,
        episodeNumber: next.episodeNumber,
      },
      watchedDate: new Date().toISOString().slice(0, 10),
    }).subscribe({
      next: () => {
        this.savingProgressSeriesId.set(null);
        const profile = this.profile();
        if (profile) this.loadSection(profile.id, true);
      },
      error: () => {
        this.savingProgressSeriesId.set(null);
        this.toasts.error(this.progressCopy.markWatchedError);
      },
    });
  }

  protected toggleProgressSeasons(seriesTmdbId: string, event: MouseEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.expandedProgress.update((expanded) => {
      const next = new Set(expanded);
      if (next.has(seriesTmdbId)) next.delete(seriesTmdbId);
      else next.add(seriesTmdbId);
      return next;
    });
  }

  protected progressSeasonsExpanded(seriesTmdbId: string): boolean {
    return this.expandedProgress().has(seriesTmdbId);
  }

  protected historyGroups(): Array<{ date: string | null; entries: DiaryRecord[] }> {
    const groups = new Map<string, DiaryRecord[]>();
    for (const entry of this.diary()?.content ?? []) {
      const key = entry.watchedDate?.slice(0, 10) || '';
      const values = groups.get(key) ?? [];
      values.push(entry);
      groups.set(key, values);
    }
    return [...groups.entries()].map(([date, entries]) => ({ date: date || null, entries }));
  }

  protected historyDayCollapsed(date: string | null): boolean {
    return this.collapsedHistoryDays().has(date ?? '');
  }

  protected allHistoryDaysCollapsed(): boolean {
    const groups = this.historyGroups();
    return groups.length > 0 && groups.every((group) => this.historyDayCollapsed(group.date));
  }

  protected toggleHistoryDay(date: string | null): void {
    const key = date ?? '';
    this.collapsedHistoryDays.update((collapsed) => {
      const next = new Set(collapsed);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  protected toggleHistoryDayGroups(): void {
    if (this.allHistoryDaysCollapsed()) {
      this.collapsedHistoryDays.set(new Set());
      return;
    }
    this.collapsedHistoryDays.set(new Set(this.historyGroups().map((group) => group.date ?? '')));
  }

  protected historyGroupRuntime(entries: readonly DiaryRecord[]): string {
    const totalMinutes = entries.reduce((total, entry) => total + (entry.content.runtimeMinutes ?? entry.card?.runtimeMinutes ?? 0), 0);
    return this.formatDuration(totalMinutes);
  }

  protected weekdayDateLabel(date: string): string {
    return new Date(date + 'T12:00:00').toLocaleDateString('pt-BR', { weekday: 'long' });
  }

  protected historySeriesOptions(): Array<{ id: string; title: string }> {
    const options = new Map<string, string>();
    for (const entry of this.diary()?.content ?? []) {
      const id = entry.content.seriesTmdbId;
      if (id) options.set(id, entry.card?.title || id);
    }
    const selected = this.historySeries();
    if (selected && !options.has(selected)) options.set(selected, selected);
    return [...options.entries()].map(([id, title]) => ({ id, title }));
  }

  protected previousPage(): void {
    if (this.currentPage() <= 1) return;
    this.currentPage.update((page) => page - 1);
    if (this.section() === 'progress') {
      this.loadSectionData();
      return;
    }
    const profile = this.profile();
    if (profile) this.loadSection(profile.id);
  }

  protected progressPageNumbers(totalPages: number): Array<number | null> {
    if (totalPages <= 5) return Array.from({ length: Math.max(0, totalPages) }, (_, index) => index + 1);
    const current = this.currentPage();
    if (current <= 3) return [1, 2, 3, null, totalPages];
    if (current >= totalPages - 2) return [1, null, totalPages - 2, totalPages - 1, totalPages];
    return [1, null, current - 1, current, current + 1, null, totalPages];
  }

  protected pageNumbers(totalPages: number): number[] {
    const current = this.currentPage();
    const start = Math.max(1, Math.min(current - 2, totalPages - 4));
    return Array.from({ length: Math.max(0, Math.min(5, totalPages)) }, (_, index) => start + index);
  }

  protected goToPage(page: number): void {
    const maximum = this.pageTotalPages();
    if (page < 1 || page > maximum || page === this.currentPage()) return;
    this.currentPage.set(page);
    if (this.section() === 'progress') {
      this.loadSectionData();
      return;
    }
    const profile = this.profile();
    if (profile) this.loadSection(profile.id);
  }

  protected pageTotalPages(): number {
    return this.currentPageData()?.totalPages ?? 1;
  }

  protected progressPercent(value: number | null | undefined): number {
    return typeof value === 'number' && Number.isFinite(value) ? Math.round(Math.min(100, Math.max(0, value))) : 0;
  }

  protected progressEpisodeCoordinates(item: SeriesInProgressRecord): string {
    if (item.lastWatchedSeasonNumber === null || item.lastWatchedEpisodeNumber === null) return '';
    return `S${item.lastWatchedSeasonNumber} · E${item.lastWatchedEpisodeNumber}`;
  }

  private recentReviewSeriesTitle(review: ProfileDiaryPreview): string | null {
    const content = review.content;
    if (!content?.seriesTmdbId) return null;
    const seriesTmdbId = content.seriesTmdbId;

    const diarySeriesTitle = this.allDiaryEntries().find((entry) =>
      entry.content.seriesTmdbId === seriesTmdbId && Boolean(entry.seriesTitle),
    )?.seriesTitle;
    if (diarySeriesTitle) return diarySeriesTitle;

    if (content.type?.toUpperCase() === 'EPISODE') {
      const episode = this.recentEpisodeEntries().find((entry) =>
        entry.content.seriesTmdbId === seriesTmdbId
        && entry.content.seasonNumber === content.seasonNumber
        && entry.content.episodeNumber === content.episodeNumber,
      );
      if (episode?.seriesTitle) return episode.seriesTitle;
    }

    const series = (this.summary()?.recentActivity ?? []).find((activity) => {
      const type = String(activity.type ?? activity.content?.type ?? activity.card?.type ?? '').toUpperCase();
      const tmdbId = activity.content?.tmdbId
        ?? activity.content?.seriesTmdbId
        ?? activity.tmdbId
        ?? activity.seriesTmdbId
        ?? activity.card?.tmdbId
        ?? activity.card?.seriesTmdbId;
      return type === 'SERIES' && String(tmdbId ?? '') === seriesTmdbId;
    });
    return series?.card?.title || null;
  }

  protected pageRangeStart(data: ProfilePageMetadata): number {
    return data.totalElements ? (data.page - 1) * data.size + 1 : 0;
  }

  protected pageRangeEnd(data: ProfilePageMetadata): number {
    return Math.min(data.page * data.size, data.totalElements);
  }

  protected pageHasNext(): boolean {
    return this.currentPageData()?.hasNext ?? false;
  }

  protected setMapRatingMode(mode: 'PERSONAL' | 'COMMUNITY'): void {
    this.mapRatingMode.set(mode);
  }

  protected mapEpisodeValue(episode: { score: number | null; averageScore: number | null }): number | null {
    return this.mapRatingMode() === 'PERSONAL' ? episode.score : episode.averageScore;
  }

  protected mapEpisodeText(episode: { score: number | null; averageScore: number | null; ratingCount: number }): string {
    const value = this.mapEpisodeValue(episode);
    return value === null ? '' : this.mapRatingMode() === 'PERSONAL' ? String(value) : value.toFixed(1);
  }

  protected mapEpisodeBucket(episode: { score: number | null; averageScore: number | null }): number {
    const value = this.mapEpisodeValue(episode);
    return value === null ? 0 : Math.max(1, Math.min(10, Math.round(value)));
  }

  protected mapEpisodeLabel(episode: { seasonNumber: number | null; episodeNumber: number | null; score: number | null; averageScore: number | null; ratingCount: number }): string {
    const identity = `T${episode.seasonNumber} · E${episode.episodeNumber}`;
    const value = this.mapEpisodeValue(episode);
    if (value === null) return `${identity} · ${this.copy.noRating}`;
    if (this.mapRatingMode() === 'PERSONAL') return `${identity} · ${this.copy.rating} ${value}`;
    return `${identity} · ${this.copy.communityEpisodeAverage.replace('{rating}', value.toFixed(1)).replace('{count}', String(episode.ratingCount))}`;
  }

  protected episodeSeasonAverage(episodes: readonly { score: number | null; averageScore: number | null; ratingCount: number }[]): string {
    if (this.mapRatingMode() === 'PERSONAL') {
      const scores = episodes.flatMap((episode) => episode.score === null ? [] : [episode.score]);
      return scores.length ? (scores.reduce((sum, score) => sum + score, 0) / scores.length).toFixed(1) : '0.0';
    }
    const rated = episodes.filter((episode) => episode.averageScore !== null && episode.ratingCount > 0);
    const count = rated.reduce((sum, episode) => sum + episode.ratingCount, 0);
    return count ? (rated.reduce((sum, episode) => sum + (episode.averageScore ?? 0) * episode.ratingCount, 0) / count).toFixed(1) : '0.0';
  }

  protected seriesCountText(): string {
    const mode = this.historyType();
    if (mode === 'MOVIE') return this.copy.movies.toLocaleLowerCase();
    if (mode === 'EPISODE') return this.copy.recentEpisodes.toLocaleLowerCase();
    return 'filmes e episódios';
  }

  protected episodeRoute(seriesTmdbId: string, seasonNumber: number, episodeNumber: number): string[] {
    return ['/content/series', seriesTmdbId, 'season', String(seasonNumber), 'episode', String(episodeNumber)];
  }

  protected watchedEpisodeRoute(item: import('../../../diary/data-access/diary-api.service').SeriesInProgressRecord): string[] | null {
    if (!item.seriesTmdbId || item.lastWatchedSeasonNumber === null || item.lastWatchedEpisodeNumber === null) return null;
    return this.episodeRoute(item.seriesTmdbId, item.lastWatchedSeasonNumber, item.lastWatchedEpisodeNumber);
  }

  protected historyRangeStart(): number {
    return this.diary()?.totalElements ? (this.currentPage() - 1) * (this.diary()?.size ?? 30) + 1 : 0;
  }

  protected historyRangeEnd(): number {
    const data = this.diary();
    return data ? Math.min(this.currentPage() * data.size, data.totalElements) : 0;
  }

  protected progressRangeStart(data: SeriesInProgressPage): number {
    return data.totalElements ? (data.page - 1) * data.size + 1 : 0;
  }

  protected progressRangeEnd(data: SeriesInProgressPage): number {
    return Math.min(data.page * data.size, data.totalElements);
  }

  private reloadHistory(): void {
    this.currentPage.set(1);
    this.loadSectionData();
  }

  protected toggleProfileMenu(): void {
    this.profileMenuOpen.update((open) => !open);
  }

  protected togglePosterMenu(id: string, event: MouseEvent): void {
    event.stopPropagation();
    this.activePosterMenu.update((active) => active === id ? null : id);
  }

  protected handlePosterAction(entry: ResolvedTopFive, selection: ContentImageActionSelection): void {
    this.activePosterMenu.set(null);
    const target: ProfileActionContent = {
      type: entry.contentType,
      contentId: entry.content.id,
      tmdbId: entry.content.tmdbId,
      seriesTmdbId: entry.contentType === 'SERIES' ? entry.content.tmdbId : null,
      seasonNumber: null,
      episodeNumber: null,
      title: entry.title || this.copy.unavailable,
      subtitle: entry.releaseYear ? String(entry.releaseYear) : '',
      episodeCount: entry.card?.numberOfEpisodes ?? null,
      viewerState: {
        myRating: entry.viewerRating ?? null,
        myReview: entry.viewerReview ?? null,
        latestDiaryEntryId: null,
        currentRatingVersion: entry.card?.viewerState?.currentRatingVersion ?? null,
        reviewIds: [],
        lastWatchedDate: null,
        lastWatchNumber: entry.contentType === 'SERIES' ? entry.card?.viewerState?.lastWatchNumber ?? null : null,
        watchedInTheater: null,
        playsCount: null,
      },
    };
    if (selection.action.id === 'rewatch' || selection.action.id === 'mark-watched') {
      if (this.isOwnProfile()) this.openProfileWatchDialog(target, selection.event, selection.action.id === 'rewatch');
      return;
    }
    if (!['rate', 'edit-rating', 'share-review'].includes(selection.action.id)) return;
    const movieDiaryEntry = this.recentMovieEntries().find((item) => item.content.tmdbId === entry.content.tmdbId) ?? null;
    const summaryDiaryEntry = this.summary()?.recentReviews.find((item) => item.content?.type?.toUpperCase() === entry.contentType
      && item.content.tmdbId === entry.content.tmdbId && item.source === 'DIARY_ENTRY') ?? null;
    const matchingActivities = (this.summary()?.recentActivity ?? []).filter((item) => {
      const activityType = String(item.type ?? item.content?.type ?? item.card?.type ?? '').toUpperCase();
      const activityTmdbId = String(item.content?.tmdbId
        ?? item.content?.seriesTmdbId
        ?? item.tmdbId
        ?? item.seriesTmdbId
        ?? item.card?.tmdbId
        ?? item.card?.seriesTmdbId
        ?? '');
      return activityType === entry.contentType
        && activityTmdbId === entry.content.tmdbId
        && (item.source === 'DIARY_ENTRY' || item.source === 'SERIES_COMPLETION');
    });
    const activity = matchingActivities.find((item) => item.card?.viewerState?.currentRatingVersion != null)
      ?? matchingActivities.find((item) => item.source === 'SERIES_COMPLETION')
      ?? matchingActivities[0]
      ?? null;
    const cardViewerState = entry.card?.viewerState;
    const activityViewerState = activity?.card?.viewerState;
    const summaryReviewViewerState = summaryDiaryEntry?.card?.viewerState;
    const seriesPassNumber = entry.contentType === 'SERIES'
      ? cardViewerState?.lastWatchNumber ?? activity?.timesWatched ?? summaryDiaryEntry?.watchNumber ?? null
      : null;
    const review = entry.contentType === 'SERIES'
      ? this.profileContentReviewForPass('SERIES', entry.content.id, seriesPassNumber)
      : this.profileShareReviews().find((item) => item.content.type.toUpperCase() === entry.contentType
        && (item.content.tmdbId === entry.content.tmdbId || item.content.seriesTmdbId === entry.content.tmdbId)) ?? null;
    const viewerPassReview = this.isOwnProfile() ? review : null;
    const reviewViewerState = review?.card?.viewerState;
    const reviewId = entry.contentType === 'SERIES'
      ? (viewerPassReview?.source === 'CONTENT_REVIEW' ? viewerPassReview.id : null)
      : null;
    const diaryEntryId = entry.contentType === 'MOVIE'
      ? movieDiaryEntry?.id
        ?? summaryDiaryEntry?.id
        ?? (activity?.source === 'DIARY_ENTRY' ? activity.id : null)
        ?? (review?.source === 'DIARY' ? review.id : null)
        ?? cardViewerState?.latestDiaryEntryId
        ?? null
      : null;
    const viewerState: ProfileActionViewerState = {
      myRating: entry.viewerRating ?? cardViewerState?.myRating ?? activityViewerState?.myRating ?? summaryReviewViewerState?.myRating ?? reviewViewerState?.myRating ?? null,
      myReview: entry.contentType === 'SERIES'
        ? viewerPassReview?.comment ?? null
        : movieDiaryEntry?.comment ?? summaryDiaryEntry?.comment ?? review?.comment ?? null,
      latestDiaryEntryId: diaryEntryId,
      currentRatingVersion: cardViewerState?.currentRatingVersion ?? activityViewerState?.currentRatingVersion ?? summaryReviewViewerState?.currentRatingVersion ?? reviewViewerState?.currentRatingVersion ?? null,
      reviewIds: reviewId ? [reviewId] : [],
      lastWatchedDate: movieDiaryEntry?.watchedDate ?? summaryDiaryEntry?.watchedDate ?? activity?.watchedDate ?? activity?.lastWatchedDate ?? cardViewerState?.lastWatchedDate ?? null,
      lastWatchNumber: entry.contentType === 'SERIES'
        ? this.isOwnProfile() ? seriesPassNumber : null
        : movieDiaryEntry?.watchNumber ?? summaryDiaryEntry?.watchNumber ?? activity?.timesWatched ?? cardViewerState?.lastWatchNumber ?? null,
      watchedInTheater: movieDiaryEntry?.watchedInTheater ?? cardViewerState?.watchedInTheater ?? null,
      playsCount: activity?.timesWatched ?? movieDiaryEntry?.watchNumber ?? summaryDiaryEntry?.watchNumber ?? cardViewerState?.playsCount ?? null,
    };
    if (selection.action.id === 'rate' || selection.action.id === 'edit-rating') {
      this.openProfileRatingDialog({
        ...target,
        diaryEntryId,
        reviewId,
        viewerState,
        initialValue: {
          score: viewerState.myRating,
          comment: viewerState.myReview ?? '',
          watchedDate: viewerState.lastWatchedDate,
          isRewatch: viewerState.lastWatchNumber === null ? undefined : viewerState.lastWatchNumber > 1,
          watchedInTheater: viewerState.watchedInTheater ?? undefined,
        },
      }, selection.event);
      return;
    }
    const openShareWithoutReview = () => {
      const user = this.session.user();
      this.openShareReviewDialog({
        title: target.title,
        subtitle: target.subtitle,
        rating: viewerState.myRating,
        review: viewerState.myReview,
        backgroundUrl: this.imageUrl(entry.backdropPath || entry.posterPath, 'w1280'),
        posterUrl: this.imageUrl(entry.posterPath, 'w780'),
        username: user?.username ?? null,
        avatarUrl: user?.profilePicture ?? null,
        selectionType: entry.contentType,
        tmdbId: entry.content.tmdbId,
      }, selection.event);
    };
    if (selection.action.id === 'share-review' && entry.contentType === 'SERIES' && !review && seriesPassNumber !== null) {
      this.findProfileContentReviewForPass(entry.content.id, 'SERIES', seriesPassNumber, 1, this.profile()?.id)
        .pipe(catchError(() => of(null)))
        .subscribe((loadedReview) => {
          if (loadedReview) this.openShareReviewDialog(this.shareReviewModelForDiaryEntry(loadedReview, true), selection.event);
          else openShareWithoutReview();
        });
      return;
    }
    if (review) {
      this.openShareReviewDialog(this.shareReviewModelForDiaryEntry(review, true), selection.event);
      return;
    }
    openShareWithoutReview();
  }
  protected handleRecentDiaryAction(entry: DiaryRecord, selection: ContentImageActionSelection): void {
    if (selection.action.id === 'share-review') {
      const isOwnProfile = !!this.profile()?.id && this.profile()?.id === this.session.user()?.id;
      this.openShareReviewDialog(this.shareReviewModelForDiaryEntry(
        entry,
        isOwnProfile,
      ), selection.event);
      return;
    }
    if (!this.isOwnProfile()) return;
    const target = this.profileActionContentForDiary(entry);
    if (!target) return;
    if (selection.action.id === 'rewatch' || selection.action.id === 'mark-watched') {
      this.openProfileWatchDialog(target, selection.event, selection.action.id === 'rewatch');
    } else if (selection.action.id === 'rate' || selection.action.id === 'edit-rating') {
      this.openProfileRatingDialog({
        ...target,
        diaryEntryId: entry.id,
        reviewId: null,
        initialValue: {
          score: entry.score,
          comment: entry.comment ?? '',
          watchedDate: entry.watchedDate,
          isRewatch: entry.watchNumber === null ? undefined : (entry.watchNumber ?? 0) > 1,
          watchedInTheater: undefined,
          watchedWith: entry.watchedWith?.flatMap((person) => person.id ? [person.id] : []),
        },
        companions: entry.watchedWith?.flatMap((person) => person.id ? [{
          id: person.id,
          name: person.name ?? null,
          username: person.username ?? '',
          profilePicture: person.profilePicture ?? null,
        }] : []),
        viewerState: {
          myRating: entry.score,
          myReview: entry.comment,
          latestDiaryEntryId: entry.id,
          currentRatingVersion: null,
          reviewIds: [],
          lastWatchedDate: entry.watchedDate,
          lastWatchNumber: entry.watchNumber,
          watchedInTheater: null,
          playsCount: entry.watchNumber,
        },
      }, selection.event);
    }
  }

  protected handleRecentSeriesAction(entry: RecentSeriesCard, selection: ContentImageActionSelection): void {
    if (selection.action.id === 'share-review') {
      const isOwnProfile = !!this.profile()?.id && this.profile()?.id === this.session.user()?.id;
      const fallback = () => this.openShareReviewDialog(this.shareReviewModelForSeriesCard(entry, isOwnProfile), selection.event);
      if (!isOwnProfile || entry.lastWatchNumber === null || !entry.contentId) {
        fallback();
        return;
      }
      const review = this.profileContentReviewForPass('SERIES', entry.contentId, entry.lastWatchNumber);
      if (review) {
        this.openShareReviewDialog(this.shareReviewModelForDiaryEntry(review, true), selection.event);
        return;
      }
      this.findProfileContentReviewForPass(entry.contentId, 'SERIES', entry.lastWatchNumber)
        .pipe(catchError(() => of(null)))
        .subscribe((loadedReview) => {
          if (loadedReview) this.openShareReviewDialog(this.shareReviewModelForDiaryEntry(loadedReview, true), selection.event);
          else fallback();
        });
      return;
    }
    if (!this.isOwnProfile()) return;
    if (!entry.canEditRating && (selection.action.id === 'rate' || selection.action.id === 'edit-rating')) return;
    const target: ProfileActionContent = {
      type: 'SERIES',
      contentId: entry.contentId,
      tmdbId: entry.seriesTmdbId,
      seriesTmdbId: entry.seriesTmdbId,
      seasonNumber: null,
      episodeNumber: null,
      title: entry.title,
      subtitle: entry.releaseYear ? String(entry.releaseYear) : '',
      episodeCount: entry.episodeCount,
      viewerState: {
        myRating: entry.viewerRating ?? null,
        myReview: null,
        latestDiaryEntryId: null,
        currentRatingVersion: entry.currentRatingVersion,
        reviewIds: entry.reviewIds,
        lastWatchedDate: entry.lastWatchedDate,
        lastWatchNumber: entry.lastWatchNumber,
        watchedInTheater: null,
        playsCount: null,
      },
    };
    if (selection.action.id === 'rewatch' || selection.action.id === 'mark-watched') {
      this.openProfileWatchDialog(target, selection.event, selection.action.id === 'rewatch');
    } else if ((selection.action.id === 'rate' || selection.action.id === 'edit-rating') && target.contentId) {
      const review = this.profileContentReviewForPass('SERIES', entry.contentId ?? '', entry.lastWatchNumber);
      const reviewId = review?.source === 'CONTENT_REVIEW' ? review.id : null;
      this.openProfileRatingDialog({
        ...target,
        reviewId,
        viewerState: {
          myRating: review?.score ?? entry.viewerRating ?? null,
          myReview: review?.comment ?? null,
          latestDiaryEntryId: null,
          currentRatingVersion: entry.currentRatingVersion ?? review?.card?.viewerState?.currentRatingVersion ?? null,
          reviewIds: reviewId ? [reviewId] : [],
          lastWatchedDate: entry.lastWatchedDate,
          lastWatchNumber: entry.lastWatchNumber,
          watchedInTheater: null,
          playsCount: null,
        },
        initialValue: { score: entry.viewerRating ?? review?.score ?? null, comment: review?.comment ?? '' },
      }, selection.event);
    }
  }

  private openShareReviewDialog(model: ShareReviewDialogModel, event?: MouseEvent): void {
    const menuTrigger = (event?.currentTarget as HTMLElement | null)
      ?.closest('.content-menu-anchor')
      ?.querySelector<HTMLElement>('.content-menu-trigger');
    this.shareReviewDialogReturnFocus.set(menuTrigger ?? (document.activeElement instanceof HTMLElement
      ? document.activeElement
      : null));
    this.activePosterMenu.set(null);
    this.shareReviewDialogModel.set(model);
  }

  protected closeShareReviewDialog(): void {
    this.shareReviewDialogModel.set(null);
    const opener = this.shareReviewDialogReturnFocus();
    this.shareReviewDialogReturnFocus.set(null);
    if (opener) {
      window.setTimeout(() => {
        if (opener.isConnected) opener.focus();
      });
    }
  }

  private shareReviewModelForDiaryEntry(
    entry: Pick<DiaryRecord, 'content' | 'card' | 'comment' | 'score' | 'customPosterUrl' | 'seriesTitle'> | ProfileShareReviewRecord,
    includeReview: boolean,
  ): ShareReviewDialogModel {
    const type = entry.content.type.toUpperCase();
    const isEpisode = type === 'EPISODE';
    const coordinates = [
      entry.content.seasonNumber !== null ? `T${entry.content.seasonNumber}` : null,
      entry.content.episodeNumber !== null ? `E${entry.content.episodeNumber}` : null,
    ].filter(Boolean).join(' · ');
    const subtitle = isEpisode
      ? [entry.seriesTitle, coordinates].filter(Boolean).join(' · ')
      : type === 'SEASON'
        ? [coordinates ? `${this.copy.season} ${entry.content.seasonNumber}` : this.copy.season, entry.card?.releaseYear]
          .filter(Boolean).join(' · ')
        : entry.card?.releaseYear ? String(entry.card.releaseYear) : null;
    const posterPath = entry.customPosterUrl || entry.card?.customPosterUrl || entry.card?.posterPath || null;
    const user = this.session.user();

    return {
      title: entry.card?.title || this.copy.unavailable,
      subtitle,
      rating: includeReview ? entry.score : null,
      review: includeReview ? entry.comment : null,
      backgroundUrl: this.imageUrl(entry.card?.backdropPath || posterPath, 'w1280'),
      posterUrl: this.imageUrl(posterPath, 'w780'),
      username: user?.username ?? null,
      avatarUrl: user?.profilePicture ?? null,
      selectionType: type === 'MOVIE' ? 'MOVIE' : 'SERIES',
      tmdbId: type === 'MOVIE'
        ? entry.content.tmdbId
        : entry.content.seriesTmdbId || entry.content.tmdbId,
    };
  }

  private shareReviewModelForSeriesCard(entry: RecentSeriesCard, includeRating: boolean): ShareReviewDialogModel {
    const user = this.session.user();
    return {
      title: entry.title,
      subtitle: entry.releaseYear ? String(entry.releaseYear) : null,
      rating: includeRating ? entry.score : null,
      review: null,
      backgroundUrl: this.imageUrl(entry.backdropPath || entry.posterPath, 'w1280'),
      posterUrl: this.imageUrl(entry.posterPath, 'w780'),
      username: user?.username ?? null,
      avatarUrl: user?.profilePicture ?? null,
      selectionType: 'SERIES',
      tmdbId: entry.seriesTmdbId,
    };
  }

  private isOwnProfile(): boolean {
    return !!this.profile()?.id && this.profile()?.id === this.session.user()?.id;
  }

  private profileActionContentForDiary(entry: DiaryRecord): ProfileActionContent | null {
    const content = entry.content;
    if (!content) return null;
    const type = content.type.toUpperCase();
    if (type !== 'MOVIE' && type !== 'SERIES' && type !== 'SEASON' && type !== 'EPISODE') return null;
    const title = entry.card?.title || entry.seriesTitle || this.copy.unavailable;
    const coordinates = [content.seasonNumber !== null ? `T${content.seasonNumber}` : null, content.episodeNumber !== null ? `E${content.episodeNumber}` : null].filter(Boolean).join(' · ');
    return {
      type,
      contentId: content.id,
      tmdbId: content.tmdbId,
      seriesTmdbId: content.seriesTmdbId,
      seasonNumber: content.seasonNumber,
      episodeNumber: content.episodeNumber,
      title: type === 'EPISODE' ? entry.seriesTitle || title : title,
      subtitle: type === 'EPISODE' ? [coordinates, title].filter(Boolean).join(' · ') : entry.card?.releaseYear ? String(entry.card.releaseYear) : '',
      companions: entry.watchedWith?.flatMap((person) => person.id ? [{
        id: person.id,
        name: person.name ?? null,
        username: person.username ?? '',
        profilePicture: person.profilePicture ?? null,
      }] : []),
    };
  }

  private profileActionOpener(event: MouseEvent): HTMLElement | null {
    return (event.currentTarget as HTMLElement | null)?.closest('app-content-image-actions')
      ?.querySelector<HTMLElement>('.content-menu-trigger') ?? null;
  }

  private openProfileWatchDialog(target: ProfileActionContent, event: MouseEvent, isRewatch = true): void {
    this.profileWatchTarget.set(target);
    this.profileWatchIsRewatch.set(isRewatch);
    this.profileWatchOpener.set(this.profileActionOpener(event));
    this.activePosterMenu.set(null);
  }

  private openProfileRatingDialog(target: ProfileRatingDialogTarget, event: MouseEvent): void {
    this.profileRatingOpener.set(this.profileActionOpener(event));
    this.activePosterMenu.set(null);
    this.activateProfileRatingTarget(target);
  }

  private activateProfileRatingTarget(target: ProfileRatingDialogTarget): void {
    this.profileRatingTarget.set(target);
    this.profileRatingLoadError.set('');
    this.profileRatingLoading.set(false);
    if ((target.type !== 'SERIES' && target.type !== 'SEASON') || !target.contentId) return;

    this.profileRatingLoading.set(true);
    const passReview = target.viewerState.lastWatchNumber !== null
      ? this.findProfileContentReviewForPass(target.contentId, target.type, target.viewerState.lastWatchNumber).pipe(catchError(() => of(null)))
      : of(null);
    forkJoin({ rating: this.contentApi.getMyContentRating(target.contentId), review: passReview }).subscribe({
      next: ({ rating, review }) => {
        if (this.profileRatingTarget() !== target) return;
        this.profileRatingLoading.set(false);
        const reviewId = review?.id ?? target.reviewId ?? null;
        const reviewComment = review?.comment ?? target.viewerState.myReview ?? null;
        this.profileRatingTarget.set({
          ...target,
          reviewId,
          viewerState: {
            ...target.viewerState,
            myRating: rating.score,
            currentRatingVersion: rating.version,
            myReview: reviewComment,
            reviewIds: reviewId ? [reviewId] : [],
          },
          initialValue: {
            ...target.initialValue,
            score: rating.score,
            comment: reviewComment ?? '',
          },
        });
      },
      error: (error: unknown) => {
        if (this.profileRatingTarget() !== target) return;
        this.profileRatingLoading.set(false);
        this.handleProfileActionError(error);
        this.profileRatingLoadError.set(this.copy.ratingVersionUnavailable);
      },
    });
  }

  protected retryProfileRatingLoad(): void {
    const target = this.profileRatingTarget();
    if (target) this.activateProfileRatingTarget(target);
  }

  protected profileRatingLabels(target: ProfileRatingDialogTarget): Partial<RatingDialogLabels> {
    return target.type === 'SERIES' || target.type === 'SEASON'
      ? { remove: movieMessages['pt-BR'].removeRating }
      : {};
  }

  protected canRemoveProfileRating(target: ProfileRatingDialogTarget): boolean {
    if (!this.isOwnProfile()) return false;
    if (target.type === 'SERIES' || target.type === 'SEASON') {
      return Boolean(target.contentId) && target.viewerState.myRating != null;
    }
    return Boolean(target.diaryEntryId || target.viewerState.latestDiaryEntryId);
  }

  private profileContentReviewForPass(
    contentType: 'SERIES' | 'SEASON',
    contentId: string,
    watchNumber: number | null,
  ): ProfileShareReviewRecord | null {
    if (watchNumber === null) return null;
    return this.profileShareReviews().find((review) => review.source === 'CONTENT_REVIEW'
      && review.content.type.toUpperCase() === contentType
      && (review.content.id === contentId || review.content.tmdbId === contentId || review.content.seriesTmdbId === contentId)
      && review.watchNumber === watchNumber) ?? null;
  }

  private findProfileContentReviewForPass(
    contentId: string,
    contentType: 'SERIES' | 'SEASON',
    watchNumber: number,
    page = 1,
    userId = this.session.user()?.id,
  ): Observable<ProfileShareReviewRecord | null> {
    const cached = userId === this.profile()?.id
      ? this.profileShareReviews().find((review) => review.source === 'CONTENT_REVIEW'
        && review.content.id === contentId
        && review.content.type.toUpperCase() === contentType
        && review.watchNumber === watchNumber) ?? null
      : null;
    if (cached) return of(cached);
    if (!userId) return of(null);
    return this.diaryApi.getUserReviewsPage(userId, page, 1000).pipe(switchMap((response) => {
      const review = response.content.find((item) => item.source === 'CONTENT_REVIEW'
        && item.content?.id === contentId
        && item.content?.type.toUpperCase() === contentType
        && item.watchNumber === watchNumber);
      if (review) {
        const loadedReview: ProfileShareReviewRecord = {
          id: review.id,
          source: review.source,
          content: review.content,
          card: review.card,
          comment: review.comment,
          score: review.score,
          watchNumber: review.watchNumber ?? null,
          customPosterUrl: review.customPosterUrl,
          seriesTitle: review.seriesTitle,
        };
        this.profileShareReviews.update((current) => current.some((item) => item.id === loadedReview.id)
          ? current
          : [...current, loadedReview]);
        return of(loadedReview);
      }
      return response.hasNext
        ? this.findProfileContentReviewForPass(contentId, contentType, watchNumber, page + 1, userId)
        : of(null);
    }));
  }

  protected closeProfileWatchDialog(): void {
    if (this.profileWatchSaving()) return;
    this.profileWatchTarget.set(null);
    this.restoreProfileActionFocus(this.profileWatchOpener);
  }

  protected profileSeriesWatchTitle(target: ProfileActionContent): string {
    return this.profileWatchIsRewatch()
      ? `Registrar ${target.title} novamente`
      : `Marcar ${target.title} como assistida`;
  }

  protected profileSeriesWatchSubtitle(target: ProfileActionContent): string {
    const count = target.episodeCount;
    return [target.subtitle, count ? `${this.formatCount(count)} episódios` : null].filter(Boolean).join(' · ');
  }

  protected saveProfileSeriesWatch(submission: SeriesBulkWatchSubmission): void {
    const target = this.profileWatchTarget();
    if (!target || this.profileWatchSaving()) return;
    let request: Observable<unknown> | null = null;
    if (target.type === 'SERIES' && target.tmdbId) {
      request = this.contentApi.createBulkSeriesDiaryEntry({ content: { type: 'SERIES', tmdbId: target.tmdbId }, watchedDate: submission.watchedDate }, crypto.randomUUID());
    } else if (target.type === 'SEASON' && target.seriesTmdbId && target.seasonNumber !== null) {
      request = this.contentApi.createBulkSeriesDiaryEntry({ content: { type: 'SEASON', seriesTmdbId: target.seriesTmdbId, seasonNumber: target.seasonNumber }, watchedDate: submission.watchedDate }, crypto.randomUUID());
    }
    if (!request) return;
    this.profileWatchSaving.set(true);
    request.subscribe({
      next: () => {
        this.profileWatchSaving.set(false);
        this.profileWatchTarget.set(null);
        this.profilePostWatchOpener.set(this.profileWatchOpener());
        this.profilePostWatchRatingTarget.set(this.profileRatingTargetForWatchedContent(target));
        this.toasts.success(this.profileWatchIsRewatch() ? messageCatalog['pt-BR'].trendingPage.watchAgainSuccess : messageCatalog['pt-BR'].trendingPage.markWatchedSuccess);
        this.loadSectionData(true);
      },
      error: (error: unknown) => {
        this.profileWatchSaving.set(false);
        this.handleProfileActionError(error);
      },
    });
  }

  private profileRatingTargetForWatchedContent(target: ProfileActionContent): ProfileRatingDialogTarget {
    const sourceState = target.viewerState ?? {
      myRating: null,
      myReview: null,
      latestDiaryEntryId: null,
      currentRatingVersion: null,
      reviewIds: [],
      lastWatchedDate: null,
      lastWatchNumber: null,
      watchedInTheater: null,
      playsCount: null,
    };
    const viewerState: ProfileActionViewerState = target.type === 'SERIES' || target.type === 'SEASON'
      ? {
        ...sourceState,
        myRating: null,
        myReview: null,
        currentRatingVersion: null,
        reviewIds: [],
        lastWatchNumber: null,
        playsCount: null,
      }
      : sourceState;
    return {
      ...target,
      viewerState,
      initialValue: {
        score: viewerState.myRating,
        comment: viewerState.myReview ?? '',
      },
    };
  }

  protected rateProfileWatchedContent(): void {
    const target = this.profilePostWatchRatingTarget();
    if (!target) return;
    this.profilePostWatchRatingTarget.set(null);
    this.profileRatingOpener.set(this.profilePostWatchOpener());
    this.profilePostWatchOpener.set(null);
    this.activateProfileRatingTarget(target);
  }

  protected closeProfilePostWatchRatingPrompt(): void {
    if (!this.profilePostWatchRatingTarget()) return;
    this.profilePostWatchRatingTarget.set(null);
    this.restoreProfileActionFocus(this.profilePostWatchOpener);
  }

  protected closeProfileRatingDialog(): void {
    if (this.profileRatingSaving()) return;
    this.profileRatingTarget.set(null);
    this.profileRatingLoading.set(false);
    this.profileRatingLoadError.set('');
    this.restoreProfileActionFocus(this.profileRatingOpener);
  }

  private restoreProfileActionFocus(target: ReturnType<typeof signal<HTMLElement | null>>): void {
    const opener = target();
    target.set(null);
    if (opener) window.setTimeout(() => opener.isConnected && opener.focus());
  }

  protected saveProfileWatch(submission: WatchLogSubmission): void {
    const target = this.profileWatchTarget();
    if (!target || this.profileWatchSaving()) return;
    const watchedDate = submission.watchedDate;
    let request: Observable<unknown> | null = null;
    if (target.type === 'MOVIE' && target.tmdbId) {
      request = this.contentApi.createDiaryEntry({
        content: { type: 'MOVIE', tmdbId: target.tmdbId },
        watchedDate,
        isRewatch: submission.isRewatch,
        watchedInTheater: submission.watchedInTheater,
        watchedWith: submission.watchedWith,
        score: submission.score,
        comment: submission.comment || null,
      });
    } else if (target.type === 'EPISODE' && target.seriesTmdbId && target.seasonNumber !== null && target.episodeNumber !== null) {
      request = this.contentApi.createSeriesDiaryEntry({ content: { type: 'EPISODE', seriesTmdbId: target.seriesTmdbId, seasonNumber: target.seasonNumber, episodeNumber: target.episodeNumber }, watchedDate, isRewatch: submission.isRewatch, score: submission.score, comment: submission.comment || null });
    } else if (target.type === 'SERIES' && target.tmdbId) {
      request = this.contentApi.createBulkSeriesDiaryEntry({ content: { type: 'SERIES', tmdbId: target.tmdbId }, watchedDate }, crypto.randomUUID());
    } else if (target.type === 'SEASON' && target.seriesTmdbId && target.seasonNumber !== null) {
      request = this.contentApi.createBulkSeriesDiaryEntry({ content: { type: 'SEASON', seriesTmdbId: target.seriesTmdbId, seasonNumber: target.seasonNumber }, watchedDate }, crypto.randomUUID());
    }
    if (!request) return;
    this.profileWatchSaving.set(true);
    request.subscribe({
      next: () => {
        this.profileWatchSaving.set(false);
        this.closeProfileWatchDialog();
        this.toasts.success(messageCatalog['pt-BR'].trendingPage.watchAgainSuccess);
        this.loadSectionData(true);
      },
      error: (error: unknown) => {
        this.profileWatchSaving.set(false);
        this.handleProfileActionError(error);
      },
    });
  }

  protected profileRatingDialogTitle(target: ProfileRatingDialogTarget): string {
    return target.viewerState.myRating !== null && target.viewerState.myRating !== undefined
      ? this.homeCopy.editRating : this.homeCopy.rate;
  }

  protected saveProfileRating(submission: RatingDialogSubmission): void {
    const target = this.profileRatingTarget();
    const contentId = target?.contentId;
    if (!target || this.profileRatingSaving() || this.profileRatingLoading() || this.profileRatingLoadError()) return;
    const isUpdatingSeriesRating = (target.type === 'SERIES' || target.type === 'SEASON')
      && target.viewerState.myRating !== null
      && target.viewerState.myRating !== undefined
      && submission.score !== null
      && (submission.score !== target.viewerState.myRating
        || (Boolean(submission.comment.trim()) && !target.reviewId && !target.viewerState.reviewIds?.[0]));
    if (isUpdatingSeriesRating && target.viewerState.currentRatingVersion == null) {
      this.toasts.error(this.copy.ratingVersionUnavailable);
      return;
    }
    const request = this.createProfileRatingRequest(target, submission);
    if (!request) return;
    this.profileRatingSaving.set(true);
    request.subscribe({
      next: (result) => {
        this.profileRatingSaving.set(false);
        this.closeProfileRatingDialog();
        this.toasts.success(this.homeCopy.ratingSaved);
        if (contentId) this.applyProfileRatingToTopFive(contentId, submission.score, this.profileRatingVersionFromResult(result));
        this.loadSectionData(true);
      },
      error: (error: unknown) => {
        this.profileRatingSaving.set(false);
        if (error instanceof HttpErrorResponse && error.status === 409
          && (target.type === 'SERIES' || target.type === 'SEASON')) {
          this.toasts.error(this.copy.ratingConflict);
          return;
        }
        this.handleProfileActionError(error);
      },
    });
  }

  private profileRatingVersionFromResult(result: unknown): number | null {
    if (Array.isArray(result)) {
      for (const item of result) {
        const version = this.profileRatingVersionFromResult(item);
        if (version !== null) return version;
      }
      return null;
    }
    if (result && typeof result === 'object' && 'version' in result) {
      const version = (result as { version?: unknown }).version;
      return typeof version === 'number' && Number.isFinite(version) ? version : null;
    }
    return null;
  }

  private applyProfileRatingToTopFive(contentId: string, score: number | null, version: number | null): void {
    this.topFive.update((entries) => entries.map((entry) => entry.content.id === contentId
      ? {
        ...entry,
        score,
        viewerRating: score,
        card: entry.card ? {
          ...entry.card,
          viewerState: {
            ...entry.card.viewerState,
            myRating: score,
            currentRatingVersion: version ?? entry.card.viewerState?.currentRatingVersion ?? null,
          },
        } : null,
      }
      : entry));
    this.summary.update((summary) => summary ? {
      ...summary,
      top5: summary.top5.map((entry) => entry.content.id === contentId ? {
        ...entry,
        score,
        card: entry.card ? {
          ...entry.card,
          viewerState: {
            ...entry.card.viewerState,
            myRating: score,
            currentRatingVersion: version ?? entry.card.viewerState?.currentRatingVersion ?? null,
          },
        } : null,
      } : entry),
    } : summary);
  }

  protected async removeProfileRatingEntry(): Promise<void> {
    const target = this.profileRatingTarget();
    const removeContentRating = target?.type === 'SERIES' || target?.type === 'SEASON';
    const diaryEntryId = target?.diaryEntryId || target?.viewerState.latestDiaryEntryId;
    if (!target || !this.canRemoveProfileRating(target) || this.profileRatingSaving()) return;
    const confirmed = await this.confirmation.requestConfirmation({
      message: removeContentRating ? movieMessages['pt-BR'].removeRatingConfirm : movieMessages['pt-BR'].removeWatchConfirm,
      confirmLabel: removeContentRating ? movieMessages['pt-BR'].removeRating : movieMessages['pt-BR'].removeWatch,
    });
    if (!confirmed || this.profileRatingSaving()) return;
    this.profileRatingSaving.set(true);
    const request = removeContentRating && target.contentId
      ? this.contentApi.deleteMyContentRating(target.contentId)
      : diaryEntryId ? this.contentApi.deleteDiaryEntry(diaryEntryId) : null;
    if (!request) {
      this.profileRatingSaving.set(false);
      return;
    }
    request.subscribe({
      next: () => {
        this.profileRatingSaving.set(false);
        this.closeProfileRatingDialog();
        this.toasts.success(removeContentRating ? movieMessages['pt-BR'].ratingRemoved : movieMessages['pt-BR'].removed);
        this.loadSectionData(true);
      },
      error: (error: unknown) => {
        this.profileRatingSaving.set(false);
        this.handleProfileActionError(error);
      },
    });
  }

  private createProfileRatingRequest(target: ProfileRatingDialogTarget, submission: RatingDialogSubmission): Observable<unknown> | null {
    const contentId = target.contentId;
    const state = target.viewerState;
    const score = submission.score;
    const comment = submission.comment || null;
    if (target.type === 'MOVIE') {
      const request = {
        score,
        comment,
        watchedDate: submission.watchedDate,
        isRewatch: submission.isRewatch,
        watchedInTheater: submission.watchedInTheater,
        watchedWith: submission.watchedWith,
      };
      const diaryEntryId = target.diaryEntryId || state.latestDiaryEntryId;
      return diaryEntryId
        ? this.contentApi.updateDiaryEntry(diaryEntryId, request)
        : target.tmdbId
          ? this.contentApi.createDiaryEntry({ content: { type: 'MOVIE', tmdbId: target.tmdbId }, ...request, watchedDate: submission.watchedDate || this.localToday(), isRewatch: submission.isRewatch ?? false })
          : null;
    }
    if (target.reviewId) {
      const calls: Observable<unknown>[] = [
        comment
          ? this.contentApi.updateContentReview(target.reviewId, comment)
          : this.contentApi.deleteContentReview(target.reviewId),
      ];
      this.appendProfileRatingChange(calls, target, score);
      return forkJoin(calls);
    }
    if (target.type === 'EPISODE') {
      const request = { score, comment, watchedDate: submission.watchedDate, watchedWith: submission.watchedWith };
      return target.diaryEntryId || state.latestDiaryEntryId
        ? this.contentApi.updateDiaryEntry(target.diaryEntryId || state.latestDiaryEntryId!, request)
        : target.seriesTmdbId && target.seasonNumber !== null && target.episodeNumber !== null && score !== null
          ? this.contentApi.createSeriesDiaryEntry({ content: { type: 'EPISODE', seriesTmdbId: target.seriesTmdbId, seasonNumber: target.seasonNumber, episodeNumber: target.episodeNumber }, ...request, watchedDate: submission.watchedDate || this.localToday() })
          : null;
    }
    if (!contentId) return null;
    const calls: Observable<unknown>[] = [];
    if (target.type === 'SERIES') {
      const reviewId = state.reviewIds?.[0];
      if (comment) {
        if (reviewId) {
          calls.push(this.contentApi.updateContentReview(reviewId, comment));
          this.appendProfileRatingChange(calls, target, score);
        } else {
          calls.push(this.contentApi.createContentReview(contentId, {
            comment,
            ...(score !== null ? {
              score,
              ...(state.currentRatingVersion != null ? { expectedRatingVersion: state.currentRatingVersion } : {}),
            } : {}),
          }, crypto.randomUUID()));
          if (score === null) this.appendProfileRatingChange(calls, target, score);
        }
      } else {
        if (reviewId) calls.push(this.contentApi.deleteContentReview(reviewId));
        this.appendProfileRatingChange(calls, target, score);
      }
    } else if (target.type === 'SEASON') {
      const reviewId = state.reviewIds?.[0] ?? null;
      if (comment) {
        if (reviewId) {
          calls.push(this.contentApi.updateContentReview(reviewId, comment));
          this.appendProfileRatingChange(calls, target, score);
        } else {
          calls.push(this.contentApi.createContentReview(contentId, {
            comment,
            ...(score !== null && score > 0 ? {
              score,
              ...(state.currentRatingVersion != null ? { expectedRatingVersion: state.currentRatingVersion } : {}),
            } : {}),
          }, crypto.randomUUID()));
          if (score === null) this.appendProfileRatingChange(calls, target, score);
        }
      } else {
        if (reviewId) calls.push(this.contentApi.deleteContentReview(reviewId));
        this.appendProfileRatingChange(calls, target, score);
      }
    }
    return calls.length ? forkJoin(calls) : of(null);
  }

  private appendProfileRatingChange(
    calls: Observable<unknown>[],
    target: ProfileRatingDialogTarget,
    score: number | null,
  ): void {
    if (target.type !== 'SERIES' && target.type !== 'SEASON') return;
    const contentId = target.contentId;
    const currentScore = target.viewerState.myRating;
    if (!contentId) return;
    if (score === null) {
      if (currentScore != null) calls.push(this.contentApi.deleteMyContentRating(contentId));
    } else if (score > 0 && score !== currentScore) {
      calls.push(this.contentApi.setContentRating(contentId, score, target.viewerState.currentRatingVersion ?? null));
    }
  }

  private handleProfileActionError(error: unknown): void {
    if ((error as { status?: number })?.status === 401) {
      void this.router.navigateByUrl('/login');
      return;
    }
    this.toasts.error(this.homeCopy.genericError);
  }

  private localToday(): string {
    const now = new Date();
    const pad = (value: number) => String(value).padStart(2, '0');
    return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
  }

  protected handleProfileImageAction(type: 'MOVIE' | 'SERIES', tmdbId: string | null, action: string): void {
    this.activePosterMenu.set(null);
    if (action === 'open-content' && tmdbId) {
      void this.router.navigate(['/content', type === 'MOVIE' ? 'movie' : 'series', tmdbId]);
    }
  }

  protected follow(): void {
    const userId = this.profile()?.id ?? this.foundUser()?.id;
    if (!userId || this.followBusy() || this.followState() === 'SELF') return;
    const following = !this.isFollowing();
    this.followBusy.set(true);
    this.profileApi.setFollow(userId, following).subscribe({
      next: (result: unknown) => {
        const status = typeof result === 'object' && result !== null && 'status' in result
          ? String((result as { status: unknown }).status)
          : '';
        const nextState = following ? (status === 'PENDING' ? 'PENDING' : 'FOLLOWING') : 'NOT_FOLLOWING';
        this.followState.set(nextState);
        this.foundUser.update((user) => user ? { ...user, viewerFollowStatus: nextState === 'FOLLOWING' ? 'ACCEPTED' : nextState === 'PENDING' ? 'PENDING' : null } : user);
        this.profile.update((user) => user ? {
          ...user,
          viewerRelation: nextState === 'FOLLOWING' ? 'FOLLOWING' : 'NOT_FOLLOWING',
          followersCount: Math.max(0, (user.followersCount ?? 0) + (following && nextState === 'FOLLOWING' ? 1 : !following ? -1 : 0)),
        } : user);
        this.foundUser.update((user) => user ? {
          ...user,
          followersCount: Math.max(0, (user.followersCount ?? 0) + (following && nextState === 'FOLLOWING' ? 1 : !following ? -1 : 0)),
        } : user);
        this.followBusy.set(false);
      },
      error: () => {
        this.toasts.error(this.copy.loadError);
        this.followBusy.set(false);
      },
    });
  }

  protected async copyProfileLink(): Promise<void> {
    try {
      await navigator.clipboard.writeText(window.location.origin + '/users/' + encodeURIComponent(this.username()));
      this.toasts.success(this.copy.copySuccess);
    } catch {
      this.toasts.error(this.copy.copyError);
    }
    this.profileMenuOpen.set(false);
  }

  protected openProfileAction(action: 'report' | 'block'): void {
    this.toasts.info(action === 'report' ? 'A denúncia ficará disponível nesta tela.' : 'O bloqueio ficará disponível nesta tela.');
    this.profileMenuOpen.set(false);
  }

  protected openProfileSettings(): void {
    this.profileMenuOpen.set(false);
    void this.router.navigate(['/settings']);
  }

  protected episodeDetailRoute(entry: DiaryRecord): string[] | null {
    const { seriesTmdbId, seasonNumber, episodeNumber } = entry.content;
    if (!seriesTmdbId || seasonNumber === null || episodeNumber === null) return this.detailRoute(entry);
    return this.episodeRoute(seriesTmdbId, seasonNumber, episodeNumber);
  }

  protected episodeNavigationState(contentId: string | null | undefined): { contentId: string } | undefined {
    return episodeContentNavigationState(contentId);
  }

  protected profileEntryNavigationState(entry: DiaryRecord): { contentId: string } | undefined {
    return entry.content.type === 'EPISODE' ? episodeContentNavigationState(entry.content.id) : undefined;
  }

  protected handleProfileEntryImageAction(entry: DiaryRecord, action: string): void {
    this.activePosterMenu.set(null);
    if (action !== 'open-content') return;
    const route = this.detailRoute(entry);
    if (!route) return;
    void this.router.navigate(route, { state: this.profileEntryNavigationState(entry) });
  }

  protected episodeStill(entry: DiaryRecord): string | null {
    const key = this.episodeKey(entry);
    return this.imageUrl((key ? this.episodeStillPaths()[key] : null) || entry.card?.backdropPath || entry.seriesPosterPath || entry.card?.posterPath, 'w780');
  }

  protected profileGenrePercentage(count: number, items: readonly { count: number }[]): string {
    const total = items.reduce((sum, item) => sum + item.count, 0);
    return total ? Math.round((count / total) * 100) + '%' : '0%';
  }

  protected profileGenreWeight(count: number, items: readonly { count: number }[]): number {
    const total = items.reduce((sum, item) => sum + Math.max(1, item.count), 0);
    return total ? Math.max(1, count) / total : 0;
  }

  protected setProfileGenreHover(index: number): void {
    this.hoveredProfileGenreIndex.set(index);
  }

  protected clearProfileGenreHover(): void {
    this.hoveredProfileGenreIndex.set(null);
  }

  protected setHoveredOverviewRating(index: number): void {
    this.hoveredOverviewRatingIndex.set(index);
  }

  protected clearHoveredOverviewRating(): void {
    this.hoveredOverviewRatingIndex.set(null);
  }

  private observeProfileGenreLabels(): void {
    this.profileGenreLabelObserver?.disconnect();
    if (this.profileGenreLabels.length === 0) {
      this.profileGenreMinimumWidths.set([]);
      return;
    }
    this.profileGenreLabels.forEach((label) => this.profileGenreLabelObserver?.observe(label.nativeElement));
    if (!this.profileGenreLabelObserver) {
      window.requestAnimationFrame(() => this.updateProfileGenreMinimumWidths());
    }
  }

  private updateProfileGenreMinimumWidths(): void {
    const widths = this.profileGenreLabels
      .toArray()
      .map((label) => Math.ceil(label.nativeElement.getBoundingClientRect().width));
    const currentWidths = this.profileGenreMinimumWidths();
    if (widths.length !== currentWidths.length || widths.some((width, index) => width !== currentWidths[index])) {
      this.profileGenreMinimumWidths.set(widths);
    }
  }

  protected imageUrl(path: string | null | undefined, size: TmdbImageSize = 'w342'): string | null {
    return tmdbImageUrl(path, size);
  }

  protected episodeMapProgress(item: EpisodeRatingsMapItem): number | null {
    const total = item.totalEpisodeCount;
    if (typeof total !== 'number' || total <= 0) return null;
    const watched = Math.max(0, item.watchedEpisodeCount ?? 0);
    if (watched === 0) return 0;
    return Math.min(100, Math.max(1, Math.floor((watched / total) * 100)));
  }

  protected episodeMapComplete(item: EpisodeRatingsMapItem): boolean {
    return typeof item.totalEpisodeCount === 'number'
      && item.totalEpisodeCount > 0
      && (item.watchedEpisodeCount ?? 0) >= item.totalEpisodeCount;
  }

  protected episodeMapWatchedBadge(count: number | null): string {
    const watched = count ?? 0;
    return `${watched} ${watched === 1 ? 'ep' : 'eps'}`;
  }

  protected episodeMapSeriesCountLabel(): string {
    const count = this.episodeMap()?.totalElements ?? 0;
    return `${count.toLocaleString('pt-BR')} ${count === 1 ? 'série' : 'séries'}`;
  }

  protected episodeMapPageRangeLabel(): string {
    const data = this.episodeMap();
    if (!data || data.totalElements === 0) return 'Mostrando 0 de 0 séries';
    const start = (data.page - 1) * data.size + 1;
    const end = Math.min(data.page * data.size, data.totalElements);
    const format = (value: number) => value.toLocaleString('pt-BR');
    const seriesLabel = data.totalElements === 1 ? 'série' : 'séries';
    return `Mostrando ${format(start)}–${format(end)} de ${format(data.totalElements)} ${seriesLabel}`;
  }

  protected runtimeLabel(minutes: number | null | undefined): string {
    return minutes && minutes > 0 ? `${minutes} min` : '';
  }

  protected formatDuration(totalMinutes: number | null | undefined): string {
    const minutes = Math.max(0, totalMinutes ?? 0);
    const days = Math.floor(minutes / 1440);
    const hours = Math.floor((minutes % 1440) / 60);
    const remainingMinutes = minutes % 60;
    if (days) return days + 'd ' + hours + 'h';
    if (hours) return hours + 'h ' + remainingMinutes + 'min';
    return remainingMinutes + 'min';
  }

  protected updateSummarySlide(event: Event): void {
    const grid = event.currentTarget as HTMLElement;
    const cards = Array.from(grid.querySelectorAll<HTMLElement>('.profile-summary-card'));
    if (!cards.length) return;
    const stride = cards.length > 1
      ? cards[1].getBoundingClientRect().left - cards[0].getBoundingClientRect().left
      : cards[0].getBoundingClientRect().width;
    if (stride > 0) this.summarySlide.set(Math.max(0, Math.min(cards.length - 1, Math.round(grid.scrollLeft / stride))));
  }

  protected updateHistorySummarySlide(event: Event): void {
    const grid = event.currentTarget as HTMLElement;
    const cards = Array.from(grid.querySelectorAll<HTMLElement>('.profile-history-summary-track > article'));
    if (!cards.length) return;
    const stride = cards.length > 1
      ? cards[1].getBoundingClientRect().left - cards[0].getBoundingClientRect().left
      : cards[0].getBoundingClientRect().width;
    if (stride > 0) this.historySummarySlide.set(Math.max(0, Math.min(cards.length - 1, Math.round(grid.scrollLeft / stride))));
  }

  protected selectHistorySummarySlide(index: number): void {
    const grid = this.historySummaryGrid?.nativeElement;
    const card = grid?.querySelectorAll<HTMLElement>('.profile-history-summary-track > article')[index];
    if (!grid || !card) return;
    const gridBox = grid.getBoundingClientRect();
    const cardBox = card.getBoundingClientRect();
    const paddingLeft = Number.parseFloat(getComputedStyle(grid).paddingLeft) || 0;
    grid.scrollTo({ left: grid.scrollLeft + cardBox.left - gridBox.left - paddingLeft, behavior: 'smooth' });
    this.historySummarySlide.set(index);
  }

  protected selectSummarySlide(index: number): void {
    const grid = this.summaryGrid?.nativeElement;
    const card = grid?.querySelectorAll<HTMLElement>('.profile-summary-card')[index];
    if (!grid || !card) return;
    const gridBox = grid.getBoundingClientRect();
    const cardBox = card.getBoundingClientRect();
    const paddingLeft = Number.parseFloat(getComputedStyle(grid).paddingLeft) || 0;
    grid.scrollTo({ left: grid.scrollLeft + cardBox.left - gridBox.left - paddingLeft, behavior: 'smooth' });
    this.summarySlide.set(index);
  }

  protected formatHours(totalMinutes: number | null | undefined): string {
    return (Math.max(0, totalMinutes ?? 0) / 60).toLocaleString('pt-BR', { maximumFractionDigits: 1 });
  }

  protected ratingBarWidth(count: number): string {
    const maximum = Math.max(1, ...((this.summary()?.ratingsDistribution ?? []).map((rating) => rating.count)));
    return Math.max(3, Math.round((count / maximum) * 100)) + '%';
  }

  protected genreBarWidth(count: number, items: readonly { count: number }[]): string {
    const maximum = Math.max(1, ...items.map((item) => item.count));
    return Math.max(3, Math.round((count / maximum) * 100)) + '%';
  }

  protected countBarWidth(count: number, items: readonly { count: number }[]): string {
    const maximum = Math.max(1, ...items.map((item) => item.count));
    return Math.max(3, Math.round((count / maximum) * 100)) + '%';
  }

  protected minutesBarWidth(minutes: number, items: readonly { minutesWatched: number }[]): string {
    const maximum = Math.max(1, ...items.map((item) => item.minutesWatched));
    return Math.max(3, Math.round((minutes / maximum) * 100)) + '%';
  }

  protected barHeight(value: number, maximum: number): string {
    return Math.max(5, Math.round((value / Math.max(1, maximum)) * 100)) + '%';
  }

  protected ratingCount(distribution: readonly { score: number; count: number }[], score: number): number {
    return distribution.find((item) => item.score === score)?.count ?? 0;
  }

  protected ratingTotal(distribution: readonly { score: number; count: number }[]): number {
    return distribution.reduce((total, item) => total + item.count, 0);
  }

  protected ratingBarHeight(count: number, distribution: readonly { score: number; count: number }[]): string {
    const maximum = Math.max(1, ...distribution.map((item) => item.count));
    return Math.max(3, Math.round((count / maximum) * 100)) + '%';
  }

  protected weekdayName(dayOfWeek: number): string {
    const names = ['domingo', 'segunda-feira', 'terça-feira', 'quarta-feira', 'quinta-feira', 'sexta-feira', 'sábado'];
    return names[((dayOfWeek % 7) + 7) % 7];
  }

  protected busiestDay(items: readonly { watchedDate: string; minutesWatched: number }[]): { watchedDate: string; minutesWatched: number } {
    return items.reduce((busiest, day) => day.minutesWatched > busiest.minutesWatched ? day : busiest, items[0] ?? { watchedDate: '', minutesWatched: 0 });
  }

  protected busiestByCount<T extends { count: number }>(items: readonly T[]): T {
    return items.reduce((busiest, item) => item.count > busiest.count ? item : busiest, items[0] ?? ({ count: 0 } as T));
  }

  protected quietestByCount<T extends { count: number }>(items: readonly T[]): T {
    return items.reduce((quietest, item) => item.count < quietest.count ? item : quietest, items[0] ?? ({ count: 0 } as T));
  }

  protected daysInMonth(month: string): number {
    const [year, number] = month.split('-').map(Number);
    return new Date(Date.UTC(year, number, 0)).getUTCDate();
  }

  protected elapsedDaysInMonth(month: string): number {
    const today = new Date();
    const currentMonth = today.toISOString().slice(0, 7);
    return Math.max(1, month === currentMonth ? today.getDate() : this.daysInMonth(month));
  }

  protected formatCount(count: number): string {
    return new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 1 }).format(count);
  }

  protected maxCount(items: readonly { count: number }[]): number {
    return Math.max(1, ...items.map((item) => item.count));
  }

  protected maxMinutes(items: readonly { minutesWatched: number }[]): number {
    return Math.max(1, ...items.map((item) => item.minutesWatched));
  }

  protected currentDayOfMonth(): number {
    return new Date().getDate();
  }

  protected asText(value: number): string {
    return String(value);
  }

  protected episodeSeasons(): Array<{ seasonNumber: number; episodes: Array<{ seasonNumber: number | null; episodeNumber: number | null; score: number | null; averageScore: number | null; ratingCount: number }> }> {
    const grouped = new Map<number, Array<{ seasonNumber: number | null; episodeNumber: number | null; score: number | null; averageScore: number | null; ratingCount: number }>>();
    for (const episode of this.episodeGrid()?.episodes ?? []) {
      if (episode.seasonNumber === null || episode.episodeNumber === null) continue;
      const rows = grouped.get(episode.seasonNumber) ?? [];
      rows.push(episode);
      grouped.set(episode.seasonNumber, rows);
    }
    return [...grouped.entries()]
      .sort(([left], [right]) => left - right)
      .map(([seasonNumber, episodes]) => ({ seasonNumber, episodes: episodes.sort((left, right) => (left.episodeNumber ?? 0) - (right.episodeNumber ?? 0)) }));
  }

  protected episodeNumbers(): number[] {
    return [...new Set((this.episodeGrid()?.episodes ?? []).flatMap((episode) => episode.episodeNumber === null ? [] : [episode.episodeNumber]))]
      .sort((left, right) => left - right);
  }

  protected episodeAt(episodeNumber: number, seasonNumber: number): { seasonNumber: number | null; episodeNumber: number | null; score: number | null; averageScore: number | null; ratingCount: number } | null {
    return this.episodeGrid()?.episodes.find((episode) => episode.seasonNumber === seasonNumber && episode.episodeNumber === episodeNumber) ?? null;
  }

  protected selectedSectionUrl(path: string): string[] {
    const base = '/users/' + encodeURIComponent(this.username());
    return path ? [base, path] : [base];
  }

  protected detailRoute(record: DiaryRecord | ProfileDiaryPreview): string[] | null {
    const content = record.content;
    if (!content) return null;
    if (content.type === 'MOVIE' && content.tmdbId) return ['/content/movie', content.tmdbId];
    if (content.type === 'SERIES' && (content.seriesTmdbId || content.tmdbId)) return ['/content/series', content.seriesTmdbId || content.tmdbId!];
    if (content.type === 'SEASON' && content.seriesTmdbId && content.seasonNumber !== null) {
      return ['/content/series', content.seriesTmdbId, 'season', String(content.seasonNumber)];
    }
    if (content.type === 'EPISODE') return episodeContentRoute(content);
    return null;
  }

  protected profileContentCardRoute(card: ProfileContentCard | null): string[] | null {
    if (!card) return null;
    if (card.type === 'MOVIE' && card.tmdbId) return ['/content/movie', card.tmdbId];
    if (card.type === 'SERIES' && (card.seriesTmdbId || card.tmdbId)) {
      return ['/content/series', card.seriesTmdbId || card.tmdbId!];
    }
    if (card.type === 'SEASON' && card.seriesTmdbId && card.seasonNumber !== null) {
      return ['/content/series', card.seriesTmdbId, 'season', String(card.seasonNumber)];
    }
    if (card.type === 'EPISODE') return episodeContentRoute(card);
    return null;
  }

  protected profileContentCardNavigationState(card: ProfileContentCard | null): { contentId: string } | undefined {
    return card?.type === 'EPISODE' ? episodeContentNavigationState(card.contentId) : undefined;
  }

  protected profilePreviewNavigationState(entry: ProfileDiaryPreview): { contentId: string } | undefined {
    return entry.content?.type === 'EPISODE' ? episodeContentNavigationState(entry.content.id) : undefined;
  }

  protected contentRoute(type: string | null, tmdbId: string | null, seriesTmdbId: string | null): string[] | null {
    const id = type === 'MOVIE' ? tmdbId : seriesTmdbId || tmdbId;
    if (!id) return null;
    return ['/content', type === 'MOVIE' ? 'movie' : 'series', id];
  }

  protected mapRoute(seriesTmdbId: string): string[] {
    return ['/users', this.username(), 'episode-ratings-map', seriesTmdbId];
  }

  protected monthChange(offset: number): void {
    const [year, month] = this.selectedMonth().split('-').map(Number);
    const next = new Date(Date.UTC(year, month - 1 + offset, 1));
    this.selectedMonth.set(next.toISOString().slice(0, 7));
    this.loadSectionData();
  }

  protected yearChange(offset: number): void {
    this.selectedYear.update((year) => year + offset);
    this.loadSectionData();
  }

  protected dateLabel(date: string | null | undefined): string {
    if (!date) return '—';
    return new Date(date + (date.length === 10 ? 'T12:00:00' : '')).toLocaleDateString('pt-BR', {
      day: 'numeric', month: 'short', year: 'numeric',
    });
  }

  protected monthLabel(month: string): string {
    const [year, number] = month.split('-').map(Number);
    return new Date(Date.UTC(year, number - 1, 1)).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric', timeZone: 'UTC' });
  }

  protected dayLabel(day: number): string {
    const names = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
    return names[((day % 7) + 7) % 7];
  }

  protected monthName(month: number): string {
    return new Date(Date.UTC(2026, month - 1, 1)).toLocaleDateString('pt-BR', { month: 'short', timeZone: 'UTC' });
  }

  protected pickPreview(pick: import('../../../picks/data-access/picks-api.service').UserPickPreview): string {
    const first = pick.answeredCategories.find((answer) => answer.name);
    return first?.name ?? this.copy.tabs.picks;
  }

  protected nextPage(): void {
    if (this.currentPage() >= this.pageTotalPages()) return;
    this.currentPage.update((page) => page + 1);
    if (this.section() === 'progress') {
      this.loadSectionData();
      return;
    }
    const profile = this.profile();
    if (profile) this.loadSection(profile.id);
  }

  protected retry(): void {
    this.loadProfile();
  }

  protected last30DayMinutes(): number {
    const profile = this.profile();
    if (!profile) return 0;
    return this.mode() === 'MOVIE'
      ? profile.minutesWatchedMoviesLast30Days ?? this.summary()?.watchTime.minutesWatchedLast30Days ?? 0
      : profile.minutesWatchedEpisodesLast30Days ?? this.summary()?.watchTime.minutesWatchedLast30Days ?? 0;
  }

  protected modeLabel(mode = this.mode()): string {
    return mode === 'MOVIE' ? this.copy.movies : this.copy.series;
  }

  private loadProfile(): void {
    const loadVersion = ++this.profileLoadVersion;
    const username = this.username().replace(/^@/, '');
    if (!username) {
      this.status.set('error');
      return;
    }
    this.status.set('loading');
    this.profile.set(null);
    this.foundUser.set(null);
    this.searchApi.search(username, 'USER').subscribe({
      next: (results) => {
        if (loadVersion !== this.profileLoadVersion) return;
        const found = results.users.find((user) => user.username.toLocaleLowerCase() === username.toLocaleLowerCase());
        if (!found) {
          this.status.set('error');
          return;
        }
        this.foundUser.set(found);
        this.followState.set(found.ownedByViewer ? 'SELF' : found.viewerFollowStatus === 'ACCEPTED' ? 'FOLLOWING' : found.viewerFollowStatus === 'PENDING' ? 'PENDING' : 'NOT_FOLLOWING');
        this.followsViewer.set(found.followsViewer);
        if (!found.profileDetailsVisible) {
          this.profileApi.getUser(found.id).subscribe({
            next: (profile) => {
              if (loadVersion !== this.profileLoadVersion) return;
              this.profile.set(profile);
              this.status.set('private');
            },
            error: () => {
              if (loadVersion === this.profileLoadVersion) this.status.set('private');
            },
          });
          return;
        }
        this.profileApi.getUser(found.id).subscribe({
          next: (profile) => {
            if (loadVersion !== this.profileLoadVersion) return;
            this.profile.set(profile);
            this.status.set('ready');
            this.loadSection(profile.id);
          },
          error: (error: unknown) => {
            if (loadVersion === this.profileLoadVersion) this.handleError(error);
          },
        });
      },
      error: (error: unknown) => {
        if (loadVersion === this.profileLoadVersion) this.handleError(error);
      },
    });
  }

  private loadSectionData(preserveExisting = false): void {
    const profile = this.profile();
    if (profile) this.loadSection(profile.id, preserveExisting);
  }

  private loadSection(userId: string, preserveExisting = false): void {
    const section = this.section();
    const mode = this.mode();
    if (section === 'profile' && !preserveExisting) this.profileOverviewLoading.set(true);
    else this.profileOverviewLoading.set(false);
    if (section !== 'progress' && !preserveExisting) this.resetSectionData();

    if (section === 'profile') {
      forkJoin({
        summary: this.profileApi.getSummary(userId, mode),
        recentMovies: mode === 'MOVIE'
          ? this.diaryApi.getDiaryPage(userId, { page: 1, size: 6, type: 'MOVIE', sortBy: 'NEWEST' }).pipe(catchError(() => of(null)))
          : of(null),
        recentEpisodes: mode === 'EPISODE'
          ? this.diaryApi.getDiaryPage(userId, { page: 1, size: 30, type: 'EPISODE', sortBy: 'NEWEST' }).pipe(catchError(() => of(null)))
          : of(null),
        diaryEntries: mode === 'EPISODE'
          ? this.diaryApi.getAllDiaryEntries(userId).pipe(catchError(() => of([] as DiaryRecord[])))
          : of([] as DiaryRecord[]),
        reviews: this.diaryApi.getUserReviewsPage(userId, 1, 50).pipe(catchError(() => of(null))),
      }).subscribe({
        next: ({ summary, recentMovies, recentEpisodes, diaryEntries, reviews }) => {
          if (this.profile()?.id !== userId || this.mode() !== mode || this.section() !== 'profile') return;
          this.summary.set(summary);
          const latestMovieReview = reviews?.content.find((review) => review.content.type === 'MOVIE');
          this.latestMovieReviewBackdropPath.set(latestMovieReview?.card?.backdropPath ?? null);
          this.recentMovieEntries.set(recentMovies?.content ?? []);
          this.recentEpisodeEntries.set(recentEpisodes?.content ?? []);
          this.allDiaryEntries.set(diaryEntries);
          this.ratedEpisodeEntries.set(diaryEntries.filter((entry) => entry.content.type === 'EPISODE' && entry.score !== null));
          this.reviewComments.set(Object.fromEntries((reviews?.content ?? [])
            .filter((review) => Boolean(review.comment))
            .map((review) => [review.id, review.comment as string])));
          this.profileShareReviews.set((reviews?.content ?? []).map((review) => ({
            id: review.id,
            source: review.source,
            content: review.content,
            card: review.card,
            comment: review.comment,
            score: review.score,
            watchNumber: review.watchNumber ?? null,
            customPosterUrl: review.customPosterUrl,
            seriesTitle: review.seriesTitle,
          })));
          this.loadEpisodeStillPaths(recentEpisodes?.content ?? []);
          this.topFive.set(this.resolveTopFive(summary.top5 ?? []));
          this.profileOverviewLoading.set(false);
        },
        error: (error: unknown) => {
          if (this.profile()?.id === userId && this.mode() === mode && this.section() === 'profile') {
            this.profileOverviewLoading.set(false);
            if (preserveExisting) this.handleProfileActionError(error);
            else this.handleError(error);
          }
        },
      });
      return;
    }

    if (section === 'progress') {
      this.diaryApi.getSeriesInProgress(userId, {
        page: this.currentPage(),
        size: this.progressPageSize,
        sortBy: this.progressSort(),
        direction: this.progressDirection(),
      }).subscribe({
        next: (data) => {
          const lastPage = Math.max(1, data.totalPages);
          if (data.page > lastPage) {
            this.currentPage.set(lastPage);
            this.loadSection(userId, preserveExisting);
            return;
          }
          this.progress.set(this.withCompletedSeasonProgress(data));
          const currentExpanded = this.expandedProgress();
          const currentIds = new Set(data.content.map((series) => series.seriesTmdbId));
          const retained = preserveExisting ? [...currentExpanded].filter((id) => currentIds.has(id)) : [];
          this.expandedProgress.set(new Set(retained.length ? retained : data.content[0] ? [data.content[0].seriesTmdbId] : []));
        },
        error: (error: unknown) => preserveExisting
          ? this.handleProfileActionError(error)
          : this.handleError(error),
      });
      return;
    }
    if (section === 'history' || section === 'reviews') {
      if (section === 'history') {
        this.profileApi.getAllTimeStats(userId).pipe(catchError(() => of(null)))
          .subscribe((data) => this.allTime.set(data));
      }
      this.diaryApi.getDiaryPage(userId, {
        page: this.currentPage(), size: section === 'history' ? 30 : this.pageSize,
        type: section === 'history' ? (this.historyType() === 'ALL' ? undefined : this.historyType() as 'MOVIE' | 'EPISODE') : mode === 'MOVIE' ? 'MOVIE' : 'EPISODE',
        hasReview: section === 'reviews' ? true : undefined,
        sortBy: section === 'history' ? this.historySort() : 'NEWEST',
        seriesTmdbId: section === 'history' ? this.historySeries() || undefined : undefined,
        score: section === 'history' && this.historyScore() ? Number(this.historyScore()) : undefined,
        dateFrom: section === 'history' ? this.historyDateFrom() || undefined : undefined,
        dateTo: section === 'history' ? this.historyDateTo() || undefined : undefined,
      }).subscribe({ next: (data) => this.diary.set(data), error: (error: unknown) => this.handleError(error) });
      return;
    }
    if (section === 'lists') {
      this.listsApi.getUserListsView(userId, {
        page: this.currentPage(), size: this.pageSize,
        itemType: this.listItemType() ?? undefined,
        sortBy: this.listSort(),
        sortDirection: this.listSortDirection(),
      })
        .subscribe({ next: (data) => this.lists.set(data), error: (error: unknown) => this.handleError(error) });
      return;
    }
    if (section === 'watchlist') {
      if (this.genreUserId !== userId) {
        this.genreRequest?.unsubscribe(); this.genreUserId = userId; this.watchlistGenreOptions.set([]);
        this.genreRequest = this.watchlistApi.getGenreOptions(userId).subscribe({
          next: genres => this.watchlistGenreOptions.set(genres),
          error: () => { this.genreUserId = ''; },
        });
      }
      this.watchlistApi.getView(userId, {
        type: this.watchlistType(), genre: this.watchlistGenre(), status: this.watchlistStatus(), sort: this.watchlistSort(),
        direction: this.watchlistDirection(), page: this.currentPage(), size: this.pageSize,
      }).subscribe({ next: (data) => this.watchlist.set(data), error: (error: unknown) => this.handleError(error) });
      return;
    }
    if (section === 'picks') {
      this.picksApi.getUserPicks(userId, this.currentPage(), this.pageSize)
        .subscribe({ next: (data) => this.picks.set(data), error: (error: unknown) => this.handleError(error) });
      return;
    }
    if (section === 'episode-ratings-map') {
      this.profileApi.getEpisodeMap(userId, this.currentPage(), 12)
        .subscribe({ next: (data) => this.episodeMap.set(data), error: (error: unknown) => this.handleError(error) });
      return;
    }
    if (section === 'episode-ratings-map-show') {
      const id = this.route.snapshot.paramMap.get('seriesTmdbId');
      if (!id) { this.status.set('error'); return; }
      this.profileApi.getEpisodeGrid(userId, id)
        .subscribe({ next: (data) => this.episodeGrid.set(data), error: (error: unknown) => this.handleError(error) });
      return;
    }
    if (section === 'month-in-review') {
      this.profileApi.getMonthReview(userId, mode, this.selectedMonth())
        .subscribe({ next: (data) => this.monthReview.set(data), error: (error: unknown) => this.handleError(error) });
      return;
    }
    if (section === 'year-in-review') {
      this.profileApi.getYearReview(userId, mode, this.selectedYear())
        .subscribe({ next: (data) => this.yearReview.set(data), error: (error: unknown) => this.handleError(error) });
      return;
    }
    if (section === 'all-time-stats') {
      forkJoin({
        allTime: this.profileApi.getAllTimeStats(userId),
        edition: this.profileApi.getAllTimeEdition(userId, mode),
      }).subscribe({
        next: ({ allTime, edition }) => {
          this.allTime.set(allTime);
          this.allTimeEdition.set(edition);
        },
        error: (error: unknown) => this.handleError(error),
      });
    }
  }

  private currentPageData(): ProfilePageMetadata | null {
    switch (this.section()) {
      case 'progress': return this.progress();
      case 'history':
      case 'reviews': return this.diary();
      case 'lists': return this.lists();
      case 'watchlist': return this.watchlist();
      case 'picks': return this.picks();
      case 'episode-ratings-map': return this.episodeMap();
      default: return null;
    }
  }

  private withCompletedSeasonProgress(page: SeriesInProgressPage): SeriesInProgressPage {
    return {
      ...page,
      content: page.content.map((series) => ({
        ...series,
        seasonProgress: [
          ...(series.seasonProgress ?? []),
          ...(series.completedSeasonProgress ?? []),
        ].sort((first, second) => first.seasonNumber - second.seasonNumber),
      })),
    };
  }

  private resolveTopFive(entries: ProfileSummaryTopFiveEntry[]): ResolvedTopFive[] {
    return entries.map((entry) => {
      const rating = resolveRating(entry.card?.stats?.averageScore ?? null, entry.card?.tmdbVoteAverage ?? null);
      return {
        ...entry,
        title: entry.card?.title ?? '',
        posterPath: entry.customPosterUrl || entry.card?.customPosterUrl || entry.card?.posterPath || null,
        backdropPath: entry.card?.backdropPath ?? null,
        releaseYear: entry.card?.releaseYear ?? null,
        averageScore: rating.value,
        ratingSource: rating.source,
        viewerHasWatched: this.isOwnProfile()
          ? entry.hasWatched
          : this.profileViewerWatched(entry.card?.viewerState?.watchStatus, null),
        viewerRating: entry.score ?? this.profileViewerRating(entry.card?.viewerState?.myRating, null),
        viewerReview: null,
        contentType: entry.type,
      };
    });
  }
  protected topFiveRatingLabel(entry: ResolvedTopFive): string {
    if (entry.averageScore === null) return '';
    const source = entry.ratingSource === 'tmdb' ? this.homeCopy.tmdbRating : this.homeCopy.communityAverage;
    return `${source} ${entry.averageScore.toFixed(1)}`;
  }

  protected profileCardRating(card: { stats?: { averageScore: number | null } | null; tmdbVoteAverage?: number | null } | null | undefined): string | null {
    if (!card) return null;
    const rating = resolveRating(card.stats?.averageScore, card.tmdbVoteAverage).value;
    return rating === null ? null : rating.toFixed(1);
  }

  protected profileCardRatingLabel(card: { stats?: { averageScore: number | null } | null; tmdbVoteAverage?: number | null } | null | undefined): string {
    if (!card) return '';
    const rating = resolveRating(card.stats?.averageScore, card.tmdbVoteAverage);
    if (rating.value === null) return '';
    const source = rating.source === 'tmdb' ? this.homeCopy.tmdbRating : this.homeCopy.communityAverage;
    return `${source} ${rating.value.toFixed(1)}`;
  }

  private resetSectionData(): void {
    this.summary.set(null);
    this.latestMovieReviewBackdropPath.set(undefined);
    this.recentMovieEntries.set([]);
    this.recentEpisodeEntries.set([]);
    this.allDiaryEntries.set([]);
    this.ratedEpisodeEntries.set([]);
    this.reviewComments.set({});
    this.profileShareReviews.set([]);
    this.recentReviewLikeBusyIds.set(new Set());
    this.episodeStillPaths.set({});
    this.topFive.set([]);
    this.diary.set(null);
    this.progress.set(null);
    this.expandedProgress.set(new Set());
    this.progressSortOpen.set(false);
    this.lists.set(null);
    this.watchlist.set(null);
    this.picks.set(null);
    this.episodeMap.set(null);
    this.episodeGrid.set(null);
    this.monthReview.set(null);
    this.yearReview.set(null);
    this.allTime.set(null);
    this.allTimeEdition.set(null);
  }

  private loadEpisodeStillPaths(entries: readonly DiaryRecord[]): void {
    const latestEpisodes = entries.slice(0, 4);
    const seasons = new Map<string, { seriesTmdbId: string; seasonNumber: number }>();
    for (const entry of latestEpisodes) {
      const { seriesTmdbId, seasonNumber } = entry.content;
      if (!seriesTmdbId || seasonNumber === null) continue;
      seasons.set(`${seriesTmdbId}:${seasonNumber}`, { seriesTmdbId, seasonNumber });
    }
    if (!seasons.size) return;
    const requests = [...seasons.entries()].map(([key, season]) => this.contentApi
      .getSeasonEpisodes(season.seriesTmdbId, season.seasonNumber)
      .pipe(map((episodes) => [key, episodes] as const), catchError(() => of([key, []] as const))));
    forkJoin(requests)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((seasonEpisodes) => {
        const paths: Record<string, string> = {};
        for (const entry of latestEpisodes) {
          const episodeKey = this.episodeKey(entry);
          const { seriesTmdbId, seasonNumber, episodeNumber } = entry.content;
          if (!episodeKey || !seriesTmdbId || seasonNumber === null || episodeNumber === null) continue;
          const seasonKey = `${seriesTmdbId}:${seasonNumber}`;
          const episodes = seasonEpisodes.find(([key]) => key === seasonKey)?.[1] ?? [];
          const stillPath = episodes.find((episode) => episode.episodeNumber === episodeNumber)?.stillUrl;
          if (stillPath) paths[episodeKey] = stillPath;
        }
        this.episodeStillPaths.set(paths);
      });
  }

  private episodeKey(entry: DiaryRecord): string | null {
    const { seriesTmdbId, seasonNumber, episodeNumber } = entry.content;
    return seriesTmdbId && seasonNumber !== null && episodeNumber !== null
      ? `${seriesTmdbId}:${seasonNumber}:${episodeNumber}`
      : null;
  }

  private handleError(error: unknown): void {
    this.status.set(error instanceof HttpErrorResponse && error.status === 403 ? 'private' : 'error');
  }
}
