import { ChangeDetectionStrategy, Component, input } from '@angular/core';

export type PageSkeletonVariant = 'cards' | 'calendar' | 'connections' | 'content' | 'detail' | 'list' | 'profile' | 'rows' | 'settings';

@Component({
  selector: 'app-page-skeleton',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="ww-page-skeleton" [class]="'ww-page-skeleton ww-page-skeleton--' + variant()" [class.ww-page-skeleton--compact]="compact()" role="status" [attr.aria-label]="label()" aria-busy="true">
      @if (!compact() && variant() !== 'calendar') {
        <span class="ww-skeleton-shape ww-skeleton-title" aria-hidden="true"></span>
        <span class="ww-skeleton-shape ww-skeleton-subtitle" aria-hidden="true"></span>
      }

      @switch (variant()) {
        @case ('profile') {
          <span class="ww-skeleton-shape ww-skeleton-banner" aria-hidden="true"></span>
          <div class="ww-skeleton-profile-row" aria-hidden="true">
            <span class="ww-skeleton-shape ww-skeleton-avatar"></span>
            <div><span class="ww-skeleton-shape ww-skeleton-line ww-skeleton-line--wide"></span><span class="ww-skeleton-shape ww-skeleton-line"></span></div>
          </div>
          <div class="ww-skeleton-tabs" aria-hidden="true"><span class="ww-skeleton-shape"></span><span class="ww-skeleton-shape"></span><span class="ww-skeleton-shape"></span><span class="ww-skeleton-shape"></span></div>
          <div class="ww-skeleton-card-grid" aria-hidden="true">@for (card of cards; track card) { <div class="ww-skeleton-card"><span class="ww-skeleton-shape ww-skeleton-poster"></span><span class="ww-skeleton-shape ww-skeleton-line"></span></div> }</div>
        }
        @case ('calendar') {
          <div class="ww-calendar-skeleton-heading" aria-hidden="true">
            <div><span class="ww-skeleton-shape ww-calendar-skeleton-icon"></span><span class="ww-skeleton-shape ww-calendar-skeleton-heading-title"></span></div>
            <span class="ww-skeleton-shape ww-calendar-skeleton-counts"></span>
          </div>
          <div class="ww-calendar-skeleton-days" aria-hidden="true">
            @for (day of calendarDays; track day) {
              <section class="ww-calendar-skeleton-day">
                <header><span class="ww-skeleton-shape ww-calendar-skeleton-weekday"></span><span class="ww-skeleton-shape ww-calendar-skeleton-date"></span></header>
                <div class="ww-calendar-skeleton-events">
                  @if (day % 5 === 0) {
                    <div class="ww-calendar-skeleton-empty"><span class="ww-skeleton-shape"></span></div>
                  } @else {
                    @for (event of day % 3 === 0 ? calendarSingleEvent : calendarEventRows; track event) {
                      <div class="ww-calendar-skeleton-event">
                        <span class="ww-skeleton-shape ww-calendar-skeleton-kind"></span>
                        <span class="ww-skeleton-shape ww-calendar-skeleton-title"></span>
                        <span class="ww-skeleton-shape ww-calendar-skeleton-subtitle"></span>
                        <div><span class="ww-skeleton-shape ww-calendar-skeleton-meta"></span><span class="ww-skeleton-shape ww-calendar-skeleton-badge"></span></div>
                      </div>
                    }
                  }
                </div>
              </section>
            }
          </div>
        }
        @case ('connections') {
          <div class="ww-skeleton-toolbar" aria-hidden="true"><span class="ww-skeleton-shape ww-skeleton-pill"></span><span class="ww-skeleton-shape ww-skeleton-pill"></span></div>
          <div class="ww-skeleton-rows" aria-hidden="true">@for (row of rows; track row) { <div class="ww-skeleton-user-row"><span class="ww-skeleton-shape ww-skeleton-avatar"></span><div><span class="ww-skeleton-shape ww-skeleton-line ww-skeleton-line--wide"></span><span class="ww-skeleton-shape ww-skeleton-line"></span></div><span class="ww-skeleton-shape ww-skeleton-button"></span></div> }</div>
        }
        @case ('rows') {
          <div class="ww-skeleton-rows" aria-hidden="true">@for (row of compactCards; track row) { <div class="ww-skeleton-user-row"><span class="ww-skeleton-shape ww-skeleton-avatar"></span><div><span class="ww-skeleton-shape ww-skeleton-line ww-skeleton-line--wide"></span><span class="ww-skeleton-shape ww-skeleton-line"></span></div></div> }</div>
        }
        @case ('content') {
          <span class="ww-skeleton-shape ww-skeleton-banner" aria-hidden="true"></span>
          <div class="ww-skeleton-content-row" aria-hidden="true"><span class="ww-skeleton-shape ww-skeleton-poster"></span><div><span class="ww-skeleton-shape ww-skeleton-line ww-skeleton-line--wide"></span><span class="ww-skeleton-shape ww-skeleton-line"></span><span class="ww-skeleton-shape ww-skeleton-line ww-skeleton-line--short"></span></div></div>
          <div class="ww-skeleton-card-grid" aria-hidden="true">@for (card of compactCards; track card) { <div class="ww-skeleton-card"><span class="ww-skeleton-shape ww-skeleton-poster"></span><span class="ww-skeleton-shape ww-skeleton-line"></span></div> }</div>
        }
        @case ('list') {
          <div class="ww-skeleton-toolbar" aria-hidden="true"><span class="ww-skeleton-shape ww-skeleton-pill"></span><span class="ww-skeleton-shape ww-skeleton-pill"></span><span class="ww-skeleton-shape ww-skeleton-pill"></span></div>
          <div class="ww-skeleton-rows" aria-hidden="true">@for (row of rows; track row) { <div class="ww-skeleton-list-row"><span class="ww-skeleton-shape ww-skeleton-avatar"></span><div><span class="ww-skeleton-shape ww-skeleton-line ww-skeleton-line--wide"></span><span class="ww-skeleton-shape ww-skeleton-line"></span></div></div> }</div>
        }
        @case ('settings') {
          <div class="ww-skeleton-settings" aria-hidden="true"><div class="ww-skeleton-settings-nav">@for (row of compactCards; track row) { <span class="ww-skeleton-shape ww-skeleton-pill"></span> }</div><div class="ww-skeleton-settings-panel">@for (row of rows; track row) { <span class="ww-skeleton-shape ww-skeleton-line ww-skeleton-line--wide"></span><span class="ww-skeleton-shape ww-skeleton-control"></span> }</div></div>
        }
        @case ('detail') {
          <span class="ww-skeleton-shape ww-skeleton-banner" aria-hidden="true"></span>
          <div class="ww-skeleton-detail-panel" aria-hidden="true"><span class="ww-skeleton-shape ww-skeleton-line ww-skeleton-line--wide"></span><span class="ww-skeleton-shape ww-skeleton-line"></span><span class="ww-skeleton-shape ww-skeleton-line ww-skeleton-line--short"></span><span class="ww-skeleton-shape ww-skeleton-control"></span></div>
        }
        @default {
          <div class="ww-skeleton-toolbar" aria-hidden="true"><span class="ww-skeleton-shape ww-skeleton-pill"></span><span class="ww-skeleton-shape ww-skeleton-pill"></span></div>
          <div class="ww-skeleton-card-grid" aria-hidden="true">@for (card of cards; track card) { <div class="ww-skeleton-card"><span class="ww-skeleton-shape ww-skeleton-poster"></span><span class="ww-skeleton-shape ww-skeleton-line ww-skeleton-line--wide"></span><span class="ww-skeleton-shape ww-skeleton-line"></span></div> }</div>
        }
      }
    </div>
  `,
  styleUrl: './page-skeleton.component.css',
})
export class PageSkeletonComponent {
  readonly variant = input<PageSkeletonVariant>('cards');
  readonly label = input('Carregando…');
  readonly compact = input(false);

  protected readonly cards = [1, 2, 3, 4, 5, 6];
  protected readonly compactCards = [1, 2, 3, 4];
  protected readonly rows = [1, 2, 3, 4, 5, 6];
  protected readonly calendarDays = Array.from({ length: 10 }, (_, index) => index);
  protected readonly calendarEventRows = [0, 1];
  protected readonly calendarSingleEvent = [0];
}
