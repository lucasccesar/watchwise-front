import { Component, HostListener, inject, signal } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { AppShellStateService } from '../core/ui/app-shell-state.service';
import { messageCatalog } from '../shared/i18n/messages';

@Component({
  imports: [RouterLink, RouterLinkActive, RouterOutlet],
  selector: 'app-authenticated-layout',
  standalone: true,
  templateUrl: './authenticated-layout.component.html',
})
export class AuthenticatedLayoutComponent {
  protected readonly copy = messageCatalog['pt-BR'].home;
  protected readonly isMenuOpen = signal(false);
  protected readonly isAccountMenuOpen = signal(false);
  protected readonly shellState = inject(AppShellStateService);

  protected toggleMenu(): void {
    this.closeAccountMenu();
    this.isMenuOpen.update((open) => !open);
  }

  protected closeMenu(): void {
    this.isMenuOpen.set(false);
  }

  protected toggleAccountMenu(): void {
    this.closeMenu();
    this.isAccountMenuOpen.update((open) => !open);
  }

  protected closeAccountMenu(): void {
    this.isAccountMenuOpen.set(false);
  }

  @HostListener('document:keydown.escape')
  protected closeMenusOnEscape(): void {
    this.closeMenu();
    this.closeAccountMenu();
  }
}
