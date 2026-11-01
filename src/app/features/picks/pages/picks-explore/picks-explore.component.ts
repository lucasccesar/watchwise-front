import { HttpErrorResponse } from '@angular/common/http';
import { DecimalPipe, NgTemplateOutlet } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { forkJoin } from 'rxjs';
import { messageCatalog } from '../../../../shared/i18n/messages';
import { PicksApiService, PicksOrigin, PicksTemplatePage, PicksTemplatePreview, PicksTemplateSort } from '../../data-access/picks-api.service';

type PicksSection = 'explore' | 'mine' | 'all';
type PicksLoadState = 'loading' | 'ready' | 'error';

@Component({
  selector: 'app-picks-explore',
  standalone: true,
  imports: [RouterLink, DecimalPipe, NgTemplateOutlet],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './picks-explore.component.html',
  styleUrl: './picks-explore.component.css',
})
export class PicksExploreComponent {
  protected readonly copy = messageCatalog['pt-BR'].picksPage;
  protected readonly status = signal<PicksLoadState>('loading');
  protected readonly section = signal<PicksSection>('explore');
  protected readonly origin = signal<PicksOrigin | null>(null);
  protected readonly query = signal('');
  protected readonly popular = signal<PicksTemplatePage | null>(null);
  protected readonly mostPicked = signal<PicksTemplatePage | null>(null);
  protected readonly recent = signal<PicksTemplatePage | null>(null);
  protected readonly mine = signal<PicksTemplatePage | null>(null);
  protected readonly allTemplates = signal<PicksTemplatePage | null>(null);
  protected readonly allSort = signal<PicksTemplateSort>('POPULAR_WEEK');
  protected readonly allPage = signal(1);
  protected readonly error = signal('');
  protected readonly busyLikeIds = signal<ReadonlySet<string>>(new Set());
  protected readonly count = computed(() => this.section() === 'mine'
    ? this.mine()?.totalElements ?? 0
    : this.section() === 'all'
      ? this.allTemplates()?.totalElements ?? 0
      : this.popular()?.totalElements ?? 0);

  private readonly api = inject(PicksApiService);
  private readonly route = inject(ActivatedRoute);
  private readonly emptyPage: PicksTemplatePage = { content: [], page: 1, size: 20, totalElements: 0, totalPages: 0, hasNext: false };

  constructor() {
    const isCatalogRoute = this.route.snapshot.pathFromRoot.some((route) => route.routeConfig?.path === 'picks/templates');
    if (isCatalogRoute) {
      this.section.set('all');
      const origin = this.route.snapshot.queryParamMap.get('origin');
      if (origin === 'OFFICIAL' || origin === 'COMMUNITY') this.origin.set(origin);
      const sort = this.route.snapshot.queryParamMap.get('sort');
      if (sort === 'POPULAR_WEEK' || sort === 'MOST_PICKED' || sort === 'RECENT') this.allSort.set(sort);
      this.query.set(this.route.snapshot.queryParamMap.get('name') ?? '');
      const page = Number(this.route.snapshot.queryParamMap.get('page'));
      if (Number.isInteger(page) && page > 0) this.allPage.set(page);
    }
    this.load();
  }

  protected load(): void {
    this.status.set('loading');
    this.error.set('');
    if (this.section() === 'mine') {
      this.api.getMyTemplates({ page: 1, size: 20, sort: 'RECENT' }).subscribe({
        next: (page) => { this.mine.set(page); this.status.set('ready'); },
        error: (error: unknown) => this.fail(error),
      });
      return;
    }
    const name = this.query().trim() || undefined;
    if (this.section() === 'all') {
      this.api.getTemplates({ origin: this.origin() ?? undefined, name, page: this.allPage(), size: 20, sort: this.allSort() }).subscribe({
        next: (page) => { this.allTemplates.set(page); this.status.set('ready'); },
        error: (error: unknown) => this.fail(error),
      });
      return;
    }
    forkJoin({
      popular: this.api.getTemplates({ origin: this.origin() ?? undefined, name, page: 1, size: 5, sort: 'POPULAR_WEEK' }),
      mostPicked: this.api.getTemplates({ origin: this.origin() ?? undefined, name, page: 1, size: 5, sort: 'MOST_PICKED' }),
      recent: this.api.getTemplates({ origin: this.origin() ?? undefined, name, page: 1, size: 5, sort: 'RECENT' }),
    }).subscribe({
      next: (pages) => { this.popular.set(pages.popular); this.mostPicked.set(pages.mostPicked); this.recent.set(pages.recent); this.status.set('ready'); },
      error: (error: unknown) => this.fail(error),
    });
  }

  protected selectSection(section: PicksSection): void { this.section.set(section); this.load(); }
  protected selectOrigin(origin: PicksOrigin | null): void { this.origin.set(origin); this.allPage.set(1); this.load(); }
  protected updateQuery(event: Event): void { this.query.set((event.target as HTMLInputElement).value); }
  protected submitSearch(event: Event): void { event.preventDefault(); this.allPage.set(1); this.load(); }
  protected setAllSort(value: string): void {
    if (value !== 'POPULAR_WEEK' && value !== 'MOST_PICKED' && value !== 'RECENT') return;
    if (this.allSort() === value) return;
    this.allSort.set(value);
    this.allPage.set(1);
    this.load();
  }
  protected previousAllPage(): void {
    if (this.allPage() <= 1) return;
    this.allPage.update((page) => page - 1);
    this.load();
  }
  protected nextAllPage(): void {
    if (!this.allTemplates()?.hasNext) return;
    this.allPage.update((page) => page + 1);
    this.load();
  }
  protected trackTemplate(_index: number, template: PicksTemplatePreview): string { return template.id; }

  protected toggleLike(template: PicksTemplatePreview, event: MouseEvent): void {
    event.preventDefault();
    event.stopPropagation();
    if (this.busyLikeIds().has(template.id)) return;
    this.busyLikeIds.update((current) => new Set(current).add(template.id));
    const request = template.isLikedByViewer ? this.api.unlikeTemplate(template.id) : this.api.likeTemplate(template.id);
    request.subscribe({ next: () => { this.busyLikeIds.update((current) => { const next = new Set(current); next.delete(template.id); return next; }); this.load(); }, error: () => this.busyLikeIds.update((current) => { const next = new Set(current); next.delete(template.id); return next; }) });
  }

  protected creatorName(template: PicksTemplatePreview): string { return template.creator?.name || template.creator?.username || this.copy.unknownCreator; }
  protected templateRoute(template: PicksTemplatePreview): string[] { return ['/picks/templates', template.id]; }
  protected pickRoute(template: PicksTemplatePreview): string[] | null { return template.latestMyPickId ? ['/picks', template.latestMyPickId] : null; }
  protected pageCount(page: PicksTemplatePage | null): string { return this.copy.templateCount.replace('{count}', new Intl.NumberFormat('pt-BR').format(page?.totalElements ?? 0)); }
  protected dateLabel(date: string | null): string { return date ? new Intl.DateTimeFormat('pt-BR', { day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(date)) : ''; }

  private fail(error: unknown): void {
    this.status.set('error');
    this.error.set(error instanceof HttpErrorResponse && error.status === 0 ? this.copy.connectionError : this.copy.loadError);
    this.popular.set(this.emptyPage); this.mostPicked.set(this.emptyPage); this.recent.set(this.emptyPage); this.mine.set(this.emptyPage);
    this.allTemplates.set(this.emptyPage);
  }
}
