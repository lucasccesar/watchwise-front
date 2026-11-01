import '@angular/compiler';
import { of } from 'rxjs';
import { describe, expect, it, vi } from 'vitest';
import { ContentApiService } from './content-api.service';
describe('Content selection GET contracts', () => {
  it('reads series seasons and episodes using selection DTOs rather than creating content references', () => {
    const http = { get: vi.fn().mockReturnValue(of([])) };
    const service = new ContentApiService(http as never) as any;
    service.getSeriesSeasons('show/id').subscribe();
    service.getSeasonEpisodes('show/id', 2).subscribe();
    expect(http.get.mock.calls).toEqual([
      ['/api/v1/contents/selection/series/show%2Fid/seasons'],
      ['/api/v1/contents/selection/series/show%2Fid/seasons/2/episodes'],
    ]);
  });
});
