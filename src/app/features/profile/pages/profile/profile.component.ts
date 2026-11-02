import { DecimalPipe } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, DestroyRef, ElementRef, ViewChild, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { combineLatest, forkJoin, Observable, of, Subscription } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { AuthSessionService } from '../../../../core/session/session.service';
import { DiaryApiService, DiaryRecord, DiaryRecordPage, DiarySortBy, ProgressSortBy, SeriesInProgressPage, SeriesInProgressRecord } from '../../../diary/data-access/diary-api.service';
import { ListItemType, ListsApiService, UserListCard, UserListCardPage } from '../../../lists/data-access/lists-api.service';
import { PicksApiService, UserPickPreviewPage } from '../../../picks/data-access/picks-api.service';
import { SearchApiService, SearchUserView } from '../../../search-content/data-access/search-api.service';
import { WatchlistApiService, WatchlistContentType, WatchlistSort, WatchlistStatus, WatchlistView } from '../../../watchlist/data-access/watchlist-api.service';
import { ContentApiService } from '../../../content/data-access/content-api.service';
import { ContentImageAction, ContentImageActionsComponent } from '../../../../shared/components/content-image-actions/content-image-actions.component';
import { DialogBackdropComponent } from '../../../../shared/components/dialog-backdrop/dialog-backdrop.component';
import { ModalFocusDirective } from '../../../../shared/directives/modal-focus.directive';
import { ShareCardModel, SharePreviewComponent } from '../../../../shared/components/share-preview/share-preview.component';
import { ProfileCountryMapComponent } from '../../components/profile-country-map/profile-country-map.component';
import { ProfileApiService, ProfileAllTimeEdition, ProfileAllTimeStats, ProfileContentMode, ProfileDiaryPreview, ProfileMonthReview, ProfileSummary, ProfileYearReview, PublicUserProfile, TopFiveEntry } from '../../data-access/profile-api.service';
import { messageCatalog } from '../../../../shared/i18n/messages';

type ProfileSection = 'profile' | 'progress' | 'history' | 'reviews' | 'lists' | 'watchlist' | 'picks' | 'episode-ratings-map' | 'episode-ratings-map-show' | 'month-in-review' | 'year-in-review' | 'all-time-stats';
type ProfileTabKey = keyof typeof messageCatalog['pt-BR']['profilePage']['tabs'];
type LoadState = 'loading' | 'ready' | 'private' | 'error';
type ProfilePageMetadata = { page: number; size: number; totalElements: number; totalPages: number; hasNext: boolean };
type ProfileListSort = 'none' | 'updatedAt' | 'rank' | 'name' | 'likesCount' | 'itemsCount' | 'commentsCount';
type ResolvedTopFive = TopFiveEntry & { title: string; posterPath: string | null; releaseYear: number | null; averageScore: number | null; contentType: 'MOVIE' | 'SERIES' };
type RecentSeriesCard = {
  seriesTmdbId: string;
  title: string;
  posterPath: string | null;
  releaseYear: number | null;
  watchedEpisodeCount: number;
  lastWatchedDate: string | null;
  score: number | null;
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
  imports: [DecimalPipe, RouterLink, ContentImageActionsComponent, DialogBackdropComponent, ModalFocusDirective, ProfileCountryMapComponent, SharePreviewComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './profile.component.html',
  styleUrl: './profile.component.css',
})
export class ProfileComponent {
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
  protected readonly progressCopy = messageCatalog['pt-BR'].progressPage;
  protected readonly section = signal<ProfileSection>('profile');
  protected readonly status = signal<LoadState>('loading');
  protected readonly profile = signal<PublicUserProfile | null>(null);
  protected readonly foundUser = signal<SearchUserView | null>(null);
  protected readonly username = signal('');
  protected readonly mode = signal<ProfileContentMode>('MOVIE');
  protected readonly summary = signal<ProfileSummary | null>(null);
  protected readonly recentMovieEntries = signal<DiaryRecord[]>([]);
  protected readonly recentEpisodeEntries = signal<DiaryRecord[]>([]);
  protected readonly recentSeriesProgress = signal<SeriesInProgressRecord[]>([]);
  protected readonly recentSeriesPosterPaths = signal<Record<string, string>>({});
  protected readonly ratedEpisodeEntries = signal<DiaryRecord[]>([]);
  protected readonly reviewComments = signal<Record<string, string>>({});
  protected readonly episodeStillPaths = signal<Record<string, string>>({});
  protected readonly summarySlide = signal(0);
  protected readonly historySummarySlide = signal(0);
  protected readonly topFive = signal<ResolvedTopFive[]>([]);
  protected readonly diary = signal<DiaryRecordPage | null>(null);
  private readonly progressEntries = signal<SeriesInProgressRecord[]>([]);
  private readonly progressLoaded = signal(false);
  protected readonly progress = computed<SeriesInProgressPage | null>(() => {
    if (!this.progressLoaded()) return null;
    const activeEntries = this.progressEntries().filter((entry) => !this.isCompletedProgress(entry));
    const totalElements = activeEntries.length;
    const totalPages = Math.ceil(totalElements / this.progressPageSize);
    const page = Math.max(1, Math.min(this.currentPage(), totalPages || 1));
    const content = activeEntries.slice((page - 1) * this.progressPageSize, page * this.progressPageSize);
    const remainingRuntimeValues = activeEntries.map((entry) => entry.remainingRuntimeMinutes);
    return {
      content,
      page,
      size: this.progressPageSize,
      totalElements,
      totalPages,
      hasNext: page < totalPages,
      aggregate: {
        totalSeriesCount: totalElements,
        watchedEpisodeCount: activeEntries.reduce((sum, entry) => sum + (entry.watchedEpisodeCount ?? 0), 0),
        totalReleasedEpisodeCount: activeEntries.reduce((sum, entry) => sum + (entry.totalReleasedEpisodeCount ?? entry.totalEpisodeCount ?? 0), 0),
        remainingEpisodeCount: activeEntries.reduce((sum, entry) => sum + (entry.remainingEpisodeCount ?? 0), 0),
        remainingRuntimeMinutes: remainingRuntimeValues.some((value) => value === null)
          ? null
          : remainingRuntimeValues.reduce<number>((sum, value) => sum + (value ?? 0), 0),
      },
    };
  });
  protected readonly progressStillPaths = signal<Record<string, string>>({});
  private readonly progressBackdropPath = signal<string | null>(null);
  protected readonly lists = signal<UserListCardPage | null>(null);
  protected readonly listItemType = signal<ListItemType | null>(null);
  protected readonly listSort = signal<ProfileListSort>('none');
  protected readonly listSortDirection = signal<'asc' | 'desc'>('desc');
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
  protected readonly actionMessage = signal('');
  protected readonly savingProgressSeriesId = signal<string | null>(null);
  protected readonly progressActionError = signal('');
  protected readonly currentPage = signal(1);

  @ViewChild('summaryGrid') private summaryGrid?: ElementRef<HTMLElement>;
  @ViewChild('historySummaryGrid') private historySummaryGrid?: ElementRef<HTMLElement>;
  protected readonly historySort = signal<DiarySortBy>('NEWEST');
  protected readonly historyType = signal<'ALL' | 'MOVIE' | 'EPISODE'>('ALL');
  protected readonly historySeries = signal('');
  protected readonly historyScore = signal('');
  protected readonly historyDateFrom = signal('');
  protected readonly historyDateTo = signal('');
  protected readonly collapsedHistoryDays = signal<ReadonlySet<string>>(new Set());
  protected readonly progressSort = signal<ProgressSortBy>('LAST_WATCHED');
  protected readonly progressDirection = signal<'ASC' | 'DESC'>('DESC');
  protected readonly expandedProgress = signal<ReadonlySet<string>>(new Set());
  protected readonly mapRatingMode = signal<'PERSONAL' | 'COMMUNITY'>('PERSONAL');
  protected readonly selectedMonth = signal(new Date().toISOString().slice(0, 7));
  protected readonly selectedYear = signal(new Date().getFullYear());
  protected readonly followBusy = signal(false);
  protected readonly activePosterMenu = signal<string | null>(null);
  protected readonly pageSize = 20;
  protected readonly progressPageSize = 8;
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
  protected readonly userName = computed(() => this.profile()?.name || this.profile()?.username || this.username());
  protected readonly recentSeriesItems = computed<RecentSeriesCard[]>(() => {
    return this.recentSeriesProgress()
      .filter((entry) => this.isCompletedProgress(entry))
      .map((entry) => {
        const latestEpisode = this.recentEpisodeEntries().find((episode) => episode.content.seriesTmdbId === entry.seriesTmdbId);
        return {
          seriesTmdbId: entry.seriesTmdbId,
          title: entry.title || entry.seriesTitle || this.copy.unavailable,
          posterPath: this.recentSeriesPosterPaths()[entry.seriesTmdbId]
            || entry.customPosterUrl
            || entry.posterPath
            || entry.seriesPosterPath
            || latestEpisode?.seriesPosterPath
            || latestEpisode?.card?.posterPath
            || null,
          releaseYear: entry.releaseYear,
          watchedEpisodeCount: entry.watchedEpisodeCount,
          lastWatchedDate: entry.lastWatchedDate,
          score: latestEpisode?.score ?? null,
        };
      })
      .sort((a, b) => (b.lastWatchedDate || '').localeCompare(a.lastWatchedDate || ''))
      .slice(0, 6);
  });
  protected readonly recentReviewComment = (review: ProfileDiaryPreview): string | null =>
    this.reviewComments()[review.id] || review.comment || null;
  protected readonly profileHeroBackdrop = computed(() => {
    const profile = this.profile();
    const summary = this.summary();
    const selectedRecent = this.mode() === 'MOVIE' ? summary?.recentReviews[0] : summary?.recentEpisodes[0];
    const fallbackRecent = summary?.recentReviews[0] || summary?.recentEpisodes[0];
    const highlightedContent = summary?.highlights?.rewatch?.content || summary?.highlights?.longestWatch?.content;
    const activeProgress = this.progress()?.content[0];
    const fallbackImage = this.progressBackdropPath()
      || this.topFive()[0]?.posterPath
      || activeProgress?.seriesPosterPath
      || activeProgress?.posterPath
      || selectedRecent?.customPosterUrl
      || selectedRecent?.card?.customPosterUrl
      || selectedRecent?.card?.posterPath
      || fallbackRecent?.customPosterUrl
      || fallbackRecent?.card?.customPosterUrl
      || fallbackRecent?.card?.posterPath
      || highlightedContent?.customPosterUrl
      || highlightedContent?.posterPath;
    return this.imageUrl(profile?.banner || fallbackImage, profile?.banner ? 'w1280' : 'w780');
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

  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly session = inject(AuthSessionService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly searchApi = inject(SearchApiService);
  private readonly profileApi = inject(ProfileApiService);
  private readonly diaryApi = inject(DiaryApiService);
  private readonly listsApi = inject(ListsApiService);
  private readonly watchlistApi = inject(WatchlistApiService);
  private readonly picksApi = inject(PicksApiService);
  private readonly contentApi = inject(ContentApiService);

  constructor() {
    this.destroyRef.onDestroy(() => this.genreRequest?.unsubscribe());
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
        this.listSort.set('none');
        this.listSortDirection.set('desc');
        this.listSource.set('ALL');
        this.watchlistType.set(null);
        this.watchlistGenre.set(null);
        this.watchlistStatus.set('ALL');
        this.watchlistSort.set('DATE_ADDED');
        this.watchlistDirection.set('DESC');
        this.profileFiltersOpen.set(false);
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

  protected chooseMode(mode: ProfileContentMode): void {
    if (this.mode() === mode) return;
    this.mode.set(mode);
    this.currentPage.set(1);
    const profile = this.profile();
    if (profile) this.loadSection(profile.id);
  }

  protected toggleProfileFilters(): void { this.profileFiltersOpen.update((open) => !open); }
  protected closeProfileFilters(): void { this.profileFiltersOpen.set(false); }

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
    const sorts: ProfileListSort[] = ['none', 'updatedAt', 'rank', 'name', 'likesCount', 'itemsCount', 'commentsCount'];
    if (!sorts.includes(value as ProfileListSort)) return;
    const next = value as ProfileListSort;
    if (this.listSort() === next) return;
    this.listSort.set(next);
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
    if (this.progressSort() === value) return;
    this.progressSort.set(value);
    this.currentPage.set(1);
    this.loadSectionData();
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
    this.progressActionError.set('');
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
        if (profile) this.loadSection(profile.id);
      },
      error: () => {
        this.savingProgressSeriesId.set(null);
        this.progressActionError.set(this.progressCopy.markWatchedError);
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
      this.loadProgressStillPaths(this.progress()?.content ?? []);
      return;
    }
    const profile = this.profile();
    if (profile) this.loadSection(profile.id);
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
      this.loadProgressStillPaths(this.progress()?.content ?? []);
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

  protected progressStill(seriesTmdbId: string, fallback: string | null | undefined): string | null {
    return this.imageUrl(this.progressStillPaths()[seriesTmdbId] || fallback, 'w780');
  }

  protected progressEpisodeCoordinates(item: SeriesInProgressRecord): string {
    if (item.lastWatchedSeasonNumber === null || item.lastWatchedEpisodeNumber === null) return '';
    return `S${item.lastWatchedSeasonNumber} · E${item.lastWatchedEpisodeNumber}`;
  }

  private isCompletedProgress(item: SeriesInProgressRecord): boolean {
    const totalEpisodes = item.totalEpisodeCount ?? item.totalReleasedEpisodeCount;
    return totalEpisodes !== null
      && totalEpisodes !== undefined
      && totalEpisodes > 0
      && item.watchedEpisodeCount >= totalEpisodes;
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

  protected handlePosterAction(entry: ResolvedTopFive, action: string): void {
    this.activePosterMenu.set(null);
    if (action === 'open-content') {
      void this.router.navigate(['/content', entry.contentType === 'MOVIE' ? 'movie' : 'series', entry.content.tmdbId]);
    }
  }

  protected handleProfileImageAction(type: 'MOVIE' | 'SERIES', tmdbId: string | null, action: string): void {
    this.activePosterMenu.set(null);
    if (action === 'open-content' && tmdbId) {
      void this.router.navigate(['/content', type === 'MOVIE' ? 'movie' : 'series', tmdbId]);
    }
  }

  protected follow(): void {
    const profile = this.profile();
    if (!profile || this.followBusy() || this.followState() === 'SELF') return;
    const following = !this.isFollowing();
    this.followBusy.set(true);
    this.profileApi.setFollow(profile.id, following).subscribe({
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
        this.followBusy.set(false);
      },
      error: () => {
        this.actionMessage.set(this.copy.loadError);
        this.followBusy.set(false);
      },
    });
  }

  protected async copyProfileLink(): Promise<void> {
    try {
      await navigator.clipboard.writeText(window.location.origin + '/users/' + encodeURIComponent(this.username()));
      this.actionMessage.set(this.copy.copySuccess);
    } catch {
      this.actionMessage.set(this.copy.copyError);
    }
    this.profileMenuOpen.set(false);
  }

  protected openProfileAction(action: 'report' | 'block'): void {
    this.actionMessage.set(action === 'report' ? 'A denúncia ficará disponível nesta tela.' : 'O bloqueio ficará disponível nesta tela.');
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

  protected episodeStill(entry: DiaryRecord): string | null {
    const key = this.episodeKey(entry);
    return this.imageUrl((key ? this.episodeStillPaths()[key] : null) || entry.card?.backdropPath || entry.seriesPosterPath || entry.card?.posterPath, 'w780');
  }

  protected profileGenrePercentage(count: number, items: readonly { count: number }[]): string {
    const total = items.reduce((sum, item) => sum + item.count, 0);
    return total ? Math.round((count / total) * 100) + '%' : '0%';
  }

  protected imageUrl(path: string | null | undefined, size = 'w342'): string | null {
    if (!path) return null;
    if (/^https?:\/\//i.test(path)) return path;
    return 'https://image.tmdb.org/t/p/' + size + (path.startsWith('/') ? path : '/' + path);
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
    const target = content.type === 'MOVIE' ? content.tmdbId : content.seriesTmdbId;
    if (!target) return null;
    return ['/content', content.type === 'MOVIE' ? 'movie' : 'series', target];
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
      this.loadProgressStillPaths(this.progress()?.content ?? []);
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
    const username = this.username().replace(/^@/, '');
    if (!username) {
      this.status.set('error');
      return;
    }
    this.status.set('loading');
    this.profile.set(null);
    this.searchApi.search(username, 'USER').subscribe({
      next: (results) => {
        const found = results.users.find((user) => user.username.toLocaleLowerCase() === username.toLocaleLowerCase())
          ?? results.users[0];
        if (!found) {
          this.status.set('error');
          return;
        }
        this.foundUser.set(found);
        this.followState.set(found.ownedByViewer ? 'SELF' : found.viewerFollowStatus === 'ACCEPTED' ? 'FOLLOWING' : found.viewerFollowStatus === 'PENDING' ? 'PENDING' : 'NOT_FOLLOWING');
        this.followsViewer.set(found.followsViewer);
        if (!found.profileDetailsVisible) {
          this.status.set('private');
          return;
        }
        this.profileApi.getUser(found.id).subscribe({
          next: (profile) => {
            this.profile.set(profile);
            this.status.set('ready');
            this.loadSection(profile.id);
          },
          error: (error: unknown) => this.handleError(error),
        });
      },
      error: (error: unknown) => this.handleError(error),
    });
  }

  private loadSectionData(): void {
    const profile = this.profile();
    if (profile) this.loadSection(profile.id);
  }

  private loadSection(userId: string): void {
    this.resetSectionData();
    const section = this.section();
    const mode = this.mode();

    if (section === 'profile') {
      forkJoin({
        summary: this.profileApi.getSummary(userId, mode),
        topFive: this.profileApi.getTopFive(userId, mode === 'MOVIE' ? 'MOVIE' : 'SERIES'),
        recentMovies: mode === 'MOVIE'
          ? this.diaryApi.getDiaryPage(userId, { page: 1, size: 6, type: 'MOVIE', sortBy: 'NEWEST' }).pipe(catchError(() => of(null)))
          : of(null),
        recentEpisodes: mode === 'EPISODE'
          ? this.diaryApi.getDiaryPage(userId, { page: 1, size: 30, type: 'EPISODE', sortBy: 'NEWEST' }).pipe(catchError(() => of(null)))
          : of(null),
        recentSeries: mode === 'EPISODE'
          ? this.diaryApi.getAllSeriesInProgress(userId, { sortBy: 'LAST_WATCHED', direction: 'DESC' }).pipe(catchError(() => of([] as SeriesInProgressRecord[])))
          : of([] as SeriesInProgressRecord[]),
        ratedEpisodes: mode === 'EPISODE'
          ? this.diaryApi.getAllDiaryEntries(userId).pipe(catchError(() => of([] as DiaryRecord[])))
          : of([] as DiaryRecord[]),
        reviews: this.diaryApi.getUserReviewsPage(userId, 1, 50).pipe(catchError(() => of(null))),
      }).subscribe({
        next: ({ summary, topFive, recentMovies, recentEpisodes, recentSeries, ratedEpisodes, reviews }) => {
          this.summary.set(summary);
          this.recentMovieEntries.set(recentMovies?.content ?? []);
          this.recentEpisodeEntries.set(recentEpisodes?.content ?? []);
          this.recentSeriesProgress.set(recentSeries);
          this.loadRecentSeriesPosterPaths(recentSeries);
          this.ratedEpisodeEntries.set(ratedEpisodes.filter((entry) => entry.content.type === 'EPISODE' && entry.score !== null));
          this.reviewComments.set(Object.fromEntries((reviews?.content ?? [])
            .filter((review) => Boolean(review.comment))
            .map((review) => [review.id, review.comment as string])));
          this.loadEpisodeStillPaths(recentEpisodes?.content ?? []);
          this.resolveTopFive(topFive);
        },
        error: (error: unknown) => this.handleError(error),
      });
      return;
    }

    if (section === 'progress') {
      this.progressStillPaths.set({});
      this.progressBackdropPath.set(null);
      forkJoin({
        entries: this.diaryApi.getAllSeriesInProgress(userId, { sortBy: this.progressSort(), direction: this.progressDirection() }),
        topFive: this.profileApi.getTopFive(userId, 'MOVIE').pipe(catchError(() => of([]))),
      })
        .subscribe({
          next: ({ entries, topFive }) => {
            this.resolveTopFive(topFive);
            this.progressEntries.set(entries);
            this.progressLoaded.set(true);
            const firstItem = entries.find((entry) => !this.isCompletedProgress(entry));
            this.expandedProgress.set(firstItem ? new Set([firstItem.seriesTmdbId]) : new Set());
            this.loadProgressStillPaths(this.progress()?.content ?? []);
            if (firstItem) {
              this.contentApi.getSeriesPage(firstItem.seriesTmdbId)
                .pipe(catchError(() => of(null)))
                .subscribe((page) => this.progressBackdropPath.set(page?.details.backdropPath ?? null));
            }
          },
          error: (error: unknown) => this.handleError(error),
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
        sortBy: this.listSort() === 'none' ? undefined : this.listSort(),
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
      this.profileApi.getEpisodeMap(userId, this.currentPage())
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

  private resolveTopFive(entries: TopFiveEntry[]): void {
    if (entries.length === 0) {
      this.topFive.set([]);
      return;
    }
    forkJoin(entries.map((entry) => this.resolveTopFiveEntry(entry)))
      .subscribe((items) => this.topFive.set(items));
  }

  private resolveTopFiveEntry(entry: TopFiveEntry): Observable<ResolvedTopFive> {
    const unavailable: ResolvedTopFive = {
      ...entry,
      title: '',
      posterPath: entry.customPosterUrl,
      releaseYear: null,
      averageScore: null,
      contentType: entry.type,
    };

    if (entry.type === 'SERIES') {
      return this.contentApi.getSeriesPage(entry.content.id).pipe(
        map((page) => ({
          ...entry,
          title: page.details.title ?? '',
          posterPath: entry.customPosterUrl || page.details.posterPath,
          releaseYear: page.details.releaseDate ? Number(page.details.releaseDate.slice(0, 4)) : null,
          averageScore: page.stats.averageScore,
          contentType: 'SERIES' as const,
        })),
        catchError(() => of(unavailable)),
      );
    }

    return this.contentApi.getPage(entry.content.id).pipe(
      map((page) => ({
        ...entry,
        title: page.details.title ?? '',
        posterPath: entry.customPosterUrl || page.details.posterPath,
        releaseYear: page.details.releaseDate ? Number(page.details.releaseDate.slice(0, 4)) : null,
        averageScore: page.stats.averageScore,
        contentType: 'MOVIE' as const,
      })),
      catchError(() => of(unavailable)),
    );
  }

  private resetSectionData(): void {
    this.summary.set(null);
    this.recentMovieEntries.set([]);
    this.recentEpisodeEntries.set([]);
    this.recentSeriesProgress.set([]);
    this.recentSeriesPosterPaths.set({});
    this.ratedEpisodeEntries.set([]);
    this.reviewComments.set({});
    this.episodeStillPaths.set({});
    this.topFive.set([]);
    this.diary.set(null);
    this.progressEntries.set([]);
    this.progressLoaded.set(false);
    this.progressStillPaths.set({});
    this.lists.set(null);
    this.watchlist.set(null);
    this.picks.set(null);
    this.episodeMap.set(null);
    this.episodeGrid.set(null);
    this.monthReview.set(null);
    this.yearReview.set(null);
    this.allTime.set(null);
    this.allTimeEdition.set(null);
    this.actionMessage.set('');
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

  private loadRecentSeriesPosterPaths(entries: readonly SeriesInProgressRecord[]): void {
    const missingPosters = entries
      .filter((entry) => this.isCompletedProgress(entry))
      .filter((entry) => !(entry.customPosterUrl || entry.posterPath || entry.seriesPosterPath))
      .slice(0, 6);
    if (!missingPosters.length) return;

    const requests = missingPosters.map((entry) => this.contentApi
      .getSeriesPage(entry.seriesTmdbId)
      .pipe(
        map((page) => [entry.seriesTmdbId, page.metadata.presentationPosterPath || page.details.customPosterUrl || page.details.posterPath] as const),
        catchError(() => of([entry.seriesTmdbId, null] as const)),
      ));

    forkJoin(requests)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((posters) => {
        this.recentSeriesPosterPaths.set(Object.fromEntries(
          posters.filter(([, path]) => Boolean(path)),
        ) as Record<string, string>);
      });
  }

  private loadProgressStillPaths(entries: readonly SeriesInProgressRecord[]): void {
    const seasons = new Map<string, { seriesTmdbId: string; seasonNumber: number }>();
    for (const entry of entries) {
      if (!entry.seriesTmdbId || entry.lastWatchedSeasonNumber === null) continue;
      seasons.set(`${entry.seriesTmdbId}:${entry.lastWatchedSeasonNumber}`, {
        seriesTmdbId: entry.seriesTmdbId,
        seasonNumber: entry.lastWatchedSeasonNumber,
      });
    }
    if (!seasons.size) return;
    const requests = [...seasons.entries()].map(([key, season]) => this.contentApi
      .getSeasonEpisodes(season.seriesTmdbId, season.seasonNumber)
      .pipe(map((episodes) => [key, episodes] as const), catchError(() => of([key, []] as const))));
    forkJoin(requests)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((seasonEpisodes) => {
        const paths: Record<string, string> = {};
        for (const entry of entries) {
          if (entry.lastWatchedSeasonNumber === null || entry.lastWatchedEpisodeNumber === null) continue;
          const episodes = seasonEpisodes.find(([key]) => key === `${entry.seriesTmdbId}:${entry.lastWatchedSeasonNumber}`)?.[1] ?? [];
          const stillPath = episodes.find((episode) => episode.episodeNumber === entry.lastWatchedEpisodeNumber)?.stillUrl;
          if (stillPath) paths[entry.seriesTmdbId] = stillPath;
        }
        this.progressStillPaths.update((current) => ({ ...current, ...paths }));
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
