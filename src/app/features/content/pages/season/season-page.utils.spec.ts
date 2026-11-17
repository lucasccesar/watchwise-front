import { describe, expect, it } from 'vitest';
import { getSeasonEpisodeProgress, hasSeasonCompletion, isSeasonWatched } from './season-page.utils';

describe('season page progress', () => {
  it('counts watched episodes against those released today, excluding future episodes', () => {
    expect(getSeasonEpisodeProgress([
      { episodeNumber: 1, releaseDate: '2026-11-10', watchStatus: 'WATCHED' },
      { episodeNumber: 2, releaseDate: '2026-11-16', watchStatus: 'WATCHED' },
      { episodeNumber: 3, releaseDate: '2026-11-17', watchStatus: 'UNWATCHED' },
    ], 3, '2026-11-16')).toEqual({ watchedEpisodeCount: 2, releasedEpisodeCount: 2 });
  });

  it('does not infer a complete season from the known catalog episode count', () => {
    expect(isSeasonWatched('PARTIALLY_WATCHED', 2, 3)).toBe(false);
    expect(isSeasonWatched('WATCHED', 3, 5)).toBe(false);
    expect(isSeasonWatched('WATCHED', 5, 5)).toBe(true);
    expect(isSeasonWatched('WATCHED', null, 5)).toBe(true);
    expect(isSeasonWatched('UNKNOWN', 2, 2)).toBe(true);
    expect(isSeasonWatched('UNKNOWN', 0, 0)).toBe(false);
  });

  it('leaves local progress unresolved when the episode list is incomplete or has unknown dates', () => {
    expect(getSeasonEpisodeProgress([
      { episodeNumber: 1, releaseDate: '2026-11-10', watchStatus: 'WATCHED' },
    ], 2, '2026-11-16')).toBeNull();
    expect(getSeasonEpisodeProgress([
      { episodeNumber: 1, releaseDate: null, watchStatus: 'WATCHED' },
    ], 1, '2026-11-16')).toBeNull();
  });

  it('requires a completion descriptor for the season before offering a pass rating prompt', () => {
    const completions = [{ content: { type: 'SEASON', seasonNumber: 2 } }];
    expect(hasSeasonCompletion(completions, 2)).toBe(true);
    expect(hasSeasonCompletion(completions, 1)).toBe(false);
  });
});
