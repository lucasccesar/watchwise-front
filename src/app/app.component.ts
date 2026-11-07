import { Component, HostListener, inject } from '@angular/core';
import { Title } from '@angular/platform-browser';
import { NavigationStart, Router, RouterOutlet, RoutesRecognized, TitleStrategy } from '@angular/router';
import { ConfirmationDialogComponent } from './shared/components/confirmation-dialog/confirmation-dialog.component';
import { ToastNotificationsComponent } from './shared/components/toast-notifications/toast-notifications.component';

@Component({
  imports: [RouterOutlet, ToastNotificationsComponent, ConfirmationDialogComponent],
  selector: 'app-root',
  standalone: true,
  templateUrl: './app.component.html',
})
export class AppComponent {
  private readonly router = inject(Router);
  private readonly title = inject(Title);
  private readonly titleStrategy = inject(TitleStrategy);

  constructor() {
    this.router.events.subscribe((event) => {
      if (event instanceof NavigationStart) {
        this.title.setTitle('Watchwise');
      } else if (event instanceof RoutesRecognized) {
        this.title.setTitle(this.titleStrategy.buildTitle(event.state) ?? 'Watchwise');
      }
    });
  }

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
      'details.movie-mobile-more-actions[open], details.movie-watch-people-picker[open], details.episode-more-menu[open]',
    );
    const isWatchedMenuTrigger = target instanceof Element && target.closest('[data-ww-watched-menu-trigger]') !== null;
    for (const dropdown of openNativeDropdowns) {
      if (!dropdown.contains(target) && !isWatchedMenuTrigger) dropdown.open = false;
    }
  }
}
