import { ChangeDetectionStrategy, Component, input, output, signal } from '@angular/core';
import { CheckIconComponent } from '../check-icon/check-icon.component';
import { ModalFocusDirective } from '../../directives/modal-focus.directive';
import { ModalScrollLockDirective } from '../../directives/modal-scroll-lock.directive';

export type SeriesBulkWatchDateMode = 'today' | 'specific' | 'release';

export interface SeriesBulkWatchSubmission {
  dateMode: SeriesBulkWatchDateMode;
  watchedDate: string | null;
}

@Component({
  selector: 'app-series-bulk-watch-dialog',
  standalone: true,
  imports: [CheckIconComponent, ModalFocusDirective, ModalScrollLockDirective],
  templateUrl: './series-bulk-watch-dialog.component.html',
  styleUrl: './series-bulk-watch-dialog.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SeriesBulkWatchDialogComponent {
  readonly title = input.required<string>();
  readonly subtitle = input.required<string>();
  readonly scope = input<'SERIES' | 'SEASON'>('SERIES');
  readonly episodeCount = input<number | null>(null);
  readonly noteText = input<string | null>(null);
  readonly isRewatch = input(true);
  readonly saving = input(false);
  readonly returnFocusTarget = input<HTMLElement | null>(null);
  readonly save = output<SeriesBulkWatchSubmission>();
  readonly dismiss = output<void>();

  protected readonly dateMode = signal<SeriesBulkWatchDateMode>('today');
  protected readonly watchedDate = signal(this.localDate(new Date()));

  protected todayLabel(): string {
    return this.formatDate(this.localDate(new Date()));
  }

  protected localDateForInput(): string {
    return this.localDate(new Date());
  }

  protected saveWatch(): void {
    if (this.saving()) return;
    const mode = this.dateMode();
    this.save.emit({ dateMode: mode, watchedDate: mode === 'release' ? null : this.watchedDate() });
  }

  protected buttonLabel(): string {
    if (this.isRewatch()) return 'Registrar novamente';
    const count = this.episodeCount();
    return count === null ? 'Marcar como assistida' : `Marcar ${this.formatNumber(count)} episódios`;
  }

  protected note(): string {
    const override = this.noteText()?.trim();
    if (override) return override;
    if (this.isRewatch()) {
      return this.scope() === 'SEASON'
        ? 'Todos os episódios desta temporada serão adicionados novamente ao seu Diário.'
        : 'Todos os episódios da série serão adicionados novamente ao seu Diário.';
    }
    const count = this.episodeCount();
    return count === null
      ? 'Todos os episódios restantes serão adicionados ao seu Diário.'
      : `Todos os ${this.formatNumber(count)} episódios restantes serão adicionados ao seu Diário.`;
  }

  private formatNumber(value: number): string {
    return new Intl.NumberFormat('pt-BR').format(value);
  }

  private formatDate(value: string): string {
    return new Intl.DateTimeFormat('pt-BR', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      timeZone: 'UTC',
    }).format(new Date(`${value}T12:00:00Z`));
  }

  private localDate(date: Date): string {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  }
}
