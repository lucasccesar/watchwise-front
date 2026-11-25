import '@angular/compiler';
import { HttpClient } from '@angular/common/http';
import { Injector, runInInjectionContext, signal } from '@angular/core';
import { config, of, Subject } from 'rxjs';
import { describe, expect, it, vi } from 'vitest';
import { AuthSessionService } from '../../../../core/session/session.service';
import { AppShellStateService } from '../../../../core/ui/app-shell-state.service';
import { ToastNotificationsService } from '../../../../shared/components/toast-notifications/toast-notifications.service';
import { HomeApiService } from '../../../home/data-access/home-api.service';
import { NotificationsApiService, type NotificationView, type NotificationViewPage } from '../../data-access/notifications-api.service';
import { NotificationsComponent } from './notifications.component';

class TestNotifications extends NotificationsComponent {
  readonly state = this.status;
  readonly banner = this.heroBackdropPath;
  readonly cards = this.notifications;
  readonly total = this.totalCount;
  readonly unread = this.unreadCount;
  readonly more = this.loadMore;
  readonly changeFilter = this.setFilter;
  readonly mark = this.markRead;
}

const item: NotificationView = {
  id: 'first', type: 'NEW_FOLLOWER', message: '', content: null, personTmdbId: null,
  isRead: false, createdAt: '2026-11-24T15:00:00', updatedAt: '2026-11-24T15:00:00',
  latestActor: null, targetType: null, targetId: null, interactionCount: null,
  contentCard: null, person: null, targetPreview: null,
};

const firstPage: NotificationViewPage = {
  content: [item], page: 1, size: 20, totalElements: 21, totalPages: 2, hasNext: true,
  totalNotifications: 21, unreadNotifications: 1,
};

function setup() {
  const backdrop = new Subject<{ latestWatchedBackdropPath: string | null }>();
  const list = new Subject<NotificationViewPage>();
  const api = {
    getBannerBackdrop: vi.fn(() => backdrop),
    getView: vi.fn(() => list),
    markAsRead: vi.fn(() => of(undefined)),
  };
  const home = { getHomeSummary: vi.fn(() => backdrop) };
  const injector = Injector.create({ providers: [
    { provide: AuthSessionService, useValue: { user: () => ({ id: 'viewer' }) } },
    { provide: AppShellStateService, useValue: { hasUnreadNotifications: signal(false) } },
    { provide: NotificationsApiService, useValue: api },
    { provide: HomeApiService, useValue: home },
    { provide: ToastNotificationsService, useValue: { error: vi.fn() } },
  ] });
  const component = runInInjectionContext(injector, () => new TestNotifications(api as unknown as NotificationsApiService));
  component.ngOnInit();
  return { component, list, backdrop, api, home, injector };
}

describe('Notifications banner', () => {
  it('uses the dedicated self endpoint and keeps an explicit null in the response', () => {
    const response = { latestWatchedBackdropPath: null };
    const get = vi.fn(() => of(response));
    const api = new NotificationsApiService({ get } as unknown as HttpClient);
    let result: unknown;
    api.getBannerBackdrop().subscribe(value => { result = value; });
    expect(result).toEqual(response);
    expect(get).toHaveBeenCalledExactlyOnceWith('/api/v1/users/me/summary/latest-watched-backdrop');
  });

  it.each([null, '/custom-backdrop.jpg'])('publishes a late backdrop %s independently of cards', path => {
    const { component, list, backdrop, api, home, injector } = setup();
    try {
      expect(api.getBannerBackdrop).toHaveBeenCalledExactlyOnceWith();
      expect(home.getHomeSummary).not.toHaveBeenCalled();
      expect(api.getView).toHaveBeenCalledExactlyOnceWith({ page: 1, size: 20 });
      expect(component.state()).toBe('loading');
      expect(component.banner()).toBeUndefined();
      list.next(firstPage);
      expect(component.state()).toBe('ready');
      expect(component.cards()).toEqual([item]);
      expect(component.total()).toBe(21);
      expect(component.unread()).toBe(1);
      expect(component.banner()).toBeUndefined();
      backdrop.next({ latestWatchedBackdropPath: path });
      expect(component.banner()).toBe(path);
    } finally { injector.destroy(); }
  });

  it('keeps the skeleton while only the backdrop is ready', () => {
    const { component, list, backdrop, injector } = setup();
    try {
      backdrop.next({ latestWatchedBackdropPath: '/early-backdrop.jpg' });
      expect(component.banner()).toBe('/early-backdrop.jpg');
      expect(component.state()).toBe('loading');
      expect(component.cards()).toEqual([]);
      list.next(firstPage);
      expect(component.state()).toBe('ready');
    } finally { injector.destroy(); }
  });

  it('keeps loading the list if the backdrop fails', async () => {
    const { component, list, backdrop, injector } = setup();
    const previousHandler = config.onUnhandledError;
    const reportError = vi.fn();
    const failure = new Error('backdrop unavailable');
    vi.useFakeTimers();
    config.onUnhandledError = reportError;
    try {
      backdrop.error(failure);
      await vi.runAllTimersAsync();
      expect(reportError).toHaveBeenCalledWith(failure);
      expect(component.banner()).toBeUndefined();
      expect(component.state()).toBe('loading');
      list.next(firstPage);
      expect(component.state()).toBe('ready');
      expect(component.cards()).toEqual([item]);
    } finally {
      config.onUnhandledError = previousHandler;
      vi.useRealTimers();
      injector.destroy();
    }
  });

  it('cancels the backdrop and list on destruction', () => {
    const { component, list, backdrop, injector } = setup();
    expect(backdrop.observed).toBe(true);
    expect(list.observed).toBe(true);
    injector.destroy();
    expect(backdrop.observed).toBe(false);
    expect(list.observed).toBe(false);
    backdrop.next({ latestWatchedBackdropPath: '/obsolete.jpg' });
    expect(component.banner()).toBeUndefined();
  });

  it('preserves pagination, filtering and the mark-read refresh', () => {
    const { component, list, backdrop, api, injector } = setup();
    try {
      list.next(firstPage);
      list.complete();
      const nextPage = new Subject<NotificationViewPage>();
      api.getView.mockReturnValueOnce(nextPage);
      component.more();
      expect(api.getView).toHaveBeenLastCalledWith({ page: 2, size: 20 });
      nextPage.next({ ...firstPage, page: 2, hasNext: false, content: [{ ...item, id: 'second' }] });
      expect(component.cards().map(card => card.id)).toEqual(['first', 'second']);
      component.changeFilter('unread');
      expect(api.getView).toHaveBeenLastCalledWith({ page: 1, size: 20, isRead: false });
      component.mark(item);
      expect(api.markAsRead).toHaveBeenCalledExactlyOnceWith('first');
      expect(api.getView).toHaveBeenLastCalledWith({ page: 1, size: 20, isRead: false });
      expect(api.getBannerBackdrop).toHaveBeenCalledTimes(1);
      expect(backdrop.observed).toBe(true);
    } finally { injector.destroy(); }
  });
});
