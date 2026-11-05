import { ChangeDetectionStrategy, Component, input } from '@angular/core';

@Component({
  selector: 'app-content-list-skeleton',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="content-list-skeleton" role="status" [attr.aria-label]="label()" aria-busy="true">
      <ul aria-hidden="true">
        @for (row of rows; track row) {
          <li>
            <span class="content-list-skeleton-check"></span>
            <span class="content-list-skeleton-name"></span>
            <span class="content-list-skeleton-count"></span>
          </li>
        }
      </ul>
    </div>
  `,
  styles: [`
    :host { display: block; width: 100%; }
    ul { display: flex; flex-direction: column; margin: 0; padding: 0; list-style: none; }
    li { display: grid; min-height: 44px; grid-template-columns: 20px minmax(0, 1fr) 20px; align-items: center; gap: var(--space-3); border-bottom: 1px solid var(--color-border); }
    li:last-child { border-bottom: 0; }
    li > span { display: block; overflow: hidden; border-radius: var(--radius-sm); background: linear-gradient(90deg, var(--color-surface), var(--color-secondary), var(--color-surface)); background-size: 200% 100%; animation: content-list-skeleton-shimmer 1.4s ease-in-out infinite; }
    .content-list-skeleton-check { width: 20px; height: 20px; }
    .content-list-skeleton-name { width: 74%; height: 14px; }
    li:nth-child(3n + 2) .content-list-skeleton-name { width: 88%; }
    li:nth-child(3n) .content-list-skeleton-name { width: 61%; }
    .content-list-skeleton-count { width: 18px; height: 12px; justify-self: end; }
    @keyframes content-list-skeleton-shimmer { to { background-position: -200% 0; } }
    @media (prefers-reduced-motion: reduce) { li > span { animation: none; } }
  `],
})
export class ContentListSkeletonComponent {
  readonly label = input('Carregando listas…');
  protected readonly rows = [1, 2, 3, 4];
}
