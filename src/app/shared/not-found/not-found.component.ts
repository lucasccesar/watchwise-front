import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-not-found',
  standalone: true,
  imports: [RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './not-found.component.html',
  styleUrl: './not-found.component.css',
})
export class NotFoundComponent {
  protected readonly suggestedPages = [
    { label: 'Em alta', href: '/trending' },
    { label: 'Calendário', href: '/calendar' },
    { label: 'Listas', href: '/lists' },
  ];
}
