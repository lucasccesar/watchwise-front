import '@angular/compiler';
import { Observable, of, Subject } from 'rxjs';
import { describe, expect, it, vi } from 'vitest';
import { DiaryApiService } from './diary-api.service';

describe('Complete Diary reads', () => {
  it('reads authoritative series choices independently from Home summaries', () => {
    const options = [{ seriesTmdbId: 'old-show', title: 'Série antiga', entriesCount: 12 }];
    const http = { get: vi.fn().mockReturnValue(of(options)) };
    const service = new DiaryApiService(http as never) as any;
    let received;
    service.getDiarySeries('user/id').subscribe((value: unknown) => received = value);
    expect(http.get).toHaveBeenCalledWith('/api/v1/users/user%2Fid/diary/series');
    expect(received).toEqual(options);
  });
  it('retrieves history after the 1000th record and preserves the review filter on every page', () => {
    const first = Array.from({ length: 1000 }, (_, id) => ({ id: String(id) }));
    const http = { get: vi.fn().mockImplementation((_url, { params }) => of({
      content: params.get('page') === '1' ? first : [{ id: '1000' }],
      page: Number(params.get('page')), hasNext: params.get('page') === '1',
    })) };
    const service = new DiaryApiService(http as never) as any;
    let received: any[] = [];
    service.getAllDiaryEntries('viewer', true).subscribe((value: any[]) => received = value);
    expect(received).toHaveLength(1001);
    expect(received.at(-1).id).toBe('1000');
    expect(http.get.mock.calls.map(([, { params }]) => [params.get('page'), params.get('size'), params.get('hasReview')])).toEqual([['1', '1000', 'true'], ['2', '1000', 'true']]);
  });
  it('cancels an in-flight next page when its caller reloads or is destroyed', () => {
    const first = new Subject<any>();
    const cancelled = vi.fn();
    const next = new Observable(() => cancelled);
    const http = { get: vi.fn().mockReturnValueOnce(first).mockReturnValueOnce(next) };
    const service = new DiaryApiService(http as never) as any;
    const received = vi.fn();
    const request = service.getAllDiaryEntries('viewer').subscribe(received);
    first.next({ content: [{ id: 'old' }], page: 1, hasNext: true });
    first.complete();
    expect(http.get).toHaveBeenCalledTimes(2);
    request.unsubscribe();
    expect(cancelled).toHaveBeenCalledOnce();
    expect(received).not.toHaveBeenCalled();
  });
});
