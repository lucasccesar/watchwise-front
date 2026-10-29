import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';

export interface LoginRequest {
  identifier: string;
  password: string;
}

export interface RegisterRequest {
  username: string;
  name: string;
  email: string;
  password: string;
}

export interface AuthenticatedUser {
  id: string;
  username: string;
  email: string;
}

@Injectable({ providedIn: 'root' })
export class AuthApiService {
  constructor(private readonly http: HttpClient) {}

  login(credentials: LoginRequest): Observable<AuthenticatedUser> {
    return this.http.post<AuthenticatedUser>('/api/v1/auth/login', credentials);
  }

  loginWithGoogle(token: string): Observable<AuthenticatedUser> {
    return this.http.post<AuthenticatedUser>('/api/v1/auth/oauth/google', { token });
  }

  register(account: RegisterRequest): Observable<void> {
    return this.http.post<void>('/api/v1/auth/register', account);
  }

  logout(): Observable<void> {
    return this.http.post<void>('/api/v1/auth/logout', null);
  }
}
