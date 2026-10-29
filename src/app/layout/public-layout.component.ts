import { Component } from '@angular/core';
import { RouterLink, RouterOutlet } from '@angular/router';
import { messageCatalog } from '../shared/i18n/messages';

export const PUBLIC_FOOTER_LINKS = [
  { labelKey: 'terms', path: '/terms' },
  { labelKey: 'privacy', path: '/privacy' },
  { labelKey: 'communityGuidelines', path: '/community-guidelines' },
  { labelKey: 'helpContact', path: '/help-contact' },
] as const;

@Component({
  imports: [RouterLink, RouterOutlet],
  selector: 'app-public-layout',
  standalone: true,
  styleUrl: './public-layout.component.css',
  templateUrl: './public-layout.component.html',
})
export class PublicLayoutComponent {
  protected readonly footerCopy = messageCatalog['pt-BR'].layout.publicFooter;
  protected readonly footerLinks = PUBLIC_FOOTER_LINKS.map((link) => ({
    path: link.path,
    label: this.footerCopy[link.labelKey],
  }));
}
