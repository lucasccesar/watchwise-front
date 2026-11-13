import { NgTemplateOutlet } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { switchMap } from 'rxjs';
import { AuthSessionService } from '../../../../core/session/session.service';
import {
  ContentApiService,
  ContentComment,
  DiaryEntryRecord,
  SeriesPage,
} from '../../../content/data-access/content-api.service';
import { ProfileApiService, PublicUserProfile } from '../../../profile/data-access/profile-api.service';
import { PageSkeletonComponent } from '../../../../shared/components/page-skeleton/page-skeleton.component';
import { ResponsiveBannerComponent } from '../../../../shared/components/responsive-banner/responsive-banner.component';
import { ShareReviewDialogComponent, ShareReviewDialogModel } from '../../../../shared/components/share-review-dialog/share-review-dialog.component';
import { RatingDialogComponent, type RatingDialogContentType, type RatingDialogSubmission, type RatingDialogValue } from '../../../../shared/components/rating-dialog/rating-dialog.component';
import { movieMessages } from '../../../content/i18n/movie.messages';
import { SocialActionsMenuComponent, SocialActionMenuEvent, SocialActionMenuUser } from '../../../../shared/components/social-actions-menu/social-actions-menu.component';
import { CommentItemComponent } from '../../../../shared/components/comment-item/comment-item.component';
import { ToastNotificationsService } from '../../../../shared/components/toast-notifications/toast-notifications.service';
import { ConfirmationDialogService } from '../../../../shared/components/confirmation-dialog/confirmation-dialog.service';
import { tmdbImageUrl } from '../../../../shared/utils/tmdb-image-url';
import { episodeContentNavigationState, episodeContentRoute } from '../../../../shared/utils/episode-content-route';

type LoadState = 'loading' | 'ready' | 'error';

interface ReviewCommentNode {
  comment: ContentComment;
  replies: ReviewCommentNode[];
}

interface ReviewCommentThread {
  root: ReviewCommentNode;
}

@Component({
  selector: 'app-diary-review-detail',
  standalone: true,
  imports: [RouterLink, NgTemplateOutlet, PageSkeletonComponent, ResponsiveBannerComponent, ShareReviewDialogComponent, RatingDialogComponent, SocialActionsMenuComponent, CommentItemComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './review-detail.component.html',
  styleUrl: './review-detail.component.css',
})
export class DiaryReviewDetailComponent {
  private readonly session = inject(AuthSessionService);
  private readonly toasts = inject(ToastNotificationsService);
  protected readonly entry = signal<DiaryEntryRecord | null>(null);
  protected readonly comments = signal<ContentComment[]>([]);
  protected readonly commentThreads = computed<ReviewCommentThread[]>(() => {
    const comments = this.comments();
    const commentsById = new Map(comments.map((comment) => [comment.id, comment]));
    const childrenByParent = new Map<string, ContentComment[]>();
    const roots: ContentComment[] = [];

    for (const comment of comments) {
      const parentId = comment.parentCommentId;
      if (parentId && commentsById.has(parentId)) {
        const children = childrenByParent.get(parentId) ?? [];
        children.push(comment);
        childrenByParent.set(parentId, children);
      } else {
        roots.push(comment);
      }
    }

    const collectReplies = (parentId: string, ancestors: Set<string>): ReviewCommentNode[] =>
      (childrenByParent.get(parentId) ?? []).flatMap((reply) => {
        if (ancestors.has(reply.id)) return [];
        const replyAncestors = new Set(ancestors);
        replyAncestors.add(reply.id);
        return [{ comment: reply, replies: collectReplies(reply.id, replyAncestors) }];
      });

    return roots.map((root) => ({
      root: { comment: root, replies: collectReplies(root.id, new Set([root.id])) },
    }));
  });
  protected readonly allCommentsVisible = signal(false);
  protected readonly status = signal<LoadState>('loading');
  protected readonly commentsStatus = signal<LoadState>('loading');
  protected readonly errorMessage = signal('');
  protected readonly commentError = signal('');
  protected readonly commentDraft = signal('');
  protected readonly replyDraft = signal('');
  protected readonly replyTo = signal<ContentComment | null>(null);
  protected readonly commentMenuId = signal<string | null>(null);
  protected readonly shareMenuOpen = signal(false);
  protected readonly sharePreviewOpen = signal(false);
  protected readonly shareMenuOpener = signal<HTMLElement | null>(null);
  protected readonly shareCopy = movieMessages['pt-BR'];
  protected readonly pendingComments = signal(false);
  protected readonly editReviewOpen = signal(false);
  protected readonly editReviewBusy = signal(false);
  protected readonly ratingDialogType = computed<RatingDialogContentType>(() => {
    const type = this.entry()?.content?.type;
    return type === 'SERIES' || type === 'SEASON' || type === 'EPISODE' ? type : 'MOVIE';
  });
  protected readonly ratingDialogInitialValue = computed<Partial<RatingDialogValue>>(() => {
    const entry = this.entry();
    return {
      score: entry?.score ?? null,
      comment: entry?.comment ?? '',
      watchedDate: entry?.watchedDate ?? entry?.watchedAt ?? this.localDate(new Date()),
      isRewatch: (entry?.watchNumber ?? 1) > 1,
      watchedInTheater: entry?.watchedInTheater ?? false,
      watchedWith: entry?.watchedWith?.map((person) => person.id) ?? [],
    };
  });
  protected readonly ratingDialogFriends = computed(() => (this.entry()?.watchedWith ?? []).map((person) => ({
    id: person.id,
    name: person.name,
    username: person.username,
    profilePicture: person.profilePicture,
  })));
  protected readonly backdrop = signal<string | null>(null);
  protected readonly parentTitle = signal('');
  protected readonly reviewerProfile = signal<PublicUserProfile | null>(null);
  protected readonly reviewerPicture = computed(() => {
    const entry = this.entry();
    if (entry?.userId === this.currentUser()?.id) return this.currentUser()?.profilePicture ?? null;
    return this.reviewerProfile()?.profilePicture ?? null;
  });
  protected readonly contentTitle = computed(() => {
    const entry = this.entry();
    return entry?.content?.type === 'EPISODE' || entry?.content?.type === 'SEASON'
      ? this.parentTitle() || entry.card?.title || 'Conteúdo'
      : entry?.card?.title || 'Conteúdo';
  });
  protected readonly currentUser = this.session.user;
  protected readonly reviewModerationAuthor = computed<SocialActionMenuUser | null>(() => {
    const entry = this.entry();
    if (!entry?.userId) return null;
    if (entry.userId === this.currentUser()?.id) {
      const user = this.currentUser();
      return user ? { id: user.id, username: user.username, name: user.name } : { id: entry.userId };
    }
    const reviewer = this.reviewerProfile();
    return { id: entry.userId, username: reviewer?.username, name: reviewer?.name };
  });
  protected readonly reviewerName = computed(() => {
    const entry = this.entry();
    const user = this.currentUser();
    if (!entry?.userId) return 'Usuário';
    if (user?.id === entry.userId) return user.name || user.username || 'Usuário';
    const reviewer = this.reviewerProfile();
    return reviewer?.name || reviewer?.username || 'Usuário';
  });
  protected readonly episodeLabel = computed(() => {
    const content = this.entry()?.content;
    if (!content || content.type !== 'EPISODE') return '';
    const episodeTitle = this.entry()?.card?.title;
    return [`T${content.seasonNumber ?? 0}`, `E${content.episodeNumber ?? 0}`, episodeTitle].filter(Boolean).join(' · ');
  });
  protected readonly episodeHeroLabel = computed(() => {
    const content = this.entry()?.content;
    if (!content || content.type !== 'EPISODE') return '';
    const episodeTitle = this.entry()?.card?.title;
    return [`Temporada ${content.seasonNumber ?? 0}`, `Episódio ${content.episodeNumber ?? 0}`, episodeTitle].filter(Boolean).join(' · ');
  });
  protected readonly shareReviewModel = computed<ShareReviewDialogModel | null>(() => {
    const entry = this.entry();
    if (!entry) return null;
    const content = entry.content;
    const year = entry.card?.releaseYear ?? entry.card?.releaseDate?.slice(0, 4) ?? null;
    let subtitle = year ? String(year) : null;
    if (content?.type === 'EPISODE') subtitle = this.episodeLabel() || null;
    else if (content?.type === 'SEASON') subtitle = content.seasonNumber === null ? null : `T${content.seasonNumber}`;
    const posterUrl = this.posterUrl();
    const user = this.currentUser();
    return {
      title: this.contentTitle(),
      subtitle,
      subtitleBelowTitle: content?.type === 'EPISODE',
      rating: entry.score,
      review: entry.comment,
      backgroundUrl: this.backdrop() || posterUrl,
      posterUrl,
      username: entry.userId && user && entry.userId === user.id
        ? user.username
        : this.reviewerProfile()?.username ?? null,
      avatarUrl: this.reviewerPicture(),
      selectionType: content ? (content.type === 'MOVIE' ? 'MOVIE' : 'SERIES') : null,
      tmdbId: content
        ? (content.type === 'MOVIE' ? content.tmdbId : content.seriesTmdbId || content.tmdbId)
        : null,
    };
  });
  protected readonly contentRoute = computed(() => {
    const content = this.entry()?.content;
    if (!content) return ['/diary/reviews'];
    if (content.type === 'MOVIE' && content.tmdbId) return ['/content/movie', content.tmdbId];
    if (content.type === 'SERIES' && content.tmdbId) return ['/content/series', content.tmdbId];
    if (content.type === 'EPISODE') return episodeContentRoute(content) ?? ['/diary/reviews'];
    if (content.type === 'SEASON' && content.seriesTmdbId) {
      const season = content.seasonNumber ?? 1;
      return ['/content/series', content.seriesTmdbId, 'season', String(season)];
    }
    return ['/diary/reviews'];
  });

  protected episodeNavigationState(): { contentId: string } | undefined {
    const content = this.entry()?.content;
    return content?.type === 'EPISODE' ? episodeContentNavigationState(content.id) : undefined;
  }

  protected reviewerReviewsRoute(): string[] {
    const entry = this.entry();
    if (!entry?.userId || entry.userId === this.currentUser()?.id) return ['/diary/reviews'];
    const username = this.reviewerProfile()?.username;
    return username ? ['/users', username, 'reviews'] : ['/diary/reviews'];
  }

  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly api = inject(ContentApiService);
  private readonly profileApi = inject(ProfileApiService);
  private readonly confirmation = inject(ConfirmationDialogService);
  private openReviewEditorAfterLoad = false;

  constructor() {
    this.openReviewEditorAfterLoad = this.router.getCurrentNavigation()?.extras.state?.['openReviewEditor'] === true;
    this.route.paramMap.subscribe((params) => this.load(params.get('entryId') ?? ''));
  }

  protected posterUrl(): string | null {
    const entry = this.entry();
    const path = entry?.customPosterUrl || entry?.card?.customPosterUrl || entry?.card?.posterPath;
    return tmdbImageUrl(path, 'w500');
  }

  protected formatDate(value: string | null | undefined): string {
    if (!value) return '';
    const date = new Date(`${value.slice(0, 10)}T12:00:00`);
    return new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' }).format(date);
  }

  protected formatTime(value: string): string {
    const elapsed = Math.max(0, Date.now() - new Date(value).getTime());
    const minutes = Math.floor(elapsed / 60_000);
    if (minutes < 60) return `${Math.max(1, minutes)} min`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours} h`;
    const days = Math.floor(hours / 24);
    return days < 7 ? `${days} d` : this.formatDate(value);
  }

  protected watchedWithLabel(): string {
    const people = this.entry()?.watchedWith ?? [];
    const names = people.map((person) => person.name || person.username).filter(Boolean);
    return names.length ? `com ${names.join(', ')}` : '';
  }

  protected firstCompanion() {
    return this.entry()?.watchedWith?.[0] ?? null;
  }

  protected setCommentDraft(event: Event): void {
    this.commentDraft.set((event.target as HTMLTextAreaElement).value);
  }

  protected setReplyDraft(event: Event): void {
    this.replyDraft.set((event.target as HTMLTextAreaElement).value);
  }

  protected submitComment(event: SubmitEvent, parentComment?: ContentComment): void {
    event.preventDefault();
    const entry = this.entry();
    const text = (parentComment ? this.replyDraft() : this.commentDraft()).trim();
    if (!entry || !text || this.pendingComments()) return;
    this.pendingComments.set(true);
    this.api.createDiaryComment(entry.id, { text, parentCommentId: parentComment?.id ?? null }).subscribe({
      next: (comment) => {
        this.comments.update((items) => [...items, comment]);
        this.entry.update((current) => current ? { ...current, commentsCount: (current.commentsCount ?? 0) + 1 } : current);
        if (parentComment) {
          this.replyDraft.set('');
          this.replyTo.set(null);
        } else {
          this.commentDraft.set('');
        }
        this.pendingComments.set(false);
      },
      error: (error: unknown) => {
        this.toasts.error(this.requestError(error));
        this.pendingComments.set(false);
      },
    });
  }

  protected toggleReviewLike(): void {
    const entry = this.entry();
    if (!entry) return;
    const nextLiked = !entry.likedByMe;
    this.entry.update((current) => current ? {
      ...current,
      likedByMe: nextLiked,
      likesCount: Math.max(0, (current.likesCount ?? 0) + (nextLiked ? 1 : -1)),
    } : current);
    this.api.setReviewLike(entry.id, 'DIARY', nextLiked).subscribe({
      error: (error: unknown) => {
        this.entry.update((current) => current ? {
          ...current,
          likedByMe: !nextLiked,
          likesCount: Math.max(0, (current.likesCount ?? 0) + (nextLiked ? -1 : 1)),
        } : current);
        this.toasts.error(this.requestError(error));
      },
    });
  }

  protected canEditReview(): boolean {
    const entry = this.entry();
    return !!entry && !!this.currentUser()?.id && entry.userId === this.currentUser()?.id;
  }

  protected openReviewEditor(): void {
    const entry = this.entry();
    if (!entry || !this.canEditReview()) return;
    this.editReviewOpen.set(true);
    this.shareMenuOpen.set(false);
  }

  protected editReviewSubtitle(): string {
    const entry = this.entry();
    const content = entry?.content;
    if (!entry || !content) return this.contentTitle();
    if (content.type === 'EPISODE') {
      return [
        this.contentTitle(),
        content.seasonNumber === null ? '' : `S${content.seasonNumber}`,
        content.episodeNumber === null ? '' : `E${content.episodeNumber}`,
        entry.card?.title,
      ].filter(Boolean).join(' · ');
    }
    if (content.type === 'SEASON') return [this.contentTitle(), content.seasonNumber === null ? '' : `T${content.seasonNumber}`].filter(Boolean).join(' · ');
    return this.contentTitle();
  }

  protected saveReviewEdit(submission: RatingDialogSubmission): void {
    const entry = this.entry();
    if (!entry || !this.canEditReview() || this.editReviewBusy()) return;
    this.editReviewBusy.set(true);
    this.api.updateDiaryEntry(entry.id, {
      score: submission.score,
      comment: submission.comment || null,
      watchedDate: submission.watchedDate || null,
      watchedInTheater: submission.watchedInTheater,
      isRewatch: submission.isRewatch,
      watchedWith: submission.watchedWith,
    }).subscribe({
      next: (updatedEntry) => {
        this.entry.update((current) => current ? { ...current, ...updatedEntry } : current);
        this.editReviewBusy.set(false);
        this.editReviewOpen.set(false);
      },
      error: (error: unknown) => {
        this.toasts.error(this.requestError(error));
        this.editReviewBusy.set(false);
      },
    });
  }

  protected async removeReviewHistory(): Promise<void> {
    const entry = this.entry();
    if (!entry || !this.canEditReview() || this.editReviewBusy()) return;
    const confirmed = await this.confirmation.requestConfirmation({
      message: this.shareCopy.removeWatchConfirm,
      confirmLabel: this.shareCopy.removeWatch,
    });
    if (!confirmed || this.editReviewBusy()) return;
    this.editReviewBusy.set(true);
    this.api.deleteDiaryEntry(entry.id).subscribe({
      next: () => {
        this.editReviewBusy.set(false);
        this.toasts.success(this.shareCopy.removed);
        void this.router.navigateByUrl('/diary/reviews');
      },
      error: (error: unknown) => {
        this.toasts.error(this.requestError(error));
        this.editReviewBusy.set(false);
      },
    });
  }

  protected replyTargetName(comment: ContentComment): string {
    const parent = this.comments().find((item) => item.id === comment.parentCommentId);
    return parent?.user.name || parent?.user.username || 'comentário';
  }

  protected shareReviewPreview(event: Event): void {
    const source = event.currentTarget as HTMLElement;
    const opener = source.closest('.review-detail-share-wrap')?.querySelector<HTMLElement>('.review-detail-share') ?? null;
    this.shareMenuOpener.set(opener);
    this.shareMenuOpen.set(false);
    this.sharePreviewOpen.set(true);
  }

  protected closeShareReviewPreview(): void {
    this.sharePreviewOpen.set(false);
  }

  protected toggleCommentLike(comment: ContentComment): void {
    const liked = !comment.likedByMe;
    this.comments.update((items) => items.map((item) => item.id === comment.id
      ? { ...item, likedByMe: liked, likesCount: Math.max(0, item.likesCount + (liked ? 1 : -1)) }
      : item));
    this.api.setCommentLike(comment.id, liked).subscribe({
      error: () => this.comments.update((items) => items.map((item) => item.id === comment.id
        ? { ...item, likedByMe: !liked, likesCount: Math.max(0, item.likesCount + (liked ? -1 : 1)) }
        : item)),
    });
  }

  protected startReply(comment: ContentComment): void {
    this.replyTo.set(comment);
    this.replyDraft.set('');
    requestAnimationFrame(() => document.getElementById(`diary-review-reply-${comment.id}`)?.focus());
  }

  protected cancelReply(): void {
    this.replyTo.set(null);
    this.replyDraft.set('');
  }

  protected toggleCommentMenu(commentId: string): void {
    this.commentMenuId.update((current) => current === commentId ? null : commentId);
  }

  protected toggleAllComments(): void {
    this.allCommentsVisible.update((visible) => !visible);
  }

  protected toggleShareMenu(): void {
    this.shareMenuOpen.update((open) => !open);
  }

  protected async copyReviewLink(): Promise<void> {
    try {
      await navigator.clipboard.writeText(window.location.href);
      this.toasts.success('Link copiado.');
    } catch {
      this.toasts.error('Não foi possível copiar o link.');
    }
    this.shareMenuOpen.set(false);
  }

  protected async copyCommentLink(comment: ContentComment): Promise<void> {
    try {
      await navigator.clipboard.writeText(`${window.location.href}#comment-${comment.id}`);
      this.toasts.success('Link copiado.');
    } catch {
      this.toasts.error('Não foi possível copiar o link agora.');
    }
    this.commentMenuId.set(null);
  }

  protected handleCommentModeration(event: SocialActionMenuEvent): void {
    if (event.action !== 'blocked') return;
    const currentCommentCount = this.entry()?.commentsCount ?? this.comments().length;
    const removedIds = new Set(this.comments().filter((item) => item.user.id === event.userId).map((item) => item.id));
    let changed = true;
    while (changed) {
      changed = false;
      for (const item of this.comments()) {
        if (item.parentCommentId && removedIds.has(item.parentCommentId) && !removedIds.has(item.id)) {
          removedIds.add(item.id);
          changed = true;
        }
      }
    }
    this.comments.update((items) => items.filter((item) => !removedIds.has(item.id)));
    this.entry.update((entry) => entry ? {
      ...entry,
      commentsCount: Math.max(0, currentCommentCount - removedIds.size),
    } : entry);
  }

  protected retry(): void {
    this.load(this.route.snapshot.paramMap.get('entryId') ?? '');
  }

  private load(entryId: string): void {
    this.entry.set(null);
    this.reviewerProfile.set(null);
    this.comments.set([]);
    this.status.set('loading');
    this.commentsStatus.set('loading');
    this.errorMessage.set('');
    this.api.getDiaryEntry(entryId).subscribe({
      next: (entry) => {
        this.entry.set(entry);
        this.status.set('ready');
        const currentUserId = this.currentUser()?.id;
        if (entry.userId && entry.userId !== currentUserId) {
          this.profileApi.getUser(entry.userId).subscribe({
            next: (profile) => {
              if (this.entry()?.id === entry.id) this.reviewerProfile.set(profile);
            },
          });
        }
        this.loadBackdrop(entry);
        this.loadComments(entry.id);
        if (this.openReviewEditorAfterLoad) {
          this.openReviewEditorAfterLoad = false;
          queueMicrotask(() => this.openReviewEditor());
        }
      },
      error: (error: unknown) => {
        this.errorMessage.set(this.requestError(error));
        this.status.set('error');
      },
    });
  }

  private loadComments(entryId: string): void {
    this.api.getDiaryComments(entryId, 1).subscribe({
      next: (result) => {
        this.comments.set(result.content);
        this.commentsStatus.set('ready');
      },
      error: (error: unknown) => {
        this.commentError.set(this.requestError(error));
        this.commentsStatus.set('error');
      },
    });
  }

  private loadBackdrop(entry: DiaryEntryRecord): void {
    const ref = entry.content;
    if (!ref) return;
    if (ref.type === 'EPISODE' && ref.seriesTmdbId) {
      this.api.createSeriesReference(ref.seriesTmdbId).pipe(
        switchMap((series) => this.api.getSeriesPage(series.id)),
      ).subscribe({ next: (page: SeriesPage) => { this.parentTitle.set(page.details.title || ''); this.setBackdrop(page.details.backdropPath); } });
      return;
    }
    if ((ref.type === 'SERIES' || ref.type === 'SEASON') && (ref.seriesTmdbId || ref.tmdbId)) {
      this.api.createSeriesReference(ref.seriesTmdbId || ref.tmdbId || '').pipe(
        switchMap((series) => this.api.getSeriesPage(series.id)),
      ).subscribe({ next: (page: SeriesPage) => { this.parentTitle.set(page.details.title || ''); this.setBackdrop(page.details.backdropPath); } });
      return;
    }
    if (ref.id) {
      this.api.getPage(ref.id).subscribe({ next: (page) => this.setBackdrop(page.details.backdropPath) });
    }
  }

  private setBackdrop(path: string | null): void {
    if (!path) return;
    this.backdrop.set(tmdbImageUrl(path, 'w1280'));
  }

  private localDate(date: Date): string {
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${date.getFullYear()}-${month}-${day}`;
  }

  private requestError(error: unknown): string {
    if (error instanceof HttpErrorResponse && error.status === 0) return 'Não foi possível conectar ao serviço. Tente novamente.';
    if (error instanceof HttpErrorResponse && error.status === 404) return 'Esta resenha não está disponível.';
    return 'Não foi possível carregar esta tela agora. Tente novamente.';
  }
}
