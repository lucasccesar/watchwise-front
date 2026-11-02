import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { CalendarApiService, CalendarEventType, CalendarMonthResponse, CalendarReleaseEvent } from '../../data-access/calendar-api.service';
import { AuthSessionService } from '../../../../core/session/session.service';
import { messageCatalog } from '../../../../shared/i18n/messages';
import { ResponsiveBannerComponent } from '../../../../shared/components/responsive-banner/responsive-banner.component';

type CalendarFilter = 'ALL' | 'EPISODE' | 'SEASON' | 'MOVIE';
interface CalendarDay {
  date: string;
  weekday: string;
  shortDate: string;
  dayNumber: number;
  relativeLabel: string | null;
  isToday: boolean;
  isPast: boolean;
  events: CalendarReleaseEvent[];
}

@Component({
  selector: 'app-calendar',
  standalone: true,
  imports: [ResponsiveBannerComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './calendar.component.html',
  styleUrl: './calendar.component.css',
})
export class CalendarComponent {
  protected readonly copy = messageCatalog['pt-BR'].calendarPage;
  protected readonly status = signal<'loading' | 'ready' | 'error'>('loading');
  protected readonly error = signal('');
  protected readonly heroBackdropPath = signal<string | null | undefined>(undefined);
  protected readonly heroBackdropFailed = signal(false);
  protected readonly month = signal(this.currentMonth());
  protected readonly filter = signal<CalendarFilter>('ALL');
  protected readonly response = signal<CalendarMonthResponse | null>(null);
  protected readonly events = computed(() => {
    const filter = this.filter();
    const items = this.response()?.events ?? [];
    const filtered = items.filter((item) => filter === 'ALL'
      || (filter === 'SEASON' ? item.eventType === 'SEASON' || item.eventType === 'SERIES' : item.eventType === filter));
    return [...filtered].sort((a, b) => a.date.localeCompare(b.date));
  });
  protected readonly days = computed(() => this.makeMonthDays(this.month(), this.events()));
  protected readonly monthTitle = computed(() => {
    const [year, month] = this.month().split('-').map(Number);
    return new Intl.DateTimeFormat('pt-BR', { month: 'long', year: 'numeric' }).format(new Date(year, month - 1, 1));
  });
  protected readonly monthName = computed(() => {
    const [year, month] = this.month().split('-').map(Number);
    return new Intl.DateTimeFormat('pt-BR', { month: 'long' }).format(new Date(year, month - 1, 1));
  });
  protected readonly eventCounts = computed(() => {
    const events = this.response()?.events ?? [];
    return {
      all: events.length,
      episodes: events.filter((event) => event.eventType === 'EPISODE').length,
      seasons: events.filter((event) => event.eventType === 'SEASON' || event.eventType === 'SERIES').length,
      movies: events.filter((event) => event.eventType === 'MOVIE').length,
    };
  });

  private readonly api = inject(CalendarApiService);
  private readonly session = inject(AuthSessionService);
  private readonly router = inject(Router);
  private request?: Subscription;

  constructor() {
    this.loadMonth();
  }

  protected loadMonth(): void {
    if (!this.session.user()) {
      void this.router.navigateByUrl('/login');
      return;
    }
    this.request?.unsubscribe();
    this.status.set('loading');
    this.heroBackdropPath.set(undefined);
    this.heroBackdropFailed.set(false);
    this.response.set(null);
    this.error.set('');
    this.request = this.api.getMonth(this.month()).subscribe({
      next: (response) => {
        this.response.set(response);
        this.heroBackdropPath.set(response.backdropPath);
        this.heroBackdropFailed.set(false);
        this.status.set('ready');
      },
      error: (error: unknown) => {
        this.status.set('error');
        this.error.set(error instanceof HttpErrorResponse && error.status === 0
          ? messageCatalog['pt-BR'].home.actionConnectionError
          : messageCatalog['pt-BR'].home.genericError);
      },
    });
  }

  protected changeMonth(offset: number): void {
    const [year, month] = this.month().split('-').map(Number);
    const next = new Date(year, month - 1 + offset, 1);
    this.month.set(`${next.getFullYear()}-${String(next.getMonth() + 1).padStart(2, '0')}`);
    this.loadMonth();
  }

  protected goToToday(): void {
    this.month.set(this.currentMonth());
    this.filter.set('ALL');
    this.loadMonth();
  }

  protected setFilter(filter: CalendarFilter): void { this.filter.set(filter); }

  protected onHeroBackdropError(): void { this.heroBackdropFailed.set(true); }

  protected eventTitle(event: CalendarReleaseEvent): string {
    if (event.eventType === 'EPISODE' && 'seriesTitle' in event.content) return event.content.seriesTitle;
    return event.content.title;
  }

  protected eventSubtitle(event: CalendarReleaseEvent): string {
    if (event.eventType === 'EPISODE' && 'episodeNumber' in event.content) {
      return `T${event.content.seasonNumber} · E${event.content.episodeNumber} · ${event.content.title}`;
    }
    if (event.eventType === 'SEASON' && 'episodeCount' in event.content && 'seasonNumber' in event.content) {
      const count = new Intl.NumberFormat('pt-BR').format(event.content.episodeCount);
      return `${this.copy.season} ${event.content.seasonNumber} · ${count} ${this.copy.episodes}`;
    }
    if (event.eventType === 'SERIES' && 'episodeCount' in event.content) {
      const count = new Intl.NumberFormat('pt-BR').format(event.content.episodeCount);
      return `${count} ${this.copy.episodes}`;
    }
    if (event.sources.includes('WATCHLIST')) return this.copy.watchlistSource;
    return this.copy.movie;
  }

  protected eventTypeLabel(type: CalendarEventType): string {
    if (type === 'MOVIE') return this.copy.movie;
    if (type === 'EPISODE') return this.copy.episode;
    return this.copy.season;
  }

  protected eventRoute(event: CalendarReleaseEvent): string[] | null {
    const content = event.content;
    if (event.eventType === 'MOVIE' && 'tmdbId' in content) return ['/content/movie', content.tmdbId];
    if (event.eventType === 'EPISODE' && 'seriesTmdbId' in content && 'seasonNumber' in content && 'episodeNumber' in content) {
      return ['/content/series', content.seriesTmdbId, 'season', String(content.seasonNumber), 'episode', String(content.episodeNumber)];
    }
    if ('seriesTmdbId' in content) return ['/content/series', content.seriesTmdbId];
    return null;
  }

  protected openEvent(event: CalendarReleaseEvent): void {
    const route = this.eventRoute(event);
    if (route) void this.router.navigate(route);
  }

  protected releaseTime(event: CalendarReleaseEvent): string | null {
    const time = event.releaseContext?.releaseTime;
    if (!time) return null;
    return new Intl.DateTimeFormat('pt-BR', { hour: 'numeric', minute: '2-digit' }).format(new Date(`2000-01-01T${time}`));
  }

  protected dayLabel(day: CalendarDay): string {
    if (day.relativeLabel) return day.relativeLabel;
    return day.weekday;
  }

  private currentMonth(): string {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  }

  private makeMonthDays(month: string, events: CalendarReleaseEvent[]): CalendarDay[] {
    const [year, monthNumber] = month.split('-').map(Number);
    const lastDate = new Date(year, monthNumber, 0).getDate();
    const today = new Date();
    const todayKey = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
    const tomorrow = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1);
    const tomorrowKey = `${tomorrow.getFullYear()}-${String(tomorrow.getMonth() + 1).padStart(2, '0')}-${String(tomorrow.getDate()).padStart(2, '0')}`;
    const byDate = new Map<string, CalendarReleaseEvent[]>();
    for (const event of events) byDate.set(event.date, [...(byDate.get(event.date) ?? []), event]);
    return Array.from({ length: lastDate }, (_, index) => {
      const dayNumber = index + 1;
      const date = `${month}-${String(dayNumber).padStart(2, '0')}`;
      const dayDate = new Date(year, monthNumber - 1, dayNumber);
      const relativeLabel = date === todayKey ? this.copy.today : date === tomorrowKey ? this.copy.tomorrow : null;
      return {
        date,
        weekday: new Intl.DateTimeFormat('pt-BR', { weekday: 'long' }).format(dayDate),
        shortDate: new Intl.DateTimeFormat('pt-BR', { day: 'numeric', month: 'short' }).format(dayDate),
        dayNumber,
        relativeLabel,
        isToday: date === todayKey,
        isPast: date < todayKey,
        events: byDate.get(date) ?? [],
      };
    });
  }
}
