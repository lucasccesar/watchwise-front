import { Component, HostListener } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { ToastNotificationsComponent } from './shared/components/toast-notifications/toast-notifications.component';

@Component({
  imports: [RouterOutlet, ToastNotificationsComponent],
  selector: 'app-root',
  standalone: true,
  templateUrl: './app.component.html',
})
export class AppComponent {
  @HostListener('document:pointerdown', ['$event'])
  protected dismissOpenDropdowns(event: PointerEvent): void {
    const target = event.target;
    if (!(target instanceof Node)) return;

    const openTriggers = document.querySelectorAll<HTMLButtonElement>('button[aria-expanded="true"]');
    for (const trigger of openTriggers) {
      const parent = trigger.parentElement;
      const controlledId = trigger.getAttribute('aria-controls');
      const controlledPanel = controlledId ? document.getElementById(controlledId) : null;
      const localPanel = parent?.querySelector<HTMLElement>('[role="menu"], [role="listbox"], [role="dialog"]') ?? null;
      const popupType = trigger.getAttribute('aria-haspopup');
      const hasPopup = popupType === 'menu'
        || popupType === 'listbox'
        || Boolean(controlledPanel)
        || Boolean(localPanel);
      const popupPanel = controlledPanel ?? localPanel;

      if (!hasPopup || trigger.contains(target) || popupPanel?.contains(target)) continue;
      trigger.click();
    }

    const openNativeDropdowns = document.querySelectorAll<HTMLDetailsElement>(
      'details.movie-mobile-more-actions[open], details.movie-watch-people-picker[open]',
    );
    for (const dropdown of openNativeDropdowns) {
      if (!dropdown.contains(target)) dropdown.open = false;
    }
  }
}
