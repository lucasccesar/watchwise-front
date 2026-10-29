import '@angular/compiler';
import { HttpClient, HttpParams } from '@angular/common/http';
import { of } from 'rxjs';
import { describe, expect, it, vi } from 'vitest';
import { TrendingApiService } from './trending-api.service';

describe('TrendingApiService', () => {
  it('requests both sections with the supported initial page size', () => {
    const http = { get: vi.fn().mockReturnValue(of({})) };
    const service = new TrendingApiService(http as unknown as HttpClient);

    service.getTrending('week').subscribe();

    const [url, options] = http.get.mock.calls[0] as [string, { params: HttpParams }];
    expect(url).toBe('/api/v1/trending');
    expect(options.params.toString()).toBe('timeWindow=week&size=12');
  });

  it('requests a single section using the published page and size parameters', () => {
    const http = { get: vi.fn().mockReturnValue(of({})) };
    const service = new TrendingApiService(http as unknown as HttpClient);

    service.getSection('MOVIE', 'day', 2).subscribe();

    const [url, options] = http.get.mock.calls[0] as [string, { params: HttpParams }];
    expect(url).toBe('/api/v1/trending/movie');
    expect(options.params.toString()).toBe('timeWindow=day&page=2&size=21');
  });
});
