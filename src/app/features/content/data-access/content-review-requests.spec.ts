import '@angular/compiler';
import { of } from 'rxjs';
import { describe, expect, it, vi } from 'vitest';
import { ContentApiService } from './content-api.service';

describe('Content opinion request contracts', () => {
  it.each([null, 0, 7])('uses the season rating PUT with expected version %s', expectedVersion => {
    const http = { put: vi.fn().mockReturnValue(of({ score: 8, version: 8 })) };
    const service = new ContentApiService(http as never) as any;
    service.setContentRating('season/id', 8, expectedVersion).subscribe();
    expect(http.put).toHaveBeenCalledWith('/api/v1/contents/season%2Fid/my-rating', { score: 8, expectedVersion });
  });
  it('patches an existing diary opinion without content, watch count, or date changes', () => {
    const http = { patch: vi.fn().mockReturnValue(of({})) };
    const service = new ContentApiService(http as never);
    service.updateDiaryEntry('entry/id', { score: 8, comment: 'Editada' }).subscribe();
    const [url, body] = http.patch.mock.calls[0];
    expect(url).toBe('/api/v1/diary/entry%2Fid');
    expect(JSON.parse(JSON.stringify(body))).toEqual({ score: 8, comment: 'Editada' });
  });
});
