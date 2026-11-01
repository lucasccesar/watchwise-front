import '@angular/compiler';
import { of } from 'rxjs';
import { describe, expect, it, vi } from 'vitest';
import { WatchlistApiService } from './watchlist-api.service';
describe('Complete watchlist genre choices', () => {
  it('collects distinct genres from every unfiltered page without coupling displayed filters', () => {
    const http = { get: vi.fn().mockImplementation((_url, { params }) => of({
      content: [{ card: { genres: params.get('page') === '1' ? ['Drama'] : ['Comédia', 'Drama'] } }],
      page: Number(params.get('page')), hasNext: params.get('page') === '1',
    })) };
    const service = new WatchlistApiService(http as never) as any;
    let genres;
    service.getGenreOptions('viewer').subscribe((value: string[]) => genres = value);
    expect(genres).toEqual(['Comédia', 'Drama']);
    expect(http.get.mock.calls.map(([, { params }]) => [params.get('page'), params.get('genre'), params.get('type'), params.get('status')])).toEqual([['1', null, null, 'ALL'], ['2', null, null, 'ALL']]);
  });
});
