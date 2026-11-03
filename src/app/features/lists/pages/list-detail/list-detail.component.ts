import { ModalFocusDirective } from '../../../../shared/directives/modal-focus.directive';
import { NgTemplateOutlet } from '@angular/common';
import { SocialActionsMenuComponent, SocialActionMenuEvent } from '../../../../shared/components/social-actions-menu/social-actions-menu.component';
import { CommentItemComponent } from '../../../../shared/components/comment-item/comment-item.component';
import { buildCommentTree } from '../../../../shared/components/comment-item/comment-tree';
import { PageSkeletonComponent } from '../../../../shared/components/page-skeleton/page-skeleton.component';
import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, ElementRef, ViewChild, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { distinctUntilChanged, map, Subscription } from 'rxjs';
import { AuthSessionService } from '../../../../core/session/session.service';
import { ContentApiService } from '../../../content/data-access/content-api.service';
import { ContentImageAction, ContentImageActionSelection, ContentImageActionsComponent } from '../../../../shared/components/content-image-actions/content-image-actions.component';
import { ShareCardModel, SharePreviewComponent } from '../../../../shared/components/share-preview/share-preview.component';
import { messageCatalog } from '../../../../shared/i18n/messages';
import { ListComment, ListDetailItem, ListDetailView, ListOwner, ListsApiService, ListVisibility } from '../../data-access/lists-api.service';

type ListContentType = 'MOVIE' | 'SERIES' | 'SEASON' | 'EPISODE' | null;
type ListWatchStatus = 'WATCHED' | 'PARTIALLY_WATCHED' | 'UNWATCHED' | 'UNKNOWN' | null;
type ListDetailSort = 'position' | 'dateAdded' | 'duration' | 'episodeAvgRating' | 'globalEpisodeAvgRating' | 'contentAvgRating';
type DetailMenu = 'type' | 'genre' | 'sort' | 'status' | null;

@Component({
  selector: 'app-list-detail',
  standalone: true,
    imports: [NgTemplateOutlet, ModalFocusDirective, RouterLink, ContentImageActionsComponent, SharePreviewComponent, PageSkeletonComponent, SocialActionsMenuComponent, CommentItemComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './list-detail.component.html',
  styleUrl: './list-detail.component.css',
})
export class ListDetailComponent {
  @ViewChild('listMenuButton') protected listMenuTrigger?: ElementRef<HTMLElement>;
  protected readonly copy = messageCatalog['pt-BR'].listDetailPage;
  protected readonly listCopy = messageCatalog['pt-BR'].listsPage;
  protected readonly homeCopy = messageCatalog['pt-BR'].home;
  protected readonly listId = signal('');
  protected readonly detail = signal<ListDetailView | null>(null);
  protected readonly owner = signal<ListOwner | null>(null);
  protected readonly status = signal<'loading' | 'ready' | 'error'>('loading');
  protected readonly errorMessage = signal('');
  protected readonly page = signal(1);
  protected readonly type = signal<ListContentType>(null);
  protected readonly genre = signal<string | null>(null);
  protected readonly watchStatus = signal<ListWatchStatus>(null);
  protected readonly sort = signal<ListDetailSort>('position');
  protected readonly sortDirection = signal<'asc' | 'desc'>('asc');
  protected readonly activeMenu = signal<DetailMenu>(null);
  protected readonly listMenuOpen = signal(false);
  protected readonly activeImageMenu = signal<string | null>(null);
  protected readonly reorderMode = signal(false);
  protected readonly editDialogOpen = signal(false);
  protected readonly editName = signal('');
  protected readonly editDescription = signal('');
  protected readonly editVisibility = signal<ListVisibility>('PUBLIC');
  protected readonly savingEdit = signal(false);
  protected readonly editError = signal('');
  protected readonly deleteListDialogOpen = signal(false);
  protected readonly deletingList = signal(false);
  protected readonly deleteItem = signal<ListDetailItem | null>(null);
  protected readonly deletingItemId = signal<string | null>(null);
  protected readonly actionError = signal('');
  protected readonly copied = signal(false);
  protected readonly shareDialogOpen = signal(false);
  protected readonly comments = signal<ListComment[]>([]);
  protected readonly commentsPage = signal(1);
  protected readonly commentsHasNext = signal(false);
  protected readonly commentsLoading = signal(false);
  protected readonly commentsError = signal(false);
  protected readonly commentText = signal('');
  protected readonly replyingTo = signal<ListComment | null>(null);
  protected readonly postingComment = signal(false);
  protected readonly expandedSpoilers = signal<ReadonlySet<string>>(new Set());
  protected readonly commentDeleteTarget = signal<ListComment | null>(null);
  protected readonly deletingComment = signal(false);
  protected readonly itemCount = computed(() => this.detail()?.items.totalElements ?? 0);
  protected readonly totalPages = computed(() => Math.max(1, this.detail()?.items.totalPages ?? 1));
  protected readonly pageNumbers = computed(() => Array.from({ length: this.totalPages() }, (_, index) => index + 1));
  protected readonly currentUserId = computed(() => this.session.user()?.id ?? null);
  protected readonly shareModel = computed<ShareCardModel>(() => {
    const detail = this.detail();
    const user = this.owner() ?? this.session.user();
    const items = (detail?.items.content ?? []).map((item) => ({
      title: item.card?.title || item.nestedList?.name || 'Conteúdo indisponível',
      label: item.card?.title || item.nestedList?.name || 'Conteúdo indisponível',
      imageUrl: this.posterFor(item),
    }));
    return {
      kind: 'list',
      title: detail?.name || 'Lista',
      subtitle: `Lista de @${user?.username ?? ''}`,
      description: detail?.description,
      authorName: user?.name || user?.username || 'Watchwise',
      username: user?.username,
      avatarUrl: user?.profilePicture,
      backgroundUrl: items.find((item) => item.imageUrl)?.imageUrl,
      items,
    };
  });
  protected readonly canManage = signal(false);
  protected readonly genreOptions = computed(() => [...new Set((this.detail()?.items.content ?? []).flatMap((item) => item.card?.genres ?? []))].sort((a, b) => a.localeCompare(b, 'pt-BR')));
  protected readonly items = computed(() => this.detail()?.items.content ?? []);
  protected readonly commentThreads = computed(() => buildCommentTree(this.comments()));
  protected readonly imageActions: readonly ContentImageAction[] = [
    { id: 'open-content', label: this.copy.openContent, icon: 'eye' },
    { id: 'remove-item', label: this.copy.removeItem, icon: 'trash' },
  ];

  private readonly api = inject(ListsApiService);
  private readonly contentApi = inject(ContentApiService);
  private readonly session = inject(AuthSessionService);
  private readonly route = inject(ActivatedRoute);
  protected readonly router = inject(Router);
  private request?: Subscription;
  private commentsRequest?: Subscription;

  constructor() {
    this.route.paramMap.pipe(
      map((params) => params.get('listId') ?? ''),
      distinctUntilChanged(),
      takeUntilDestroyed(),
    ).subscribe((listId) => {
      if (!listId) {
        void this.router.navigateByUrl('/lists');
        return;
      }
      this.listId.set(listId);
      this.resetForListChange();
      this.load();
      this.loadComments(true);
    });
  }

  protected load(): void {
    this.request?.unsubscribe();
    this.status.set('loading');
    this.errorMessage.set('');
    const params = {
      page: this.page(),
      size: 30,
      type: this.type() ?? undefined,
      genre: this.genre() ?? undefined,
      watchStatus: this.watchStatus() ?? undefined,
      sortBy: this.sort(),
      sortDirection: this.sortDirection(),
    };
    const listId = this.listId();
    this.request = this.api.getDetail(listId, params).subscribe({
      next: (detail) => {
        this.detail.set(detail);
        const owner = detail.owner ?? null;
        this.owner.set(owner);
        this.canManage.set(owner?.id === this.currentUserId());
        this.status.set('ready');
      },
      error: (error: unknown) => {
        this.status.set('error');
        this.errorMessage.set(error instanceof HttpErrorResponse && error.status === 0
          ? this.homeCopy.actionConnectionError
          : this.homeCopy.genericError);
      },
    });
  }

  protected loadComments(reset = false): void {
    if (this.commentsLoading()) return;
    const nextPage = reset ? 1 : this.commentsPage() + 1;
    this.commentsLoading.set(true);
    this.commentsRequest?.unsubscribe();
    this.commentsRequest = this.api.getComments(this.listId(), nextPage).subscribe({
      next: (page) => {
        this.comments.update((current) => reset ? page.content : [...current, ...page.content]);
        this.commentsPage.set(page.page);
        this.commentsHasNext.set(page.hasNext);
        this.commentsError.set(false);
        this.commentsLoading.set(false);
      },
      error: () => { this.commentsError.set(true); this.commentsLoading.set(false); },
    });
  }

  protected selectType(type: ListContentType): void { this.type.set(type); this.activeMenu.set(null); this.resetFilters(); }
  protected selectGenre(genre: string | null): void { this.genre.set(genre); this.activeMenu.set(null); this.resetFilters(); }
  protected selectWatchStatus(status: ListWatchStatus): void { this.watchStatus.set(status); this.activeMenu.set(null); this.resetFilters(); }
  protected selectSort(sort: ListDetailSort): void { this.sort.set(sort); this.activeMenu.set(null); this.resetFilters(); }
  protected toggleDirection(): void { this.sortDirection.update((direction) => direction === 'asc' ? 'desc' : 'asc'); this.load(); }
  protected toggleMenu(menu: Exclude<DetailMenu, null>): void { this.activeMenu.update((active) => active === menu ? null : menu); }
  protected goToPage(page: number): void { this.page.set(Math.max(1, Math.min(this.totalPages(), page))); this.load(); window.scrollTo({ top: 0, behavior: 'smooth' }); }
  protected toggleReorder(): void { this.reorderMode.update((value) => !value); this.listMenuOpen.set(false); }
  protected toggleListMenu(): void { this.listMenuOpen.update((value) => !value); }
  protected openProgress(): void { void this.router.navigate(['/lists', this.listId(), 'progress']); this.listMenuOpen.set(false); }

  protected typeLabel(): string {
    const labels: Record<Exclude<ListContentType, null>, string> = {
      MOVIE: this.copy.movies, SERIES: this.copy.series, SEASON: this.copy.seasons, EPISODE: this.copy.episodes,
    };
    return this.type() ? labels[this.type()!] : this.copy.all;
  }

  protected sortLabel(): string {
    const labels: Record<ListDetailSort, string> = {
      position: this.copy.sortPosition,
      dateAdded: this.copy.sortDate,
      duration: this.copy.sortDuration,
      episodeAvgRating: this.copy.sortEpisodeRating,
      globalEpisodeAvgRating: this.copy.sortGlobalRating,
      contentAvgRating: this.copy.sortContentRating,
    };
    return labels[this.sort()];
  }

  protected statusLabel(): string {
    const labels: Record<Exclude<ListWatchStatus, null>, string> = {
      WATCHED: this.copy.watched,
      PARTIALLY_WATCHED: this.copy.partiallyWatched,
      UNWATCHED: this.copy.unwatched,
      UNKNOWN: this.copy.unknown,
    };
    return this.watchStatus() ? labels[this.watchStatus()!] : this.copy.allStatuses;
  }

  protected ratingFor(item: ListDetailItem): string | null {
    const rating = item.globalEpisodeAverageRating ?? item.contentAverageRating ?? item.card?.stats?.averageScore ?? null;
    return rating === null ? null : new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 }).format(rating);
  }

  protected ratingLabel(item: ListDetailItem): string {
    const rating = this.ratingFor(item);
    return rating ? `${this.homeCopy.communityAverage}: ${rating}` : '';
  }

  protected posterFor(item: ListDetailItem): string | null {
    const path = item.customPosterUrl || item.card?.customPosterUrl || item.card?.posterPath;
    if (!path || item.card?.previewStatus === 'UNAVAILABLE') return null;
    return /^https?:\/\//i.test(path) ? path : `https://image.tmdb.org/t/p/w342${path.startsWith('/') ? path : `/${path}`}`;
  }

  protected contentRoute(item: ListDetailItem): string[] | null {
    const card = item.card;
    if (!card) return item.nestedList ? ['/lists', item.nestedList.id] : null;
    const id = card.tmdbId || card.seriesTmdbId;
    if (!id) return null;
    if (card.type === 'MOVIE') return ['/content/movie', id];
    if (card.type === 'SERIES' || card.type === 'SEASON' || card.type === 'EPISODE') return ['/content/series', id];
    return null;
  }

  protected openImageAction(item: ListDetailItem, selection: ContentImageActionSelection): void {
    if (selection.action.id === 'open-content') {
      const route = this.contentRoute(item);
      if (route) void this.router.navigate(route);
    } else if (selection.action.id === 'remove-item' && this.canManage()) {
      this.deleteItem.set(item);
      this.activeImageMenu.set(null);
    }
  }

  protected toggleImageMenu(item: ListDetailItem, event: MouseEvent): void {
    event.stopPropagation();
    this.activeImageMenu.update((id) => id === item.id ? null : item.id);
  }

  protected statusText(item: ListDetailItem): string | null {
    const status = item.contentState?.watchStatus;
    if (status === 'WATCHED') return this.copy.watched;
    if (status === 'PARTIALLY_WATCHED') return this.copy.partiallyWatched;
    if (item.contentState?.inWatchlist) return this.copy.inWatchlist;
    return null;
  }

  protected dateLabel(value: string): string {
    return new Intl.DateTimeFormat('pt-BR', { day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(value));
  }

  protected durationLabel(minutes: number | null | undefined): string {
    if (minutes === null || minutes === undefined) return '0 min';
    const days = Math.floor(minutes / 1440);
    const hours = Math.floor(minutes % 1440 / 60);
    const remainder = minutes % 60;
    if (days) return `${days}d ${hours}h`;
    if (hours) return remainder ? `${hours}h ${remainder}min` : `${hours}h`;
    return `${remainder} min`;
  }

  protected listRuntime(): string { return this.durationLabel(this.detail()?.totalRuntimeMinutes); }
  protected updatedLabel(): string { return this.detail() ? this.copy.updated.replace('{date}', this.dateLabel(this.detail()!.updatedAt)) : ''; }
  protected pageLabel(): string { return this.copy.page.replace('{page}', String(this.page())).replace('{total}', String(this.totalPages())); }
  protected heroBackground(): string {
    const item = this.items().find((entry) => entry.customPosterUrl || entry.card?.customPosterUrl || entry.card?.posterPath);
    const path = item?.customPosterUrl || item?.card?.customPosterUrl || item?.card?.posterPath;
    const image = path
      ? `url("${/^https?:\/\//i.test(path) ? path.replace('/w342/', '/w1280/') : `https://image.tmdb.org/t/p/w1280${path.startsWith('/') ? path : `/${path}`}`}")`
      : 'radial-gradient(ellipse at 50% 20%, #303238 0%, #1c1c1d 68%)';
    return `linear-gradient(180deg, rgb(16 16 18 / 42%) 0%, rgb(16 16 18 / 62%) 58%, var(--color-surface) 100%), ${image}`;
  }
  protected visibilityLabel(visibility: ListVisibility): string {
    return visibility === 'PRIVATE' ? this.listCopy.private : visibility === 'FOLLOWERS' ? this.listCopy.followers : this.listCopy.public;
  }

  protected toggleLike(): void {
    const current = this.detail();
    if (!current) return;
    const liked = !current.likedByMe;
    this.api.setLiked(current.id, liked).subscribe({
      next: () => this.detail.update((value) => value ? { ...value, likedByMe: liked, likesCount: (value.likesCount ?? 0) + (liked ? 1 : -1) } : value),
      error: () => this.actionError.set(this.copy.actionError),
    });
  }

  protected copyLink(): void {
    const link = `${window.location.origin}/lists/${encodeURIComponent(this.listId())}`;
    void navigator.clipboard.writeText(link).then(() => {
      this.copied.set(true);
      window.setTimeout(() => this.copied.set(false), 1800);
    }).catch(() => this.actionError.set(this.copy.actionError));
    this.listMenuOpen.set(false);
  }

  protected openSharePreview(): void { this.shareDialogOpen.set(true); this.listMenuOpen.set(false); }
  protected shareLink(): string { return `${window.location.origin}/lists/${encodeURIComponent(this.listId())}`; }

  protected openEdit(): void {
    const current = this.detail();
    if (!current || !this.canManage()) return;
    this.editName.set(current.name);
    this.editDescription.set(current.description ?? '');
    this.editVisibility.set(current.visibility);
    this.editError.set('');
    this.editDialogOpen.set(true);
    this.listMenuOpen.set(false);
  }

  protected saveEdit(): void {
    const current = this.detail();
    const name = this.editName().trim();
    if (!current || !name || this.savingEdit()) return;
    this.savingEdit.set(true);
    this.editError.set('');
    this.api.updateList(current.id, {
      name,
      description: this.editDescription().trim(),
      visibility: this.editVisibility(),
    }).subscribe({
      next: () => { this.savingEdit.set(false); this.editDialogOpen.set(false); this.load(); },
      error: () => { this.savingEdit.set(false); this.editError.set(this.copy.updateError); },
    });
  }

  protected confirmDeleteList(): void {
    if (!this.canManage() || this.deletingList()) return;
    this.deletingList.set(true);
    this.api.deleteList(this.listId()).subscribe({
      next: () => { this.deletingList.set(false); this.deleteListDialogOpen.set(false); void this.router.navigateByUrl('/lists'); },
      error: () => { this.deletingList.set(false); this.actionError.set(this.copy.actionError); },
    });
  }

  protected confirmDeleteItem(): void {
    const item = this.deleteItem();
    if (!item || this.deletingItemId()) return;
    this.deletingItemId.set(item.id);
    this.api.removeItem(this.listId(), item.id).subscribe({
      next: () => { this.deletingItemId.set(null); this.deleteItem.set(null); this.load(); },
      error: () => { this.deletingItemId.set(null); this.actionError.set(this.copy.deleteError); },
    });
  }

  protected moveItem(item: ListDetailItem, offset: number): void {
    const pageContent = this.items();
    const currentIndex = pageContent.findIndex((entry) => entry.id === item.id);
    const targetIndex = currentIndex + offset;
    if (currentIndex < 0 || targetIndex < 0 || targetIndex >= pageContent.length) return;
    this.api.updateItem(this.listId(), item.id, { position: item.position + offset }).subscribe({
      next: () => this.load(),
      error: () => this.actionError.set(this.copy.actionError),
    });
  }

  protected updateEditName(event: Event): void { this.editName.set((event.target as HTMLInputElement).value); }
  protected updateEditDescription(event: Event): void { this.editDescription.set((event.target as HTMLTextAreaElement).value); }
  protected setVisibility(event: Event): void { this.editVisibility.set((event.target as HTMLSelectElement).value as ListVisibility); }
  protected setCommentText(event: Event): void { this.commentText.set((event.target as HTMLTextAreaElement).value); }

  protected submitComment(): void {
    const text = this.commentText().trim();
    if (!text || this.postingComment()) return;
    this.postingComment.set(true);
    this.api.createComment(this.listId(), { text, parentCommentId: this.replyingTo()?.id ?? null }).subscribe({
      next: (comment) => {
        this.comments.update((current) => [...current, comment]);
        this.detail.update((detail) => detail ? { ...detail, commentsCount: detail.commentsCount + 1 } : detail);
        this.commentText.set('');
        this.replyingTo.set(null);
        this.postingComment.set(false);
      },
      error: () => { this.postingComment.set(false); this.commentsError.set(true); },
    });
  }

  protected repliesTo(comment: ListComment): ListComment[] { return this.comments().filter((entry) => entry.parentCommentId === comment.id); }
  protected toggleReply(comment: ListComment): void { this.replyingTo.set(comment); this.commentText.set(''); }
  protected cancelReply(): void { this.replyingTo.set(null); this.commentText.set(''); }
  protected spoilerExpanded(comment: ListComment): boolean { return this.expandedSpoilers().has(comment.id); }
  protected toggleSpoiler(comment: ListComment): void {
    this.expandedSpoilers.update((current) => {
      const next = new Set(current);
      if (next.has(comment.id)) next.delete(comment.id); else next.add(comment.id);
      return next;
    });
  }

  protected handleCommentModeration(event: SocialActionMenuEvent): void {
    if (event.action !== 'blocked') return;
    const removedIds = new Set(this.comments().filter((comment) => comment.user.id === event.userId).map((comment) => comment.id));
    let changed = true;
    while (changed) {
      changed = false;
      for (const comment of this.comments()) {
        if (comment.parentCommentId && removedIds.has(comment.parentCommentId) && !removedIds.has(comment.id)) {
          removedIds.add(comment.id);
          changed = true;
        }
      }
    }
    this.comments.update((comments) => comments.filter((comment) => !removedIds.has(comment.id)));
    this.detail.update((detail) => detail ? {
      ...detail,
      commentsCount: Math.max(0, detail.commentsCount - removedIds.size),
    } : detail);
  }

  protected toggleCommentLike(comment: ListComment): void {
    const liked = !comment.likedByMe;
    this.contentApi.setCommentLike(comment.id, liked).subscribe({
      next: () => this.comments.update((current) => current.map((entry) => entry.id === comment.id
        ? { ...entry, likedByMe: liked, likesCount: Math.max(0, entry.likesCount + (liked ? 1 : -1)) }
        : entry)),
      error: () => this.commentsError.set(true),
    });
  }

  protected confirmDeleteComment(): void {
    const comment = this.commentDeleteTarget();
    if (!comment || this.deletingComment()) return;
    this.deletingComment.set(true);
    this.contentApi.deleteComment(comment.id).subscribe({
      next: () => {
        this.comments.update((items) => items.filter((item) => item.id !== comment.id && item.parentCommentId !== comment.id));
        this.detail.update((detail) => detail ? { ...detail, commentsCount: Math.max(0, detail.commentsCount - 1) } : detail);
        this.commentDeleteTarget.set(null);
        this.deletingComment.set(false);
      },
      error: () => { this.deletingComment.set(false); this.commentsError.set(true); },
    });
  }

  protected relativeDate(value: string): string {
    const minutes = Math.max(0, Math.floor((Date.now() - new Date(value).getTime()) / 60000));
    if (minutes < 1) return 'agora';
    if (minutes < 60) return `há ${minutes} min`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `há ${hours} h`;
    const days = Math.floor(hours / 24);
    if (days < 30) return `há ${days} d`;
    return this.dateLabel(value);
  }

  protected userAvatar(user: ListOwner): string | null { return user.profilePicture; }
  protected isOwnComment(comment: ListComment): boolean { return comment.user.id === this.currentUserId(); }

  private resetForListChange(): void {
    this.request?.unsubscribe();
    this.commentsRequest?.unsubscribe();
    this.detail.set(null);
    this.owner.set(null);
    this.canManage.set(false);
    this.status.set('loading');
    this.errorMessage.set('');
    this.page.set(1);
    this.type.set(null);
    this.genre.set(null);
    this.watchStatus.set(null);
    this.sort.set('position');
    this.sortDirection.set('asc');
    this.activeMenu.set(null);
    this.listMenuOpen.set(false);
    this.activeImageMenu.set(null);
    this.reorderMode.set(false);
    this.editDialogOpen.set(false);
    this.deleteListDialogOpen.set(false);
    this.deleteItem.set(null);
    this.deletingItemId.set(null);
    this.actionError.set('');
    this.comments.set([]);
    this.commentsPage.set(1);
    this.commentsHasNext.set(false);
    this.commentsLoading.set(false);
    this.commentsError.set(false);
    this.commentText.set('');
    this.replyingTo.set(null);
    this.expandedSpoilers.set(new Set());
    this.commentDeleteTarget.set(null);
  }

  private resetFilters(): void { this.page.set(1); this.load(); }
}
