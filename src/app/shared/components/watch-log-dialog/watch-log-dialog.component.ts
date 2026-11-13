import { ChangeDetectionStrategy, Component, OnInit, computed, input, output, signal } from '@angular/core';
import { messageCatalog } from '../../i18n/messages';
import { DialogBackdropComponent } from '../dialog-backdrop/dialog-backdrop.component';
import { ModalFocusDirective } from '../../directives/modal-focus.directive';
import {
  RatingDialogComponent,
  type RatingDialogCompanion,
  type RatingDialogContentType,
  type RatingDialogSubmission,
  type RatingDialogValue,
} from '../rating-dialog/rating-dialog.component';

export interface WatchLogSubmission {
  watchedDate: string;
  isRewatch: boolean;
  score?: number;
  comment?: string;
  watchedInTheater?: boolean;
  watchedWith?: string[];
}

interface WatchCalendarDay {
  date: string;
  day: number;
  inMonth: boolean;
  selected: boolean;
  disabled: boolean;
  ariaLabel: string;
}

@Component({
  selector: 'app-watch-log-dialog',
  standalone: true,
  imports: [DialogBackdropComponent, ModalFocusDirective, RatingDialogComponent],
  templateUrl: './watch-log-dialog.component.html',
  styleUrl: './watch-log-dialog.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class WatchLogDialogComponent implements OnInit {
  readonly dialogTitle = input.required<string>();
  readonly title = input.required<string>();
  readonly subtitle = input.required<string>();
  readonly type = input<RatingDialogContentType>('MOVIE');
  readonly friends = input<RatingDialogCompanion[]>([]);
  readonly initialRewatch = input(false);
  readonly allowRating = input(true);
  readonly saving = input(false);
  readonly returnFocusTarget = input<HTMLElement | null>(null);
  readonly save = output<WatchLogSubmission>();
  readonly dismiss = output<void>();

  protected readonly copy = messageCatalog['pt-BR'].home;
  protected readonly watchLogDate = signal(this.toDateKey(new Date()));
  protected readonly watchLogRewatch = signal(false);
  protected readonly ratingInitialValue = computed<Partial<RatingDialogValue>>(() => ({
    watchedDate: this.watchLogDate(),
    isRewatch: this.watchLogRewatch(),
  }));
  protected readonly watchCalendarOpen = signal(false);
  protected readonly watchCalendarMonth = signal(this.firstOfMonth(new Date()));
  protected readonly calendarWeekdays = this.copy.calendarWeekdays.split(' ');
  protected readonly watchCalendarDays = computed(() => this.createWatchCalendarDays(this.watchCalendarMonth(), this.watchLogDate()));
  protected readonly watchCalendarMonthLabel = computed(() =>
    new Intl.DateTimeFormat('pt-BR', { month: 'long', year: 'numeric' }).format(this.watchCalendarMonth()),
  );
  protected readonly canAdvanceWatchCalendar = computed(() => {
    const month = this.watchCalendarMonth();
    const today = new Date();
    return month.getFullYear() * 12 + month.getMonth() < today.getFullYear() * 12 + today.getMonth();
  });

  ngOnInit(): void {
    this.watchLogRewatch.set(this.initialRewatch());
  }

  protected toggleWatchCalendar(): void {
    this.watchCalendarOpen.update((open) => !open);
  }

  protected changeWatchCalendarMonth(offset: number): void {
    const current = this.watchCalendarMonth();
    const candidate = new Date(current.getFullYear(), current.getMonth() + offset, 1);
    const today = new Date();
    if (candidate.getFullYear() * 12 + candidate.getMonth() > today.getFullYear() * 12 + today.getMonth()) return;
    this.watchCalendarMonth.set(candidate);
  }

  protected selectWatchLogDate(date: string): void {
    this.watchLogDate.set(date);
    this.watchCalendarOpen.set(false);
  }

  protected watchLogDateLabel(): string {
    const date = this.parseDate(this.watchLogDate());
    return date
      ? new Intl.DateTimeFormat('pt-BR', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' }).format(date)
      : this.copy.dateUnavailable;
  }

  protected setWatchLogRewatch(event: Event): void {
    this.watchLogRewatch.set((event.currentTarget as HTMLInputElement).checked);
  }

  protected submit(): void {
    if (this.saving()) return;
    const submission: WatchLogSubmission = {
      watchedDate: this.watchLogDate(),
      isRewatch: this.watchLogRewatch(),
    };
    this.save.emit(submission);
  }

  protected submitRating(submission: RatingDialogSubmission): void {
    const value: WatchLogSubmission = {
      watchedDate: submission.watchedDate ?? this.watchLogDate(),
      isRewatch: submission.isRewatch ?? this.initialRewatch(),
    };
    if (submission.score !== null) value.score = submission.score;
    if (submission.comment.trim()) value.comment = submission.comment.trim();
    if (submission.watchedInTheater !== undefined) value.watchedInTheater = submission.watchedInTheater;
    if (submission.watchedWith !== undefined) value.watchedWith = submission.watchedWith;
    this.save.emit(value);
  }

  private createWatchCalendarDays(month: Date, selectedDate: string): WatchCalendarDay[] {
    const firstDay = new Date(month.getFullYear(), month.getMonth(), 1);
    const gridStart = new Date(month.getFullYear(), month.getMonth(), 1 - firstDay.getDay());
    const todayKey = this.toDateKey(new Date());
    return Array.from({ length: 42 }, (_, index) => {
      const date = new Date(gridStart.getFullYear(), gridStart.getMonth(), gridStart.getDate() + index);
      const dateKey = this.toDateKey(date);
      return {
        date: dateKey,
        day: date.getDate(),
        inMonth: date.getMonth() === month.getMonth(),
        selected: dateKey === selectedDate,
        disabled: dateKey > todayKey,
        ariaLabel: new Intl.DateTimeFormat('pt-BR', { dateStyle: 'full', timeZone: 'UTC' }).format(new Date(`${dateKey}T00:00:00Z`)),
      };
    });
  }

  private firstOfMonth(date: Date): Date {
    return new Date(date.getFullYear(), date.getMonth(), 1);
  }

  private toDateKey(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  private parseDate(value: string): Date | null {
    if (!value) return null;
    const date = new Date(`${value.slice(0, 10)}T12:00:00Z`);
    return Number.isNaN(date.getTime()) ? null : date;
  }
}
