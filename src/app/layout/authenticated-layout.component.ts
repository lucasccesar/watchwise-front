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
import { HeaderSearchComponent } from '../features/search-content/components/header-search/header-search.component';
import { HomeFooterComponent } from '../shared/components/home-footer/home-footer.component';
import { messageCatalog } from '../shared/i18n/messages';
import { ToastNotificationsService } from '../shared/components/toast-notifications/toast-notifications.service';

@Component({
  imports: [HeaderSearchComponent, HomeFooterComponent, RouterLink, RouterLinkActive, RouterOutlet],
  selector: 'app-authenticated-layout',
  standalone: true,
  templateUrl: './authenticated-layout.component.html',
})
export class AuthenticatedLayoutComponent {
  protected readonly copy = messageCatalog['pt-BR'].home;
  protected readonly isMenuOpen = signal(false);
  protected readonly isAccountMenuOpen = signal(false);
  protected readonly isSigningOut = signal(false);
  protected readonly shellState = inject(AppShellStateService);
  private readonly toasts = inject(ToastNotificationsService);

  protected get currentViewer() {
    return this.shellState.viewer() ?? this.session.user();
  }

  protected followingCount(): number {
    return this.shellState.viewer()?.followingCount ?? 0;
  }

  protected followerCount(): number {
    return this.shellState.viewer()?.followerCount ?? 0;
  }

  protected viewerRoute(...segments: string[]): string[] {
    const username = this.currentViewer?.username;
    return username
      ? ['/users', username, ...segments]
      : ['/home'];
  }

  protected isNotificationsRoute(): boolean {
    return this.router.url.startsWith('/notifications');
  }

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

  protected closeMenusForSearch(): void {
    this.closeMenu();
    this.closeAccountMenu();
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
  }

  protected signOut(): void {
    if (this.isSigningOut()) {
      return;
    }

    this.isSigningOut.set(true);
    this.authApi
      .logout()
      .pipe(finalize(() => this.isSigningOut.set(false)))
      .subscribe({
        next: () => {
          this.session.clear();
          this.closeAccountMenu();
          void this.router.navigateByUrl('/login', { replaceUrl: true });
        },
        error: () => this.toasts.error(this.copy.signOutError),
      });
  }

  @HostListener('document:keydown.escape')
  protected closeMenusOnEscape(): void {
    this.closeMenu();
    this.closeAccountMenu();
  }
}
