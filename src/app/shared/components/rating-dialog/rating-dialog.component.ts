import { NgTemplateOutlet } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, effect, input, output, signal } from '@angular/core';
import { messageCatalog } from '../../i18n/messages';
import { ModalFocusDirective } from '../../directives/modal-focus.directive';
import { ModalScrollLockDirective } from '../../directives/modal-scroll-lock.directive';
import { DialogBackdropComponent } from '../dialog-backdrop/dialog-backdrop.component';

export type RatingDialogContentType = 'MOVIE' | 'SERIES' | 'SEASON' | 'EPISODE';

export interface RatingDialogCompanion {
  id: string;
  name: string | null;
  username: string;
  profilePicture: string | null;
}

export interface RatingDialogValue {
  score: number | null;
  comment: string;
  watchedDate?: string | null;
  isRewatch?: boolean;
  watchedInTheater?: boolean;
  watchedWith?: string[];
}

export interface RatingDialogSubmission extends RatingDialogValue {
  watchedDate?: string;
  isRewatch?: boolean;
  watchedInTheater?: boolean;
  watchedWith?: string[];
}

export interface RatingDialogLabels {
  watchedOn: string;
  watchedWith: string;
  addPerson: string;
  followingEmpty: string;
  followingUnavailable: string;
  followingLoading: string;
  actionUnavailable: string;
  moreFollowing: string;
  retry: string;
  loading: string;
  watchedWithLimit: string;
  yourRating: string;
  yourReview: string;
  optional: string;
  reviewPlaceholder: string;
  rewatch: string;
  theater: string;
  remove: string;
  cancel: string;
  save: string;
  saving: string;
  chooseDate: string;
  previousMonth: string;
  nextMonth: string;
  weekdays: string[];
}

interface CalendarDay {
  date: string;
  day: number;
  inMonth: boolean;
  selected: boolean;
  disabled: boolean;
  ariaLabel: string;
}

@Component({
  selector: 'app-rating-dialog',
  standalone: true,
  imports: [DialogBackdropComponent, ModalFocusDirective, ModalScrollLockDirective, NgTemplateOutlet],
  templateUrl: './rating-dialog.component.html',
  styleUrls: ['./rating-dialog.component.css', './rating-dialog-movie.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RatingDialogComponent {
  readonly type = input<RatingDialogContentType>('MOVIE');
  readonly title = input.required<string>();
  readonly subtitle = input.required<string>();
  readonly initialValue = input<Partial<RatingDialogValue>>({});
  readonly initialScore = input<number | null>(null);
  readonly initialComment = input('');
  readonly friends = input<RatingDialogCompanion[]>([]);
  readonly friendsLoaded = input(false);
  readonly friendsHasNext = input(false);
  readonly friendsLoading = input(false);
  readonly friendsError = input('');
  readonly saving = input(false);
  readonly loading = input(false);
  readonly loadError = input('');
  readonly canRemove = input(false);
  readonly allowClear = input(true);
  readonly allowEmpty = input(false);
  readonly labels = input<Partial<RatingDialogLabels>>({});
  readonly returnFocusTarget = input<HTMLElement | null>(null);
  readonly save = output<RatingDialogSubmission>();
  readonly remove = output<void>();
  readonly loadMoreFriends = output<void>();
  readonly retryFriends = output<void>();
  readonly retryLoad = output<void>();
  readonly dismiss = output<void>();

  protected readonly copy = messageCatalog['pt-BR'].home;
  protected readonly ratingStarPath = 'M11.283 3.453C11.513 2.986 11.628 2.753 11.785 2.678C11.921 2.613 12.079 2.613 12.216 2.678C12.372 2.753 12.487 2.986 12.717 3.453L14.904 7.883C14.972 8.021 15.006 8.09 15.056 8.143C15.1 8.191 15.153 8.229 15.211 8.256C15.278 8.287 15.354 8.298 15.506 8.321L20.397 9.035C20.912 9.111 21.169 9.148 21.288 9.274C21.391 9.383 21.44 9.533 21.42 9.682C21.398 9.853 21.211 10.035 20.839 10.398L17.3 13.844C17.19 13.951 17.135 14.005 17.1 14.069C17.068 14.125 17.048 14.187 17.04 14.251C17.031 14.323 17.044 14.399 17.07 14.551L17.905 19.417C17.993 19.93 18.037 20.187 17.954 20.339C17.882 20.472 17.754 20.564 17.606 20.592C17.436 20.623 17.206 20.502 16.745 20.26L12.372 17.96C12.236 17.888 12.168 17.853 12.097 17.839C12.034 17.826 11.968 17.826 11.905 17.839C11.833 17.853 11.765 17.888 11.629 17.96L7.256 20.26C6.795 20.502 6.565 20.623 6.395 20.592C6.247 20.564 6.119 20.472 6.047 20.339C5.964 20.187 6.008 19.93 6.096 19.417L6.931 14.551C6.957 14.399 6.97 14.323 6.961 14.251C6.953 14.187 6.933 14.125 6.901 14.069C6.866 14.005 6.811 13.951 6.701 13.844L3.162 10.398C2.79 10.035 2.603 9.853 2.581 9.682C2.561 9.533 2.61 9.383 2.713 9.274C2.832 9.148 3.089 9.111 3.604 9.035L8.495 8.321C8.647 8.298 8.723 8.287 8.79 8.256C8.848 8.229 8.901 8.191 8.945 8.143C8.995 8.09 9.029 8.021 9.097 7.883L11.283 3.453Z';
  protected readonly score = signal<number | null>(null);
  protected readonly comment = signal('');
  protected readonly watchedDate = signal(this.toDateKey(new Date()));
  protected readonly isRewatch = signal(false);
  protected readonly watchedInTheater = signal(false);
  protected readonly watchedWith = signal<string[]>([]);
  private readonly rewatchTouched = signal(false);
  private readonly theaterTouched = signal(false);
  private readonly companionsTouched = signal(false);
  protected readonly calendarOpen = signal(false);
  protected readonly calendarMonth = signal(this.firstOfMonth(new Date()));
  protected readonly ratingOptions = Array.from({ length: 10 }, (_, index) => index + 1);
  protected readonly displayDate = computed(() => this.type() === 'MOVIE' || this.type() === 'EPISODE');
  protected readonly displayMovieOptions = computed(() => this.type() === 'MOVIE');
  protected readonly displayRemoveAction = computed(() => this.canRemove() && (this.type() === 'MOVIE' || this.type() === 'EPISODE'));
  protected readonly calendarDays = computed(() => this.createCalendarDays(this.calendarMonth(), this.watchedDate()));
  protected readonly calendarMonthLabel = computed(() =>
    new Intl.DateTimeFormat('pt-BR', { month: 'long', year: 'numeric' }).format(this.calendarMonth()),
  );
  protected readonly canAdvanceCalendar = computed(() => {
    const month = this.calendarMonth();
    const today = new Date();
    return month.getFullYear() * 12 + month.getMonth() < today.getFullYear() * 12 + today.getMonth();
  });
  protected readonly text = computed<RatingDialogLabels>(() => {
    const labels = this.labels();
    return {
      watchedOn: labels.watchedOn ?? this.copy.watchedOn,
      watchedWith: labels.watchedWith ?? this.copy.watchedWith,
      addPerson: labels.addPerson ?? this.copy.addPerson,
      followingEmpty: labels.followingEmpty ?? this.copy.followingEmpty,
      followingUnavailable: labels.followingUnavailable ?? this.copy.followingUnavailable,
      followingLoading: labels.followingLoading ?? this.copy.followingLoading,
      actionUnavailable: labels.actionUnavailable ?? this.copy.actionUnavailableShort,
      moreFollowing: labels.moreFollowing ?? this.copy.moreFollowing,
      retry: labels.retry ?? this.copy.retryAction,
      loading: labels.loading ?? this.copy.ratingDialogLoading,
      watchedWithLimit: labels.watchedWithLimit ?? this.copy.watchedWithLimit,
      yourRating: labels.yourRating ?? this.copy.yourRating,
      yourReview: labels.yourReview ?? this.copy.yourReview,
      optional: labels.optional ?? this.copy.optional,
      reviewPlaceholder: labels.reviewPlaceholder ?? this.copy.reviewPlaceholder,
      rewatch: labels.rewatch ?? 'Já assisti antes',
      theater: labels.theater ?? 'Assisti no cinema',
      remove: labels.remove ?? 'Remover do diário',
      cancel: labels.cancel ?? this.copy.cancel,
      save: labels.save ?? this.copy.save,
      saving: labels.saving ?? this.copy.saving,
      chooseDate: labels.chooseDate ?? this.copy.chooseWatchDate,
      previousMonth: labels.previousMonth ?? this.copy.previousMonth,
      nextMonth: labels.nextMonth ?? this.copy.nextMonth,
      weekdays: labels.weekdays ?? this.copy.calendarWeekdays.split(' '),
    };
  });

  constructor() {
    effect(() => {
      const value = this.initialValue();
      this.score.set(value.score ?? this.initialScore());
      this.comment.set(value.comment ?? this.initialComment());
      const date = value.watchedDate || this.toDateKey(new Date());
      this.watchedDate.set(date);
      const parsedDate = this.parseDate(date);
      if (parsedDate) this.calendarMonth.set(this.firstOfMonth(parsedDate));
      this.isRewatch.set(Boolean(value.isRewatch));
      this.watchedInTheater.set(Boolean(value.watchedInTheater));
      this.watchedWith.set(value.watchedWith ?? []);
      this.rewatchTouched.set(false);
      this.theaterTouched.set(false);
      this.companionsTouched.set(false);
    });
  }

  protected setScore(score: number): void {
    const existingScore = this.initialValue().score ?? this.initialScore();
    const canClear = this.allowClear() && (this.type() !== 'MOVIE' || existingScore === null);
    this.score.update((current) => canClear && current === score ? null : score);
  }

  protected updateComment(event: Event): void {
    this.comment.set((event.currentTarget as HTMLTextAreaElement).value);
  }

  protected toggleCalendar(): void {
    this.calendarOpen.update((open) => !open);
  }

  protected changeCalendarMonth(offset: number): void {
    const current = this.calendarMonth();
    const candidate = new Date(current.getFullYear(), current.getMonth() + offset, 1);
    const today = new Date();
    if (candidate.getFullYear() * 12 + candidate.getMonth() > today.getFullYear() * 12 + today.getMonth()) return;
    this.calendarMonth.set(candidate);
  }

  protected selectDate(date: string): void {
    this.watchedDate.set(date);
    this.calendarOpen.set(false);
  }

  protected dateLabel(): string {
    const date = this.parseDate(this.watchedDate());
    return date
      ? new Intl.DateTimeFormat('pt-BR', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' }).format(date)
      : this.copy.dateUnavailable;
  }

  protected toggleRewatch(): void {
    this.isRewatch.update((value) => !value);
    this.rewatchTouched.set(true);
  }

  protected toggleTheater(): void {
    this.watchedInTheater.update((value) => !value);
    this.theaterTouched.set(true);
  }

  protected isCompanionSelected(id: string): boolean {
    return this.watchedWith().includes(id);
  }

  protected toggleCompanion(id: string, event: Event): void {
    const checked = (event.currentTarget as HTMLInputElement).checked;
    const selected = this.watchedWith();
    if (checked && selected.length >= 20) return;
    this.watchedWith.set(checked ? [...new Set([...selected, id])] : selected.filter((item) => item !== id));
    this.companionsTouched.set(true);
  }

  protected selectedCompanions(): RatingDialogCompanion[] {
    const selected = new Set(this.watchedWith());
    return this.friends().filter((friend) => selected.has(friend.id));
  }

  protected canSave(): boolean {
    return this.allowEmpty()
      || this.type() === 'MOVIE'
      || this.type() === 'EPISODE'
      || this.score() !== null
      || this.comment().trim().length > 0;
  }

  protected submitFromForm(event: SubmitEvent): void {
    event.preventDefault();
    this.submit();
  }

  protected submit(): void {
    if (this.saving() || this.loading() || this.loadError() || !this.canSave()) return;
    const submission: RatingDialogSubmission = {
      score: this.score(),
      comment: this.comment().trim(),
    };
    if (this.displayDate()) submission.watchedDate = this.watchedDate();
    if (this.displayMovieOptions()) {
      const initial = this.initialValue();
      if (initial.isRewatch !== undefined || this.rewatchTouched()) submission.isRewatch = this.isRewatch();
      if (initial.watchedInTheater !== undefined || this.theaterTouched()) submission.watchedInTheater = this.watchedInTheater();
      if (initial.watchedWith !== undefined || this.companionsTouched()) submission.watchedWith = this.watchedWith();
    }
    this.save.emit(submission);
  }

  private createCalendarDays(month: Date, selectedDate: string): CalendarDay[] {
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
