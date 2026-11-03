import { HttpErrorResponse } from '@angular/common/http';
import { NgTemplateOutlet } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { Router, RouterLink, ActivatedRoute } from '@angular/router';
import { forkJoin } from 'rxjs';
import { ContentImageAction, ContentImageActionSelection, ContentImageActionsComponent } from '../../../../shared/components/content-image-actions/content-image-actions.component';
import { messageCatalog } from '../../../../shared/i18n/messages';
import { PicksApiService, PicksAnswer, PicksCommentPreview, PicksOptionView, PicksTemplateDetail, PicksTemplatePickView } from '../../data-access/picks-api.service';
import { PageSkeletonComponent } from '../../../../shared/components/page-skeleton/page-skeleton.component';
import { CommentItemComponent } from '../../../../shared/components/comment-item/comment-item.component';
import { buildCommentTree } from '../../../../shared/components/comment-item/comment-tree';
import { ToastNotificationsService } from '../../../../shared/components/toast-notifications/toast-notifications.service';

type PickTemplateStatus = 'loading' | 'ready' | 'error';
type CommunitySort = 'RECENT' | 'POPULAR';

@Component({
  selector: 'app-pick-template',
  standalone: true,
  imports: [NgTemplateOutlet, RouterLink, ContentImageActionsComponent, PageSkeletonComponent, CommentItemComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './pick-template.component.html',
  styleUrl: './pick-template.component.css',
})
export class PickTemplateComponent {
  protected readonly copy = messageCatalog['pt-BR'].pickTemplatePage;
  protected readonly picksCopy = messageCatalog['pt-BR'].picksPage;
  protected readonly homeCopy = messageCatalog['pt-BR'].home;
  protected readonly templateId = inject(ActivatedRoute).snapshot.paramMap.get('templateId') ?? '';
  protected readonly status = signal<PickTemplateStatus>('loading');
  protected readonly detail = signal<PicksTemplateDetail | null>(null);
  protected readonly myPicks = signal<PicksTemplatePickView[]>([]);
  protected readonly communityPicks = signal<PicksTemplatePickView[]>([]);
  protected readonly comments = signal<PicksCommentPreview[]>([]);
  protected readonly commentThreads = computed(() => buildCommentTree(this.comments()));
  protected readonly optionViews = signal<ReadonlyMap<string, PicksOptionView[]>>(new Map());
  protected readonly communitySort = signal<CommunitySort>('RECENT');
  protected readonly likesBusy = signal(false);
  protected readonly busyPickIds = signal<ReadonlySet<string>>(new Set());
  protected readonly commentText = signal('');
  protected readonly commentSpoiler = signal(false);
  protected readonly postingComment = signal(false);
  protected readonly error = signal('');
  protected readonly optionActions: readonly ContentImageAction[] = [{ id: 'open-option', label: this.copy.openOption, icon: 'eye' }];
  protected readonly categoryGroups = computed(() => ({
    primary: (this.detail()?.categories ?? []).filter((category) => category.group === 'PRIMARY').sort((a, b) => a.displayOrder - b.displayOrder),
    secondary: (this.detail()?.categories ?? []).filter((category) => category.group === 'SECONDARY').sort((a, b) => a.displayOrder - b.displayOrder),
  }));

  private readonly api = inject(PicksApiService);
  private readonly router = inject(Router);
  private readonly toasts = inject(ToastNotificationsService);

  constructor() { if (this.templateId) this.load(); else void this.router.navigateByUrl('/picks'); }

  protected load(): void {
    this.status.set('loading'); this.error.set('');
    forkJoin({
      template: this.api.getTemplate(this.templateId),
      mine: this.api.getMyTemplatePicks(this.templateId, 1, 10),
      community: this.api.getTemplatePicks(this.templateId, { page: 1, size: 10, sort: this.communitySort() }),
      comments: this.api.getTemplateComments(this.templateId, 1, 20),
    }).subscribe({
      next: ({ template, mine, community, comments }) => {
        this.detail.set(template); this.myPicks.set(mine.content); this.communityPicks.set(community.content); this.comments.set(comments.content); this.status.set('ready');
        this.loadOptionViews(template);
      },
      error: (error: unknown) => { this.status.set('error'); this.error.set(error instanceof HttpErrorResponse && error.status === 0 ? this.copy.connectionError : this.copy.loadError); },
    });
  }

  protected refreshCommunity(sort: CommunitySort): void { this.communitySort.set(sort); this.api.getTemplatePicks(this.templateId, { page: 1, size: 10, sort }).subscribe({ next: (page) => this.communityPicks.set(page.content), error: () => this.error.set(this.copy.communityLoadError) }); }
  protected template(): PicksTemplateDetail | null { return this.detail(); }
  protected creatorName(template: PicksTemplateDetail): string { return template.creator?.name || template.creator?.username || this.picksCopy.unknownCreator; }
  protected authorRoute(template: PicksTemplateDetail): string[] { return ['/users', template.creator?.username ?? '']; }
  protected answerTemplateRoute(): string[] { return ['/picks/templates', this.templateId, 'new']; }
  protected pickRoute(pick: PicksTemplatePickView): string[] { return ['/picks', pick.id]; }
  protected pickLabel(pick: PicksTemplatePickView): string { return this.copy.pickBy.replace('{username}', pick.user?.username ?? ''); }
  protected formatDate(value: string | null): string { return value ? new Intl.DateTimeFormat('pt-BR', { day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(value)) : ''; }
  protected visibilityLabel(value: string): string { return value === 'PUBLIC' ? this.copy.public : value === 'FOLLOWERS' ? this.copy.followers : this.copy.private; }
  protected answeredCount(pick: PicksTemplatePickView): string { return this.copy.answersCount.replace('{count}', String(pick.answeredCategoriesCount)); }
  protected isLiked(): boolean { return Boolean(this.detail()?.isLikedByViewer); }
  protected toggleLike(): void {
    const detail = this.detail(); if (!detail || this.likesBusy()) return;
    this.likesBusy.set(true);
    const request = detail.isLikedByViewer ? this.api.unlikeTemplate(detail.id) : this.api.likeTemplate(detail.id);
    request.subscribe({ next: () => { this.likesBusy.set(false); this.load(); }, error: () => this.likesBusy.set(false) });
  }
  protected togglePickLike(pick: PicksTemplatePickView): void {
    if (this.busyPickIds().has(pick.id)) return;
    this.busyPickIds.update((current) => new Set(current).add(pick.id));
    const request = pick.isLikedByViewer ? this.api.unlikePick(pick.id) : this.api.likePick(pick.id);
    request.subscribe({
      next: () => {
        this.busyPickIds.update((current) => { const next = new Set(current); next.delete(pick.id); return next; });
        this.api.getTemplatePicks(this.templateId, { page: 1, size: 10, sort: this.communitySort() }).subscribe({ next: (page) => this.communityPicks.set(page.content) });
      },
      error: () => this.busyPickIds.update((current) => { const next = new Set(current); next.delete(pick.id); return next; }),
    });
  }
  protected optionPoster(option: PicksOptionView): string | null { const card = option.preview?.contentCard; return card?.customPosterUrl || card?.posterPath || option.preview?.person?.profileUrl || null; }
  protected optionRating(option: PicksOptionView): string | null {
    const value = option.preview?.contentCard?.stats?.averageScore;
    return value === null || value === undefined ? null : new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 }).format(value);
  }
  protected optionRatingLabel(option: PicksOptionView): string { const value = this.optionRating(option); return value ? `${this.homeCopy.communityAverage}: ${value}` : ''; }
  protected optionLabel(option: PicksOptionView): string { return option.preview?.contentCard?.title || option.preview?.person?.name || this.copy.optionUnavailable; }
  protected optionMenuKey(option: PicksOptionView): string { return `${this.templateId}:${option.id}`; }
  protected optionMenuKeyFor(option: PicksOptionView): string { return this.activeOptionMenu() === this.optionMenuKey(option) ? this.optionMenuKey(option) : ''; }
  protected readonly activeOptionMenu = signal('');
  protected toggleOptionMenu(option: PicksOptionView, event: MouseEvent): void { event.stopPropagation(); const key = this.optionMenuKey(option); this.activeOptionMenu.update((current) => current === key ? '' : key); }
  protected optionAction(option: PicksOptionView, selection: ContentImageActionSelection): void {
    if (selection.action.id !== 'open-option') return;
    const card = option.preview.contentCard;
    if (card?.tmdbId && card.type === 'MOVIE') void this.router.navigate(['/content/movie', card.tmdbId]);
    else if (card?.tmdbId && card.type === 'SERIES') void this.router.navigate(['/content/series', card.tmdbId]);
  }
  protected submitComment(event: Event): void {
    event.preventDefault(); const text = this.commentText().trim();
    if (!text || this.postingComment()) return;
    this.postingComment.set(true);
    this.api.createTemplateComment(this.templateId, { text, containsSpoiler: this.commentSpoiler() }).subscribe({
      next: (comment) => { this.comments.update((items) => [comment, ...items]); this.commentText.set(''); this.commentSpoiler.set(false); this.postingComment.set(false); },
      error: () => { this.postingComment.set(false); this.toasts.error(this.copy.commentError); },
    });
  }
  protected updateComment(event: Event): void { this.commentText.set((event.target as HTMLTextAreaElement).value); }
  protected toggleSpoiler(event: Event): void { this.commentSpoiler.set((event.target as HTMLInputElement).checked); }
  protected commentUserName(comment: PicksCommentPreview): string { return comment.user?.name || comment.user?.username || this.copy.unknownUser; }
  protected commentTime(comment: PicksCommentPreview): string { return this.formatDate(comment.createdAt); }
  protected progressLabel(pick: PicksTemplatePickView): string { return this.copy.progress.replace('{answered}', String(pick.answeredCategoriesCount)).replace('{total}', String(pick.totalCategoriesCount)); }
  protected previewAnswers(pick: PicksTemplatePickView): PicksAnswer[] { return pick.answeredCategories.slice(0, 3); }

  private loadOptionViews(template: PicksTemplateDetail): void {
    const requests = template.categories.filter((category) => category.optionMode === 'FIXED' && category.options?.length)
      .map((category) => this.api.getTemplateOptionViews(template.id, category.id));
    if (!requests.length) { this.optionViews.set(new Map()); return; }
    forkJoin(requests).subscribe({
      next: (pages) => {
        const fixed = template.categories.filter((category) => category.optionMode === 'FIXED' && category.options?.length);
        this.optionViews.set(new Map(fixed.map((category, index) => [category.id, pages[index].content])));
      },
      error: () => this.optionViews.set(new Map()),
    });
  }
}
