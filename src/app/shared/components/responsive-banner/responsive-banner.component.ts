import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { tmdbImageUrl } from '../../utils/tmdb-image-url';

@Component({
  selector: 'app-responsive-banner',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <picture aria-hidden="true">
      <source media="(max-width: 480px)" [srcset]="imageUrls().mobile" />
      <source media="(min-width: 481px) and (max-width: 800px)" [srcset]="imageUrls().tablet" />
      <source media="(min-width: 801px) and (max-width: 1599px)" [srcset]="imageUrls().notebook" />
      <img [src]="imageUrls().desktop" alt="" />
    </picture>
  `,
  styles: `
    :host {
      position: absolute;
      z-index: 0;
      inset: 0;
      display: block;
      overflow: hidden;
      pointer-events: none;
    }

    picture,
    img {
      display: block;
      width: 100%;
      height: 100%;
    }

    img {
      object-fit: cover;
      object-position: var(--responsive-banner-position, center);
    }
  `,
})
export class ResponsiveBannerComponent {
  readonly path = input<string | null | undefined>(null);
  readonly fallbackPath = input.required<string>();

  protected readonly imageUrls = computed(() => {
    const path = this.path()?.trim() ? this.path()! : this.fallbackPath();
    return {
      mobile: tmdbImageUrl(path, 'w500') ?? '',
      tablet: tmdbImageUrl(path, 'w780') ?? '',
      notebook: tmdbImageUrl(path, 'w1280') ?? '',
      desktop: tmdbImageUrl(path, 'w1920') ?? '',
    };
  });
}
