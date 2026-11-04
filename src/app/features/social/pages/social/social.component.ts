import { DOCUMENT } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, HostListener, OnDestroy, OnInit, computed, effect, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { Observable, Subscription } from 'rxjs';
import { AuthSessionService, SessionUser } from '../../../../core/session/session.service';
import { ContentApiService, ContentComment } from '../../../content/data-access/content-api.service';
import { PicksApiService, PicksCommentPreview } from '../../../picks/data-access/picks-api.service';
import { FeedActivity, FeedApiService, FeedCommentPreview, FeedPage } from '../../data-access/feed-api.service';
import { ProfileApiService } from '../../../profile/data-access/profile-api.service';
import { SettingsApiService } from '../../../settings/data-access/settings-api.service';
import { ReportApiService, SocialReportReason, SocialReportTargetType } from '../../data-access/report-api.service';
import { messageCatalog } from '../../../../shared/i18n/messages';
import { ResponsiveBannerComponent } from '../../../../shared/components/responsive-banner/responsive-banner.component';
import { CommentItemComponent } from '../../../../shared/components/comment-item/comment-item.component';
import { ToastNotificationsService } from '../../../../shared/components/toast-notifications/toast-notifications.service';
import { ModalScrollLockDirective } from '../../../../shared/directives/modal-scroll-lock.directive';
import { tmdbImageUrl } from '../../../../shared/utils/tmdb-image-url';

interface ActivityGroup {
  key: string;
  label: string;
  activities: FeedActivity[];
}

type SocialStatus = 'loading' | 'ready' | 'error';
type SocialCommentResponse = ContentComment | PicksCommentPreview;
type SocialReportKind = 'review' | 'user' | 'comment';
type SocialActionSubject = FeedActivity | FeedCommentPreview;
type CommentFollowState = 'LOADING' | 'FOLLOWING' | 'NOT_FOLLOWING' | 'ERROR';

interface SocialReportTarget {
  kind: SocialReportKind;
  targetType: SocialReportTargetType;
  targetId: string;
  reportedUserId: string | null;
  reportedUserName: string;
  reportedUsername: string | null;
  evidenceLabel: string;
  evidenceText: string;
}

type SocialUserActionKind = 'unfollow' | 'block';

interface SocialUserActionConfirmation {
  kind: SocialUserActionKind;
  subject: SocialActionSubject;
  source: 'activity' | 'comment';
  userId: string;
}

@Component({
  selector: 'app-social',
  standalone: true,
  imports: [RouterLink, ResponsiveBannerComponent, CommentItemComponent, ModalScrollLockDirective],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './social.component.html',
  styleUrl: './social.component.css',
})
export class SocialComponent implements OnInit, OnDestroy {
  protected readonly copy = messageCatalog['pt-BR'].socialPage;
  protected readonly homeCopy = messageCatalog['pt-BR'].home;
  protected readonly loadingItems = [1, 2, 3];
  protected readonly status = signal<SocialStatus>('loading');
  protected readonly data = signal<FeedPage | null>(null);
  protected readonly viewer = signal<SessionUser | null>(null);
  protected readonly latestBackdrop = signal<string | null | undefined>(undefined);
  protected readonly heroBackdropLoading = signal(true);
  protected readonly heroBackdropFailed = signal(false);
  protected readonly busyMore = signal(false);
  protected readonly busyLikeIds = signal<ReadonlySet<string>>(new Set());
  protected readonly busyCommentIds = signal<ReadonlySet<string>>(new Set());
  protected readonly commentDrafts = signal<ReadonlyMap<string, string>>(new Map());
  protected readonly commentActionBusyIds = signal<ReadonlySet<string>>(new Set());
  protected readonly commentEditId = signal<string | null>(null);
  protected readonly commentEditDraft = signal('');
  protected readonly commentFollowStates = signal<ReadonlyMap<string, CommentFollowState>>(new Map());
  protected readonly loadError = signal('');
  protected readonly activeActivityMenu = signal<string | null>(null);
  protected readonly activeCommentMenu = signal<string | null>(null);
  protected readonly busyUserActionIds = signal<ReadonlySet<string>>(new Set());
  protected readonly pendingUserAction = signal<SocialUserActionConfirmation | null>(null);
  protected readonly reportTarget = signal<SocialReportTarget | null>(null);
  protected readonly reportReason = signal<SocialReportReason | null>(null);
  protected readonly reportDetails = signal('');
  protected readonly reportBusy = signal(false);
  protected readonly reportBlockUser = signal(false);
  protected readonly groups = computed(() => this.groupActivities(this.data()?.content ?? []));
  protected readonly availableReportReasons: readonly SocialReportReason[] = [
    'SPAM_OR_MISLEADING',
    'HARASSMENT_OR_BULLYING',
    'HATE_SPEECH',
    'UNMARKED_SPOILER',
    'SEXUAL_OR_VIOLENT_CONTENT',
    'OTHER',
  ];

  private request?: Subscription;
  private readonly document = inject(DOCUMENT);
  private readonly toasts = inject(ToastNotificationsService);

  constructor(
    private readonly feedApi: FeedApiService,
    private readonly contentApi: ContentApiService,
    private readonly picksApi: PicksApiService,
    private readonly session: AuthSessionService,
    private readonly router: Router,
    private readonly profileApi: ProfileApiService,
    private readonly settingsApi: SettingsApiService,
    private readonly reportApi: ReportApiService,
  ) {
    effect((onCleanup) => {
      if (!this.reportTarget()) return;
      const root = this.document.documentElement;
      const body = this.document.body;
      const previousRootOverflow = root.style.overflow;
      const previousBodyOverflow = body.style.overflow;
      root.style.overflow = 'hidden';
      body.style.overflow = 'hidden';
      onCleanup(() => {
        root.style.overflow = previousRootOverflow;
        body.style.overflow = previousBodyOverflow;
      });
    });
  }

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

    this.viewer.set(user);
    this.request?.unsubscribe();
    this.status.set('loading');
    this.latestBackdrop.set(undefined);
    this.heroBackdropLoading.set(true);
    this.heroBackdropFailed.set(false);
    this.loadError.set('');
    this.request = this.feedApi.getFeed({ size: 20 }).subscribe({
      next: (feed) => {
        const backdropPath = feed.backdropPath ?? null;
        this.latestBackdrop.set(backdropPath);
        this.heroBackdropLoading.set(backdropPath === null || Boolean(backdropPath?.trim()));
        this.heroBackdropFailed.set(false);
        this.data.set(feed);
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
    if (activity.content?.type === 'EPISODE') {
      return activity.episodeTitle
        || this.cardForActivity(activity)?.title
        || activity.targetLabel
        || this.copy.contentUnavailable;
    }
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
    if (activity.content?.type === 'EPISODE') {
      const parts = [activity.seriesTitle || (card?.type === 'SERIES' ? card.title : null), activity.content.seasonNumber !== null ? `T${activity.content.seasonNumber}` : null,
        activity.content.episodeNumber !== null ? `E${activity.content.episodeNumber}` : null].filter(Boolean);
      return parts.join(' · ') || this.activityVerb(activity);
    }
    if (card) {
      const genres = activity.content?.type === 'MOVIE' || card.type === 'MOVIE'
        ? []
        : (card.genres ?? []).slice(0, 2);
      return [card.releaseYear, ...genres].filter(Boolean).join(' · ') || this.activityVerb(activity);
    }
    if (activity.top5Type || activity.top5Preview?.type) return (activity.top5Type ?? activity.top5Preview?.type) === 'MOVIE' ? this.copy.movies : this.copy.series;
    if (activity.eventType === 'PICK_CREATED') return this.copy.pickPreview;
    if (activity.eventType === 'PICKS_TEMPLATE_CREATED') return this.copy.templatePreview;
    return this.activityVerb(activity);
  }

  protected posterUrl(activity: FeedActivity): string | null {
    const card = this.cardForActivity(activity);
    const path = card?.customPosterUrl || card?.posterPath || activity.picksTemplate?.coverImage;
    return tmdbImageUrl(path, 'w342');
  }

  protected profilePicture(activity: FeedActivity): string {
    return activity.user.profilePicture || '/default-user-avatar.png';
  }

  protected profileName(activity: FeedActivity): string {
    return activity.user.name || activity.user.username || this.homeCopy.welcome;
  }

  protected userActionLabel(template: string, subject: SocialActionSubject): string {
    const user = subject.user;
    const name = user.name?.trim() || user.username?.trim() || this.homeCopy.welcome;
    return template.replace('{user}', name);
  }

  protected isOtherUser(activity: FeedActivity): boolean {
    const viewerId = this.viewer()?.id;
    return !viewerId || !activity.user.id || activity.user.id !== viewerId;
  }

  protected canReportReview(activity: FeedActivity): boolean {
    return (activity.eventType === 'DIARY_ENTRY' || activity.eventType === 'CONTENT_REVIEW')
      && !!activity.comment?.trim();
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
    request.subscribe({
      next: () => {
        this.busyLikeIds.update((current) => { const next = new Set(current); next.delete(activity.id); return next; });
        this.updateLikeState(activity.id, nextLiked);
      },
      error: () => {
        this.busyLikeIds.update((current) => { const next = new Set(current); next.delete(activity.id); return next; });
        this.toasts.error(this.copy.likeError);
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

  protected hasMoreComments(activity: FeedActivity): boolean {
    return this.commentCount(activity) > Math.min(this.comments(activity).length, 2);
  }

  protected viewCommentsLabel(activity: FeedActivity): string {
    return this.copy.viewComments.replace('{count}', this.formatCount(this.commentCount(activity)));
  }

  protected toggleCommentMenu(comment: FeedCommentPreview, event: MouseEvent): void {
    event.stopPropagation();
    this.activeActivityMenu.set(null);
    const opening = this.activeCommentMenu() !== comment.id;
    this.activeCommentMenu.set(opening ? comment.id : null);
    if (opening && !this.isOwnComment(comment)) this.ensureCommentFollowState(comment.user.id);
  }

  protected commentMenuOpen(commentId: string): boolean {
    return this.activeCommentMenu() === commentId;
  }

  protected isOwnComment(comment: FeedCommentPreview): boolean {
    const userId = comment.user.id;
    return !!userId && userId === this.viewer()?.id;
  }

  protected commentFollowState(comment: FeedCommentPreview): CommentFollowState | null {
    const userId = comment.user.id;
    return userId ? this.commentFollowStates().get(userId) ?? null : null;
  }

  protected commentFollowActionLabel(comment: FeedCommentPreview): string {
    const state = this.commentFollowState(comment);
    if (state === 'LOADING') return this.copy.commentFollowLoading;
    if (state === 'ERROR' || !comment.user.id) return this.copy.commentFollowUnavailable;
    const template = state === 'FOLLOWING' ? this.copy.unfollowUser : this.copy.followCommentUser;
    return this.userActionLabel(template, comment);
  }

  protected isCommentUserActionBusy(comment: FeedCommentPreview): boolean {
    const state = this.commentFollowState(comment);
    return !comment.user.id || state === 'LOADING' || this.busyUserActionIds().has(comment.user.id);
  }

  protected toggleFollowCommentAuthor(comment: FeedCommentPreview, event: MouseEvent): void {
    event.stopPropagation();
    this.activeCommentMenu.set(null);
    const userId = comment.user.id;
    const state = this.commentFollowState(comment);
    if (!userId || this.isCommentUserActionBusy(comment) || state === 'LOADING') return;
    if (state === 'ERROR' || state === null) {
      this.ensureCommentFollowState(userId);
      return;
    }
    if (state === 'FOLLOWING') {
      this.openUserActionConfirmation(comment, 'comment', 'unfollow', event);
      return;
    }

    this.setUserActionBusy(userId, true);
    this.profileApi.setFollow(userId, true).subscribe({
      next: () => {
        this.setCommentFollowState(userId, 'FOLLOWING');
        this.addFollowedCommentUser(comment);
        this.toasts.success(this.userActionLabel(this.copy.followSuccess, comment));
        this.setUserActionBusy(userId, false);
      },
      error: () => {
        this.toasts.error(this.userActionLabel(this.copy.followError, comment));
        this.setUserActionBusy(userId, false);
      },
    });
  }

  protected blockCommentAuthor(comment: FeedCommentPreview, event: MouseEvent): void {
    this.openUserActionConfirmation(comment, 'comment', 'block', event);
  }

  protected reportComment(comment: FeedCommentPreview, event: MouseEvent): void {
    event.stopPropagation();
    this.closeActivityMenu();
    this.activeCommentMenu.set(null);
    if (!comment.id) return;
    this.reportTarget.set({
      kind: 'comment',
      targetType: 'COMMENT',
      targetId: comment.id,
      reportedUserId: comment.user.id ?? null,
      reportedUserName: comment.user.name?.trim() || comment.user.username || this.homeCopy.welcome,
      reportedUsername: comment.user.username || null,
      evidenceLabel: this.copy.reportCommentBy.replace('{user}', this.reportHandle(comment.user.username, comment.user.name)),
      evidenceText: comment.text,
    });
    this.resetReportDialog();
  }

  protected startCommentEdit(comment: FeedCommentPreview, event: MouseEvent): void {
    event.stopPropagation();
    this.closeActivityMenu();
    this.activeCommentMenu.set(null);
    if (this.isCommentActionBusy(comment.id)) return;
    this.commentEditId.set(comment.id);
    this.commentEditDraft.set(comment.text);
  }

  protected isCommentEditing(commentId: string): boolean {
    return this.commentEditId() === commentId;
  }

  protected setCommentEditDraft(event: Event): void {
    this.commentEditDraft.set((event.target as HTMLTextAreaElement).value);
  }

  protected cancelCommentEdit(): void {
    const commentId = this.commentEditId();
    if (commentId && this.isCommentActionBusy(commentId)) return;
    this.commentEditId.set(null);
    this.commentEditDraft.set('');
  }

  protected isCommentActionBusy(commentId: string): boolean {
    return this.commentActionBusyIds().has(commentId);
  }

  protected saveCommentEdit(event: Event, activity: FeedActivity, comment: FeedCommentPreview): void {
    event.preventDefault();
    const text = this.commentEditDraft().trim();
    if (!text || text.length > 280 || this.isCommentActionBusy(comment.id)) return;
    this.setCommentActionBusy(comment.id, true);
    this.contentApi.updateComment(comment.id, { text, containsSpoiler: comment.containsSpoiler ?? false }).subscribe({
      next: (updated) => {
        this.updateCommentInFeed(activity.id, this.toFeedComment(updated));
        this.commentEditId.set(null);
        this.commentEditDraft.set('');
        this.setCommentActionBusy(comment.id, false);
      },
      error: () => {
        this.toasts.error(this.copy.commentEditError);
        this.setCommentActionBusy(comment.id, false);
      },
    });
  }

  protected deleteSocialComment(activity: FeedActivity, comment: FeedCommentPreview, event: MouseEvent): void {
    event.stopPropagation();
    this.closeActivityMenu();
    this.activeCommentMenu.set(null);
    if (this.isCommentActionBusy(comment.id)) return;
    this.setCommentActionBusy(comment.id, true);
    this.contentApi.deleteComment(comment.id).subscribe({
      next: () => {
        this.removeCommentFromFeed(activity.id, comment.id);
        if (this.commentEditId() === comment.id) this.cancelCommentEdit();
        this.setCommentActionBusy(comment.id, false);
        this.toasts.success(this.copy.commentDeleteSuccess);
      },
      error: () => {
        this.toasts.error(this.copy.commentDeleteError);
        this.setCommentActionBusy(comment.id, false);
      },
    });
  }

  protected commentThreadLink(activity: FeedActivity): string[] | null {
    if (activity.eventType === 'DIARY_ENTRY') return ['/diary/entry', activity.id];
    if (activity.eventType === 'PICK_CREATED') return ['/picks', activity.id];
    if (activity.eventType === 'PICKS_TEMPLATE_CREATED') return ['/picks/templates', activity.id];
    return this.activityLink(activity);
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
  }

  protected isCommentBusy(activityId: string): boolean {
    return this.busyCommentIds().has(activityId);
  }

  protected submitComment(event: Event, activity: FeedActivity): void {
    event.preventDefault();
    const text = this.commentDraft(activity.id).trim();
    if (!text || !this.canComment(activity) || this.isCommentBusy(activity.id)) return;
    const request = this.commentRequest(activity, text);
    if (!request) return;

    this.busyCommentIds.update((current) => new Set(current).add(activity.id));
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
        this.toasts.error(this.copy.commentError);
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

  protected toggleActivityMenu(activityId: string, event: MouseEvent): void {
    event.stopPropagation();
    this.activeCommentMenu.set(null);
    this.activeActivityMenu.update((active) => active === activityId ? null : activityId);
  }

  protected activityMenuOpen(activityId: string): boolean {
    return this.activeActivityMenu() === activityId;
  }

  protected closeActivityMenu(event?: MouseEvent): void {
    event?.stopPropagation();
    this.activeActivityMenu.set(null);
  }

  protected unfollowActivityUser(activity: FeedActivity, event: MouseEvent): void {
    this.openUserActionConfirmation(activity, 'activity', 'unfollow', event);
  }

  protected blockActivityUser(activity: FeedActivity, event: MouseEvent): void {
    this.openUserActionConfirmation(activity, 'activity', 'block', event);
  }

  protected userActionConfirmationTitle(): string {
    const pending = this.pendingUserAction();
    if (!pending) return '';
    const template = pending.kind === 'unfollow' ? this.copy.unfollowConfirmTitle : this.copy.blockConfirmTitle;
    return this.userActionLabel(template, pending.subject);
  }

  protected confirmUserAction(): void {
    const pending = this.pendingUserAction();
    if (!pending || this.busyUserActionIds().has(pending.userId)) return;

    this.setUserActionBusy(pending.userId, true);
    const request = pending.kind === 'unfollow'
      ? this.profileApi.setFollow(pending.userId, false)
      : this.settingsApi.blockUser(pending.userId);
    request.subscribe({
      next: () => {
        if (pending.source === 'activity') this.removeFollowedAuthor(pending.userId);
        else {
          const wasFollowing = this.commentFollowStates().get(pending.userId) === 'FOLLOWING';
          if (pending.kind === 'unfollow' || wasFollowing) this.removeFollowedAuthor(pending.userId);
          this.setCommentFollowState(pending.userId, 'NOT_FOLLOWING');
          if (pending.kind === 'block') this.removeCommentAuthorFromFeed(pending.userId);
        }
        const success = pending.kind === 'unfollow' ? this.copy.unfollowSuccess : this.copy.blockSuccess;
        this.toasts.success(this.userActionLabel(success, pending.subject));
        this.pendingUserAction.set(null);
        this.setUserActionBusy(pending.userId, false);
      },
      error: () => {
        const failure = pending.kind === 'unfollow' ? this.copy.unfollowError : this.copy.blockError;
        this.toasts.error(this.userActionLabel(failure, pending.subject));
        this.pendingUserAction.set(null);
        this.setUserActionBusy(pending.userId, false);
      },
    });
  }

  protected cancelUserActionConfirmation(): void {
    const pending = this.pendingUserAction();
    if (pending && this.busyUserActionIds().has(pending.userId)) return;
    this.pendingUserAction.set(null);
  }

  protected closeUserActionFromBackdrop(event: MouseEvent): void {
    if (event.target === event.currentTarget) this.cancelUserActionConfirmation();
  }

  private openUserActionConfirmation(
    subject: SocialActionSubject,
    source: 'activity' | 'comment',
    kind: SocialUserActionKind,
    event: MouseEvent,
  ): void {
    event.stopPropagation();
    this.closeActivityMenu();
    this.activeCommentMenu.set(null);
    const userId = subject.user.id;
    if (!userId || this.busyUserActionIds().has(userId)) return;
    this.pendingUserAction.set({ kind, subject, source, userId });
  }

  protected userActionConfirmationBusy(): boolean {
    const pending = this.pendingUserAction();
    return pending ? this.busyUserActionIds().has(pending.userId) : false;
  }

  protected userActionConfirmationLabel(): string {
    const pending = this.pendingUserAction();
    if (!pending) return this.copy.confirmAction;
    const action = pending.kind === 'unfollow' ? this.copy.unfollowUser : this.copy.blockUser;
    return this.userActionLabel(action, pending.subject);
  }

  protected userActionConfirmButtonLabel(): string {
    return this.userActionConfirmationBusy() ? this.copy.confirmingAction : this.userActionConfirmationLabel();
  }

  protected isBlockConfirmation(): boolean {
    return this.pendingUserAction()?.kind === 'block';
  }

  protected openReport(activity: FeedActivity, kind: SocialReportKind, event: MouseEvent): void {
    event.stopPropagation();
    this.closeActivityMenu();
    this.activeCommentMenu.set(null);
    if (kind === 'comment') return;
    const targetId = kind === 'user' ? activity.user.id : activity.id;
    if (!targetId) return;
    const reportedUserName = activity.user.name?.trim() || activity.user.username || this.homeCopy.welcome;
    const evidenceLabel = kind === 'user'
      ? this.copy.reportUserEvidence
      : this.copy.reportReviewBy.replace('{user}', this.reportHandle(activity.user.username, activity.user.name));
    this.reportTarget.set({
      kind,
      targetType: kind === 'user'
        ? 'USER'
        : activity.eventType === 'CONTENT_REVIEW' ? 'CONTENT_REVIEW' : 'REVIEW',
      targetId,
      reportedUserId: activity.user.id ?? null,
      reportedUserName,
      reportedUsername: activity.user.username || null,
      evidenceLabel,
      evidenceText: kind === 'user'
        ? this.reportProfileSummary(activity)
        : activity.comment?.trim() || this.copy.reportReviewWithoutText,
    });
    this.resetReportDialog();
  }

  protected reportTitle(): string {
    const kind = this.reportTarget()?.kind;
    if (kind === 'review') return this.copy.reportReviewTitle;
    if (kind === 'comment') return this.copy.reportCommentTitle;
    return this.copy.reportUserTitle;
  }

  protected reportReasons(): SocialReportReason[] {
    return this.reportTarget()?.targetType === 'USER'
      ? this.availableReportReasons.filter((reason) => reason !== 'UNMARKED_SPOILER')
      : [...this.availableReportReasons];
  }

  protected reportReasonLabel(reason: SocialReportReason): string {
    switch (reason) {
      case 'SPAM_OR_MISLEADING': return this.copy.reportReasonSpam;
      case 'HARASSMENT_OR_BULLYING': return this.copy.reportReasonHarassment;
      case 'HATE_SPEECH': return this.copy.reportReasonHate;
      case 'UNMARKED_SPOILER': return this.copy.reportReasonSpoiler;
      case 'SEXUAL_OR_VIOLENT_CONTENT': return this.copy.reportReasonSexualViolent;
      case 'OTHER': return this.copy.reportReasonOther;
    }
  }

  protected reportReasonDescription(reason: SocialReportReason): string {
    switch (reason) {
      case 'SPAM_OR_MISLEADING': return this.copy.reportReasonSpamDescription;
      case 'HARASSMENT_OR_BULLYING': return this.copy.reportReasonHarassmentDescription;
      case 'HATE_SPEECH': return this.copy.reportReasonHateDescription;
      case 'UNMARKED_SPOILER': return this.copy.reportReasonSpoilerDescription;
      case 'SEXUAL_OR_VIOLENT_CONTENT': return this.copy.reportReasonSexualViolentDescription;
      case 'OTHER': return this.copy.reportReasonOtherDescription;
    }
  }

  protected selectReportReason(reason: SocialReportReason): void {
    this.reportReason.set(reason);
  }

  protected reportQuestion(): string {
    const kind = this.reportTarget()?.kind;
    if (kind === 'comment') return this.copy.reportQuestionComment;
    if (kind === 'review') return this.copy.reportQuestionReview;
    return this.copy.reportQuestionUser;
  }

  protected reportAnonymousNotice(): string {
    const target = this.reportTarget();
    return target
      ? this.copy.reportAnonymous.replace('{user}', this.reportHandle(target.reportedUsername, target.reportedUserName))
      : '';
  }

  protected reportBlockLabel(): string {
    const target = this.reportTarget();
    return target
      ? this.copy.reportAlsoBlock.replace('{user}', this.reportHandle(target.reportedUsername, target.reportedUserName))
      : '';
  }

  protected hasBlockableReportedUser(): boolean {
    const target = this.reportTarget();
    return !!target?.reportedUserId && target.reportedUserId !== this.viewer()?.id;
  }

  protected setReportBlockUser(event: Event): void {
    this.reportBlockUser.set((event.target as HTMLInputElement).checked);
  }

  protected setReportDetails(event: Event): void {
    this.reportDetails.set((event.target as HTMLTextAreaElement).value);
  }

  protected cancelReport(): void {
    if (this.reportBusy()) return;
    this.reportTarget.set(null);
    this.reportBlockUser.set(false);
  }

  protected submitReport(event: Event): void {
    event.preventDefault();
    const target = this.reportTarget();
    const reason = this.reportReason();
    if (!target || !reason || this.reportBusy()) return;
    this.reportBusy.set(true);
    const details = this.reportDetails().trim();
    this.reportApi.createReport({
      targetType: target.targetType,
      targetId: target.targetId,
      reason,
      ...(details ? { details } : {}),
    }).subscribe({
      next: () => this.finishReport(target),
      error: () => {
        this.reportBusy.set(false);
        this.reportBusy.set(false);
        this.toasts.error(this.copy.reportError);
      },
    });
  }

  protected closeReportFromBackdrop(event: MouseEvent): void {
    if (event.target === event.currentTarget) this.cancelReport();
  }

  @HostListener('document:click')
  protected dismissActivityMenu(): void {
    this.activeActivityMenu.set(null);
    this.activeCommentMenu.set(null);
  }

  @HostListener('document:keydown.escape')
  protected dismissActivityMenuOnEscape(): void {
    if (this.reportTarget()) {
      this.cancelReport();
      return;
    }
    if (this.pendingUserAction()) {
      this.cancelUserActionConfirmation();
      return;
    }
    this.activeActivityMenu.set(null);
    this.activeCommentMenu.set(null);
  }

  protected showMore(): void {
    const current = this.data();
    if (!current?.hasNext || !current.nextCursor || this.busyMore()) return;
    this.busyMore.set(true);
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
        this.toasts.error(this.copy.moreError);
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

  private resetReportDialog(): void {
    this.reportReason.set(null);
    this.reportDetails.set('');
    this.reportBlockUser.set(false);
  }

  private reportHandle(username: string | null | undefined, name: string | null | undefined): string {
    return username?.trim() ? `@${username.trim()}` : name?.trim() || this.homeCopy.welcome;
  }

  private reportProfileSummary(activity: FeedActivity): string {
    const username = activity.user.username?.trim();
    return username ? `${this.profileName(activity)} · @${username}` : this.profileName(activity);
  }

  private finishReport(target: SocialReportTarget): void {
    const userId = target.reportedUserId;
    if (!this.reportBlockUser() || !userId) {
      this.closeReportDialog();
      this.toasts.success(this.copy.reportSuccess);
      return;
    }

    this.settingsApi.blockUser(userId).subscribe({
      next: () => {
        const wasFollowing = this.commentFollowStates().get(userId) === 'FOLLOWING'
          || !!this.data()?.content.some((activity) => activity.user.id === userId);
        if (wasFollowing) this.removeFollowedAuthor(userId);
        this.setCommentFollowState(userId, 'NOT_FOLLOWING');
        this.removeCommentAuthorFromFeed(userId);
        this.closeReportDialog();
        this.toasts.success(this.copy.reportSuccessAndBlocked.replace('{user}', target.reportedUserName));
      },
      error: () => {
        this.closeReportDialog();
        this.toasts.warning(`${this.copy.reportSuccess} ${this.copy.reportBlockError.replace('{user}', target.reportedUserName)}`);
      },
    });
  }

  private closeReportDialog(): void {
    this.reportBusy.set(false);
    this.reportTarget.set(null);
    this.reportBlockUser.set(false);
  }

  private ensureCommentFollowState(userId: string | undefined): void {
    if (!userId) return;
    const state = this.commentFollowStates().get(userId);
    if (state === 'LOADING' || state === 'FOLLOWING' || state === 'NOT_FOLLOWING') return;
    this.setCommentFollowState(userId, 'LOADING');
    this.profileApi.getUser(userId).subscribe({
      next: (profile) => this.setCommentFollowState(userId, profile.viewerRelation === 'FOLLOWING' ? 'FOLLOWING' : 'NOT_FOLLOWING'),
      error: () => this.setCommentFollowState(userId, 'ERROR'),
    });
  }

  private setCommentFollowState(userId: string, state: CommentFollowState): void {
    this.commentFollowStates.update((current) => new Map(current).set(userId, state));
  }

  private setCommentActionBusy(commentId: string, busy: boolean): void {
    this.commentActionBusyIds.update((current) => {
      const next = new Set(current);
      if (busy) next.add(commentId);
      else next.delete(commentId);
      return next;
    });
  }

  private addFollowedCommentUser(comment: FeedCommentPreview): void {
    const userId = comment.user.id;
    if (!userId) return;
    const preview = {
      id: userId,
      username: comment.user.username || '',
      name: comment.user.name?.trim() || comment.user.username || this.homeCopy.welcome,
      profilePicture: comment.user.profilePicture || null,
      isProfilePublic: null,
    };
    this.data.update((page) => page ? {
      ...page,
      followingCount: page.followingCount + 1,
      followedUsersPreview: [preview, ...page.followedUsersPreview.filter((user) => user.id !== userId)].slice(0, 5),
    } : page);
  }

  private removeCommentAuthorFromFeed(userId: string): void {
    this.data.update((page) => page ? {
      ...page,
      content: page.content.map((activity) => {
        const visibleComments = this.comments(activity);
        const removedCount = visibleComments.filter((comment) => comment.user.id === userId).length;
        if (!removedCount) return activity;
        const remaining = (items: FeedCommentPreview[] | null | undefined) => items?.filter((comment) => comment.user.id !== userId);
        const nextCount = Math.max(0, this.commentCount(activity) - removedCount);
        return {
          ...activity,
          commentsCount: nextCount,
          recentComments: remaining(activity.recentComments),
          pick: activity.pick ? { ...activity.pick, commentsCount: nextCount, recentComments: remaining(activity.pick.recentComments) } : activity.pick,
          picksTemplate: activity.picksTemplate ? { ...activity.picksTemplate, commentsCount: nextCount, recentComments: remaining(activity.picksTemplate.recentComments) } : activity.picksTemplate,
        };
      }),
    } : page);
  }

  private updateCommentInFeed(activityId: string, updated: FeedCommentPreview): void {
    const replace = (items: FeedCommentPreview[] | null | undefined) => items?.map((comment) => comment.id === updated.id ? { ...comment, ...updated } : comment);
    this.data.update((page) => page ? {
      ...page,
      content: page.content.map((activity) => activity.id === activityId ? {
        ...activity,
        recentComments: replace(activity.recentComments),
        pick: activity.pick ? { ...activity.pick, recentComments: replace(activity.pick.recentComments) } : activity.pick,
        picksTemplate: activity.picksTemplate ? { ...activity.picksTemplate, recentComments: replace(activity.picksTemplate.recentComments) } : activity.picksTemplate,
      } : activity),
    } : page);
  }

  private removeCommentFromFeed(activityId: string, commentId: string): void {
    this.data.update((page) => page ? {
      ...page,
      content: page.content.map((activity) => {
        if (activity.id !== activityId || !this.comments(activity).some((comment) => comment.id === commentId)) return activity;
        const remove = (items: FeedCommentPreview[] | null | undefined) => items?.filter((comment) => comment.id !== commentId);
        const count = Math.max(0, this.commentCount(activity) - 1);
        return {
          ...activity,
          commentsCount: count,
          recentComments: remove(activity.recentComments),
          pick: activity.pick ? { ...activity.pick, commentsCount: count, recentComments: remove(activity.pick.recentComments) } : activity.pick,
          picksTemplate: activity.picksTemplate ? { ...activity.picksTemplate, commentsCount: count, recentComments: remove(activity.picksTemplate.recentComments) } : activity.picksTemplate,
        };
      }),
    } : page);
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
      createdAt: comment.createdAt,
      updatedAt: 'updatedAt' in comment ? comment.updatedAt : null,
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

  private setUserActionBusy(userId: string, busy: boolean): void {
    this.busyUserActionIds.update((current) => {
      const next = new Set(current);
      if (busy) next.add(userId);
      else next.delete(userId);
      return next;
    });
  }

  private removeFollowedAuthor(userId: string): void {
    this.data.update((page) => page ? {
      ...page,
      content: page.content.filter((activity) => activity.user.id !== userId),
      followedUsersPreview: page.followedUsersPreview.filter((user) => user.id !== userId),
      followingCount: Math.max(0, page.followingCount - 1),
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
        const formattedDate = new Intl.DateTimeFormat('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' }).format(date);
        const dateLabel = `${formattedDate.charAt(0).toLocaleUpperCase('pt-BR')}${formattedDate.slice(1)}`;
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
