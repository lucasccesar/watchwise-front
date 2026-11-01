import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { switchMap } from 'rxjs';
import { AuthSessionService } from '../../../../core/session/session.service';
import {
  ContentApiService,
  ContentComment,
  DiaryEntryRecord,
  SeriesPage,
} from '../../../content/data-access/content-api.service';
import { ProfileApiService, PublicUserProfile } from '../../../profile/data-access/profile-api.service';

type LoadState = 'loading' | 'ready' | 'error';

@Component({
  selector: 'app-diary-review-detail',
  standalone: true,
  imports: [RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './review-detail.component.html',
  styleUrl: './review-detail.component.css',
})
export class DiaryReviewDetailComponent {
  private readonly session = inject(AuthSessionService);
  protected readonly entry = signal<DiaryEntryRecord | null>(null);
  protected readonly comments = signal<ContentComment[]>([]);
  protected readonly allCommentsVisible = signal(false);
  protected readonly status = signal<LoadState>('loading');
  protected readonly commentsStatus = signal<LoadState>('loading');
  protected readonly errorMessage = signal('');
  protected readonly commentError = signal('');
  protected readonly commentDraft = signal('');
  protected readonly replyTo = signal<ContentComment | null>(null);
  protected readonly commentMenuId = signal<string | null>(null);
  protected readonly shareMenuOpen = signal(false);
  protected readonly copiedLink = signal(false);
  protected readonly pendingComments = signal(false);
  protected readonly backdrop = signal<string | null>(null);
  protected readonly parentTitle = signal('');
  protected readonly reviewerProfile = signal<PublicUserProfile | null>(null);
  protected readonly contentTitle = computed(() => {
    const entry = this.entry();
    return entry?.content?.type === 'EPISODE' || entry?.content?.type === 'SEASON'
      ? this.parentTitle() || entry.card?.title || 'Conteúdo'
      : entry?.card?.title || 'Conteúdo';
  });
  protected readonly currentUser = this.session.user;
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
  protected readonly contentRoute = computed(() => {
    const content = this.entry()?.content;
    if (!content) return ['/diary/reviews'];
    if (content.type === 'MOVIE' && content.tmdbId) return ['/content/movie', content.tmdbId];
    if (content.type === 'SERIES' && content.tmdbId) return ['/content/series', content.tmdbId];
    if ((content.type === 'EPISODE' || content.type === 'SEASON') && content.seriesTmdbId) {
      const season = content.seasonNumber ?? 1;
      if (content.type === 'EPISODE') {
        return ['/content/series', content.seriesTmdbId, 'season', String(season), 'episode', String(content.episodeNumber ?? 1)];
      }
      return ['/content/series', content.seriesTmdbId, 'season', String(season)];
    }
    return ['/diary/reviews'];
  });

  protected reviewerReviewsRoute(): string[] {
    const entry = this.entry();
    if (!entry?.userId || entry.userId === this.currentUser()?.id) return ['/diary/reviews'];
    const username = this.reviewerProfile()?.username;
    return username ? ['/users', username, 'reviews'] : ['/diary/reviews'];
  }

  private readonly route = inject(ActivatedRoute);
  private readonly api = inject(ContentApiService);
  private readonly profileApi = inject(ProfileApiService);

  constructor() {
    this.route.paramMap.subscribe((params) => this.load(params.get('entryId') ?? ''));
  }

  protected posterUrl(): string | null {
    const entry = this.entry();
    const path = entry?.customPosterUrl || entry?.card?.customPosterUrl || entry?.card?.posterPath;
    if (!path) return null;
    return /^https?:\/\//i.test(path)
      ? path
      : `https://image.tmdb.org/t/p/w500${path.startsWith('/') ? path : `/${path}`}`;
  }

  protected backdropStyle(): string | null {
    const url = this.backdrop();
    return url ? `linear-gradient(180deg, rgba(17, 17, 19, .18) 0%, #111113 100%), url("${url}")` : null;
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

  protected initials(name: string | null | undefined): string {
    return (name ?? '').trim().split(/\s+/).slice(0, 2).map((word) => word[0] ?? '').join('').toLocaleUpperCase('pt-BR') || 'U';
  }

  protected watchedWithLabel(): string {
    const people = this.entry()?.watchedWith ?? [];
    const names = people.map((person) => person.name || person.username).filter(Boolean);
    return names.length ? `com ${names.join(', ')}` : '';
  }

  protected setCommentDraft(event: Event): void {
    this.commentDraft.set((event.target as HTMLTextAreaElement).value);
  }

  protected submitComment(event: SubmitEvent): void {
    event.preventDefault();
    const entry = this.entry();
    const text = this.commentDraft().trim();
    if (!entry || !text || this.pendingComments()) return;
    this.pendingComments.set(true);
    this.commentError.set('');
    const parentCommentId = this.replyTo()?.id ?? null;
    this.api.createDiaryComment(entry.id, { text, parentCommentId }).subscribe({
      next: (comment) => {
        this.comments.update((items) => [...items, comment]);
        this.entry.update((current) => current ? { ...current, commentsCount: (current.commentsCount ?? 0) + 1 } : current);
        this.commentDraft.set('');
        this.replyTo.set(null);
        this.pendingComments.set(false);
      },
      error: (error: unknown) => {
        this.commentError.set(this.requestError(error));
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
      error: () => this.entry.update((current) => current ? {
        ...current,
        likedByMe: !nextLiked,
        likesCount: Math.max(0, (current.likesCount ?? 0) + (nextLiked ? -1 : 1)),
      } : current),
    });
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
    const input = document.querySelector<HTMLTextAreaElement>('#diary-review-comment');
    input?.focus();
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
      this.copiedLink.set(true);
    } catch {
      this.copiedLink.set(false);
    }
    this.shareMenuOpen.set(false);
  }

  protected async copyCommentLink(comment: ContentComment): Promise<void> {
    try {
      await navigator.clipboard.writeText(`${window.location.href}#comment-${comment.id}`);
    } catch {
      this.commentError.set('Não foi possível copiar o link agora.');
    }
    this.commentMenuId.set(null);
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
    this.backdrop.set(/^https?:\/\//i.test(path) ? path : `https://image.tmdb.org/t/p/w1280${path.startsWith('/') ? path : `/${path}`}`);
  }

  private requestError(error: unknown): string {
    if (error instanceof HttpErrorResponse && error.status === 0) return 'Não foi possível conectar ao serviço. Tente novamente.';
    if (error instanceof HttpErrorResponse && error.status === 404) return 'Esta resenha não está disponível.';
    return 'Não foi possível carregar esta tela agora. Tente novamente.';
  }
}
