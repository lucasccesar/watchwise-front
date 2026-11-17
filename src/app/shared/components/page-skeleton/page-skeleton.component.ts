import { ChangeDetectionStrategy, Component, input } from '@angular/core';

export type PageSkeletonVariant = 'cards' | 'calendar' | 'connections' | 'content' | 'episode-content' | 'detail' | 'list' | 'profile' | 'profile-progress' | 'profile-episode-ratings-map' | 'rows' | 'settings';

@Component({
  selector: 'app-page-skeleton',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="ww-page-skeleton" [class]="'ww-page-skeleton ww-page-skeleton--' + variant()" [class.ww-page-skeleton--compact]="compact()" role="status" [attr.aria-label]="label()" aria-busy="true">
      @if (!compact() && variant() !== 'calendar' && variant() !== 'content' && variant() !== 'episode-content' && variant() !== 'profile' && variant() !== 'profile-progress' && variant() !== 'profile-episode-ratings-map') {
        <span class="ww-skeleton-shape ww-skeleton-title" aria-hidden="true"></span>
        <span class="ww-skeleton-shape ww-skeleton-subtitle" aria-hidden="true"></span>
      }

      <ng-content select="[profile-skeleton-tabs]"></ng-content>

      @switch (variant()) {
        @case ('profile') {
          <div class="ww-profile-skeleton">
            <section class="ww-profile-skeleton-hero" aria-hidden="true">
              <span class="ww-skeleton-shape ww-profile-skeleton-banner"></span>
              <span class="ww-skeleton-shape ww-profile-skeleton-options"></span>
              <div class="ww-profile-skeleton-identity">
                <span class="ww-skeleton-shape ww-profile-skeleton-avatar"></span>
                <span class="ww-skeleton-shape ww-profile-skeleton-name"></span>
                <span class="ww-skeleton-shape ww-profile-skeleton-handle"></span>
                <span class="ww-skeleton-shape ww-profile-skeleton-description"></span>
                <div class="ww-profile-skeleton-follow-counts"><span class="ww-skeleton-shape"></span><span class="ww-skeleton-shape"></span></div>
              </div>
            </section>
            <ng-content select="[profile-skeleton-type-switch]"></ng-content>
            <div class="ww-profile-skeleton-content">
              <section class="ww-profile-skeleton-summary" aria-hidden="true">
                @for (summary of profileSummaryCards; track summary) {
                  <div class="ww-profile-skeleton-summary-card">
                    <div><span class="ww-skeleton-shape"></span><span class="ww-skeleton-shape"></span><span class="ww-skeleton-shape"></span></div>
                    <span class="ww-skeleton-shape ww-profile-skeleton-highlight"></span>
                  </div>
                }
              </section>
              <section class="ww-profile-skeleton-section" aria-hidden="true">
                <div class="ww-profile-skeleton-heading"><span class="ww-skeleton-shape"></span><span class="ww-skeleton-shape"></span></div>
                <div class="ww-profile-skeleton-posters ww-profile-skeleton-posters--top-five">
                  @for (poster of profileTopFiveCards; track poster) { <div><span class="ww-skeleton-shape"></span><span class="ww-skeleton-shape"></span><span class="ww-skeleton-shape"></span></div> }
                </div>
              </section>
              <section class="ww-profile-skeleton-section ww-profile-skeleton-recent" aria-hidden="true">
                <div class="ww-profile-skeleton-heading"><span class="ww-skeleton-shape"></span><span class="ww-skeleton-shape"></span></div>
                <div class="ww-profile-skeleton-posters">
                  @for (poster of profileRecentCards; track poster) { <div><span class="ww-skeleton-shape"></span><span class="ww-skeleton-shape"></span><span class="ww-skeleton-shape"></span></div> }
                </div>
              </section>
              <section class="ww-profile-skeleton-section" aria-hidden="true">
                <div class="ww-profile-skeleton-heading"><span class="ww-skeleton-shape"></span><span class="ww-skeleton-shape"></span></div>
                <div class="ww-profile-skeleton-genre-chart">
                  @for (genre of profileGenres; track genre) { <div><span class="ww-skeleton-shape"></span><span class="ww-skeleton-shape"></span></div> }
                  <span class="ww-skeleton-shape ww-profile-skeleton-genre-bar"></span>
                </div>
              </section>
              <section class="ww-profile-skeleton-section" aria-hidden="true">
                <div class="ww-profile-skeleton-heading"><span class="ww-skeleton-shape"></span><span class="ww-skeleton-shape"></span></div>
                <div class="ww-profile-skeleton-rating-chart">
                  <div>@for (bar of profileRatingBars; track bar) { <span class="ww-skeleton-shape"></span> }</div>
                  <div>@for (bar of profileRatingBars; track bar) { <span class="ww-skeleton-shape"></span> }</div>
                </div>
              </section>
              <section class="ww-profile-skeleton-section ww-profile-skeleton-reviews" aria-hidden="true">
                <div class="ww-profile-skeleton-heading"><span class="ww-skeleton-shape"></span><span class="ww-skeleton-shape"></span></div>
                @for (review of profileReviews; track review) {
                  <article><span class="ww-skeleton-shape"></span><div><span class="ww-skeleton-shape"></span><span class="ww-skeleton-shape"></span><span class="ww-skeleton-shape"></span><span class="ww-skeleton-shape"></span></div></article>
                }
              </section>
            </div>
          </div>
        }
        @case ('profile-progress') {
          <div class="ww-profile-progress-skeleton">
            <section class="ww-profile-progress-skeleton-hero" aria-hidden="true">
              <span class="ww-skeleton-shape ww-profile-progress-skeleton-backdrop"></span>
              <div class="ww-profile-progress-skeleton-identity">
                <div class="ww-profile-progress-skeleton-owner">
                  <span class="ww-skeleton-shape ww-profile-progress-skeleton-avatar"></span>
                  <span><span class="ww-skeleton-shape ww-profile-progress-skeleton-owner-name"></span><span class="ww-skeleton-shape ww-profile-progress-skeleton-handle"></span></span>
                </div>
                <span class="ww-skeleton-shape ww-profile-progress-skeleton-title"></span>
                <span class="ww-skeleton-shape ww-profile-progress-skeleton-subtitle"></span>
                <div class="ww-profile-progress-skeleton-description"><span class="ww-skeleton-shape"></span><span class="ww-skeleton-shape"></span></div>
              </div>
            </section>
            <section class="ww-profile-progress-skeleton-summary" aria-hidden="true">
              <div class="ww-profile-progress-skeleton-summary-inner">
                <div class="ww-profile-progress-skeleton-metrics">
                  @for (metric of profileProgressMetrics; track metric) {
                    <div><span class="ww-skeleton-shape"></span><span class="ww-skeleton-shape"></span><span class="ww-skeleton-shape"></span></div>
                  }
                </div>
                <div class="ww-profile-progress-skeleton-controls"><span class="ww-skeleton-shape"></span><span class="ww-skeleton-shape"></span></div>
              </div>
            </section>
            <section class="ww-profile-progress-skeleton-list" aria-hidden="true">
              @for (series of profileProgressCards; track series) {
                <article class="ww-profile-progress-skeleton-card">
                  <span class="ww-skeleton-shape ww-profile-progress-skeleton-poster"></span>
                  <div class="ww-profile-progress-skeleton-main">
                    <div class="ww-profile-progress-skeleton-heading"><span class="ww-skeleton-shape"></span><span class="ww-skeleton-shape"></span></div>
                    <span class="ww-skeleton-shape ww-profile-progress-skeleton-bar"></span>
                    <span class="ww-skeleton-shape ww-profile-progress-skeleton-detail"></span>
                    <span class="ww-skeleton-shape ww-profile-progress-skeleton-detail ww-profile-progress-skeleton-detail--short"></span>
                    <span class="ww-skeleton-shape ww-profile-progress-skeleton-toggle"></span>
                  </div>
                  <aside class="ww-profile-progress-skeleton-next">
                    <span class="ww-skeleton-shape ww-profile-progress-skeleton-next-heading"></span>
                    <div><span class="ww-skeleton-shape ww-profile-progress-skeleton-still"></span><span class="ww-skeleton-shape ww-profile-progress-skeleton-next-copy"></span></div>
                  </aside>
                </article>
              }
            </section>
          </div>
        }
        @case ('profile-episode-ratings-map') {
          <div class="ww-profile-episode-ratings-map-skeleton">
            <header class="ww-profile-map-skeleton-hero" aria-hidden="true">
              <span class="ww-skeleton-shape ww-profile-map-skeleton-backdrop"></span>
              <div class="ww-profile-map-skeleton-hero-copy">
                <span class="ww-profile-map-skeleton-owner"><span class="ww-skeleton-shape"></span><span><span class="ww-skeleton-shape"></span><span class="ww-skeleton-shape"></span></span></span>
                <span class="ww-skeleton-shape ww-profile-map-skeleton-title"></span>
                <span class="ww-skeleton-shape ww-profile-map-skeleton-count"></span>
                <div class="ww-profile-map-skeleton-description"><span class="ww-skeleton-shape"></span><span class="ww-skeleton-shape"></span></div>
              </div>
            </header>
            <section class="ww-profile-map-skeleton-summary" aria-hidden="true">
              @for (metric of profileEpisodeMapMetrics; track metric) {
                <div><span class="ww-skeleton-shape"></span><span class="ww-skeleton-shape"></span><span class="ww-skeleton-shape"></span></div>
              }
            </section>
            <section class="ww-profile-map-skeleton-list" aria-hidden="true">
              <ul>
                @for (series of profileEpisodeMapCards; track series) {
                  <li>
                    <article>
                      <span class="ww-skeleton-shape ww-profile-map-skeleton-poster"><span class="ww-skeleton-shape"></span></span>
                      <div class="ww-profile-map-skeleton-card-copy">
                        <div><span class="ww-skeleton-shape"></span><span class="ww-skeleton-shape"></span></div>
                        <div class="ww-profile-map-skeleton-progress"><span class="ww-skeleton-shape"></span><span class="ww-skeleton-shape"></span></div>
                      </div>
                    </article>
                  </li>
                }
              </ul>
            </section>
            <div class="ww-profile-map-skeleton-pagination" aria-hidden="true"><span class="ww-skeleton-shape"></span><span class="ww-skeleton-shape"></span><span class="ww-skeleton-shape"></span><span class="ww-skeleton-shape"></span><span class="ww-skeleton-shape"></span></div>
          </div>
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
            <div class="ww-content-skeleton-hero">
              <span class="ww-skeleton-shape ww-content-skeleton-backdrop"></span>
              <div class="ww-content-skeleton-overview">
                <aside class="ww-content-skeleton-sidebar">
                  <span class="ww-skeleton-shape ww-content-skeleton-poster"></span>
                  <div class="ww-content-skeleton-provider ww-episode-skeleton-provider">
                    <span class="ww-skeleton-shape ww-skeleton-line"></span>
                    @for (provider of compactCards.slice(0, 3); track provider) {
                      <div><span class="ww-skeleton-shape"></span><span class="ww-skeleton-shape ww-skeleton-line ww-skeleton-line--wide"></span></div>
                    }
                  </div>
                </aside>
                <header class="ww-content-skeleton-title-block ww-episode-skeleton-title-block">
                  <div class="ww-episode-skeleton-parent-links"><span class="ww-skeleton-shape"></span><i></i><span class="ww-skeleton-shape"></span></div>
                  <div class="ww-episode-skeleton-heading"><span class="ww-skeleton-shape ww-episode-skeleton-title"></span><span class="ww-skeleton-shape ww-episode-skeleton-coordinate"></span><span class="ww-skeleton-shape ww-episode-skeleton-certification"></span></div>
                  <div class="ww-content-skeleton-stats"><span class="ww-skeleton-shape"></span><span class="ww-skeleton-shape"></span><span class="ww-skeleton-shape"></span><span class="ww-skeleton-shape"></span></div>
                </header>
                <div class="ww-content-skeleton-copy ww-episode-skeleton-copy">
                  <div class="ww-episode-skeleton-switcher"><span class="ww-skeleton-shape"></span><div>@for (episode of compactCards; track episode) { <span class="ww-skeleton-shape"></span> }</div></div>
                  <div class="ww-content-skeleton-metadata"><span class="ww-skeleton-shape ww-skeleton-line"></span><span class="ww-skeleton-shape ww-skeleton-line ww-skeleton-line--wide"></span><span class="ww-skeleton-shape ww-skeleton-line"></span><span class="ww-skeleton-shape ww-skeleton-line ww-skeleton-line--wide"></span></div>
                  <div class="ww-episode-skeleton-synopsis"><span class="ww-skeleton-shape ww-content-skeleton-section-title"></span><span class="ww-skeleton-shape ww-skeleton-line ww-skeleton-line--wide"></span><span class="ww-skeleton-shape ww-skeleton-line ww-skeleton-line--wide"></span><span class="ww-skeleton-shape ww-skeleton-line"></span></div>
                  <div class="ww-content-skeleton-following"><span class="ww-skeleton-shape ww-content-skeleton-section-title"></span><div>@for (person of compactCards; track person) { <span class="ww-skeleton-shape ww-content-skeleton-avatar"></span> }</div></div>
                </div>
                <aside class="ww-content-skeleton-actions ww-episode-skeleton-actions">
                  <span class="ww-skeleton-shape ww-content-skeleton-action ww-episode-skeleton-rating-action"></span>
                  <span class="ww-skeleton-shape ww-content-skeleton-action ww-episode-skeleton-watch-action"></span>
                  <span class="ww-skeleton-shape ww-content-skeleton-action ww-episode-skeleton-list-action"></span>
                  <div><span class="ww-skeleton-shape ww-skeleton-line ww-skeleton-line--wide"></span><span class="ww-skeleton-shape ww-skeleton-line"></span><span class="ww-skeleton-shape ww-content-skeleton-score"></span></div>
                </aside>
              </div>
            </div>
            <div class="ww-content-skeleton-sections">
              <section><div class="ww-content-skeleton-tabs">@for (tab of compactCards.slice(0, 3); track tab) { <span class="ww-skeleton-shape ww-skeleton-pill"></span> }</div><div class="ww-content-skeleton-people">@for (person of cards; track person) { <div><span class="ww-skeleton-shape"></span><span class="ww-skeleton-shape ww-skeleton-line"></span><span class="ww-skeleton-shape ww-skeleton-line ww-skeleton-line--short"></span></div> }</div></section>
              <section><div class="ww-episode-skeleton-review-heading"><span class="ww-skeleton-shape ww-content-skeleton-section-title"></span><div><span class="ww-skeleton-shape ww-skeleton-pill"></span><span class="ww-skeleton-shape ww-skeleton-pill"></span></div></div>@for (review of compactCards.slice(0, 2); track review) { <div class="ww-content-skeleton-review"><span class="ww-skeleton-shape ww-content-skeleton-avatar"></span><span class="ww-skeleton-shape ww-skeleton-line ww-skeleton-line--wide"></span><span class="ww-skeleton-shape ww-skeleton-line"></span></div> }</section>
              <section><span class="ww-skeleton-shape ww-content-skeleton-section-title"></span><span class="ww-skeleton-shape ww-content-skeleton-comment"></span>@for (comment of compactCards.slice(0, 2); track comment) { <span class="ww-skeleton-shape ww-content-skeleton-comment ww-episode-skeleton-comment-row"></span> }</section>
            </div>
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
  protected readonly profileSummaryCards = [1, 2];
  protected readonly profileProgressMetrics = [1, 2, 3];
  protected readonly profileProgressCards = [1, 2, 3, 4, 5, 6];
  protected readonly profileEpisodeMapMetrics = [1, 2];
  protected readonly profileEpisodeMapCards = Array.from({ length: 12 }, (_, index) => index + 1);
  protected readonly profileTopFiveCards = [1, 2, 3, 4, 5];
  protected readonly profileRecentCards = [1, 2, 3, 4, 5, 6];
  protected readonly profileGenres = [1, 2, 3, 4, 5, 6];
  protected readonly profileRatingBars = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
  protected readonly profileReviews = [1, 2, 3];
}
