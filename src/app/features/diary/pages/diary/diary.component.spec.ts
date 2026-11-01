import '@angular/compiler';
import { Injector, runInInjectionContext } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { of } from 'rxjs';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { AuthSessionService } from '../../../../core/session/session.service';
import { HomeApiService } from '../../../home/data-access/home-api.service';
import { DiaryApiService } from '../../data-access/diary-api.service';
import { DiaryComponent } from './diary.component';

function diary(reviews = false) {
  const api = {
    getDiaryPage: vi.fn().mockReturnValue(of({ content: [], page: 1, size: 1000, totalElements: 0, totalPages: 1, hasNext: false })),
    getAllDiaryEntries: vi.fn().mockReturnValue(of([])),
    getDiarySeries: vi.fn().mockReturnValue(of([{ seriesTmdbId: 'show', title: 'A série real', entriesCount: 2 }])),
  };
  const injector = Injector.create({ providers: [
    { provide: ActivatedRoute, useValue: { snapshot: { data: { mode: reviews ? 'reviews' : 'history' } } } },
    { provide: AuthSessionService, useValue: { user: () => ({ id: 'viewer' }) } },
    { provide: HomeApiService, useValue: { getHomeSummary: () => of(null) } },
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

describe('Diary control state', () => {
  afterEach(() => vi.useRealTimers());
  it.each([false, true])('loads complete history and authoritative series options with reviews=%s', reviews => {
    const { page, api } = diary(reviews);
    expect(api.getAllDiaryEntries).toHaveBeenCalledWith('viewer', reviews ? true : undefined);
    expect(api.getDiarySeries).toHaveBeenCalledWith('viewer');
    expect(page.seriesOptions()).toEqual([{ id: 'show', title: 'A série real' }]);
  });
  it('clamps and rounds both rating handles, prevents crossing, and resets immediately', () => {
    const { page } = diary();
    page.diaryEntries.set(records);
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
    const { page } = diary();
    page.diaryEntries.set(records);
    page.page.set(2);
    page.updateDate('from', input('2026-10-20'));
    expect(page.entries()).toHaveLength(2);
    expect(page.page()).toBe(1);
    page.toggleFilter('date');
    page.toggleFilter('date');
    expect(page.dateFrom()).toBe('2026-10-20');
  });
  it('applies all four sorts without requesting more data', () => {
    const { page, api } = diary();
    page.diaryEntries.set(records);
    for (const [sort, expected] of [['newest', ['new', 'unrated', 'old']], ['oldest', ['old', 'new', 'unrated']], ['highest', ['old', 'new', 'unrated']], ['lowest', ['new', 'old', 'unrated']]]) {
      page.setSort(sort);
      expect(page.entries().map((entry: any) => entry.id)).toEqual(expected);
      expect(page.activeFilter()).toBeNull();
    }
    expect(api.getAllDiaryEntries).toHaveBeenCalledTimes(1);
  });
  it('shows all entries in flat mode even when individual days are collapsed', () => {
    const { page } = diary();
    page.diaryEntries.set(records);
    page.toggleDay('2026-10-20');
    page.toggleGrouping();
    expect(page.grouped()).toBe(false);
    expect(page.visibleEntries()).toHaveLength(3);
    expect(page.displayGroups().map((group: any) => group.entries.length)).toEqual([3]);
    page.toggleGrouping();
    expect(page.grouped()).toBe(true);
    expect(page.dayCollapsed('2026-10-20')).toBe(true);
    expect(page.displayGroups()).toHaveLength(2);
  });
  it('keeps date-only diary groups on their local calendar day', () => {
    const { page } = diary();
    page.diaryEntries.set(records);
    const group = page.groups().find((value: any) => value.key === '2026-10-20');
    expect([group.date.getFullYear(), group.date.getMonth(), group.date.getDate()]).toEqual([2026, 9, 20]);
  });
  it('exposes real series only and combines type, series, and theater controls locally', () => {
    const { page, api } = diary();
    page.diaryEntries.set(records);
    expect(page.seriesOptions()).toEqual([{ id: 'show', title: 'A série real' }]);
    page.setSeriesFilter('show');
    page.setTypeFilter('episodes');
    page.toggleTheaterFilter();
    expect(page.entries().map((entry: any) => entry.id)).toEqual(['new']);
    expect(api.getAllDiaryEntries).toHaveBeenCalledTimes(1);
  });
  it('returns keyboard focus to each opener after selecting or dismissing a control', () => {
    const { page } = diary();
    const opener = { focus: vi.fn() };
    const event = { currentTarget: opener } as unknown as Event;
    page.toggleFilter('type', event);
    page.setTypeFilter('movies');
    expect(opener.focus).toHaveBeenCalledTimes(1);
    page.toggleFilter('series', event);
    page.setSeriesFilter('show');
    expect(opener.focus).toHaveBeenCalledTimes(2);
    page.toggleFilter('sort', event);
    page.setSort('lowest');
    expect(opener.focus).toHaveBeenCalledTimes(3);
    page.toggleFilter('rating', event);
    page.closeFilter();
    expect(page.activeFilter()).toBeNull();
    expect(opener.focus).toHaveBeenCalledTimes(4);
  });
  it('keeps known parent-series options when a different content type is selected', () => {
    const { page } = diary();
    page.diaryEntries.set(records.slice(0, 2));
    page.diarySeries.set([{ seriesTmdbId: 'show', title: 'Série de verdade', entriesCount: 1 }]);
    page.setTypeFilter('movies');
    expect(page.seriesOptions()).toEqual([{ id: 'show', title: 'Série de verdade' }]);
    page.setTypeFilter('episodes');
    page.setSeriesFilter('show');
    expect(page.seriesFilterLabel()).toBe('Série: Série de verdade');
    page.toggleFilter('series');
    page.toggleFilter('series');
    expect(page.seriesFilterLabel()).toBe('Série: Série de verdade');
    expect(page.entries().map((entry: any) => entry.id)).toEqual(['new']);
  });
});
