import '@angular/compiler';
import { HttpErrorResponse } from '@angular/common/http';
import { Injector, runInInjectionContext } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { of, throwError } from 'rxjs';
import { describe, expect, it, vi } from 'vitest';
import { AuthSessionService } from '../../../../core/session/session.service';
import { ToastNotificationsService } from '../../../../shared/components/toast-notifications/toast-notifications.service';
import { applyOrderMoves, buildOrderMoves, ListsApiService, type ListOrderItem, type ListOrderPage } from '../../data-access/lists-api.service';
import { ListsComponent } from './lists.component';

function batch(prefix: number, count: number, revision: string, nextCursor: string | null): ListOrderPage {
  return {
    revision,
    items: Array.from({ length: count }, (_, index) => ({
      id: `list-${prefix + index + 1}`,
      position: prefix + index + 1,
      label: `List ${prefix + index + 1}`,
      thumbnailUrl: null,
      movable: true,
    })),
    nextCursor,
  };
}

function pageFromIds(ids: string[], revision: string, nextCursor: string | null): ListOrderPage {
  return {
    revision,
    items: ids.map((id, index): ListOrderItem => ({ id, position: index + 1, label: id, thumbnailUrl: null, movable: true })),
    nextCursor,
  };
}

describe('ListsComponent continuous reordering', () => {
  it('converts TMDB poster paths for order rows and preserves custom URLs', () => {
    const api = {
      getMyLists: vi.fn().mockReturnValue(of({ content: [], page: 1, size: 10, totalElements: 0, totalPages: 0, hasNext: false })),
      getOwnedListOrder: vi.fn().mockReturnValue(of(batch(0, 1, 'rev-1', null))),
    };
    const injector = Injector.create({ providers: [
      { provide: ActivatedRoute, useValue: { snapshot: { data: {} } } },
      { provide: AuthSessionService, useValue: { user: () => ({ id: 'viewer' }) } },
      { provide: Router, useValue: { navigateByUrl: vi.fn() } },
      { provide: ListsApiService, useValue: api },
      { provide: ToastNotificationsService, useValue: { success: vi.fn(), error: vi.fn() } },
    ] });
    const component = runInInjectionContext(injector, () => new ListsComponent()) as any;
    const row = batch(0, 1, 'rev-1', null).items[0];

    expect(component.orderThumbnailUrl({ ...row, thumbnailUrl: '/poster.jpg' })).toBe(
      'https://image.tmdb.org/t/p/w500/poster.jpg',
    );
    expect(component.orderThumbnailUrl({ ...row, thumbnailUrl: 'https://cdn.example/custom.jpg' })).toBe(
      'https://cdn.example/custom.jpg',
    );
  });

  it('loads one batch on entry and only fetches the next batch on demand', () => {
    const api = {
      getMyLists: vi.fn().mockReturnValue(of({ content: [], page: 1, size: 10, totalElements: 0, totalPages: 0, hasNext: false })),
      getOwnedListOrder: vi.fn().mockReturnValueOnce(of(batch(0, 30, 'rev-1', 'cursor-2')))
        .mockReturnValueOnce(of(batch(30, 30, 'rev-1', null))),
    };
    const injector = Injector.create({ providers: [
      { provide: ActivatedRoute, useValue: { snapshot: { data: {} } } },
      { provide: AuthSessionService, useValue: { user: () => ({ id: 'viewer' }) } },
      { provide: Router, useValue: { navigateByUrl: vi.fn() } },
      { provide: ListsApiService, useValue: api },
      { provide: ToastNotificationsService, useValue: { success: vi.fn(), error: vi.fn() } },
    ] });
    const component = runInInjectionContext(injector, () => new ListsComponent()) as any;

    component.toggleReorder();

    expect(api.getOwnedListOrder).toHaveBeenCalledTimes(1);
    expect(component.reorderDraft()).toHaveLength(30);
    expect(component.orderRevision()).toBe('rev-1');
    component.loadMoreOrder();
    expect(api.getOwnedListOrder).toHaveBeenNthCalledWith(2, 'cursor-2');
    expect(component.reorderDraft()).toHaveLength(60);
  });

  it('keeps the loaded rows after a next-batch error and retries the same cursor', () => {
    const api = {
      getMyLists: vi.fn().mockReturnValue(of({ content: [], page: 1, size: 10, totalElements: 0, totalPages: 0, hasNext: false })),
      getOwnedListOrder: vi.fn()
        .mockReturnValueOnce(of(batch(0, 30, 'rev-1', 'cursor-2')))
        .mockReturnValueOnce(throwError(() => new HttpErrorResponse({ status: 0 })))
        .mockReturnValueOnce(of(batch(30, 30, 'rev-1', null))),
    };
    const injector = Injector.create({ providers: [
      { provide: ActivatedRoute, useValue: { snapshot: { data: {} } } },
      { provide: AuthSessionService, useValue: { user: () => ({ id: 'viewer' }) } },
      { provide: Router, useValue: { navigateByUrl: vi.fn() } },
      { provide: ListsApiService, useValue: api },
      { provide: ToastNotificationsService, useValue: { success: vi.fn(), error: vi.fn() } },
    ] });
    const component = runInInjectionContext(injector, () => new ListsComponent()) as any;
    component.toggleReorder();
    const initialIds = component.reorderDraft().map((item: ListOrderItem) => item.id);

    component.loadMoreOrder();

    expect(component.reorderDraft().map((item: ListOrderItem) => item.id)).toEqual(initialIds);
    expect(component.reorderError()).toBe(true);
    expect(component.orderCursor()).toBe('cursor-2');
    component.retryLoad();
    expect(api.getOwnedListOrder).toHaveBeenNthCalledWith(3, 'cursor-2');
    expect(component.reorderDraft()).toHaveLength(60);
    expect(component.reorderError()).toBe(false);
  });

  it('cancels a changed order draft without sending a PATCH', () => {
    const api = {
      getMyLists: vi.fn().mockReturnValue(of({ content: [], page: 1, size: 10, totalElements: 0, totalPages: 0, hasNext: false })),
      getOwnedListOrder: vi.fn().mockReturnValue(of(batch(0, 30, 'rev-1', 'cursor-2'))),
      updateOwnedListOrder: vi.fn().mockReturnValue(of({ revision: 'rev-2' })),
    };
    const injector = Injector.create({ providers: [
      { provide: ActivatedRoute, useValue: { snapshot: { data: {} } } },
      { provide: AuthSessionService, useValue: { user: () => ({ id: 'viewer' }) } },
      { provide: Router, useValue: { navigateByUrl: vi.fn() } },
      { provide: ListsApiService, useValue: api },
      { provide: ToastNotificationsService, useValue: { success: vi.fn(), error: vi.fn() } },
    ] });
    const component = runInInjectionContext(injector, () => new ListsComponent()) as any;
    component.toggleReorder();
    component.moveList('list-2', 1);

    component.cancelReorder();

    expect(api.updateOwnedListOrder).not.toHaveBeenCalled();
    expect(component.reorderMode()).toBe(false);
  });

  it('saves a drag across loaded batches as one anchored update', () => {
    const api = {
      getMyLists: vi.fn().mockReturnValue(of({ content: [], page: 1, size: 10, totalElements: 0, totalPages: 0, hasNext: false })),
      getOwnedListOrder: vi.fn().mockReturnValueOnce(of(batch(0, 30, 'rev-1', 'cursor-2')))
        .mockReturnValueOnce(of(batch(30, 30, 'rev-1', null))),
      updateOwnedListOrder: vi.fn().mockReturnValue(of({ revision: 'rev-2' })),
    };
    const injector = Injector.create({ providers: [
      { provide: ActivatedRoute, useValue: { snapshot: { data: {} } } },
      { provide: AuthSessionService, useValue: { user: () => ({ id: 'viewer' }) } },
      { provide: Router, useValue: { navigateByUrl: vi.fn() } },
      { provide: ListsApiService, useValue: api },
      { provide: ToastNotificationsService, useValue: { success: vi.fn(), error: vi.fn() } },
    ] });
    const component = runInInjectionContext(injector, () => new ListsComponent()) as any;
    component.toggleReorder();
    component.loadMoreOrder();

    const container = {};
    component.dropList({ previousIndex: 4, currentIndex: 40, previousContainer: container, container });
    component.saveReorder();

    expect(api.updateOwnedListOrder).toHaveBeenCalledWith({
      revision: 'rev-1',
      moves: [{ movedId: 'list-5', anchorId: 'list-42', side: 'BEFORE' }],
    });
  });

  it('saves at most 100 moves per request and keeps the remaining draft after a partial save', () => {
    const initialIds = Array.from({ length: 120 }, (_, index) => `list-${index + 1}`);
    const targetIds = [...initialIds].reverse();
    const moves = buildOrderMoves(initialIds, targetIds);
    const afterFirstBatch = applyOrderMoves(initialIds, moves.slice(0, 100));
    const responses = [
      ...Array.from({ length: 4 }, (_, index) => pageFromIds(initialIds.slice(index * 30, index * 30 + 30), 'rev-1', index < 3 ? `cursor-${index + 2}` : null)),
      ...Array.from({ length: 4 }, (_, index) => pageFromIds(afterFirstBatch.slice(index * 30, index * 30 + 30), 'rev-2', index < 3 ? `refresh-${index + 2}` : null)),
    ];
    let pageIndex = 0;
    const api = {
      getMyLists: vi.fn().mockReturnValue(of({ content: [], page: 1, size: 10, totalElements: 0, totalPages: 0, hasNext: false })),
      getOwnedListOrder: vi.fn().mockImplementation(() => of(responses[pageIndex++])),
      updateOwnedListOrder: vi.fn().mockReturnValueOnce(of({ revision: 'rev-2' })).mockReturnValueOnce(of({ revision: 'rev-3' })),
    };
    const injector = Injector.create({ providers: [
      { provide: ActivatedRoute, useValue: { snapshot: { data: {} } } },
      { provide: AuthSessionService, useValue: { user: () => ({ id: 'viewer' }) } },
      { provide: Router, useValue: { navigateByUrl: vi.fn() } },
      { provide: ListsApiService, useValue: api },
      { provide: ToastNotificationsService, useValue: { success: vi.fn(), error: vi.fn() } },
    ] });
    const component = runInInjectionContext(injector, () => new ListsComponent()) as any;
    component.toggleReorder();
    for (let index = 0; index < 3; index++) component.loadMoreOrder();
    component.reorderDraft.set([...component.reorderDraft()].reverse());

    component.saveReorder();

    expect(api.updateOwnedListOrder.mock.calls[0][0].moves).toHaveLength(100);
    expect(component.reorderInitialIds()).toEqual(afterFirstBatch);
    expect(component.reorderDraft().map((item: ListOrderItem) => item.id)).toEqual(targetIds);
    expect(component.orderRevision()).toBe('rev-2');
    component.saveReorder();
    expect(api.updateOwnedListOrder.mock.calls[1][0].moves.length).toBeLessThanOrEqual(100);
  });
});
