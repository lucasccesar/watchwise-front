import '@angular/compiler';
import { Injector, runInInjectionContext } from '@angular/core';
import { Router } from '@angular/router';
import { of } from 'rxjs';
import { describe, expect, it } from 'vitest';
import { AuthSessionService } from '../../../../core/session/session.service';
import { CalendarApiService } from '../../data-access/calendar-api.service';
import { CalendarComponent } from './calendar.component';

describe('Calendar content routes', () => {
  it.each([
    ['SEASON', { seriesTmdbId: 'show', seasonNumber: 2 }, ['/content/series', 'show']],
    ['SERIES', { seriesTmdbId: 'show' }, ['/content/series', 'show']],
    ['EPISODE', { seriesTmdbId: 'show', seasonNumber: 2, episodeNumber: 3 }, ['/content/series', 'show', 'season', '2', 'episode', '3']],
  ])('routes %s to an implemented detail page', (eventType, content, expected) => {
    const injector = Injector.create({ providers: [
      { provide: AuthSessionService, useValue: { user: () => ({ id: 'viewer' }) } },
      { provide: CalendarApiService, useValue: { getMonth: () => of({ events: [] }) } },
      { provide: Router, useValue: {} },
    ] });
    const calendar = runInInjectionContext(injector, () => new CalendarComponent()) as any;
    expect(calendar.eventRoute({ eventType, content })).toEqual(expected);
  });
});
