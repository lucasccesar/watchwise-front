import '@angular/compiler';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Subject, of, throwError } from 'rxjs';
import { describe, expect, it, vi } from 'vitest';
import { AuthSessionService } from './session.service';

const path = '/api/v1/users/me/session';
const user = {
  id: 'viewer', username: 'viewer', email: 'viewer@example.test', name: 'Viewer',
  description: null, profilePicture: null, banner: null, isProfilePublic: false,
  preferredLanguage: 'pt-BR', preferredRegion: 'BR',
};

function setup() {
  const http = { get: vi.fn(), post: vi.fn() };
  const service = new AuthSessionService(http as unknown as HttpClient);
  return { http, service };
}

describe('AuthSessionService restoration', () => {
  it('shares restoration and reuses identity in memory on subsequent navigation', () => {
    const { http, service } = setup();
    const response = new Subject<typeof user>();
    http.get.mockReturnValue(response);
    const first = vi.fn();
    const second = vi.fn();
    service.ensureUser().subscribe(first);
    service.ensureUser().subscribe(second);
    expect(http.get).toHaveBeenCalledExactlyOnceWith(path);
    response.next(user);
    response.complete();
    expect(first).toHaveBeenCalledWith(user);
    expect(second).toHaveBeenCalledWith(user);
    service.ensureUser().subscribe(value => expect(value).toEqual(user));
    expect(http.get).toHaveBeenCalledTimes(1);
    expect(http.post).not.toHaveBeenCalled();
  });

  it('retries the same identity route after the existing refresh', () => {
    const { http, service } = setup();
    http.get.mockReturnValueOnce(throwError(() => new HttpErrorResponse({ status: 401 })))
      .mockReturnValueOnce(of(user));
    http.post.mockReturnValue(of(undefined));
    service.ensureUser().subscribe(value => expect(value).toEqual(user));
    expect(http.get.mock.calls).toEqual([[path], [path]]);
    expect(http.post).toHaveBeenCalledExactlyOnceWith('/api/v1/auth/refresh', null);
  });

  it('returns no identity if refresh fails and avoids refresh for other errors', () => {
    const { http, service } = setup();
    http.get.mockReturnValueOnce(throwError(() => new HttpErrorResponse({ status: 401 })))
      .mockReturnValueOnce(throwError(() => new HttpErrorResponse({ status: 503 })));
    http.post.mockReturnValue(throwError(() => new HttpErrorResponse({ status: 401 })));
    const values = vi.fn();
    service.ensureUser().subscribe(values);
    service.ensureUser().subscribe(values);
    expect(values.mock.calls).toEqual([[null], [null]]);
    expect(http.get.mock.calls).toEqual([[path], [path]]);
    expect(http.post).toHaveBeenCalledTimes(1);
    expect(service.user()).toBeNull();
  });

  it('reads a different identity after clearing and preserves updates in memory', () => {
    const { http, service } = setup();
    const next = { ...user, id: 'other', username: 'other' };
    http.get.mockReturnValueOnce(of(user)).mockReturnValueOnce(of(next));
    service.ensureUser().subscribe();
    service.updateUser({ ...user, name: 'Updated' });
    expect(service.user()?.name).toBe('Updated');
    service.clear();
    expect(service.user()).toBeNull();
    service.ensureUser().subscribe();
    expect(service.user()).toEqual(next);
    expect(http.get.mock.calls).toEqual([[path], [path]]);
  });
});
