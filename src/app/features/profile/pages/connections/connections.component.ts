import { Component, DestroyRef, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { EMPTY, Observable, combineLatest, of } from 'rxjs';
import { catchError, map, switchMap } from 'rxjs/operators';
import {
  ContentApiService,
  ContentPageResult,
  FollowingUser,
} from '../../../content/data-access/content-api.service';
import { ProfileApiService } from '../../data-access/profile-api.service';
import { SearchApiService } from '../../../search-content/data-access/search-api.service';
import { AuthSessionService } from '../../../../core/session/session.service';

type ConnectionsMode = 'followers' | 'following';

@Component({
  selector: 'app-profile-connections',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './connections.component.html',
  styleUrl: './connections.component.css',
})
export class ConnectionsComponent {
  private readonly destroyRef = inject(DestroyRef);
  private readonly route = inject(ActivatedRoute);
  private readonly contentApi = inject(ContentApiService);
  private readonly profileApi = inject(ProfileApiService);
  private readonly searchApi = inject(SearchApiService);
  private readonly session = inject(AuthSessionService);

  protected readonly mode = signal<ConnectionsMode>('followers');
  protected readonly username = signal('');
  protected readonly page = signal<ContentPageResult<FollowingUser> | null>(null);
  protected readonly status = signal<'loading' | 'ready' | 'error'>('loading');
  protected readonly unfollowingId = signal<string | null>(null);
  protected readonly errorMessage = signal('');

  constructor() {
    combineLatest([this.route.paramMap, this.route.data])
      .pipe(
        switchMap(([params, data]) => {
          const username = params.get('username') ?? '';
          const mode: ConnectionsMode = data['connectionsMode'] === 'following' ? 'following' : 'followers';
          this.username.set(username);
          this.mode.set(mode);
          this.page.set(null);
          this.status.set('loading');
          this.errorMessage.set('');
          return this.loadForUsername(username, mode, 1);
        }),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((result) => {
        if (!result) {
          this.status.set('error');
          return;
        }
        this.page.set(result);
        this.status.set('ready');
      });
  }

  protected title(): string {
    return this.mode() === 'followers' ? 'Seguidores' : 'Seguindo';
  }

  protected description(): string {
    return this.mode() === 'followers'
      ? `Pessoas que seguem @${this.username()}.`
      : `Pessoas que @${this.username()} segue.`;
  }

  protected retry(): void {
    this.status.set('loading');
    this.errorMessage.set('');
    this.loadForUsername(this.username(), this.mode(), this.page()?.page ?? 1)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((result) => {
        if (!result) {
          this.status.set('error');
          return;
        }
        this.page.set(result);
        this.status.set('ready');
      });
  }

  protected goToPage(pageNumber: number): void {
    const current = this.page();
    if (!current || pageNumber < 1 || pageNumber > current.totalPages || pageNumber === current.page) return;
    this.status.set('loading');
    this.loadForUsername(this.username(), this.mode(), pageNumber)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((result) => {
        if (!result) {
          this.status.set('error');
          return;
        }
        this.page.set(result);
        this.status.set('ready');
      });
  }

  protected unfollow(user: FollowingUser): void {
    if (this.mode() !== 'following' || this.unfollowingId()) return;
    this.unfollowingId.set(user.id);
    this.errorMessage.set('');
    this.profileApi.setFollow(user.id, false)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        catchError(() => {
          this.unfollowingId.set(null);
          this.errorMessage.set('Não foi possível deixar de seguir esta pessoa. Tente novamente.');
          return EMPTY;
        }),
      )
      .subscribe(() => {
        const current = this.page();
        this.unfollowingId.set(null);
        if (!current) return;
        if (current.content.length === 1 && current.page > 1) {
          this.goToPage(current.page - 1);
          return;
        }
        const totalElements = Math.max(0, current.totalElements - 1);
        const totalPages = Math.ceil(totalElements / Math.max(1, current.size));
        this.page.set({
          ...current,
          content: current.content.filter((entry) => entry.id !== user.id),
          totalElements,
          totalPages,
          hasNext: current.page < totalPages,
        });
      });
  }

  protected userInitial(user: FollowingUser): string {
    return (user.name?.trim() || user.username.trim()).charAt(0).toLocaleUpperCase('pt-BR') || '?';
  }

  private loadForUsername(
    username: string,
    mode: ConnectionsMode,
    pageNumber: number,
  ): Observable<ContentPageResult<FollowingUser> | null> {
    return this.resolveUserId(username).pipe(
      switchMap((userId) => {
        if (!userId) return of(null);
        const request = mode === 'followers'
          ? this.contentApi.getFollowers(userId, pageNumber)
          : this.contentApi.getFollowing(userId, pageNumber);
        return request;
      }),
      catchError(() => {
        this.errorMessage.set('Não foi possível carregar estas conexões. Tente novamente.');
        return of(null);
      }),
    );
  }

  private resolveUserId(username: string): Observable<string | null> {
    const normalizedUsername = username.toLocaleLowerCase('pt-BR');
    return this.session.ensureUser().pipe(
      switchMap((viewer) => {
        if (viewer?.username.toLocaleLowerCase('pt-BR') === normalizedUsername) return of(viewer.id);
        return this.searchApi.search(username, 'USER').pipe(
          map((results) => results.users.find(
            (user) => user.username.toLocaleLowerCase('pt-BR') === normalizedUsername,
          )?.id ?? null),
        );
      }),
    );
  }
}
