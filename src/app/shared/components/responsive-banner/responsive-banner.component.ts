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
        <img
          [src]="images.desktop"
          [class.responsive-banner-image--content-detail]="appearance() === 'content-detail'"
          [class.responsive-banner-image--episode-detail]="appearance() === 'episode-detail'"
          alt=""
          (load)="imageLoaded.emit()"
          (error)="imageError.emit()"
        />
      </picture>
      @if (shade()) {
        <span
          class="responsive-banner-shade"
          [class.responsive-banner-shade--content-detail]="appearance() === 'content-detail'"
          [class.responsive-banner-shade--episode-detail]="appearance() === 'episode-detail'"
          aria-hidden="true"
        ></span>
      }
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

    .responsive-banner-image--content-detail {
      object-position: center 40%;
      filter: blur(1px);
      opacity: 1;
      transform: scale(1.04);
    }

    .responsive-banner-image--episode-detail {
      object-position: center 35%;
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

    .responsive-banner-shade--content-detail {
      background: linear-gradient(
        180deg,
        color-mix(in srgb, var(--color-surface) 25%, transparent) 0%,
        color-mix(in srgb, var(--color-surface) 55%, transparent) 50%,
        color-mix(in srgb, var(--color-surface) 92%, transparent) 82%,
        var(--color-surface) 100%
      );
    }

    .responsive-banner-shade--episode-detail {
      background:
        linear-gradient(90deg, rgba(12, 13, 17, .96) 0%, rgba(12, 13, 17, .72) 46%, rgba(12, 13, 17, .28) 100%),
        linear-gradient(0deg, #111113 0%, transparent 42%);
    }
  `,
})
export class ResponsiveBannerComponent {
  readonly path = input<string | null | undefined>(undefined);
  readonly fallbackPath = input.required<string>();
  readonly shade = input(true);
  readonly appearance = input<'standard' | 'content-detail' | 'episode-detail'>('standard');
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
