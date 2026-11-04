import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
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
        <img [src]="images.desktop" alt="" (load)="imageLoaded.emit()" (error)="imageError.emit()" />
      </picture>
      @if (shade()) { <span class="responsive-banner-shade" aria-hidden="true"></span> }
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

    picture {
      position: relative;
      z-index: 0;
    }

    img {
      object-fit: cover;
      object-position: center 30%;
    }

    .responsive-banner-shade {
      position: absolute;
      z-index: 1;
      inset: 0;
      background: linear-gradient(
        180deg,
        color-mix(in srgb, var(--color-surface) 45%, transparent) 0%,
        color-mix(in srgb, var(--color-surface) 80%, transparent) 62%,
        var(--color-surface) 100%
      );
    }
  `,
})
export class ResponsiveBannerComponent {
  readonly path = input<string | null | undefined>(undefined);
  readonly fallbackPath = input.required<string>();
  readonly shade = input(true);
  readonly imageLoaded = output<void>();
  readonly imageError = output<void>();

  protected readonly imageUrls = computed(() => {
    const currentPath = this.path();
    const path = currentPath === null
      ? this.fallbackPath()
      : currentPath?.trim()
        ? currentPath
        : null;
    if (!path) return null;

    return {
      mobile: tmdbImageUrl(path, 'w1280') ?? '',
      tablet: tmdbImageUrl(path, 'w1280') ?? '',
      notebook: tmdbImageUrl(path, 'w1920') ?? '',
      desktop: tmdbImageUrl(path, 'w1920') ?? '',
    };
  });
}
