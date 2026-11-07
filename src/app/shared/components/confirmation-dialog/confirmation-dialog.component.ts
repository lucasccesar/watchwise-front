import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { DialogBackdropComponent } from '../dialog-backdrop/dialog-backdrop.component';
import { ModalFocusDirective } from '../../directives/modal-focus.directive';
import { confirmationDialogMessages } from '../../i18n/confirmation-dialog.messages';
import { ConfirmationDialogService } from './confirmation-dialog.service';

@Component({
  selector: 'app-confirmation-dialog',
  standalone: true,
  imports: [DialogBackdropComponent, ModalFocusDirective],
  templateUrl: './confirmation-dialog.component.html',
  styleUrl: './confirmation-dialog.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ConfirmationDialogComponent {
  protected readonly confirmation = inject(ConfirmationDialogService);
  protected readonly request = this.confirmation.request;
  protected readonly copy = confirmationDialogMessages['pt-BR'];

  protected dismiss(): void {
    this.confirmation.resolve(false);
  }

  protected confirm(): void {
    this.confirmation.resolve(true);
  }
}
