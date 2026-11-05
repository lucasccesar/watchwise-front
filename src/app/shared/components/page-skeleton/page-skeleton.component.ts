import { ChangeDetectionStrategy, Component, input } from '@angular/core';

export type PageSkeletonVariant = 'cards' | 'calendar' | 'connections' | 'content' | 'episode-content' | 'detail' | 'list' | 'profile' | 'rows' | 'settings';

@Component({
  selector: 'app-page-skeleton',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="ww-page-skeleton" [class]="'ww-page-skeleton ww-page-skeleton--' + variant()" [class.ww-page-skeleton--compact]="compact()" role="status" [attr.aria-label]="label()" aria-busy="true">
      @if (!compact() && variant() !== 'calendar' && variant() !== 'content' && variant() !== 'episode-content') {
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
          <div class="ww-content-skeleton" aria-hidden="true">
            <div class="ww-content-skeleton-hero">
              <span class="ww-skeleton-shape ww-content-skeleton-backdrop"></span>
              <div class="ww-content-skeleton-overview">
                <aside class="ww-content-skeleton-sidebar"><span class="ww-skeleton-shape ww-content-skeleton-poster"></span><div class="ww-content-skeleton-provider"><span class="ww-skeleton-shape ww-skeleton-line"></span><span class="ww-skeleton-shape ww-skeleton-line ww-skeleton-line--wide"></span><span class="ww-skeleton-shape ww-skeleton-line"></span></div></aside>
                <header class="ww-content-skeleton-title-block"><span class="ww-skeleton-shape ww-content-skeleton-title"></span><div class="ww-content-skeleton-stats"><span class="ww-skeleton-shape"></span><span class="ww-skeleton-shape"></span><span class="ww-skeleton-shape"></span><span class="ww-skeleton-shape"></span></div></header>
                <div class="ww-content-skeleton-copy"><div class="ww-content-skeleton-metadata"><span class="ww-skeleton-shape ww-skeleton-line"></span><span class="ww-skeleton-shape ww-skeleton-line ww-skeleton-line--wide"></span><span class="ww-skeleton-shape ww-skeleton-line"></span><span class="ww-skeleton-shape ww-skeleton-line ww-skeleton-line--wide"></span></div><span class="ww-skeleton-shape ww-content-skeleton-section-title"></span><span class="ww-skeleton-shape ww-skeleton-line ww-skeleton-line--wide"></span><span class="ww-skeleton-shape ww-skeleton-line ww-skeleton-line--wide"></span><span class="ww-skeleton-shape ww-skeleton-line"></span><div class="ww-content-skeleton-following"><span class="ww-skeleton-shape ww-content-skeleton-section-title"></span><div>@for (person of compactCards; track person) { <span class="ww-skeleton-shape ww-content-skeleton-avatar"></span> }</div></div></div>
                <aside class="ww-content-skeleton-actions"><span class="ww-skeleton-shape ww-content-skeleton-action"></span><span class="ww-skeleton-shape ww-content-skeleton-action"></span><span class="ww-skeleton-shape ww-content-skeleton-action"></span><span class="ww-skeleton-shape ww-content-skeleton-action"></span><div><span class="ww-skeleton-shape ww-skeleton-line ww-skeleton-line--wide"></span><span class="ww-skeleton-shape ww-skeleton-line"></span><span class="ww-skeleton-shape ww-content-skeleton-score"></span></div></aside>
              </div>
            </div>
            <div class="ww-content-skeleton-sections">
              <section><div class="ww-content-skeleton-tabs"><span class="ww-skeleton-shape ww-skeleton-pill"></span><span class="ww-skeleton-shape ww-skeleton-pill"></span></div><div class="ww-content-skeleton-people">@for (person of cards; track person) { <div><span class="ww-skeleton-shape"></span><span class="ww-skeleton-shape ww-skeleton-line"></span><span class="ww-skeleton-shape ww-skeleton-line ww-skeleton-line--short"></span></div> }</div></section>
              <section><span class="ww-skeleton-shape ww-content-skeleton-section-title"></span><div class="ww-content-skeleton-posters">@for (card of compactCards; track card) { <div><span class="ww-skeleton-shape ww-content-skeleton-poster"></span><span class="ww-skeleton-shape ww-skeleton-line"></span></div> }</div></section>
              <section><span class="ww-skeleton-shape ww-content-skeleton-section-title"></span>@for (review of compactCards.slice(0, 2); track review) { <div class="ww-content-skeleton-review"><span class="ww-skeleton-shape"></span><span class="ww-skeleton-shape ww-skeleton-line ww-skeleton-line--wide"></span><span class="ww-skeleton-shape ww-skeleton-line"></span></div> }</section>
              <section><span class="ww-skeleton-shape ww-content-skeleton-section-title"></span><span class="ww-skeleton-shape ww-content-skeleton-comment"></span><div class="ww-skeleton-shape ww-content-skeleton-comment"></div></section>
            </div>
          </div>
        }
        @case ('episode-content') {
          <div class="ww-episode-skeleton" aria-hidden="true">
            <header class="ww-episode-skeleton-hero"><span class="ww-skeleton-shape ww-episode-skeleton-backdrop"></span><div><span class="ww-skeleton-shape ww-episode-skeleton-back"></span><section><span class="ww-skeleton-shape ww-episode-skeleton-eyebrow"></span><span class="ww-skeleton-shape ww-episode-skeleton-title"></span><span class="ww-skeleton-shape ww-episode-skeleton-meta"></span><span class="ww-skeleton-shape ww-episode-skeleton-copy"></span><span class="ww-skeleton-shape ww-episode-skeleton-copy ww-episode-skeleton-copy--short"></span><div>@for (action of compactCards.slice(0, 3); track action) { <span class="ww-skeleton-shape ww-episode-skeleton-action"></span> }</div></section></div></header>
            <div class="ww-episode-skeleton-layout"><aside><span class="ww-skeleton-shape ww-content-skeleton-poster"></span><div><span class="ww-skeleton-shape ww-skeleton-line"></span><span class="ww-skeleton-shape ww-skeleton-line ww-skeleton-line--wide"></span></div><div><span class="ww-skeleton-shape ww-skeleton-line"></span><span class="ww-skeleton-shape ww-skeleton-line ww-skeleton-line--wide"></span></div></aside><div><div class="ww-episode-skeleton-nav"><span class="ww-skeleton-shape ww-skeleton-line"></span><span class="ww-skeleton-shape ww-skeleton-pill"></span></div><section><span class="ww-skeleton-shape ww-content-skeleton-section-title"></span><div class="ww-episode-skeleton-cast">@for (person of compactCards; track person) { <div><span class="ww-skeleton-shape"></span><span class="ww-skeleton-shape ww-skeleton-line"></span></div> }</div></section><section><span class="ww-skeleton-shape ww-content-skeleton-section-title"></span>@for (review of compactCards.slice(0, 2); track review) { <div class="ww-episode-skeleton-review"><span class="ww-skeleton-shape ww-content-skeleton-avatar"></span><span class="ww-skeleton-shape ww-skeleton-line ww-skeleton-line--wide"></span><span class="ww-skeleton-shape ww-skeleton-line"></span></div> }</section><section><span class="ww-skeleton-shape ww-content-skeleton-section-title"></span><span class="ww-skeleton-shape ww-episode-skeleton-comment"></span></section></div></div>
          </div>
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
