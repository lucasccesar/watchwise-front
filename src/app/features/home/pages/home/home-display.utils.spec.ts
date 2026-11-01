import { describe, expect, it } from 'vitest';
import { formatHomeHeroDate, homeContentRoute } from './home-display.utils';

describe('formatHomeHeroDate', () => {
  it('formats the supplied local calendar date in pt-BR, independent of the API', () => {
    expect(formatHomeHeroDate(new Date(2026, 10, 1, 0, 5))).toBe('Domingo, 1 de novembro');
  });

  it('keeps the local date near midnight instead of converting it to UTC', () => {
    expect(formatHomeHeroDate(new Date(2026, 11, 31, 23, 55))).toBe('Quinta-feira, 31 de dezembro');
  });
});

describe('homeContentRoute', () => {
  it('routes a movie to its movie detail', () => {
    expect(homeContentRoute({ type: 'MOVIE', tmdbId: '550' })).toEqual(['/content/movie', '550']);
  });

  it('routes a series to its series detail', () => {
    expect(homeContentRoute({ type: 'SERIES', tmdbId: '1399' })).toEqual(['/content/series', '1399']);
  });

  it('uses the parent series ID for an episode detail', () => {
    expect(homeContentRoute({ type: 'EPISODE', tmdbId: '999', seriesTmdbId: '1399', seasonNumber: 2, episodeNumber: 3 }))
      .toEqual(['/content/series', '1399', 'season', 2, 'episode', 3]);
  });

  it('preserves season zero for specials', () => {
    expect(homeContentRoute({ type: 'EPISODE', seriesTmdbId: '1399', seasonNumber: 0, episodeNumber: 1 }))
      .toEqual(['/content/series', '1399', 'season', 0, 'episode', 1]);
  });

  it('falls back to the series when episode coordinates are unavailable', () => {
    expect(homeContentRoute({ type: 'EPISODE', seriesTmdbId: '1399', seasonNumber: null }))
      .toEqual(['/content/series', '1399']);
  });

  it('does not link an episode TMDB ID as a series when its parent is missing', () => {
    expect(homeContentRoute({ type: 'EPISODE', tmdbId: '999', seasonNumber: 1, episodeNumber: 2 })).toBeNull();
  });

  it('does not invent a route when content is absent', () => {
    expect(homeContentRoute(null)).toBeNull();
    expect(homeContentRoute({ type: 'MOVIE', tmdbId: null })).toBeNull();
  });

  it('opens season releases on their series detail, the available canonical route', () => {
    expect(homeContentRoute({ type: 'SEASON', seriesTmdbId: '1399', seasonNumber: 2 }))
      .toEqual(['/content/series', '1399']);
  });
});
