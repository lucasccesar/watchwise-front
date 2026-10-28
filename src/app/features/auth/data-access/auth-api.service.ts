import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

export interface LoginRequest {
  identifier: string;
  password: string;
}

@Injectable({ providedIn: 'root' })
export class AuthApiService {
  private readonly http = inject(HttpClient);

  login(credentials: LoginRequest): Observable<void> {
    return this.http.post<void>('/api/v1/auth/login', credentials);
  }

  loginWithGoogle(token: string): Observable<void> {
    return this.http.post<void>('/api/v1/auth/oauth/google', { token });
  }
}
