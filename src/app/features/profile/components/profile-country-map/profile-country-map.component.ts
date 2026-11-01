import { ChangeDetectionStrategy, Component, Input } from '@angular/core';

export interface ProfileCountryCount {
  country: string;
  count: number;
}

@Component({
  selector: 'app-profile-country-map',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './profile-country-map.component.html',
  styleUrl: './profile-country-map.component.css',
})
export class ProfileCountryMapComponent {
  @Input({ required: true }) title = 'Assistidos por país';
  @Input() description = '';
  @Input() countries: ProfileCountryCount[] = [];
  @Input() emptyText = 'Não há dados de países para este período.';

  get maxCount(): number {
    return Math.max(0, ...this.countries.map(({ count }) => count));
  }

  width(count: number): string {
    return `${this.maxCount === 0 ? 0 : Math.max(3, (count / this.maxCount) * 100)}%`;
  }
}
