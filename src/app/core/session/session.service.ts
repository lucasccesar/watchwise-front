import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable, signal } from '@angular/core';
import { Observable, catchError, finalize, map, of, shareReplay, switchMap, tap } from 'rxjs';
import type { AuthenticatedUser } from '../../features/auth/data-access/auth-api.service';

export interface SessionUser {
  id: string;
  username: string;
  email: string;
  name?: string;
  profilePicture?: string | null;
}

interface CurrentUserResponse extends SessionUser {}

@Injectable({ providedIn: 'root' })
export class AuthSessionService {
  private readonly userState = signal<SessionUser | null>(null);
  private restoreRequest: Observable<SessionUser | null> | null = null;

  readonly user = this.userState.asReadonly();

  constructor(private readonly http: HttpClient) {}

  setUser(user: AuthenticatedUser): void {
    this.userState.set(user);
  }

  clear(): void {
    this.userState.set(null);
  }

  ensureUser(): Observable<SessionUser | null> {
    const currentUser = this.userState();
    if (currentUser) {
      return of(currentUser);
    }
    if (this.restoreRequest) {
      return this.restoreRequest;
    }

    const request = this.fetchCurrentUser().pipe(
      finalize(() => {
        if (this.restoreRequest === request) {
          this.restoreRequest = null;
        }
      }),
      shareReplay({ bufferSize: 1, refCount: false }),
    );
    this.restoreRequest = request;
    return request;
  }

  private fetchCurrentUser(): Observable<SessionUser | null> {
    return this.http.get<CurrentUserResponse>('/api/v1/users/me').pipe(
      catchError((error: unknown) => {
        if (!(error instanceof HttpErrorResponse) || error.status !== 401) {
          return of(null);
        }
        return this.http.post<void>('/api/v1/auth/refresh', null).pipe(
          switchMap(() => this.http.get<CurrentUserResponse>('/api/v1/users/me')),
          map((user) => user as SessionUser),
          catchError(() => of(null)),
        );
      }),
      tap((user) => this.userState.set(user)),
    );
  }
}
