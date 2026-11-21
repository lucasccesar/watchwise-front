import '@angular/compiler';
import { of } from 'rxjs';
import { describe, expect, it, vi } from 'vitest';
import { ListsApiService, applyOrderMoves, buildOrderMoves } from './lists-api.service';

describe('list order API', () => {
  it('requests the first and next owned-list batches using the order cursor', () => {
    const http = { get: vi.fn().mockReturnValue(of({})) };
    const api = new ListsApiService(http as never);

    api.getOwnedListOrder();
    api.getOwnedListOrder('cursor/next');

    expect(http.get).toHaveBeenNthCalledWith(1, '/api/v1/users/me/lists/order', {
      params: expect.objectContaining({ get: expect.any(Function) }),
    });
    expect(http.get.mock.calls[0][1].params.get('size')).toBe('30');
    expect(http.get.mock.calls[0][1].params.get('cursor')).toBeNull();
    expect(http.get.mock.calls[1][1].params.get('cursor')).toBe('cursor/next');
  });

  it('patches a list item order with anchor-based moves and its revision', () => {
    const http = { patch: vi.fn().mockReturnValue(of({ revision: 'next' })) };
    const api = new ListsApiService(http as never);
    const request = { revision: 'rev-1', moves: [{ movedId: 'item-5', anchorId: 'item-40', side: 'AFTER' as const }] };

    api.reorderListItems('list/a', request);

    expect(http.patch).toHaveBeenCalledWith('/api/v1/lists/list%2Fa/items/order', request);
  });
});

describe('buildOrderMoves', () => {
  it('produces an anchor move to reorder a row from one loaded batch to another', () => {
    const initial = Array.from({ length: 60 }, (_, index) => `item-${index + 1}`);
    const desired = [...initial];
    const [moved] = desired.splice(4, 1);
    desired.splice(40, 0, moved);

    expect(buildOrderMoves(initial, desired)).toEqual([
      { movedId: 'item-5', anchorId: 'item-42', side: 'BEFORE' },
    ]);
  });

  it('reproduces multi-move permutations, including a moved prefix', () => {
    const initial = ['A', 'B', 'C', 'D'];
    const desired = ['D', 'C', 'A', 'B'];
    const moves = buildOrderMoves(initial, desired);

    expect(applyOrderMoves(initial, moves)).toEqual(desired);
  });

  it('reproduces every permutation of a five-item loaded sequence', () => {
    const initial = ['A', 'B', 'C', 'D', 'E'];
    const permutations = (items: string[]): string[][] => items.length === 0
      ? [[]]
      : items.flatMap((item, index) => permutations(items.filter((_, itemIndex) => itemIndex !== index).map((rest) => rest)).map((tail) => [item, ...tail]));

    for (const desired of permutations(initial)) {
      expect(applyOrderMoves(initial, buildOrderMoves(initial, desired))).toEqual(desired);
    }
  });

  it('keeps inaccessible nested-list rows out of move anchors and forbids crossing them', () => {
    const initial = ['A', 'private-list', 'B', 'C'];
    const desired = ['A', 'private-list', 'C', 'B'];
    const moves = buildOrderMoves(initial, desired, ['A', 'B', 'C']);

    expect(applyOrderMoves(initial, moves)).toEqual(desired);
    expect(moves.every(({ movedId, anchorId }) => movedId !== 'private-list' && anchorId !== 'private-list')).toBe(true);
    expect(() => buildOrderMoves(initial, ['A', 'B', 'private-list', 'C'], ['A', 'B', 'C'])).toThrow(RangeError);
  });
});
