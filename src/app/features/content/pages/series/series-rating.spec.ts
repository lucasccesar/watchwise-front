import '@angular/compiler';
import { signal } from '@angular/core';
import { NEVER, Subscription } from 'rxjs';
import { describe, expect, it, vi } from 'vitest';
import { SeriesComponent } from './series.component';

// Exercise the real rating branch/runAction without unrelated constructor effects or network loading.
function ratingPage(version: number | null) {
  const api = { setContentRating: vi.fn().mockReturnValue(NEVER), createSeriesDiaryEntry: vi.fn().mockReturnValue(NEVER) };
  const component = Object.assign(Object.create(SeriesComponent.prototype), {
    api, requests: new Subscription(), actionPending: signal(false),
    toast: signal(''), tmdbId: signal('show'), ratingScore: signal(8),
    ratingTarget: signal({ type: 'SEASON', season: { seasonNumber: 2 } }),
    page: signal({ sections: { seasons: [{ contentId: 'season-2', seasonNumber: 2, viewerState: { myRating: version === null ? null : 6, currentRatingVersion: version } }] } }),
  });
  return { component, api };
}

describe('Series season rating', () => {
  it.each([null, 0, 4])('rates the actual season content ID with version %s without logging a watch', version => {
    const { component, api } = ratingPage(version);
    component.saveRating();
    expect(api.setContentRating).toHaveBeenCalledWith('season-2', 8, version);
    expect(api.createSeriesDiaryEntry).not.toHaveBeenCalled();
  });
  it('does not invent a season ID or write when the section card is missing', () => {
    const { component, api } = ratingPage(null);
    component.page.set({ sections: { seasons: [] } });
    component.saveRating();
    expect(api.setContentRating).not.toHaveBeenCalled();
    expect(api.createSeriesDiaryEntry).not.toHaveBeenCalled();
  });
});
