import { HttpErrorResponse } from '@angular/common/http';
import { NgTemplateOutlet } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { forkJoin } from 'rxjs';
import { AuthSessionService } from '../../../../core/session/session.service';
import { ContentImageAction, ContentImageActionSelection, ContentImageActionsComponent } from '../../../../shared/components/content-image-actions/content-image-actions.component';
import { ShareCardModel, SharePreviewComponent } from '../../../../shared/components/share-preview/share-preview.component';
import { messageCatalog } from '../../../../shared/i18n/messages';
import { PicksApiService, PicksAnswer, PicksCommentPreview, PicksPickView } from '../../data-access/picks-api.service';
import { PageSkeletonComponent } from '../../../../shared/components/page-skeleton/page-skeleton.component';
import { CommentItemComponent } from '../../../../shared/components/comment-item/comment-item.component';
import { buildCommentTree } from '../../../../shared/components/comment-item/comment-tree';
import { ToastNotificationsService } from '../../../../shared/components/toast-notifications/toast-notifications.service';
import { tmdbImageUrl } from '../../../../shared/utils/tmdb-image-url';
import { resolveRating } from '../../../../shared/utils/community-rating';
import { episodeContentNavigationState, episodeContentRoute } from '../../../../shared/utils/episode-content-route';

type PickVisibility = 'PUBLIC' | 'FOLLOWERS' | 'PRIVATE';

@Component({
  selector: 'app-pick-detail',
  standalone: true,
  imports: [NgTemplateOutlet, RouterLink, ContentImageActionsComponent, SharePreviewComponent, PageSkeletonComponent, CommentItemComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './pick-detail.component.html',
  styleUrl: './pick-detail.component.css',
})
export class PickDetailComponent {
  protected readonly copy = messageCatalog['pt-BR'].pickDetailPage;
  protected readonly templateCopy = messageCatalog['pt-BR'].pickTemplatePage;
  protected readonly picksCopy = messageCatalog['pt-BR'].picksPage;
  protected readonly homeCopy = messageCatalog['pt-BR'].home;
  protected readonly pickId = inject(ActivatedRoute).snapshot.paramMap.get('pickId') ?? '';
  protected readonly pick = signal<PicksPickView | null>(null);
  protected readonly comments = signal<PicksCommentPreview[]>([]);
  protected readonly commentThreads = computed(() => buildCommentTree(this.comments()));
  protected readonly status = signal<'loading' | 'ready' | 'error'>('loading');
  protected readonly error = signal('');
  protected readonly likedBusy = signal(false);
  protected readonly commentText = signal('');
  protected readonly commentSpoiler = signal(false);
  protected readonly postingComment = signal(false);
  protected readonly selectedVisibility = signal<PickVisibility>('PUBLIC');
  protected readonly savingVisibility = signal(false);
  protected readonly sharePreviewOpen = signal(false);
  protected readonly openMenu = signal('');
  protected readonly imageActions: readonly ContentImageAction[] = [{ id: 'open', label: this.copy.answerUnavailable, icon: 'eye' }];
  protected readonly currentUserId = computed(() => this.session.user()?.id ?? null);
  protected readonly isOwner = computed(() => Boolean(this.pick()?.user.id && this.currentUserId() === this.pick()?.user.id));
  protected readonly totalAnswers = computed(() => this.pick()?.answers.filter((answer) => answer.isAnswered !== false && answer.target).length ?? 0);
  protected readonly shareModel = computed<ShareCardModel>(() => {
    const pick = this.pick();
    const items = (pick?.answers ?? [])
      .filter((answer) => answer.target && answer.isAnswered !== false)
      .map((answer) => ({ title: this.answerLabel(answer), label: answer.name, imageUrl: this.shareImage(answer) }));
    return {
      kind: 'picks',
      title: 'Minhas escolhas',
      subtitle: pick?.picksTemplate.name || this.copy.categories,
      authorName: pick?.user.name || pick?.user.username || 'Watchwise',
      username: pick?.user.username,
      avatarUrl: pick?.user.profilePicture,
      backgroundUrl: items.find((item) => item.imageUrl)?.imageUrl,
      description: pick?.picksTemplate.description,
      items,
    };
  });

  private readonly api = inject(PicksApiService);
  private readonly session = inject(AuthSessionService);
  private readonly router = inject(Router);
  private readonly toasts = inject(ToastNotificationsService);

  constructor() {
    if (!this.pickId) { this.status.set('error'); this.error.set(this.copy.loadError); return; }
    this.load();
  }

  protected load(): void {
    this.status.set('loading'); this.error.set('');
    forkJoin({ pick: this.api.getPick(this.pickId), comments: this.api.getPickComments(this.pickId, 1, 30) }).subscribe({
      next: ({ pick, comments }) => { this.pick.set(pick); this.selectedVisibility.set(pick.visibility); this.comments.set(comments.content); this.status.set('ready'); },
      error: (error: unknown) => { this.status.set('error'); this.error.set(error instanceof HttpErrorResponse && error.status === 0 ? this.copy.connectionError : this.copy.loadError); },
    });
  }

  protected templateRoute(): string[] { return ['/picks/templates', this.pick()?.picksTemplate.id ?? '']; }
  protected authorRoute(): string[] { return ['/users', this.pick()?.user.username ?? '']; }
  protected isLiked(): boolean { return Boolean(this.pick()?.isLikedByViewer); }
  protected toggleLike(): void {
    const pick = this.pick(); if (!pick || this.likedBusy()) return;
    this.likedBusy.set(true);
    const request = pick.isLikedByViewer ? this.api.unlikePick(pick.id) : this.api.likePick(pick.id);
    request.subscribe({
      next: () => {
        this.pick.update((current) => current ? { ...current, isLikedByViewer: !current.isLikedByViewer, likesCount: Math.max(0, (current.likesCount ?? 0) + (current.isLikedByViewer ? -1 : 1)) } : current);
        this.likedBusy.set(false);
      },
      error: () => this.likedBusy.set(false),
    });
  }
  protected updateComment(event: Event): void { this.commentText.set((event.target as HTMLTextAreaElement).value); }
  protected updateSpoiler(event: Event): void { this.commentSpoiler.set((event.target as HTMLInputElement).checked); }
  protected postComment(event: Event): void {
    event.preventDefault(); const text = this.commentText().trim(); if (!text || this.postingComment()) return;
    this.postingComment.set(true);
    this.api.createPickComment(this.pickId, { text, containsSpoiler: this.commentSpoiler() }).subscribe({
      next: (comment) => { this.comments.update((items) => [comment, ...items]); this.pick.update((current) => current ? { ...current, commentsCount: current.commentsCount + 1 } : current); this.commentText.set(''); this.commentSpoiler.set(false); this.postingComment.set(false); },
      error: () => { this.postingComment.set(false); this.toasts.error(this.copy.commentError); },
    });
  }
  protected changeVisibility(value: PickVisibility): void { this.selectedVisibility.set(value); }
  protected saveVisibility(): void {
    const pick = this.pick(); if (!pick || !this.isOwner() || this.savingVisibility() || pick.visibility === this.selectedVisibility()) return;
    this.savingVisibility.set(true);
    this.api.updatePickVisibility(pick.id, this.selectedVisibility()).subscribe({
      next: () => { this.pick.update((current) => current ? { ...current, visibility: this.selectedVisibility() } : current); this.savingVisibility.set(false); this.toasts.success(this.copy.visibilityUpdated); },
      error: () => { this.savingVisibility.set(false); this.toasts.error(this.copy.visibilityError); },
    });
  }
  protected answeredLabel(): string { const item = this.pick(); return item ? this.copy.answered.replace('{answered}', String(item.answeredCategoriesCount)).replace('{total}', String(item.totalCategoriesCount)) : ''; }
  protected date(value: string): string { return new Intl.DateTimeFormat('pt-BR', { day: 'numeric', month: 'long', year: 'numeric' }).format(new Date(value)); }
  protected visibilityLabel(value: string): string { return value === 'PUBLIC' ? this.copy.public : value === 'FOLLOWERS' ? this.copy.followers : this.copy.private; }
  protected answerLabel(answer: PicksAnswer): string { return answer.preview?.contentCard?.title || answer.preview?.person?.name || this.copy.answerUnavailable; }
  protected answerImage(answer: PicksAnswer): string | null { const preview = answer.preview; return tmdbImageUrl(preview?.contentCard?.customPosterUrl || preview?.contentCard?.posterPath || preview?.person?.profileUrl || preview?.contextCard?.posterPath, 'w500'); }
  protected shareImage(answer: PicksAnswer): string | null {
    const path = this.answerImage(answer);
    return tmdbImageUrl(path, 'w500');
  }
  protected shareLink(): string { return `${window.location.origin}/picks/${encodeURIComponent(this.pickId)}`; }
  protected answerRating(answer: PicksAnswer): string | null { const card = answer.preview?.contentCard; const rating = resolveRating(card?.stats?.averageScore, card?.tmdbVoteAverage).value; return rating === null ? null : new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 }).format(rating); }
  protected answerRatingLabel(answer: PicksAnswer): string { const rating = this.answerRating(answer); if (!rating) return ''; const card = answer.preview?.contentCard; const source = resolveRating(card?.stats?.averageScore, card?.tmdbVoteAverage).source; return `${source === 'tmdb' ? this.homeCopy.tmdbRating : this.homeCopy.communityAverage}: ${rating}`; }
  protected answerMenuKey(answer: PicksAnswer): string { return `${this.pickId}:${answer.categoryId}`; }
  protected menuExpanded(answer: PicksAnswer): boolean { return this.openMenu() === this.answerMenuKey(answer); }
  protected toggleAnswerMenu(answer: PicksAnswer, event: MouseEvent): void { event.stopPropagation(); const key = this.answerMenuKey(answer); this.openMenu.update((current) => current === key ? '' : key); }
  protected answerAction(answer: PicksAnswer, event: ContentImageActionSelection): void {
    this.openMenu.set('');
    if (event.action.id !== 'open') return;
    const content = answer.preview?.contentCard;
    const route = this.answerRoute(answer);
    if (!route) return;
    if (content?.type === 'EPISODE') void this.router.navigate(route, { state: episodeContentNavigationState(content.contentId) });
    else void this.router.navigate(route);
  }
  protected answerRoute(answer: PicksAnswer): string[] | null {
    const content = answer.preview?.contentCard;
    const reference = answer.target?.content ?? answer.target?.contextContent;
    if (content?.tmdbId && content.type === 'MOVIE') return ['/content/movie', content.tmdbId];
    if (content?.tmdbId && content.type === 'SERIES') return ['/content/series', content.tmdbId];
    if (content?.type === 'EPISODE') return episodeContentRoute(content);
    if (content?.type === 'SEASON' && content.seriesTmdbId && content.seasonNumber !== null) return ['/content/series', content.seriesTmdbId, 'season', String(content.seasonNumber)];
    if (reference?.type === 'EPISODE') return episodeContentRoute(reference);
    if (content?.seriesTmdbId) return ['/content/series', content.seriesTmdbId];
    return null;
  }
  protected answerNavigationState(answer: PicksAnswer): { contentId: string } | undefined {
    const content = answer.preview?.contentCard;
    return content?.type === 'EPISODE' ? episodeContentNavigationState(content.contentId) : undefined;
  }
  protected optionActionLabel(answer: PicksAnswer): string { return this.templateCopy.optionActions.replace('{name}', this.answerLabel(answer)); }
  protected commentUser(comment: PicksCommentPreview): string { return comment.user.name || comment.user.username || this.copy.unknownUser; }
  protected initials(value: string): string { return value.trim().slice(0, 1).toLocaleUpperCase('pt-BR') || 'W'; }
  protected focusContent(event: MouseEvent): void { event.stopPropagation(); }
}
