import { ChangeDetectionStrategy, Component, EventEmitter, HostListener, Input, Output, inject, signal } from '@angular/core';
import { AuthSessionService } from '../../../core/session/session.service';
import { ProfileApiService } from '../../../features/profile/data-access/profile-api.service';
import { SettingsApiService } from '../../../features/settings/data-access/settings-api.service';
import { ReportApiService, SocialReportReason, SocialReportTargetType } from '../../../features/social/data-access/report-api.service';
import { messageCatalog } from '../../i18n/messages';
import { ModalFocusDirective } from '../../directives/modal-focus.directive';

export interface SocialActionMenuUser {
  id: string;
  username?: string | null;
  name?: string | null;
}

export type SocialActionMenuMode = 'comment' | 'review';

export interface SocialActionMenuEvent {
  action: 'followed' | 'unfollowed' | 'blocked' | 'reported';
  userId: string;
}

type FollowState = 'loading' | 'following' | 'not-following' | 'error';
type PendingUserAction = 'unfollow' | 'block';
type ReportAction = 'comment' | 'review' | 'user';

@Component({
  selector: 'app-social-actions-menu',
  standalone: true,
  imports: [ModalFocusDirective],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './social-actions-menu.component.html',
  styleUrl: './social-actions-menu.component.css',
  host: { class: 'ww-social-actions-menu-host' },
})
export class SocialActionsMenuComponent {
  @Input({ required: true }) author!: SocialActionMenuUser;
  @Input({ required: true }) itemId!: string;
  @Input() itemText = '';
  @Input() mode: SocialActionMenuMode = 'comment';
  @Input() reviewTargetType: 'REVIEW' | 'CONTENT_REVIEW' = 'REVIEW';
  @Output() readonly actionCompleted = new EventEmitter<SocialActionMenuEvent>();

  protected readonly copy = messageCatalog['pt-BR'].socialPage;
  protected readonly menuOpen = signal(false);
  protected readonly followState = signal<FollowState | null>(null);
  protected readonly pendingAction = signal<PendingUserAction | null>(null);
  protected readonly reportTarget = signal<ReportAction | null>(null);
  protected readonly reportReason = signal<SocialReportReason | null>(null);
  protected readonly reportDetails = signal('');
  protected readonly busy = signal(false);
  protected readonly error = signal('');
  protected readonly statusMessage = signal('');
  protected readonly reportError = signal('');
  protected readonly reportReasons: readonly SocialReportReason[] = [
    'SPAM_OR_MISLEADING',
    'HARASSMENT_OR_BULLYING',
    'HATE_SPEECH',
    'UNMARKED_SPOILER',
    'SEXUAL_OR_VIOLENT_CONTENT',
    'OTHER',
  ];

  private readonly session = inject(AuthSessionService);
  private readonly profileApi = inject(ProfileApiService);
  private readonly settingsApi = inject(SettingsApiService);
  private readonly reportApi = inject(ReportApiService);

  protected get authorName(): string {
    return this.author?.name?.trim() || this.author?.username?.trim() || 'usuário';
  }

  protected get reportHandle(): string {
    return this.author?.username?.trim() ? `@${this.author.username.trim()}` : this.authorName;
  }

  protected get isOwnAuthor(): boolean {
    const viewerId = this.session.user()?.id;
    return !this.author?.id || this.author.id === viewerId;
  }

  protected get followActionLabel(): string {
    const state = this.followState();
    if (state === 'loading') return this.copy.commentFollowLoading;
    if (state === 'error') return this.copy.commentFollowUnavailable;
    const template = state === 'following' ? this.copy.unfollowUser : this.copy.followCommentUser;
    return template.replace('{user}', this.authorName);
  }

  protected get userActionBusy(): boolean {
    return this.busy() || !this.author?.id || this.followState() === 'loading' || this.followState() === 'error';
  }

  protected get confirmationTitle(): string {
    const action = this.pendingAction();
    const template = action === 'unfollow' ? this.copy.unfollowConfirmTitle : this.copy.blockConfirmTitle;
    return template.replace('{user}', this.authorName);
  }

  protected get confirmationButtonLabel(): string {
    if (this.busy()) return this.copy.confirmingAction;
    const template = this.pendingAction() === 'unfollow' ? this.copy.unfollowUser : this.copy.blockUser;
    return template.replace('{user}', this.authorName);
  }

  protected get reportTitle(): string {
    const target = this.reportTarget();
    if (target === 'comment') return this.copy.reportCommentTitle;
    if (target === 'review') return this.copy.reportReviewTitle;
    return this.copy.reportUserTitle;
  }

  protected get reportQuestion(): string {
    const target = this.reportTarget();
    if (target === 'comment') return this.copy.reportQuestionComment;
    if (target === 'review') return this.copy.reportQuestionReview;
    return this.copy.reportQuestionUser;
  }

  protected get reportEvidenceLabel(): string {
    const target = this.reportTarget();
    if (target === 'comment') return this.copy.reportCommentBy.replace('{user}', this.reportHandle);
    if (target === 'review') return this.copy.reportReviewBy.replace('{user}', this.reportHandle);
    return this.copy.reportUserEvidence;
  }

  protected get reportEvidenceText(): string {
    if (this.reportTarget() === 'user') {
      const username = this.author.username?.trim();
      return username ? `${this.authorName} · @${username}` : this.authorName;
    }
    return this.itemText.trim() || (this.reportTarget() === 'review' ? this.copy.reportReviewWithoutText : '');
  }

  protected toggleMenu(event: MouseEvent): void {
    event.stopPropagation();
    const opening = !this.menuOpen();
    this.menuOpen.set(opening);
    this.error.set('');
    this.statusMessage.set('');
    if (opening) this.ensureFollowState();
  }

  protected followOrUnfollow(event: MouseEvent): void {
    event.stopPropagation();
    const state = this.followState();
    if (this.userActionBusy) return;
    if (state === 'following') {
      this.menuOpen.set(false);
      this.pendingAction.set('unfollow');
      return;
    }
    this.updateFollow(true);
  }

  protected blockAuthor(event: MouseEvent): void {
    event.stopPropagation();
    if (this.busy() || !this.author?.id) return;
    this.menuOpen.set(false);
    this.pendingAction.set('block');
  }

  protected openReport(target: ReportAction, event: MouseEvent): void {
    event.stopPropagation();
    if (!this.author?.id || (target !== 'user' && !this.itemId)) return;
    this.menuOpen.set(false);
    this.pendingAction.set(null);
    this.reportTarget.set(target);
    this.reportReason.set(null);
    this.reportDetails.set('');
    this.reportError.set('');
  }

  protected confirmUserAction(): void {
    const action = this.pendingAction();
    const userId = this.author?.id;
    if (!action || !userId || this.busy()) return;
    this.busy.set(true);
    this.error.set('');
    const request = action === 'unfollow'
      ? this.profileApi.setFollow(userId, false)
      : this.settingsApi.blockUser(userId);
    request.subscribe({
      next: () => {
        if (action === 'unfollow') this.followState.set('not-following');
        else this.followState.set('not-following');
        this.pendingAction.set(null);
        this.busy.set(false);
        this.statusMessage.set(action === 'unfollow'
          ? this.copy.unfollowSuccess.replace('{user}', this.authorName)
          : this.copy.blockSuccess.replace('{user}', this.authorName));
        this.actionCompleted.emit({ action: action === 'unfollow' ? 'unfollowed' : 'blocked', userId });
      },
      error: () => {
        this.error.set(action === 'unfollow'
          ? this.copy.unfollowError.replace('{user}', this.authorName)
          : this.copy.blockError.replace('{user}', this.authorName));
        this.pendingAction.set(null);
        this.busy.set(false);
      },
    });
  }

  protected cancelUserAction(): void {
    if (!this.busy()) this.pendingAction.set(null);
  }

  protected selectReportReason(reason: SocialReportReason): void {
    this.reportReason.set(reason);
    this.reportError.set('');
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

  protected setReportDetails(event: Event): void {
    this.reportDetails.set((event.target as HTMLTextAreaElement).value);
  }

  protected submitReport(event: Event): void {
    event.preventDefault();
    const target = this.reportTarget();
    const reason = this.reportReason();
    if (!target || !reason || this.busy() || !this.author?.id) return;
    const targetId = target === 'user' ? this.author.id : this.itemId;
    const targetType: SocialReportTargetType = target === 'comment'
      ? 'COMMENT'
      : target === 'user' ? 'USER' : this.reviewTargetType;
    const details = this.reportDetails().trim();
    this.busy.set(true);
    this.reportError.set('');
    this.reportApi.createReport({ targetType, targetId, reason, ...(details ? { details } : {}) }).subscribe({
      next: () => {
        this.reportTarget.set(null);
        this.busy.set(false);
        this.statusMessage.set(this.copy.reportSuccess);
        this.actionCompleted.emit({ action: 'reported', userId: this.author.id });
      },
      error: () => {
        this.reportError.set(this.copy.reportError);
        this.busy.set(false);
      },
    });
  }

  protected cancelReport(): void {
    if (this.busy()) return;
    this.reportTarget.set(null);
  }

  protected reportBackdropClick(event: MouseEvent): void {
    if (event.target === event.currentTarget) this.cancelReport();
  }

  @HostListener('document:click')
  protected dismissMenu(): void {
    this.menuOpen.set(false);
  }

  @HostListener('document:keydown.escape')
  protected dismissMenuOnEscape(): void {
    if (this.reportTarget() || this.pendingAction()) return;
    this.menuOpen.set(false);
  }

  private ensureFollowState(): void {
    const userId = this.author?.id;
    if (!userId || userId === this.session.user()?.id || this.followState() === 'loading') return;
    if (this.followState() === 'following' || this.followState() === 'not-following') return;
    this.followState.set('loading');
    this.profileApi.getUser(userId).subscribe({
      next: (profile) => this.followState.set(profile.viewerRelation === 'FOLLOWING' ? 'following' : 'not-following'),
      error: () => this.followState.set('error'),
    });
  }

  private updateFollow(following: boolean): void {
    const userId = this.author?.id;
    if (!userId || this.busy()) return;
    this.busy.set(true);
    this.error.set('');
    this.profileApi.setFollow(userId, following).subscribe({
      next: () => {
        this.followState.set(following ? 'following' : 'not-following');
        this.busy.set(false);
        this.statusMessage.set(this.copy.followSuccess.replace('{user}', this.authorName));
        this.actionCompleted.emit({ action: 'followed', userId });
      },
      error: () => {
        this.error.set(this.copy.followError.replace('{user}', this.authorName));
        this.busy.set(false);
      },
    });
  }
}
