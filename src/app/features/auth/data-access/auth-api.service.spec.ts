import '@angular/compiler';
import { HttpClient } from '@angular/common/http';
import { of } from 'rxjs';
import { describe, expect, it, vi } from 'vitest';
import { AuthApiService } from './auth-api.service';

describe('AuthApiService registration', () => {
  it('posts the supported registration fields to the relative API path', () => {
    const http = { post: vi.fn().mockReturnValue(of(undefined)) };
    const ServiceWithHttp = AuthApiService as unknown as new (
      http: unknown,
    ) => AuthApiService;
    const service = new ServiceWithHttp(http as unknown as HttpClient);
    const payload = {
      username: 'maria.silva',
      name: 'Maria Silva',
      email: 'maria@example.com',
      password: 'SecurePass1',
    };

    service.register(payload).subscribe();

    expect(http.post).toHaveBeenCalledWith('/api/v1/auth/register', payload);
  });
});
