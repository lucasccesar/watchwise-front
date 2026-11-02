import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, HostListener, OnDestroy, OnInit, computed, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { Observable, Subscription, forkJoin } from 'rxjs';
import { AuthSessionService } from '../../../../core/session/session.service';
import { AppShellStateService } from '../../../../core/ui/app-shell-state.service';
import { ContentApiService, ContentComment } from '../../../content/data-access/content-api.service';
import { HomeApiService, HomeSummary } from '../../../home/data-access/home-api.service';
import { PicksApiService, PicksCommentPreview } from '../../../picks/data-access/picks-api.service';
import { ContentImageAction, ContentImageActionsComponent } from '../../../../shared/components/content-image-actions/content-image-actions.component';
import { FeedActivity, FeedApiService, FeedCommentPreview, FeedPage } from '../../data-access/feed-api.service';
import { messageCatalog } from '../../../../shared/i18n/messages';
import { ResponsiveBannerComponent } from '../../../../shared/components/responsive-banner/responsive-banner.component';

interface ActivityGroup {
  key: string;
  label: string;
  activities: FeedActivity[];
}

type SocialStatus = 'loading' | 'ready' | 'error';
type SocialCommentResponse = ContentComment | PicksCommentPreview;

@Component({
  selector: 'app-social',
  standalone: true,
  imports: [RouterLink, ContentImageActionsComponent, ResponsiveBannerComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './social.component.html',
  styleUrl: './social.component.css',
})
export class SocialComponent implements OnInit, OnDestroy {
  protected readonly copy = messageCatalog['pt-BR'].socialPage;
  protected readonly homeCopy = messageCatalog['pt-BR'].home;
  protected readonly posterActions: readonly ContentImageAction[] = [
    { id: 'open-content', label: this.copy.openContent, icon: 'eye' },
  ];
  protected readonly status = signal<SocialStatus>('loading');
  protected readonly data = signal<FeedPage | null>(null);
  protected readonly viewer = signal<HomeSummary['viewer'] | null>(null);
  protected readonly latestBackdrop = signal<string | null | undefined>(undefined);
  protected readonly heroBackdropLoading = signal(true);
  protected readonly heroBackdropFailed = signal(false);
  protected readonly busyMore = signal(false);
  protected readonly busyLikeIds = signal<ReadonlySet<string>>(new Set());
  protected readonly busyCommentIds = signal<ReadonlySet<string>>(new Set());
  protected readonly commentDrafts = signal<ReadonlyMap<string, string>>(new Map());
  protected readonly commentErrors = signal<ReadonlyMap<string, string>>(new Map());
  protected readonly loadError = signal('');
  protected readonly actionError = signal('');
  protected readonly expandedCommentIds = signal<ReadonlySet<string>>(new Set());
  protected readonly activeActivityMenu = signal<string | null>(null);
  protected readonly groups = computed(() => this.groupActivities(this.data()?.content ?? []));

  private request?: Subscription;
  private readonly shellState = inject(AppShellStateService);

  constructor(
    private readonly homeApi: HomeApiService,
    private readonly feedApi: FeedApiService,
    private readonly contentApi: ContentApiService,
    private readonly picksApi: PicksApiService,
    private readonly session: AuthSessionService,
    private readonly router: Router,
  ) {}

  ngOnInit(): void {
    this.load();
  }

  ngOnDestroy(): void {
    this.request?.unsubscribe();
  }

  protected load(): void {
    const user = this.session.user();
    if (!user) {
      void this.router.navigateByUrl('/login');
      return;
    }

    this.request?.unsubscribe();
    this.status.set('loading');
    this.latestBackdrop.set(undefined);
    this.heroBackdropLoading.set(true);
    this.heroBackdropFailed.set(false);
    this.loadError.set('');
    this.actionError.set('');
    this.request = forkJoin({
      summary: this.homeApi.getHomeSummary(user.id),
      feed: this.feedApi.getFeed({ size: 20 }),
    }).subscribe({
      next: ({ summary, feed }) => {
        this.viewer.set(summary.viewer);
        const backdropPath = feed.backdropPath;
        this.latestBackdrop.set(backdropPath);
        this.heroBackdropLoading.set(backdropPath === null || Boolean(backdropPath?.trim()));
        this.heroBackdropFailed.set(false);
        this.data.set(feed);
        this.shellState.updateHomeState(summary.viewer, summary.hasUnreadNotifications);
        this.status.set('ready');
      },
      error: (error: unknown) => {
        this.heroBackdropLoading.set(false);
        this.status.set('error');
        this.loadError.set(this.errorMessage(error));
      },
    });
  }

  protected followingLabel(): string {
    const count = new Intl.NumberFormat('pt-BR').format(this.data()?.followingCount ?? 0);
    return this.copy.followingActivity.replace('{count}', count);
  }

  protected onHeroBackdropLoaded(): void {
    this.heroBackdropLoading.set(false);
  }

  protected onHeroBackdropError(): void {
    this.heroBackdropFailed.set(true);
    this.heroBackdropLoading.set(false);
  }

  protected avatarStack(): string[] {
    return (this.data()?.followedUsersPreview ?? [])
      .map((user) => user.profilePicture)
      .filter((picture): picture is string => Boolean(picture))
      .slice(0, 5);
  }

  protected activityVerb(activity: FeedActivity): string {
    switch (activity.eventType) {
      case 'DIARY_ENTRY':
        return activity.content?.type === 'EPISODE' ? this.copy.watchedEpisode : this.copy.watchedMovie;
      case 'CONTENT_REVIEW': return this.copy.reviewedContent;
      case 'DROPPED': return this.copy.droppedContent;
      case 'TOP5_UPDATE': return this.copy.updatedTopFive;
      case 'PICK_CREATED': return this.copy.createdPick;
      case 'PICKS_TEMPLATE_CREATED': return this.copy.createdTemplate;
      case 'DAILY_GAME_RESULT': return this.copy.playedGame;
      default: return this.copy.sharedActivity;
    }
  }

  protected activityTitle(activity: FeedActivity): string {
    return this.cardForActivity(activity)?.title
      || activity.pick?.title
      || activity.picksTemplate?.name
      || activity.picksTemplate?.title
      || (activity.eventType === 'TOP5_UPDATE' ? this.copy.topFiveTitle : null)
      || (activity.eventType === 'DAILY_GAME_RESULT' ? this.copy.dailyGameTitle : null)
      || this.copy.contentUnavailable;
  }

  protected activitySubtitle(activity: FeedActivity): string {
    const card = this.cardForActivity(activity);
    if (card && activity.content?.type === 'EPISODE') {
      const parts = [card.title, activity.content.seasonNumber !== null ? `T${activity.content.seasonNumber}` : null,
        activity.content.episodeNumber !== null ? `E${activity.content.episodeNumber}` : null].filter(Boolean);
      return parts.join(' · ') || this.activityVerb(activity);
    }
    if (card) return [card.releaseYear, ...(card.genres ?? []).slice(0, 2)].filter(Boolean).join(' · ') || this.activityVerb(activity);
    if (activity.top5Type || activity.top5Preview?.type) return (activity.top5Type ?? activity.top5Preview?.type) === 'MOVIE' ? this.copy.movies : this.copy.series;
    if (activity.eventType === 'PICK_CREATED') return this.copy.pickPreview;
    if (activity.eventType === 'PICKS_TEMPLATE_CREATED') return this.copy.templatePreview;
    return this.activityVerb(activity);
  }

  protected posterUrl(activity: FeedActivity): string | null {
    const card = this.cardForActivity(activity);
    const path = card?.customPosterUrl || card?.posterPath || activity.picksTemplate?.coverImage;
    if (!path) return null;
    return /^https?:\/\//i.test(path) ? path : `https://image.tmdb.org/t/p/w342${path.startsWith('/') ? path : `/${path}`}`;
  }

  protected posterRating(activity: FeedActivity): { value: string; label: string } | null {
    const score = this.cardForActivity(activity)?.tmdbVoteAverage;
    if (score == null || !Number.isFinite(score)) return null;
    const value = new Intl.NumberFormat('pt-BR', {
      minimumFractionDigits: 1,
      maximumFractionDigits: 1,
    }).format(score);
    return { value, label: `${this.homeCopy.tmdbRating}: ${value}` };
  }

  protected posterCanOpen(activity: FeedActivity): boolean {
    const card = this.cardForActivity(activity);
    const content = activity.content;
    const type = content?.type ?? card?.type;
    const tmdbId = content?.tmdbId ?? card?.tmdbId;
    const seriesTmdbId = content?.seriesTmdbId ?? card?.seriesTmdbId;
    if (type === 'MOVIE') return Boolean(tmdbId);
    return Boolean(type && (seriesTmdbId || tmdbId));
  }

  protected profilePicture(activity: FeedActivity): string {
    return activity.user.profilePicture || '/default-user-avatar.png';
  }

  protected profileName(activity: FeedActivity): string {
    return activity.user.name || activity.user.username || this.homeCopy.welcome;
  }

  protected relativeDate(value: string): string {
    const date = new Date(value);
    const elapsedMinutes = Math.max(0, Math.floor((Date.now() - date.getTime()) / 60_000));
    if (!Number.isFinite(elapsedMinutes)) return '';
    if (elapsedMinutes < 1) return 'agora';
    if (elapsedMinutes < 60) return `há ${elapsedMinutes} min`;
    const hours = Math.floor(elapsedMinutes / 60);
    if (hours < 24) return `há ${hours} h`;
    const days = Math.floor(hours / 24);
    if (days === 1) return 'ontem';
    if (days < 7) return `há ${days} dias`;
    return new Intl.DateTimeFormat('pt-BR', { day: 'numeric', month: 'short' }).format(date);
  }

  protected activityGroups(): ActivityGroup[] {
    return this.groups();
  }

  protected canLike(activity: FeedActivity): boolean {
    return activity.eventType === 'DIARY_ENTRY'
      || activity.eventType === 'CONTENT_REVIEW'
      || activity.eventType === 'DROPPED'
      || activity.eventType === 'PICK_CREATED'
      || activity.eventType === 'PICKS_TEMPLATE_CREATED';
  }

  protected toggleLike(activity: FeedActivity): void {
    if (!this.canLike(activity) || this.isLikeBusy(activity.id)) return;
    const liked = this.isLiked(activity);
    const nextLiked = !liked;
    const request = this.likeRequest(activity, nextLiked);
    if (!request) return;
    this.busyLikeIds.update((current) => new Set(current).add(activity.id));
    this.actionError.set('');
    request.subscribe({
      next: () => {
        this.busyLikeIds.update((current) => { const next = new Set(current); next.delete(activity.id); return next; });
        this.updateLikeState(activity.id, nextLiked);
      },
      error: () => {
        this.busyLikeIds.update((current) => { const next = new Set(current); next.delete(activity.id); return next; });
        this.actionError.set(this.copy.likeError);
      },
    });
  }

  protected isLiked(activity: FeedActivity): boolean {
    return activity.likedByMe
      ?? activity.pick?.likedByMe
      ?? activity.pick?.isLikedByViewer
      ?? activity.picksTemplate?.likedByMe
      ?? activity.picksTemplate?.isLikedByViewer
      ?? false;
  }

  protected comments(activity: FeedActivity) {
    return activity.recentComments ?? activity.pick?.recentComments ?? activity.picksTemplate?.recentComments ?? [];
  }

  protected canComment(activity: FeedActivity): boolean {
    return activity.eventType === 'DIARY_ENTRY'
      || activity.eventType === 'PICK_CREATED'
      || activity.eventType === 'PICKS_TEMPLATE_CREATED';
  }

  protected commentDraft(activityId: string): string {
    return this.commentDrafts().get(activityId) ?? '';
  }

  protected setCommentDraft(activityId: string, event: Event): void {
    const value = (event.target as HTMLInputElement).value;
    this.commentDrafts.update((current) => new Map(current).set(activityId, value));
    this.commentErrors.update((current) => {
      if (!current.has(activityId)) return current;
      const next = new Map(current);
      next.delete(activityId);
      return next;
    });
  }

  protected isCommentBusy(activityId: string): boolean {
    return this.busyCommentIds().has(activityId);
  }

  protected commentError(activityId: string): string | null {
    return this.commentErrors().get(activityId) ?? null;
  }

  protected submitComment(event: Event, activity: FeedActivity): void {
    event.preventDefault();
    const text = this.commentDraft(activity.id).trim();
    if (!text || !this.canComment(activity) || this.isCommentBusy(activity.id)) return;
    const request = this.commentRequest(activity, text);
    if (!request) return;

    this.busyCommentIds.update((current) => new Set(current).add(activity.id));
    this.commentErrors.update((current) => {
      const next = new Map(current);
      next.delete(activity.id);
      return next;
    });
    request.subscribe({
      next: (created) => {
        this.addCommentToFeed(activity.id, this.toFeedComment(created));
        this.commentDrafts.update((current) => {
          const next = new Map(current);
          next.delete(activity.id);
          return next;
        });
        this.busyCommentIds.update((current) => {
          const next = new Set(current);
          next.delete(activity.id);
          return next;
        });
      },
      error: () => {
        this.busyCommentIds.update((current) => {
          const next = new Set(current);
          next.delete(activity.id);
          return next;
        });
        this.commentErrors.update((current) => new Map(current).set(activity.id, this.copy.commentError));
      },
    });
  }

  protected likeCount(activity: FeedActivity): number {
    return activity.likesCount
      ?? activity.pick?.likesCount
      ?? activity.picksTemplate?.likesCount
      ?? 0;
  }

  protected commentCount(activity: FeedActivity): number {
    return activity.commentsCount
      ?? activity.pick?.commentsCount
      ?? activity.picksTemplate?.commentsCount
      ?? 0;
  }

  protected isLikeBusy(id: string): boolean {
    return this.busyLikeIds().has(id);
  }

  protected toggleComments(activityId: string): void {
    this.expandedCommentIds.update((current) => {
      const next = new Set(current);
      if (next.has(activityId)) next.delete(activityId);
      else next.add(activityId);
      return next;
    });
  }

  protected commentsExpanded(activityId: string): boolean {
    return this.expandedCommentIds().has(activityId);
  }

  protected toggleActivityMenu(activityId: string, event: MouseEvent): void {
    event.stopPropagation();
    this.activeActivityMenu.update((active) => active === activityId ? null : activityId);
  }

  protected activityMenuOpen(activityId: string): boolean {
    return this.activeActivityMenu() === activityId;
  }

  protected closeActivityMenu(event?: MouseEvent): void {
    event?.stopPropagation();
    this.activeActivityMenu.set(null);
  }

  @HostListener('document:click')
  protected dismissActivityMenu(): void {
    this.activeActivityMenu.set(null);
  }

  @HostListener('document:keydown.escape')
  protected dismissActivityMenuOnEscape(): void {
    this.activeActivityMenu.set(null);
  }

  protected showMore(): void {
    const current = this.data();
    if (!current?.hasNext || !current.nextCursor || this.busyMore()) return;
    this.busyMore.set(true);
    this.actionError.set('');
    this.feedApi.getFeed({ cursor: current.nextCursor, size: 20 }).subscribe({
      next: (nextPage) => {
        this.data.update((page) => page ? {
          ...nextPage,
          content: [...page.content, ...nextPage.content],
          followedUsersPreview: page.followedUsersPreview,
          followingCount: page.followingCount,
        } : nextPage);
        this.busyMore.set(false);
      },
      error: () => {
        this.busyMore.set(false);
        this.actionError.set(this.copy.moreError);
      },
    });
  }

  protected hasMore(): boolean {
    return this.data()?.hasNext ?? false;
  }

  protected formatCount(value: number | null | undefined): string {
    return new Intl.NumberFormat('pt-BR').format(value ?? 0);
  }

  protected activityLink(activity: FeedActivity): string[] | null {
    const content = activity.content;
    if (content?.type === 'MOVIE' && content.tmdbId) return ['/content/movie', content.tmdbId];
    if (content?.type === 'EPISODE' && content.seriesTmdbId && content.seasonNumber !== null && content.episodeNumber !== null) {
      return ['/content/series', content.seriesTmdbId, 'season', String(content.seasonNumber), 'episode', String(content.episodeNumber)];
    }
    if (content?.type && content.type !== 'MOVIE') {
      const id = content.seriesTmdbId || content.tmdbId;
      if (id) return ['/content/series', id];
    }
    if (activity.eventType === 'PICK_CREATED') return ['/picks', activity.id];
    if (activity.eventType === 'PICKS_TEMPLATE_CREATED') return ['/picks/templates', activity.id];
    if (activity.eventType === 'DAILY_GAME_RESULT') return ['/games'];
    if (activity.eventType === 'TOP5_UPDATE' && activity.user.username) return ['/users', activity.user.username];
    return null;
  }

  protected openContent(activity: FeedActivity): void {
    const card = this.cardForActivity(activity);
    const content = activity.content;
    const type = content?.type ?? card?.type;
    const tmdbId = content?.tmdbId ?? card?.tmdbId;
    const seriesTmdbId = content?.seriesTmdbId ?? card?.seriesTmdbId;
    if (type === 'MOVIE' && tmdbId) {
      void this.router.navigate(['/content/movie', tmdbId]);
      return;
    }
    if (type === 'EPISODE' && content && seriesTmdbId && content.seasonNumber !== null && content.episodeNumber !== null) {
      void this.router.navigate(['/content/series', seriesTmdbId, 'season', String(content.seasonNumber), 'episode', String(content.episodeNumber)]);
      return;
    }
    const seriesId = seriesTmdbId || tmdbId;
    if (type && type !== 'MOVIE' && seriesId) {
      void this.router.navigate(['/content/series', seriesId]);
      return;
    }
    const route = this.activityLink(activity);
    if (route) void this.router.navigate(route);
  }

  private cardForActivity(activity: FeedActivity) {
    return activity.card || activity.pickTargetCards?.[0] || activity.top5Preview?.cards?.[0] || null;
  }

  private likeRequest(activity: FeedActivity, liked: boolean): Observable<void> | null {
    if (activity.eventType === 'DIARY_ENTRY') return this.contentApi.setReviewLike(activity.id, 'DIARY', liked);
    if (activity.eventType === 'CONTENT_REVIEW') return this.contentApi.setReviewLike(activity.id, 'CONTENT_REVIEW', liked);
    if (activity.eventType === 'DROPPED') return this.contentApi.setReviewLike(activity.id, 'DROPPED', liked);
    if (activity.eventType === 'PICK_CREATED') return liked ? this.picksApi.likePick(activity.id) : this.picksApi.unlikePick(activity.id);
    if (activity.eventType === 'PICKS_TEMPLATE_CREATED') return liked ? this.picksApi.likeTemplate(activity.id) : this.picksApi.unlikeTemplate(activity.id);
    return null;
  }

  private commentRequest(activity: FeedActivity, text: string): Observable<SocialCommentResponse> | null {
    if (activity.eventType === 'DIARY_ENTRY') return this.contentApi.createDiaryComment(activity.id, { text });
    if (activity.eventType === 'PICK_CREATED') return this.picksApi.createPickComment(activity.id, { text });
    if (activity.eventType === 'PICKS_TEMPLATE_CREATED') return this.picksApi.createTemplateComment(activity.id, { text });
    return null;
  }

  private toFeedComment(comment: SocialCommentResponse): FeedCommentPreview {
    return {
      id: comment.id,
      text: comment.text,
      containsSpoiler: comment.containsSpoiler,
      user: {
        id: comment.user.id,
        username: comment.user.username,
        name: comment.user.name,
        profilePicture: comment.user.profilePicture,
      },
    };
  }

  private addCommentToFeed(activityId: string, comment: FeedCommentPreview): void {
    this.data.update((page) => page ? {
      ...page,
      content: page.content.map((activity) => {
        if (activity.id !== activityId) return activity;
        const existing = this.comments(activity);
        const alreadyPresent = existing.some((item) => item.id === comment.id);
        const comments = alreadyPresent ? existing : [comment, ...existing].slice(0, 3);
        const count = this.commentCount(activity) + (alreadyPresent ? 0 : 1);
        return {
          ...activity,
          commentsCount: count,
          recentComments: comments,
          pick: activity.pick ? { ...activity.pick, commentsCount: count, recentComments: comments } : activity.pick,
          picksTemplate: activity.picksTemplate ? { ...activity.picksTemplate, commentsCount: count, recentComments: comments } : activity.picksTemplate,
        };
      }),
    } : page);
  }

  private updateLikeState(id: string, liked: boolean): void {
    this.data.update((page) => page ? {
      ...page,
      content: page.content.map((activity) => activity.id === id ? {
        ...activity,
        likedByMe: liked,
        likesCount: Math.max(0, this.likeCount(activity) + (liked ? 1 : -1)),
        pick: activity.pick ? { ...activity.pick, likedByMe: liked, isLikedByViewer: liked, likesCount: Math.max(0, this.likeCount(activity) + (liked ? 1 : -1)) } : activity.pick,
        picksTemplate: activity.picksTemplate ? { ...activity.picksTemplate, likedByMe: liked, isLikedByViewer: liked, likesCount: Math.max(0, this.likeCount(activity) + (liked ? 1 : -1)) } : activity.picksTemplate,
      } : activity),
    } : page);
  }

  private groupActivities(activities: FeedActivity[]): ActivityGroup[] {
    const today = new Date();
    const todayKey = this.dateKey(today);
    const yesterdayKey = this.dateKey(new Date(today.getFullYear(), today.getMonth(), today.getDate() - 1));
    const sorted = [...activities].sort((left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime());
    const groups = new Map<string, ActivityGroup>();
    for (const activity of sorted) {
      const date = new Date(activity.createdAt);
      const key = this.dateKey(date);
      let group = groups.get(key);
      if (!group) {
        const dateLabel = new Intl.DateTimeFormat('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' }).format(date);
        const label = key === todayKey ? `${this.copy.today} · ${dateLabel}`
          : key === yesterdayKey ? `${this.copy.yesterday} · ${dateLabel}`
          : dateLabel;
        group = { key, label, activities: [] };
        groups.set(key, group);
      }
      group.activities.push(activity);
    }
    return [...groups.values()];
  }

  private dateKey(date: Date): string {
    if (!Number.isFinite(date.getTime())) return 'unknown';
    return `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`;
  }

  private errorMessage(error: unknown): string {
    if (error instanceof HttpErrorResponse && error.status === 0) return this.homeCopy.actionConnectionError;
    return this.homeCopy.genericError;
  }
}
