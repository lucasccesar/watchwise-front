import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { tmdbImageUrl } from '../../utils/tmdb-image-url';

@Component({
  selector: 'app-responsive-banner',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (imageUrls(); as images) {
      <picture aria-hidden="true">
        <source media="(max-width: 480px)" [srcset]="images.mobile" />
        <source media="(min-width: 481px) and (max-width: 800px)" [srcset]="images.tablet" />
        <source media="(min-width: 801px) and (max-width: 1599px)" [srcset]="images.notebook" />
        <img [src]="images.desktop" alt="" />
      </picture>
    }
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
  readonly path = input<string | null | undefined>(undefined);
  readonly fallbackPath = input.required<string>();

  protected readonly imageUrls = computed(() => {
    const currentPath = this.path();
    const path = currentPath === null
      ? this.fallbackPath()
      : currentPath?.trim()
        ? currentPath
        : null;
    if (!path) return null;

    return {
      mobile: tmdbImageUrl(path, 'w500') ?? '',
      tablet: tmdbImageUrl(path, 'w780') ?? '',
      notebook: tmdbImageUrl(path, 'w1280') ?? '',
      desktop: tmdbImageUrl(path, 'w1920') ?? '',
    };
  });
}
