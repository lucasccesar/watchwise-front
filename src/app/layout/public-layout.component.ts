import { Component, inject } from '@angular/core';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { HomeFooterComponent } from '../shared/components/home-footer/home-footer.component';

@Component({
  imports: [HomeFooterComponent, RouterLink, RouterLinkActive, RouterOutlet],
  selector: 'app-public-layout',
  standalone: true,
  styleUrl: './public-layout.component.css',
  templateUrl: './public-layout.component.html',
})
export class PublicLayoutComponent {
  private readonly router = inject(Router);

  protected isLegalRoute(): boolean {
    return ['/terms', '/privacy', '/community-guidelines'].includes(this.router.url.split('?')[0]);
  }

  protected isHelpRoute(): boolean {
    return this.router.url.split('?')[0] === '/help-contact';
  }

  protected isNotFoundRoute(): boolean {
    const path = this.router.url.split('?')[0];
    return !['/', '/login', '/register', '/forgot-password', '/terms', '/privacy', '/community-guidelines', '/help-contact'].includes(path);
  }

  protected legalTitle(): string {
    const path = this.router.url.split('?')[0];
    if (path === '/terms') return 'Termos de Uso';
    if (path === '/privacy') return 'Privacidade';
    return 'Diretrizes da comunidade';
  }
}
