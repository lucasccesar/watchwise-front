import { ChangeDetectionStrategy, Component, OnInit, input, output, signal } from '@angular/core';
import { messageCatalog } from '../../i18n/messages';
import { ModalFocusDirective } from '../../directives/modal-focus.directive';
import { DialogBackdropComponent } from '../dialog-backdrop/dialog-backdrop.component';

export interface RatingDialogSubmission {
  score: number | null;
  comment: string;
}

@Component({
  selector: 'app-rating-dialog',
  standalone: true,
  imports: [DialogBackdropComponent, ModalFocusDirective],
  templateUrl: './rating-dialog.component.html',
  styleUrl: './rating-dialog.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RatingDialogComponent implements OnInit {
  readonly title = input.required<string>();
  readonly subtitle = input.required<string>();
  readonly initialScore = input<number | null>(null);
  readonly initialComment = input('');
  readonly allowComment = input(true);
  readonly saving = input(false);
  readonly returnFocusTarget = input<HTMLElement | null>(null);
  readonly save = output<RatingDialogSubmission>();
  readonly dismiss = output<void>();

  protected readonly copy = messageCatalog['pt-BR'].home;
  protected readonly score = signal<number | null>(null);
  protected readonly comment = signal('');
  protected readonly ratingOptions = Array.from({ length: 10 }, (_, index) => index + 1);

  ngOnInit(): void {
    this.score.set(this.initialScore());
    this.comment.set(this.initialComment());
  }

  protected setScore(score: number): void {
    this.score.update((current) => current === score ? null : score);
  }

  protected updateComment(event: Event): void {
    this.comment.set((event.currentTarget as HTMLTextAreaElement).value);
  }

  protected canSave(): boolean {
    return this.score() !== null || this.comment().trim().length > 0;
  }

  protected submit(): void {
    if (this.saving() || !this.canSave()) return;
    this.save.emit({ score: this.score(), comment: this.comment().trim() });
  }
}
