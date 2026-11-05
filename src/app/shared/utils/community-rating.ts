export type RatingSource = 'community' | 'tmdb' | 'none';

export interface ResolvedRating {
  value: number | null;
  source: RatingSource;
}

export function resolveRating(
  communityAverage: number | null | undefined,
  tmdbAverage: number | null | undefined,
): ResolvedRating {
  if (communityAverage !== null && communityAverage !== undefined) {
    return { value: communityAverage, source: 'community' };
  }

  if (tmdbAverage !== null && tmdbAverage !== undefined) {
    return { value: tmdbAverage, source: 'tmdb' };
  }

  return { value: null, source: 'none' };
}
