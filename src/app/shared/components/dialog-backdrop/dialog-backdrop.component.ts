import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';

@Component({
  selector: 'app-dialog-backdrop',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div
      class="ww-dialog-backdrop"
      [class.ww-dialog-backdrop--bottom]="placement() === 'bottom'"
      [class.ww-dialog-backdrop--top]="placement() === 'top'"
      (click)="dismissFromBackdrop($event)"
    >
      <ng-content />
    </div>
  `,
  styleUrl: './dialog-backdrop.component.css',
})
export class DialogBackdropComponent {
  readonly placement = input<'center' | 'bottom' | 'top'>('center');
  readonly dismiss = output<void>();

  dismissFromBackdrop(event: MouseEvent): void {
    if (event.target === event.currentTarget) this.dismiss.emit();
  }
}
