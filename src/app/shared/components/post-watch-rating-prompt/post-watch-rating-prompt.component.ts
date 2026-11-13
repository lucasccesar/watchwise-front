import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { NgTemplateOutlet } from '@angular/common';
import { CheckIconComponent } from '../check-icon/check-icon.component';
import { ModalFocusDirective } from '../../directives/modal-focus.directive';
import { ModalScrollLockDirective } from '../../directives/modal-scroll-lock.directive';

@Component({
  selector: 'app-post-watch-rating-prompt',
  standalone: true,
  imports: [CheckIconComponent, ModalFocusDirective, ModalScrollLockDirective, NgTemplateOutlet],
  templateUrl: './post-watch-rating-prompt.component.html',
  styleUrl: './post-watch-rating-prompt.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PostWatchRatingPromptComponent {
  readonly title = input.required<string>();
  readonly message = input.required<string>();
  readonly ratingLabel = input.required<string>();
  readonly disabled = input(false);
  readonly embedded = input(false);
  readonly returnFocusTarget = input<HTMLElement | null>(null);
  readonly evaluate = output<void>();
  readonly dismiss = output<void>();
}
