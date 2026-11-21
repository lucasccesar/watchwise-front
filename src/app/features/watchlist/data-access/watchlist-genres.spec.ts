import '@angular/compiler';
import { of } from 'rxjs';
import { describe, expect, it, vi } from 'vitest';
import { WatchlistApiService } from './watchlist-api.service';
describe('Watchlist page genre options', () => {
  it('receives the complete genre set in the single filtered page response', () => {
    const response = {
      content: [{ card: { genres: ['Drama'] } }],
      page: 1,
      size: 30,
      totalElements: 1,
      totalPages: 1,
      hasNext: false,
      availableGenres: ['Comédia', 'Drama', 'Terror'],
      aggregate: { totalCount: 1, movieCount: 1, seriesCount: 0, totalRuntimeMinutes: 120, upcomingCount: 0 },
    };
    const http = { get: vi.fn().mockReturnValue(of(response)) };
    const service = new WatchlistApiService(http as never);
    let received: typeof response | undefined;

    service.getView('viewer', {
      type: 'MOVIE', genre: 'Drama', status: 'ALL', sort: 'DATE_ADDED', direction: 'DESC', page: 1, size: 30,
    }).subscribe(value => received = value);

    expect(received?.availableGenres).toEqual(['Comédia', 'Drama', 'Terror']);
    expect(http.get).toHaveBeenCalledTimes(1);
  });
});
