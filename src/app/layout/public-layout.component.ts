import { Component } from '@angular/core';
import { RouterLink, RouterOutlet } from '@angular/router';

export const PUBLIC_FOOTER_LINKS = [
  { label: 'Terms of Use', path: '/terms' },
  { label: 'Privacy', path: '/privacy' },
  { label: 'Community Guidelines', path: '/community-guidelines' },
  { label: 'Help & Contact', path: '/help-contact' },
] as const;

@Component({
  imports: [RouterLink, RouterOutlet],
  selector: 'app-public-layout',
  standalone: true,
  styleUrl: './public-layout.component.css',
  templateUrl: './public-layout.component.html',
})
export class PublicLayoutComponent {
  protected readonly footerLinks = PUBLIC_FOOTER_LINKS;
}
