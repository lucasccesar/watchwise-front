import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { messageCatalog } from '../../i18n/messages';

@Component({
  selector: 'app-home-footer',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './home-footer.component.html',
  styleUrl: './home-footer.component.css',
})
export class HomeFooterComponent {
  protected readonly copy = messageCatalog['pt-BR'].home;
  protected readonly copyrightYear = new Date().getFullYear();
}
