import { ChangeDetectionStrategy, Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { EMPTY, Observable, forkJoin, of } from 'rxjs';
import { catchError, expand, reduce, switchMap } from 'rxjs/operators';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { AppShellStateService } from '../../../../core/ui/app-shell-state.service';
import { AuthSessionService } from '../../../../core/session/session.service';
import { HomeApiService } from '../../../home/data-access/home-api.service';
import {
  NotificationView,
  NotificationsApiService,
  NotificationTargetType,
  WatchwiseNotificationType,
} from '../../data-access/notifications-api.service';
import { messageCatalog } from '../../../../shared/i18n/messages';
import { episodeContentNavigationState, episodeContentRoute } from '../../../../shared/utils/episode-content-route';
import { ResponsiveBannerComponent } from '../../../../shared/components/responsive-banner/responsive-banner.component';
import { PageSkeletonComponent } from '../../../../shared/components/page-skeleton/page-skeleton.component';
import { ToastNotificationsService } from '../../../../shared/components/toast-notifications/toast-notifications.service';

type NotificationFilter = 'all' | 'unread' | 'read';
type LoadStatus = 'loading' | 'ready' | 'error';
type FollowDecision = 'accepted' | 'declined';

interface NotificationGroup {
  key: string;
  label: string;
  items: NotificationView[];
}

@Component({
  selector: 'app-notifications',
  standalone: true,
  imports: [RouterLink, ResponsiveBannerComponent, PageSkeletonComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './notifications.component.html',
  styleUrl: './notifications.component.css',
})
export class NotificationsComponent {
  protected readonly copy = messageCatalog['pt-BR'].notificationsPage;
  protected readonly filter = signal<NotificationFilter>('all');
  protected readonly status = signal<LoadStatus>('loading');
  protected readonly notifications = signal<NotificationView[]>([]);
  protected readonly totalCount = signal(0);
  protected readonly unreadCount = signal(0);
  protected readonly filteredCount = signal(0);
  protected readonly page = signal(1);
  protected readonly hasNext = signal(false);
  protected readonly loadingMore = signal(false);
  protected readonly markingAllRead = signal(false);
  protected readonly loadError = signal('');
  protected readonly heroBackdropPath = signal<string | null | undefined>(undefined);
  protected readonly followDecisions = signal<ReadonlyMap<string, FollowDecision>>(new Map());
  protected readonly groups = computed(() => this.groupByDay(this.notifications()));

  private readonly destroyRef = inject(DestroyRef);
  private readonly shellState = inject(AppShellStateService);
  private readonly session = inject(AuthSessionService);
  private readonly homeApi = inject(HomeApiService);
  private readonly toasts = inject(ToastNotificationsService);

  constructor(private readonly api: NotificationsApiService) {}

  ngOnInit(): void {
    const user = this.session.user();
    if (user) {
      this.homeApi.getHomeSummary(user.id)
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe({ next: (summary) => this.heroBackdropPath.set(summary.latestWatchedBackdropPath) });
    }
    this.load();
  }

  protected setFilter(filter: NotificationFilter): void {
    if (this.filter() === filter) return;
    this.filter.set(filter);
    this.load();
  }

  protected retry(): void {
    this.load();
  }

  protected loadMore(): void {
    if (!this.hasNext() || this.loadingMore()) return;
    const page = this.page() + 1;
    this.loadingMore.set(true);
    this.api.getView({ page, size: 20, ...this.readFilter() })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (result) => this.applyPage(result, false),
        error: () => {
          this.loadingMore.set(false);
          this.toasts.error(this.copy.loadError);
        },
      });
  }

  protected markRead(item: NotificationView): void {
    if (item.isRead) return;
    this.api.markAsRead(item.id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => this.load(),
        error: () => this.toasts.error(this.copy.actionError),
      });
  }

  protected markAllRead(): void {
    if (!this.unreadCount() || this.markingAllRead()) return;
    this.markingAllRead.set(true);
    this.unreadPages()
      .pipe(
        switchMap((ids) => ids.length ? forkJoin(ids.map((id) => this.api.markAsRead(id))) : of([])),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: () => {
          this.markingAllRead.set(false);
          this.load();
        },
        error: () => {
          this.markingAllRead.set(false);
          this.toasts.error(this.copy.actionError);
        },
      });
  }

  protected decideFollow(item: NotificationView, decision: FollowDecision): void {
    const requesterId = item.latestActor?.id;
    if (!requesterId || this.followDecisions().has(item.id)) return;
    const request = decision === 'accepted'
      ? this.api.acceptFollowRequest(requesterId)
      : this.api.rejectFollowRequest(requesterId);
    request.pipe(
      switchMap(() => this.api.markAsRead(item.id).pipe(catchError(() => of(undefined)))),
      takeUntilDestroyed(this.destroyRef),
    ).subscribe({
      next: () => {
        this.followDecisions.update((current) => new Map(current).set(item.id, decision));
        this.toasts.success(decision === 'accepted' ? this.copy.acceptedMessage : this.copy.declinedMessage);
        this.load();
      },
      error: () => this.toasts.error(this.copy.actionError),
    });
  }

  protected followDecision(id: string): FollowDecision | null {
    return this.followDecisions().get(id) ?? null;
  }

  protected actorName(item: NotificationView): string {
    return item.latestActor?.name || item.latestActor?.username || item.person?.name || this.fallbackActor(item.type);
  }

  protected message(item: NotificationView): string {
    const more = Math.max(0, (item.interactionCount ?? 1) - 1);
    switch (item.type) {
      case 'FOLLOW_REQUEST': return this.copy.followRequest;
      case 'NEW_FOLLOWER': return this.copy.newFollower;
      case 'FOLLOW_REQUEST_ACCEPTED': return this.copy.followAccepted;
      case 'RELEASE': return this.copy.newMovie;
      case 'ANNOUNCED_DATE': return this.copy.announcedDate;
      case 'CANCELLED': return this.copy.cancelled;
      case 'RENEWED': return this.copy.renewed;
      case 'NEW_EPISODE': return this.copy.newEpisode;
      case 'FOLLOWED_PERSON_NEW_CREDIT': return this.copy.personCredit;
      case 'LIKE_RECEIVED': return more ? this.copy.likedReviewMore.replace('{count}', String(more)) : this.copy.likedReview;
      case 'COMMENT_RECEIVED': return more ? this.copy.commentedReviewMore.replace('{count}', String(more)) : this.copy.commentedReview;
      case 'REPORT_RESOLVED': return this.copy.reportResolved;
    }
  }

  protected title(item: NotificationView): string | null {
    return item.contentCard?.title
      || item.targetPreview?.contentCard?.title
      || item.targetPreview?.title
      || item.person?.name
      || null;
  }

  protected contentMetadata(item: NotificationView): string | null {
    const content = item.content;
    if (content?.type === 'EPISODE' || content?.type === 'SEASON') {
      if (content.seasonNumber !== null && content.episodeNumber !== null) {
        return this.copy.episodeMeta
          .replace('{season}', String(content.seasonNumber))
          .replace('{episode}', String(content.episodeNumber));
      }
    }
    const releaseDate = item.contentCard?.releaseDate;
    if (releaseDate && (item.type === 'RELEASE' || item.type === 'ANNOUNCED_DATE')) {
      const date = new Date(`${releaseDate}T12:00:00`);
      if (Number.isFinite(date.getTime())) {
        return this.copy.comingOn.replace('{date}', new Intl.DateTimeFormat('pt-BR', { day: 'numeric', month: 'long' }).format(date));
      }
    }
    if (item.type === 'ANNOUNCED_DATE') return this.copy.dateUnavailable;
    if (item.type === 'RELEASE' || item.type === 'NEW_EPISODE') return this.copy.outNow;
    return item.targetPreview?.excerpt ?? null;
  }

  protected itemRoute(item: NotificationView): string[] | null {
    const targetRoute = this.targetRoute(
      item.targetType ?? item.targetPreview?.targetType ?? null,
      item.targetId ?? item.targetPreview?.targetId ?? null,
      item,
    );
    if (targetRoute) return targetRoute;

    const content = item.content;
    if (content?.type === 'MOVIE' && content.tmdbId) return ['/content/movie', content.tmdbId];
    if (content?.type && content.type !== 'MOVIE') {
      const seriesId = content.seriesTmdbId || content.tmdbId;
      if (seriesId && content.type === 'EPISODE' && content.seasonNumber !== null && content.episodeNumber !== null) {
        return episodeContentRoute({ seriesTmdbId: seriesId, seasonNumber: content.seasonNumber, episodeNumber: content.episodeNumber });
      }
      if (seriesId) return ['/content/series', seriesId];
    }
    const username = item.latestActor?.username;
    return username ? ['/users', username] : null;
  }

  protected itemRouteState(item: NotificationView): { contentId: string } | undefined {
    const card = item.targetPreview?.contentCard ?? item.contentCard;
    const isEpisodeTarget = card?.type === 'EPISODE' || item.content?.type === 'EPISODE';
    return isEpisodeTarget ? episodeContentNavigationState(card?.contentId ?? item.content?.id) : undefined;
  }

  protected episodeRoute(item: NotificationView): string[] | null {
    const card = item.targetPreview?.contentCard ?? item.contentCard;
    if (card?.type === 'EPISODE') {
      const route = episodeContentRoute(card);
      if (route) return route;
    }
    const content = item.content;
    return content?.type === 'EPISODE' ? episodeContentRoute(content) : null;
  }

  protected contentScore(item: NotificationView): number | null {
    return item.targetPreview?.score ?? null;
  }

  protected relativeTime(value: string): string {
    const date = new Date(value);
    const elapsedMinutes = Math.max(0, Math.floor((Date.now() - date.getTime()) / 60_000));
    if (!Number.isFinite(elapsedMinutes) || elapsedMinutes < 1) return this.copy.justNow;
    if (elapsedMinutes < 60) return `${elapsedMinutes} min ${this.copy.ago}`;
    const hours = Math.floor(elapsedMinutes / 60);
    if (hours < 24) return `${hours} h ${this.copy.ago}`;
    const days = Math.floor(hours / 24);
    if (days === 1) return this.copy.yesterday;
    if (days < 7) return `${days} dias ${this.copy.ago}`;
    return new Intl.DateTimeFormat('pt-BR', { day: 'numeric', month: 'short' }).format(date);
  }

  protected summaryLabel(count: number): string {
    return count === 1
      ? this.copy.totalCountOne
      : this.copy.totalCount.replace('{count}', this.formatCount(count));
  }

  protected unreadLabel(count: number): string {
    return count === 1
      ? this.copy.unreadCountOne
      : this.copy.unreadCount.replace('{count}', this.formatCount(count));
  }

  protected shownLabel(): string {
    return this.copy.showing
      .replace('{shown}', this.formatCount(this.notifications().length))
      .replace('{total}', this.formatCount(this.filteredCount()));
  }

  protected formatCount(value: number | null | undefined): string {
    return new Intl.NumberFormat('pt-BR').format(value ?? 0);
  }

  protected hasMore(): boolean {
    return this.hasNext();
  }

  protected markReadLabel(item: NotificationView): string {
    return `${this.copy.markRead}: ${this.actorName(item)} ${this.message(item)}`;
  }

  protected followResult(id: string): string | null {
    const decision = this.followDecision(id);
    if (decision === 'accepted') return this.copy.acceptedMessage;
    if (decision === 'declined') return this.copy.declinedMessage;
    return null;
  }

  private load(): void {
    this.page.set(1);
    this.status.set('loading');
    this.notifications.set([]);
    this.loadError.set('');
    this.api.getView({ page: 1, size: 20, ...this.readFilter() })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (result) => this.applyPage(result, true),
        error: () => {
          this.status.set('error');
          this.loadError.set(this.copy.loadError);
          this.loadingMore.set(false);
        },
      });
  }

  private applyPage(result: import('../../data-access/notifications-api.service').NotificationViewPage, replace: boolean): void {
    this.notifications.update((current) => replace ? result.content : [...current, ...result.content]);
    this.totalCount.set(result.totalNotifications);
    this.unreadCount.set(result.unreadNotifications);
    this.filteredCount.set(result.totalElements);
    this.page.set(result.page);
    this.hasNext.set(result.hasNext);
    this.status.set('ready');
    this.loadingMore.set(false);
    this.shellState.hasUnreadNotifications.set(result.unreadNotifications > 0);
  }

  private readFilter(): { isRead?: boolean } {
    if (this.filter() === 'unread') return { isRead: false };
    if (this.filter() === 'read') return { isRead: true };
    return {};
  }

  private unreadPages(): Observable<string[]> {
    return this.api.getView({ page: 1, size: 50, isRead: false }).pipe(
      expand((result) => result.hasNext
        ? this.api.getView({ page: result.page + 1, size: 50, isRead: false })
        : EMPTY),
      reduce((ids, result) => [...ids, ...result.content.filter((item) => !item.isRead).map((item) => item.id)], [] as string[]),
    );
  }

  private targetRoute(type: NotificationTargetType | null, id: string | null, item: NotificationView): string[] | null {
    if (!type || !id) return null;
    if (type === 'DIARY_ENTRY') return ['/diary/entry', id];
    if (type === 'CONTENT_REVIEW' || type === 'DROPPED_ENTRY') {
      const card = item.targetPreview?.contentCard;
      const contentId = card?.tmdbId || card?.seriesTmdbId;
      if (!card?.type || !contentId) return null;
      if (card.type === 'EPISODE') return episodeContentRoute(card);
      if (card.type === 'SEASON' && card.seriesTmdbId && card.seasonNumber !== null) return ['/content/series', card.seriesTmdbId, 'season', String(card.seasonNumber)];
      return card.type === 'MOVIE'
        ? ['/content/movie', contentId]
        : ['/content/series', card.seriesTmdbId || contentId];
    }
    if (type === 'USER_LIST') return ['/lists', id];
    if (type === 'PICK') return ['/picks', id];
    if (type === 'PICKS_TEMPLATE') return ['/picks/templates', id];
    return null;
  }

  private groupByDay(items: NotificationView[]): NotificationGroup[] {
    const todayKey = this.dayKey(new Date());
    const yesterdayDate = new Date();
    yesterdayDate.setDate(yesterdayDate.getDate() - 1);
    const yesterdayKey = this.dayKey(yesterdayDate);
    const groups = new Map<string, NotificationGroup>();
    for (const item of items) {
      const date = new Date(item.createdAt);
      const key = this.dayKey(date);
      let group = groups.get(key);
      if (!group) {
        const label = key === todayKey ? this.copy.today
          : key === yesterdayKey ? this.copy.yesterday
          : new Intl.DateTimeFormat('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' }).format(date);
        group = { key, label: label.charAt(0).toLocaleUpperCase('pt-BR') + label.slice(1), items: [] };
        groups.set(key, group);
      }
      group.items.push(item);
    }
    return [...groups.values()];
  }

  private dayKey(date: Date): string {
    if (!Number.isFinite(date.getTime())) return 'unknown';
    return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
  }

  private fallbackActor(type: WatchwiseNotificationType): string {
    if (type === 'RELEASE' || type === 'ANNOUNCED_DATE' || type === 'CANCELLED' || type === 'RENEWED' || type === 'NEW_EPISODE') return this.copy.titleUpdate;
    if (type === 'REPORT_RESOLVED') return this.copy.moderationTeam;
    return this.copy.communityMember;
  }
}
