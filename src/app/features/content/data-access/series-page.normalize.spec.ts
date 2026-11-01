import '@angular/compiler';
import { describe, expect, it } from 'vitest';
import { SeriesPageResponse, normalizeSeriesPageResponse } from './content-api.service';

describe('normalizeSeriesPageResponse', () => {
  it('converts nullable API collections to empty arrays before the page renders', () => {
    const response = {
      details: {
        genres: null,
        countries: null,
        cast: null,
        guestStars: null,
        creators: null,
        watchProviders: null,
        seasons: null,
        episodes: null,
        recentEpisodes: null,
        productionCompanies: null,
        crew: null,
        videos: null,
      },
      metadata: { watchProviders: null, presentationCrew: null },
      stats: { ratingsDistribution: null },
      viewerState: { lists: null, reviewIds: null },
      sections: { seasons: null, episodes: null, recentEpisodes: null },
    } as unknown as SeriesPageResponse;

    const page = normalizeSeriesPageResponse(response);

    expect(page.details).toMatchObject({
      genres: [],
      countries: [],
      cast: [],
      guestStars: [],
      creators: [],
      watchProviders: [],
      seasons: [],
      episodes: [],
      recentEpisodes: [],
      productionCompanies: [],
      crew: [],
      videos: [],
    });
    expect(page.metadata).toMatchObject({ watchProviders: [], presentationCrew: [] });
    expect(page.stats.ratingsDistribution).toEqual([]);
    expect(page.viewerState).toMatchObject({ lists: [], reviewIds: [] });
    expect(page.sections).toEqual({ seasons: [], episodes: [], recentEpisodes: [] });
  });
});
