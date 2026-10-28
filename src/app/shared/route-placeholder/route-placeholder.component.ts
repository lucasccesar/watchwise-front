import { Component, inject } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { messageCatalog } from '../i18n/messages';

type RouteMessageKey = keyof typeof messageCatalog['pt-BR']['auth']['routes'];

@Component({
  imports: [RouterLink],
  selector: 'app-route-placeholder',
  standalone: true,
  styleUrl: './route-placeholder.component.css',
  templateUrl: './route-placeholder.component.html',
})
export class RoutePlaceholderComponent {
  private readonly route = inject(ActivatedRoute);
  protected readonly copy = messageCatalog['pt-BR'].auth.routes;
  protected readonly title = this.copy[
    this.route.snapshot.data['titleKey'] as RouteMessageKey
  ];
  protected readonly message = this.copy[
    this.route.snapshot.data['messageKey'] as RouteMessageKey
  ];
}
