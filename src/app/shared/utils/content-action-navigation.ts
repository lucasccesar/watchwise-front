import type { Router } from '@angular/router';

export type ContentActionType = 'MOVIE' | 'SERIES' | 'SEASON' | 'EPISODE';
export type ContentActionIntent = 'rate' | 'rewatch' | 'share-review';

export type ContentActionTarget =
  | { type: 'MOVIE'; tmdbId: string; contentId?: string | null }
  | { type: 'SERIES'; tmdbId: string; contentId?: string | null }
  | { type: 'SEASON'; seriesTmdbId: string; seasonNumber: number; contentId?: string | null }
  | { type: 'EPISODE'; seriesTmdbId: string; seasonNumber: number; episodeNumber: number; contentId?: string | null };

export function navigateToContentAction(
  router: Router,
  target: ContentActionTarget,
  action: ContentActionIntent,
  returnUrl = router.url,
): Promise<boolean> {
  const route = target.type === 'MOVIE'
    ? ['/content/movie', target.tmdbId]
    : target.type === 'SERIES'
      ? ['/content/series', target.tmdbId]
      : target.type === 'SEASON'
        ? ['/content/series', target.seriesTmdbId, 'season', String(target.seasonNumber)]
        : ['/content/series', target.seriesTmdbId, 'season', String(target.seasonNumber), 'episode', String(target.episodeNumber)];
  return router.navigate(route, {
    queryParams: { contentId: target.contentId ?? null },
    state: {
      ...(action === 'share-review' ? { openShareReview: true } : { profileContentAction: action }),
      profileActionReturnUrl: returnUrl,
    },
    fragment: `profile-action:${action}:${encodeURIComponent(returnUrl)}`,
  });
}
