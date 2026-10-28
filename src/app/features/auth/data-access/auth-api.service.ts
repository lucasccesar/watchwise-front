import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

export interface LoginRequest {
  identifier: string;
  password: string;
}

export interface AuthenticatedUser {
  id: string;
  username: string;
  email: string;
}

@Injectable({ providedIn: 'root' })
export class AuthApiService {
  private readonly http = inject(HttpClient);

  login(credentials: LoginRequest): Observable<AuthenticatedUser> {
    return this.http.post<AuthenticatedUser>('/api/v1/auth/login', credentials);
  }

  loginWithGoogle(token: string): Observable<AuthenticatedUser> {
    return this.http.post<AuthenticatedUser>('/api/v1/auth/oauth/google', { token });
  }
}
