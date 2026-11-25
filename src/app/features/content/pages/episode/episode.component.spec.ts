import '@angular/compiler';
import { DOCUMENT } from '@angular/common';
import { Injector, Renderer2, runInInjectionContext } from '@angular/core';
import { DomSanitizer, Title } from '@angular/platform-browser';
import { ActivatedRoute, Router, convertToParamMap } from '@angular/router';
import { NEVER, of, Subject, throwError } from 'rxjs';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { AuthSessionService } from '../../../../core/session/session.service';
import { ToastNotificationsService } from '../../../../shared/components/toast-notifications/toast-notifications.service';
import { ContentApiService } from '../../data-access/content-api.service';
import { EpisodeComponent } from './episode.component';

const result = (content: any[], page = 1, hasNext = true) => ({ content, page, size: 20, totalElements: 40, totalPages: 2, hasNext });
const episode = () => ({ details: { contentId: 'episode-id', type: 'EPISODE', runtimeMinutes: 25 }, viewerState: { myRating: 5, myReview: 'Anterior', latestDiaryEntryId: 'watch-id', lastWatchedDate: '2024-02-03', watchStatus: 'WATCHED' }, navigation: { seriesTmdbId: 'show', seasonNumber: 2, episodeNumber: 1, seasonEpisodeCount: 3, previousEpisode: { type: 'EPISODE', seriesTmdbId: 'show', seasonNumber: 1, episodeNumber: 9 }, nextEpisode: { type: 'EPISODE', seriesTmdbId: 'show', seasonNumber: 2, episodeNumber: 2 } } });
function episodePage() {
  const params = new Subject<ReturnType<typeof convertToParamMap>>();
  const api = {
    createEpisodeReference: vi.fn().mockReturnValue(of({ id: 'episode-id' })), createSeriesReference: vi.fn().mockReturnValue(of({ id: 'series-id' })),
    getEpisodePage: vi.fn().mockImplementation(() => of(episode())), getSeriesPage: vi.fn().mockReturnValue(of({ details: { episodes: [] } })),
    getReviews: vi.fn().mockReturnValue(of(result([{ id: 'review-1' }]))), getComments: vi.fn().mockReturnValue(of(result([{ id: 'comment-1' }]))),
    updateDiaryEntry: vi.fn().mockReturnValue(NEVER), createSeriesDiaryEntry: vi.fn().mockReturnValue(NEVER), createComment: vi.fn().mockReturnValue(NEVER),
  };
  const injector = Injector.create({ providers: [
    { provide: ToastNotificationsService, useValue: { success: vi.fn(), error: vi.fn() } },
    { provide: DOCUMENT, useValue: { baseURI: 'http://localhost/', head: {} } },
    { provide: Renderer2, useValue: { createElement: vi.fn(() => ({})), setAttribute: vi.fn(), appendChild: vi.fn(), removeChild: vi.fn() } },
    { provide: Router, useValue: { getCurrentNavigation: () => null, navigateByUrl: vi.fn() } },
    { provide: Title, useValue: { setTitle: vi.fn() } },
    { provide: DomSanitizer, useValue: { bypassSecurityTrustResourceUrl: vi.fn() } },
    { provide: ActivatedRoute, useValue: { paramMap: params } }, { provide: ContentApiService, useValue: api },
    { provide: AuthSessionService, useValue: { user: () => ({ id: 'viewer' }) } },
  ] });
  const page = runInInjectionContext(injector, () => new EpisodeComponent()) as any;
  params.next(convertToParamMap({ tmdbId: 'show', seasonNumber: '2', episodeNumber: '1' }));
  return { page, api, params };
}

describe('Episode review fixes', () => {
  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });
  it('edits the latest diary opinion without replacing its existing watch date or creating a watch', () => {
    const { page, api } = episodePage();
    page.openRating();
    page.selectedRating.set(8);
    page.reviewText.set('Alterada');
    page.saveWatch();
    expect(api.updateDiaryEntry).toHaveBeenCalledWith('watch-id', { watchedDate: '2024-02-03', score: 8, comment: 'Alterada' });
    expect(api.createSeriesDiaryEntry).not.toHaveBeenCalled();
    expect(page.page().viewerState.lastWatchedDate).toBe('2024-02-03');
  });
  it('can remove an existing review comment without creating a watch', () => {
    const { page, api } = episodePage();
    page.openRating();
    page.selectedRating.set(8);
    page.reviewText.set('  ');
    page.saveWatch();
    expect(api.updateDiaryEntry).toHaveBeenCalledWith('watch-id', { watchedDate: '2024-02-03', score: 8, comment: '' });
    expect(api.createSeriesDiaryEntry).not.toHaveBeenCalled();
  });
  it('uses POST for a first rating/viewing when no diary entry exists', () => {
    const { page, api } = episodePage();
    page.page.update((value: any) => ({ ...value, viewerState: { ...value.viewerState, latestDiaryEntryId: null } }));
    page.openRating();
    page.selectWatchDate('2024-02-04');
    page.selectedRating.set(7);
    page.saveWatch();
    expect(api.updateDiaryEntry).not.toHaveBeenCalled();
    expect(api.createSeriesDiaryEntry).toHaveBeenCalledWith(expect.objectContaining({ content: { type: 'EPISODE', seriesTmdbId: 'show', seasonNumber: 2, episodeNumber: 1 }, watchedDate: '2024-02-04', score: 7 }));
  });
  it('keeps explicit rewatch separate from editing', () => {
    vi.stubGlobal('HTMLElement', class {});
    const { page, api } = episodePage();
    page.markWatched();
    expect(page.watchLogOpen()).toBe(true);
    expect(api.createSeriesDiaryEntry).not.toHaveBeenCalled();
    page.saveWatchLog({ watchedDate: '2024-02-04', isRewatch: true });
    expect(api.createSeriesDiaryEntry).toHaveBeenCalledWith({
      content: { type: 'EPISODE', seriesTmdbId: 'show', seasonNumber: 2, episodeNumber: 1 },
      watchedDate: '2024-02-04', isRewatch: true,
    });
    expect(api.updateDiaryEntry).not.toHaveBeenCalled();
  });
  it('uses authoritative adjacent navigation even when series.details.episodes is empty', () => {
    const { page } = episodePage();
    expect(page.episodeRoute(page.adjacentEpisodes().previous)).toEqual(['/content/series', 'show', 'season', '1', 'episode', '9']);
    expect(page.episodeRoute(page.adjacentEpisodes().next)).toEqual(['/content/series', 'show', 'season', '2', 'episode', '2']);
    page.page.update((value: any) => ({ ...value, navigation: { previousEpisode: null, nextEpisode: null } }));
    expect(page.adjacentEpisodes()).toEqual({ previous: null, next: null });
  });
  it.each([281, 500])('rejects %s-character comments before requesting a write', length => {
    const { page, api } = episodePage();
    page.commentText.set('a'.repeat(length));
    page.submitComment({ preventDefault: vi.fn() });
    expect(api.createComment).not.toHaveBeenCalled();
    expect(page.busy()).toBe(false);
  });
  it('accepts the 280-character comment boundary', () => {
    const { page, api } = episodePage();
    page.commentText.set('a'.repeat(280));
    page.submitComment({ preventDefault: vi.fn() });
    expect(api.createComment).toHaveBeenCalledWith('episode-id', { text: 'a'.repeat(280), parentCommentId: null });
  });
  it.each(['Reviews', 'Comments'])('loads and appends the next %s page and stops at hasNext=false', section => {
    const { page, api } = episodePage();
    const kind = section.toLowerCase();
    const request = section === 'Reviews' ? api.getReviews : api.getComments;
    request.mockReturnValue(of(result([{ id: 'second' }], 2, false)));
    page[`loadMore${section}`]();
    expect(request).toHaveBeenCalledTimes(2);
    expect(request.mock.calls[1].slice(0, 2)).toEqual(['episode-id', 2]);
    expect(page[kind]().map((item: any) => item.id)).toEqual([section === 'Reviews' ? 'review-1' : 'comment-1', 'second']);
    page[`loadMore${section}`]();
    expect(request).toHaveBeenCalledTimes(2);
  });
  it.each(['Reviews', 'Comments'])('retains %s on load-more failure and allows retry without duplicate pending requests', section => {
    const { page, api } = episodePage();
    const kind = section.toLowerCase();
    const request = section === 'Reviews' ? api.getReviews : api.getComments;
    const pending = new Subject<any>();
    request.mockReturnValue(pending);
    page[`loadMore${section}`]();
    page[`loadMore${section}`]();
    expect(request).toHaveBeenCalledTimes(2);
    pending.error(new Error('offline'));
    expect(page[kind]()).toHaveLength(1);
    request.mockReturnValue(of(result([{ id: 'retry' }], 2, false)));
    page[`loadMore${section}`]();
    expect(page[kind]()).toHaveLength(2);
  });
  it('deduplicates a locally submitted comment when it reappears on later chronological pages', () => {
    const { page, api } = episodePage();
    const first = { id: 'first', createdAt: '2026-10-01T10:00:00Z' };
    const older = { id: 'older', createdAt: '2026-10-02T10:00:00Z' };
    const submitted = { id: 'new', createdAt: '2026-10-03T10:00:00Z' };
    page.comments.set([first]);
    api.createComment.mockReturnValue(of(submitted));
    page.commentText.set('Novo comentário');
    page.submitComment({ preventDefault: vi.fn() });
    api.getComments.mockReturnValue(of(result([older, submitted], 2, false)));
    page.loadMoreComments();
    expect(page.comments().map((comment: any) => comment.id)).toEqual(['first', 'older', 'new']);
  });
});
