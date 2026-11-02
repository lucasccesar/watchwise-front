import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { messageCatalog } from '../../../shared/i18n/messages';
import { tmdbImageUrl } from '../../../shared/utils/tmdb-image-url';

const PICKS_BACKDROP_FALLBACK = '/eVYChqJavS1DCXFeJE2lzVUMLKp.jpg';

@Component({
  selector: 'app-picks-page-hero',
  standalone: true,
  imports: [RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './picks-page-hero.component.html',
  styleUrl: './picks-page-hero.component.css',
})
export class PicksPageHeroComponent {
  protected readonly copy = messageCatalog['pt-BR'].picksPage;

  @Input() activeTab: 'mine' | 'explore' = 'mine';
  @Input() statsText: string | null = null;
  @Input()
  set backdropPath(value: string | null | undefined) {
    const path = value?.trim() ? value.trim() : PICKS_BACKDROP_FALLBACK;
    const image = tmdbImageUrl(path, 'w1280');
    if (image === this.backgroundImage) return;

    this.backgroundImage = image;
    this.heroBackdropLoading = Boolean(image);
    this.heroBackdropFailed = false;
  }

  protected backgroundImage = tmdbImageUrl(PICKS_BACKDROP_FALLBACK, 'w1280');
  protected heroBackdropLoading = Boolean(this.backgroundImage);
  protected heroBackdropFailed = false;

  protected onHeroImageLoad(): void {
    this.heroBackdropLoading = false;
  }

  protected onHeroImageError(): void {
    this.heroBackdropLoading = false;
    this.heroBackdropFailed = true;
  }
}
