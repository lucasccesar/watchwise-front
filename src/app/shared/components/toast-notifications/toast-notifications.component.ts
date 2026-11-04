import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { ToastNotificationsService } from './toast-notifications.service';
import { CheckIconComponent } from '../check-icon/check-icon.component';

@Component({
  selector: 'app-toast-notifications',
  standalone: true,
  imports: [CheckIconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './toast-notifications.component.html',
  styleUrl: './toast-notifications.component.css',
})
export class ToastNotificationsComponent {
  protected readonly notifications = inject(ToastNotificationsService);
}
