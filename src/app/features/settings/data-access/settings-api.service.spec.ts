import '@angular/compiler';
import { HttpClient, HttpParams } from '@angular/common/http';
import { of } from 'rxjs';
import { expect, it, vi } from 'vitest';
import { SettingsApiService } from './settings-api.service';

it('reads the settings form and preserves the legacy and blocked-list requests', () => {
  const get = vi.fn((_url: string, _options?: {params: HttpParams}) => of({}));
  const service = new SettingsApiService({get} as unknown as HttpClient);

  service.getSettingsForm().subscribe();
  service.getSettings().subscribe();
  service.getBlockedUsers(2, 20).subscribe();

  expect(get.mock.calls.map(([url]) => url)).toEqual([
    '/api/v1/users/me/settings/form',
    '/api/v1/users/me/settings',
    '/api/v1/users/me/blocked',
  ]);
  expect(get.mock.calls[2][1]?.params.toString()).toBe('page=2&size=20');
});
