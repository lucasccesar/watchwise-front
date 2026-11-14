import '@angular/compiler';
import { of } from 'rxjs';
import { describe, expect, it, vi } from 'vitest';
import { ContentApiService } from '../../../features/content/data-access/content-api.service';
import { ToastNotificationsService } from '../toast-notifications/toast-notifications.service';
import {
  PostWatchRatingFlowComponent,
  type PostWatchRatingTarget,
} from './post-watch-rating-flow.component';

type FlowHarness = {
  api: ContentApiService;
  target: () => PostWatchRatingTarget | null;
  contentId: (() => string | null) & { set(value: string | null): void };
  rating: (() => { score: number | null; version: number | null } | null) & {
    set(value: { score: number | null; version: number | null } | null): void;
  };
  loading: (() => boolean) & { set(value: boolean): void };
  loadError: (() => string) & { set(value: string): void };
  request?: { unsubscribe(): void };
  loadCurrentRating(target: PostWatchRatingTarget): void;
};

describe('PostWatchRatingFlowComponent', () => {
  function createFlow(target: PostWatchRatingTarget) {
    let resolvedContentId: string | null = null;
    let currentRating: { score: number | null; version: number | null } | null = null;
    let isLoading = false;
    let errorMessage = '';
    const api = {
      getMyContentRating: vi.fn().mockReturnValue(of({ score: null, version: null })),
      createSeriesReference: vi.fn().mockReturnValue(of({ id: 'created-series-id' })),
      createSeasonReference: vi.fn().mockReturnValue(of({ id: 'created-season-id' })),
    };
    const contentId = Object.assign(() => resolvedContentId, {
      set: vi.fn((value: string | null) => { resolvedContentId = value; }),
    });
    const rating = Object.assign(() => currentRating, {
      set: vi.fn((value: typeof currentRating) => { currentRating = value; }),
    });
    const loading = Object.assign(() => isLoading, {
      set: vi.fn((value: boolean) => { isLoading = value; }),
    });
    const loadError = Object.assign(() => errorMessage, {
      set: vi.fn((value: string) => { errorMessage = value; }),
    });
    const component = Object.assign(Object.create(PostWatchRatingFlowComponent.prototype), {
      api: api as unknown as ContentApiService,
      toasts: { success: vi.fn(), error: vi.fn() } as unknown as ToastNotificationsService,
      target: () => target,
      contentId,
      rating,
      loading,
      loadError,
      request: undefined,
    }) as FlowHarness;
    return { component, api, contentId, loadError };
  }

  it('does not create a series reference when the response has no local ID', () => {
    const target = {
      type: 'SERIES',
      tmdbId: '1396',
      title: 'Series',
      subtitle: 'Series',
    } as unknown as PostWatchRatingTarget;
    const { component, api, loadError } = createFlow(target);

    component.loadCurrentRating(target);

    expect(api.createSeriesReference).not.toHaveBeenCalled();
    expect(api.createSeasonReference).not.toHaveBeenCalled();
    expect(api.getMyContentRating).not.toHaveBeenCalled();
    expect(loadError.set).toHaveBeenCalledOnce();
  });

  it('reads the rating with the local ID supplied by the existing response', () => {
    const target: PostWatchRatingTarget = {
      type: 'SEASON',
      contentId: 'local-season-id',
      title: 'Season',
      subtitle: 'Series',
    };
    const { component, api, contentId } = createFlow(target);

    component.loadCurrentRating(target);

    expect(api.getMyContentRating).toHaveBeenCalledWith('local-season-id');
    expect(api.createSeriesReference).not.toHaveBeenCalled();
    expect(api.createSeasonReference).not.toHaveBeenCalled();
    expect(contentId.set).toHaveBeenCalledWith('local-season-id');
  });
});
