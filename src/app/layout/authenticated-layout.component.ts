import { Component, HostListener, inject, signal } from '@angular/core';
import {
  Router,
  RouterLink,
  RouterLinkActive,
  RouterOutlet,
} from '@angular/router';
import { finalize } from 'rxjs';
import { AuthSessionService } from '../core/session/session.service';
import { AppShellStateService } from '../core/ui/app-shell-state.service';
import { AuthApiService } from '../features/auth/data-access/auth-api.service';
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
  protected readonly isSigningOut = signal(false);
  protected readonly signOutError = signal<string | null>(null);
  protected readonly shellState = inject(AppShellStateService);

  constructor(
    private readonly authApi: AuthApiService,
    private readonly session: AuthSessionService,
    private readonly router: Router,
  ) {}

  protected toggleMenu(): void {
    this.closeAccountMenu();
    this.isMenuOpen.update((open) => !open);
  }

  protected closeMenu(): void {
    this.isMenuOpen.set(false);
  }

  protected toggleAccountMenu(): void {
    this.closeMenu();
    if (this.isAccountMenuOpen()) {
      this.closeAccountMenu();
    } else {
      this.isAccountMenuOpen.set(true);
    }
  }

  protected closeAccountMenu(): void {
    this.isAccountMenuOpen.set(false);
    this.signOutError.set(null);
  }

  protected signOut(): void {
    if (this.isSigningOut()) {
      return;
    }

    this.isSigningOut.set(true);
    this.signOutError.set(null);
    this.authApi
      .logout()
      .pipe(finalize(() => this.isSigningOut.set(false)))
      .subscribe({
        next: () => {
          this.session.clear();
          this.closeAccountMenu();
          void this.router.navigateByUrl('/login', { replaceUrl: true });
        },
        error: () => this.signOutError.set(this.copy.signOutError),
      });
  }

  @HostListener('document:keydown.escape')
  protected closeMenusOnEscape(): void {
    this.closeMenu();
    this.closeAccountMenu();
  }
}
