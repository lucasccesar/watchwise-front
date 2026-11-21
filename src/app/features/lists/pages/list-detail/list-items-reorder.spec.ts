import '@angular/compiler';
import { HttpErrorResponse } from '@angular/common/http';
import { Injector, runInInjectionContext } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { of, throwError } from 'rxjs';
import { describe, expect, it, vi } from 'vitest';
import { AuthSessionService } from '../../../../core/session/session.service';
import { ToastNotificationsService } from '../../../../shared/components/toast-notifications/toast-notifications.service';
import { ContentApiService } from '../../../content/data-access/content-api.service';
import { applyOrderMoves, buildOrderMoves, ListsApiService, type ListDetailView, type ListOrderItem, type ListOrderPage } from '../../data-access/lists-api.service';
import { ListDetailComponent } from './list-detail.component';

function batch(prefix: number, count: number, revision: string, nextCursor: string | null): ListOrderPage {
  return {
    revision,
    items: Array.from({ length: count }, (_, index) => ({
      id: `item-${prefix + index + 1}`,
      position: prefix + index + 1,
      label: `Item ${prefix + index + 1}`,
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

const detail: ListDetailView = {
  id: 'list-1',
  owner: { id: 'viewer', username: 'viewer', name: 'Viewer', profilePicture: null },
  name: 'List',
  description: null,
  visibility: 'PRIVATE',
  watchedPercentage: null,
  createdAt: '2026-01-01T00:00:00Z',
  updatedAt: '2026-01-01T00:00:00Z',
  likesCount: 0,
  likedByMe: false,
  itemsCount: 60,
  commentsCount: 0,
  totalRuntimeMinutes: 0,
  backdropPath: null,
  rank: 1,
  itemScope: 'MOVIE_OR_SERIES',
  items: { content: [], page: 1, size: 30, totalElements: 60, totalPages: 2, hasNext: true },
};

function createComponent(api: Record<string, unknown>): ListDetailComponent {
  const injector = Injector.create({ providers: [
    { provide: ActivatedRoute, useValue: { paramMap: of({ get: (key: string) => key === 'listId' ? 'list-1' : null }) } },
    { provide: AuthSessionService, useValue: { user: () => ({ id: 'viewer' }) } },
    { provide: Router, useValue: { navigateByUrl: vi.fn(), navigate: vi.fn() } },
    { provide: ListsApiService, useValue: api },
    { provide: ContentApiService, useValue: {} },
    { provide: ToastNotificationsService, useValue: { success: vi.fn(), error: vi.fn() } },
  ] });
  return runInInjectionContext(injector, () => new ListDetailComponent());
}

describe('ListDetailComponent continuous item reordering', () => {
  it('converts TMDB poster paths for order rows and preserves custom URLs', () => {
    const api = {
      getDetail: vi.fn().mockReturnValue(of(detail)),
      getComments: vi.fn().mockReturnValue(of({ content: [], page: 1, size: 20, totalElements: 0, totalPages: 0, hasNext: false })),
    };
    const component = createComponent(api) as any;
    const item = { id: 'item-1', position: 1, label: 'Item 1', thumbnailUrl: '/poster.jpg', movable: true };

    expect(component.orderThumbnailUrl(item)).toBe('https://image.tmdb.org/t/p/w342/poster.jpg');
    expect(component.orderThumbnailUrl({ ...item, thumbnailUrl: 'https://cdn.example/custom.jpg' })).toBe(
      'https://cdn.example/custom.jpg',
    );
  });

  it('loads only the first order batch until the user advances', () => {
    const api = {
      getDetail: vi.fn().mockReturnValue(of(detail)),
      getComments: vi.fn().mockReturnValue(of({ content: [], page: 1, size: 20, totalElements: 0, totalPages: 0, hasNext: false })),
      getListItemsOrder: vi.fn().mockReturnValueOnce(of(batch(0, 30, 'rev-1', 'cursor-2')))
        .mockReturnValueOnce(of(batch(30, 30, 'rev-1', null))),
    };
    const component = createComponent(api) as any;

    component.toggleReorder();

    expect(api.getListItemsOrder).toHaveBeenCalledTimes(1);
    expect(api.getListItemsOrder).toHaveBeenCalledWith('list-1', null);
    expect(component.reorderDraft()).toHaveLength(30);
    component.loadMoreOrder();
    expect(api.getListItemsOrder).toHaveBeenNthCalledWith(2, 'list-1', 'cursor-2');
    expect(component.reorderDraft()).toHaveLength(60);
  });

  it('keeps the loaded rows after a next-batch error and retries the same cursor', () => {
    const api = {
      getDetail: vi.fn().mockReturnValue(of(detail)),
      getComments: vi.fn().mockReturnValue(of({ content: [], page: 1, size: 20, totalElements: 0, totalPages: 0, hasNext: false })),
      getListItemsOrder: vi.fn()
        .mockReturnValueOnce(of(batch(0, 30, 'rev-1', 'cursor-2')))
        .mockReturnValueOnce(throwError(() => new HttpErrorResponse({ status: 0 })))
        .mockReturnValueOnce(of(batch(30, 30, 'rev-1', null))),
    };
    const component = createComponent(api) as any;
    component.toggleReorder();
    const initialIds = component.reorderDraft().map((item: { id: string }) => item.id);

    component.loadMoreOrder();

    expect(component.reorderDraft().map((item: { id: string }) => item.id)).toEqual(initialIds);
    expect(component.reorderError()).toBe(true);
    expect(component.orderCursor()).toBe('cursor-2');
    component.loadMoreOrder();
    expect(api.getListItemsOrder).toHaveBeenNthCalledWith(3, 'list-1', 'cursor-2');
    expect(component.reorderDraft()).toHaveLength(60);
    expect(component.reorderError()).toBe(false);
  });

  it('cancels a changed item draft without sending a PATCH', () => {
    const api = {
      getDetail: vi.fn().mockReturnValue(of(detail)),
      getComments: vi.fn().mockReturnValue(of({ content: [], page: 1, size: 20, totalElements: 0, totalPages: 0, hasNext: false })),
      getListItemsOrder: vi.fn().mockReturnValue(of(batch(0, 30, 'rev-1', 'cursor-2'))),
      reorderListItems: vi.fn().mockReturnValue(of({ revision: 'rev-2' })),
    };
    const component = createComponent(api) as any;
    component.toggleReorder();
    component.moveOrderItem('item-2', 1);

    component.cancelItemOrder();

    expect(api.reorderListItems).not.toHaveBeenCalled();
    expect(component.reorderMode()).toBe(false);
  });

  it('saves a cross-batch drag using one revision-checked anchor request', () => {
    const api = {
      getDetail: vi.fn().mockReturnValue(of(detail)),
      getComments: vi.fn().mockReturnValue(of({ content: [], page: 1, size: 20, totalElements: 0, totalPages: 0, hasNext: false })),
      getListItemsOrder: vi.fn().mockReturnValueOnce(of(batch(0, 30, 'rev-1', 'cursor-2')))
        .mockReturnValueOnce(of(batch(30, 30, 'rev-1', null))),
      reorderListItems: vi.fn().mockReturnValue(of({ revision: 'rev-2' })),
    };
    const component = createComponent(api) as any;
    component.toggleReorder();
    component.loadMoreOrder();

    const container = {};
    component.dropOrderItem({ previousIndex: 4, currentIndex: 40, previousContainer: container, container });
    component.saveItemOrder();

    expect(api.reorderListItems).toHaveBeenCalledWith('list-1', {
      revision: 'rev-1',
      moves: [{ movedId: 'item-5', anchorId: 'item-42', side: 'BEFORE' }],
    });
  });

  it('does not let a drag cross an inaccessible nested-list placeholder', () => {
    const first = batch(0, 5, 'rev-1', null);
    first.items[2] = { ...first.items[2], label: null, thumbnailUrl: null, movable: false };
    const api = {
      getDetail: vi.fn().mockReturnValue(of(detail)),
      getComments: vi.fn().mockReturnValue(of({ content: [], page: 1, size: 20, totalElements: 0, totalPages: 0, hasNext: false })),
      getListItemsOrder: vi.fn().mockReturnValue(of(first)),
    };
    const component = createComponent(api) as any;
    component.toggleReorder();
    const initial = component.reorderDraft().map((item: { id: string }) => item.id);
    const container = {};

    component.dropOrderItem({ previousIndex: 1, currentIndex: 3, previousContainer: container, container });

    expect(component.reorderDraft().map((item: { id: string }) => item.id)).toEqual(initial);
  });

  it('discards a stale cursor draft and reloads the latest revision after a conflict', () => {
    const api = {
      getDetail: vi.fn().mockReturnValue(of(detail)),
      getComments: vi.fn().mockReturnValue(of({ content: [], page: 1, size: 20, totalElements: 0, totalPages: 0, hasNext: false })),
      getListItemsOrder: vi.fn()
        .mockReturnValueOnce(of(batch(0, 30, 'rev-1', 'cursor-2')))
        .mockReturnValueOnce(throwError(() => new HttpErrorResponse({ status: 409 })))
        .mockReturnValueOnce(of(batch(0, 30, 'rev-2', 'fresh-cursor'))),
    };
    const component = createComponent(api) as any;
    component.toggleReorder();
    component.moveOrderItem('item-2', 1);
    component.loadMoreOrder();

    expect(api.getListItemsOrder).toHaveBeenNthCalledWith(3, 'list-1', null);
    expect(component.orderRevision()).toBe('rev-2');
    expect(component.reorderDraft().map((item: { id: string }) => item.id)).toEqual(batch(0, 30, 'rev-2', 'fresh-cursor').items.map((item) => item.id));
    expect(component.reorderHasChanges()).toBe(false);
  });

  it('saves at most 100 item moves per request and keeps the remaining draft after a partial save', () => {
    const initialIds = Array.from({ length: 120 }, (_, index) => `item-${index + 1}`);
    const targetIds = [...initialIds].reverse();
    const moves = buildOrderMoves(initialIds, targetIds);
    const afterFirstBatch = applyOrderMoves(initialIds, moves.slice(0, 100));
    const responses = [
      ...Array.from({ length: 4 }, (_, index) => pageFromIds(initialIds.slice(index * 30, index * 30 + 30), 'rev-1', index < 3 ? `cursor-${index + 2}` : null)),
      ...Array.from({ length: 4 }, (_, index) => pageFromIds(afterFirstBatch.slice(index * 30, index * 30 + 30), 'rev-2', index < 3 ? `refresh-${index + 2}` : null)),
    ];
    let pageIndex = 0;
    const api = {
      getDetail: vi.fn().mockReturnValue(of(detail)),
      getComments: vi.fn().mockReturnValue(of({ content: [], page: 1, size: 20, totalElements: 0, totalPages: 0, hasNext: false })),
      getListItemsOrder: vi.fn().mockImplementation(() => of(responses[pageIndex++])),
      reorderListItems: vi.fn().mockReturnValueOnce(of({ revision: 'rev-2' })).mockReturnValueOnce(of({ revision: 'rev-3' })),
    };
    const component = createComponent(api) as any;
    component.toggleReorder();
    for (let index = 0; index < 3; index++) component.loadMoreOrder();
    component.reorderDraft.set([...component.reorderDraft()].reverse());

    component.saveItemOrder();

    expect(api.reorderListItems.mock.calls[0][1].moves).toHaveLength(100);
    expect(component.reorderInitialIds()).toEqual(afterFirstBatch);
    expect(component.reorderDraft().map((item: ListOrderItem) => item.id)).toEqual(targetIds);
    expect(component.orderRevision()).toBe('rev-2');
    component.saveItemOrder();
    expect(api.reorderListItems.mock.calls[1][1].moves.length).toBeLessThanOrEqual(100);
  });
});
