import '@angular/compiler';
import { Injector, runInInjectionContext } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { of } from 'rxjs';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { AuthSessionService } from '../../../../core/session/session.service';
import { ToastNotificationsService } from '../../../../shared/components/toast-notifications/toast-notifications.service';
import { ConfirmationDialogService } from '../../../../shared/components/confirmation-dialog/confirmation-dialog.service';
import { ContentApiService } from '../../../content/data-access/content-api.service';
import { DiaryApiService } from '../../data-access/diary-api.service';
import { DiaryComponent } from './diary.component';

function diary(reviews = false) {
  const emptyPage = { content: [], page: 1, size: 15, totalElements: 0, totalPages: 1, hasNext: false };
  const api = {
    getReviewsSummary: vi.fn(() => of({
      latestWatchedBackdropPath: null, totalMinutesWatchedMovies: 0, totalMinutesWatchedEpisodes: 0,
      totalMoviesWatched: 0, totalDistinctMoviesWatched: 0, totalEpisodesWatched: 0, distinctSeriesWatched: 0,
    })),
    getReviewsPage: vi.fn(() => of(emptyPage)),
    getDiaryTimelinePage: vi.fn(() => of(timelinePage())),
  };
  const injector = Injector.create({ providers: [
    { provide: ToastNotificationsService, useValue: { success: vi.fn(), error: vi.fn() } },
    ConfirmationDialogService,
    { provide: ContentApiService, useValue: {} },
    { provide: ActivatedRoute, useValue: { snapshot: { data: { mode: reviews ? 'reviews' : 'history' } } } },
    { provide: AuthSessionService, useValue: { user: () => ({ id: 'viewer', username: 'viewer' }) } },
    { provide: DiaryApiService, useValue: api },
    { provide: Router, useValue: { navigateByUrl: vi.fn(), navigate: vi.fn() } },
  ] });
  const page = runInInjectionContext(injector, () => new DiaryComponent()) as any;
  return { page, api };
}
const input = (value: string) => ({ target: { value } }) as unknown as Event;
const records = [
  { id: 'old', content: { type: 'MOVIE', tmdbId: '1', seriesTmdbId: null }, watchedDate: '2026-10-19', score: 9, watchedInTheater: false },
  { id: 'new', content: { type: 'EPISODE', tmdbId: null, seriesTmdbId: 'show' }, watchedDate: '2026-10-20', score: 4, watchedInTheater: true },
  { id: 'unrated', content: { type: 'SERIES', tmdbId: null, seriesTmdbId: 'show' }, card: { title: 'A série real' }, watchedDate: '2026-10-20', score: null, watchedInTheater: null },
];

function timelinePage(...items: typeof records) {
  return {
    content: items.map(entry => ({ kind: 'PERSISTED_ENTRY' as const, entry: { ...entry, createdAt: entry.watchedDate + 'T12:00:00' } })),
    page: 1, size: 30, totalElements: items.length, totalPages: 1, hasNext: false,
  };
}

describe('Diary control state', () => {
  afterEach(() => vi.useRealTimers());
  it.each([false, true])('loads the first page with reviews=%s', reviews => {
    const { api } = diary(reviews);
    expect(api.getReviewsSummary).toHaveBeenCalledExactlyOnceWith('viewer');
    if (reviews) {
      expect(api.getReviewsPage).toHaveBeenCalledExactlyOnceWith('viewer', 1, 15);
      expect(api.getDiaryTimelinePage).not.toHaveBeenCalled();
    } else {
      expect(api.getDiaryTimelinePage).toHaveBeenCalledExactlyOnceWith('viewer', expect.objectContaining({ page: 1, size: 30, sortBy: 'NEWEST' }));
      expect(api.getReviewsPage).not.toHaveBeenCalled();
    }
  });
  it('clamps and rounds both rating handles, prevents crossing, and resets immediately', () => {
    const { page, api } = diary();
    const [old, recent, unrated] = records;
    page.diaryEntries.set([recent, unrated, old]);
    api.getDiaryTimelinePage.mockReturnValue(of(timelinePage(recent, unrated, old)));
    page.updateRating('min', input('4.4'));
    expect(page.ratingMin()).toBe(4);
    page.updateRating('max', input('8.8'));
    expect(page.ratingMax()).toBe(9);
    expect(page.entries().map((entry: any) => entry.id)).toEqual(['new', 'old']);
    page.updateRating('min', input('20'));
    expect(page.ratingMin()).toBe(9);
    page.updateRating('max', input('-2'));
    expect(page.ratingMax()).toBe(9);
    page.resetRating();
    expect([page.ratingMin(), page.ratingMax(), page.ratingApplied()]).toEqual([1, 10, false]);
    expect(page.entries()).toHaveLength(3);
  });
  it('retains the rating selection when a menu closes and reopens', () => {
    const { page } = diary();
    page.toggleFilter('rating');
    page.updateRating('min', input('5'));
    page.toggleFilter('rating');
    page.toggleFilter('rating');
    expect(page.activeFilter()).toBe('rating');
    expect([page.ratingMin(), page.ratingMax(), page.ratingApplied()]).toEqual([5, 10, true]);
  });
  it('restores the native handle value when a crossing gesture leaves the signal unchanged', () => {
    const { page } = diary();
    page.updateRating('min', input('9'));
    page.updateRating('max', input('9'));
    const lower = input('10');
    const upper = input('8');
    page.updateRating('min', lower);
    page.updateRating('max', upper);
    expect((lower.target as HTMLInputElement).value).toBe('9');
    expect((upper.target as HTMLInputElement).value).toBe('9');
    expect([page.ratingMin(), page.ratingMax()]).toEqual([9, 9]);
  });
  it.each([
    [10, 10, 7, 10], [1, 1, 1, 4], [5, 5, 3, 5], [5, 5, 5, 8],
  ])('widens coincident %s–%s handles by pointer to %s–%s without reset', (min, max, nextMin, nextMax) => {
    const { page } = diary();
    page.ratingMin.set(min);
    page.ratingMax.set(max);
    const thumb = { value: '', focus: vi.fn() };
    const track = Object.assign(new EventTarget(), {
      getBoundingClientRect: () => ({ left: 0, width: 198 }),
      setPointerCapture: vi.fn(),
      querySelector: () => thumb,
    });
    track.addEventListener('pointerdown', event => page.startRatingDrag(event));
    track.addEventListener('pointermove', event => page.moveRatingDrag(event));
    track.addEventListener('pointerup', event => page.endRatingDrag(event));
    const point = (type: string, score: number) => Object.assign(new Event(type, { cancelable: true }), {
      pointerId: 1, button: 0, clientX: 9 + (score - 1) * 20,
    });
    const down = point('pointerdown', min);
    track.dispatchEvent(down);
    track.dispatchEvent(point('pointermove', nextMin !== min ? nextMin : nextMax));
    track.dispatchEvent(point('pointerup', nextMin !== min ? nextMin : nextMax));
    expect([page.ratingMin(), page.ratingMax()]).toEqual([nextMin, nextMax]);
    expect(down.defaultPrevented).toBe(true);
    track.dispatchEvent(point('pointermove', 2));
    expect([page.ratingMin(), page.ratingMax()]).toEqual([nextMin, nextMax]);
  });
  it.each([
    ['week', '2026-10-26', '2026-11-01'], ['month', '2026-10-03', '2026-11-01'],
    ['year', '2026-01-01', '2026-11-01'], ['all', '', ''],
  ])('sets inclusive local calendar dates for %s and resets pagination', (shortcut, from, to) => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 10, 1, 12));
    const { page } = diary();
    page.page.set(2);
    page.setDateShortcut(shortcut);
    expect([page.dateFrom(), page.dateTo(), page.page()]).toEqual([from, to, 1]);
  });
  it('applies manual date bounds immediately and preserves them when reopened', () => {
    const { page, api } = diary();
    api.getDiaryTimelinePage.mockReturnValueOnce(of(timelinePage(records[1], records[2])));
    page.page.set(2);
    page.updateDate('from', input('2026-10-20'));
    expect(api.getDiaryTimelinePage).toHaveBeenLastCalledWith('viewer', expect.objectContaining({ page: 1, dateFrom: '2026-10-20' }));
    expect(page.entries().map((entry: any) => entry.id)).toEqual(['new', 'unrated']);
    expect(page.page()).toBe(1);
    page.toggleFilter('date');
    page.toggleFilter('date');
    expect(page.dateFrom()).toBe('2026-10-20');
  });
  it('requests the first page in each server sort and preserves its result order', () => {
    const { page, api } = diary();
    const [old, recent, unrated] = records;
    const scenarios = [
      ['newest', 'NEWEST', [recent, unrated, old]],
      ['oldest', 'OLDEST', [old, recent, unrated]],
      ['highest', 'RATING_DESC', [old, recent, unrated]],
      ['lowest', 'RATING_ASC', [recent, old, unrated]],
    ] as const;
    for (const [sort, sortBy, reply] of scenarios) {
      api.getDiaryTimelinePage.mockReturnValueOnce(of(timelinePage(...reply)));
      page.setSort(sort);
      expect(api.getDiaryTimelinePage).toHaveBeenLastCalledWith('viewer', expect.objectContaining({ page: 1, sortBy }));
      expect(page.entries().map((entry: any) => entry.id)).toEqual(reply.map(entry => entry.id));
      expect(page.activeFilter()).toBeNull();
    }
    expect(api.getDiaryTimelinePage).toHaveBeenCalledTimes(5);
  });
  it('keeps all date groups expanded when switching between grouped and flat modes', () => {
    const { page } = diary();
    page.diaryEntries.set(records);
    expect(page.displayGroups()).toHaveLength(2);
    page.toggleGrouping();
    expect(page.grouped()).toBe(false);
    expect(page.visibleEntries()).toHaveLength(3);
    expect(page.displayGroups().map((group: any) => group.entries.length)).toEqual([3]);
    page.toggleGrouping();
    expect(page.grouped()).toBe(true);
    expect(page.displayGroups()).toHaveLength(2);
  });
  it('keeps date-only diary groups on their local calendar day', () => {
    const { page } = diary();
    page.diaryEntries.set(records);
    const group = page.groups().find((value: any) => value.key === '2026-10-20');
    expect([group.date.getFullYear(), group.date.getMonth(), group.date.getDate()]).toEqual([2026, 9, 20]);
  });
  it('returns keyboard focus to each opener after selecting or dismissing a control', () => {
    const { page } = diary();
    const opener = { focus: vi.fn() };
    const event = { currentTarget: opener } as unknown as Event;
    page.toggleFilter('type', event);
    page.setTypeFilter('movies');
    expect(opener.focus).toHaveBeenCalledTimes(1);
    page.toggleFilter('sort', event);
    page.setSort('lowest');
    expect(opener.focus).toHaveBeenCalledTimes(2);
    page.toggleFilter('rating', event);
    page.closeFilter();
    expect(page.activeFilter()).toBeNull();
    expect(opener.focus).toHaveBeenCalledTimes(3);
  });
});
