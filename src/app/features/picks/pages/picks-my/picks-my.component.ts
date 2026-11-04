import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { PicksApiService, PicksMyPickCard, PicksMyPickPage } from '../../data-access/picks-api.service';
import { messageCatalog } from '../../../../shared/i18n/messages';
import { PicksPageHeroComponent } from '../../shared/picks-page-hero.component';
import { PageSkeletonComponent } from '../../../../shared/components/page-skeleton/page-skeleton.component';
import { CheckIconComponent } from '../../../../shared/components/check-icon/check-icon.component';

type PicksLoadState = 'loading' | 'ready' | 'error';

@Component({
  selector: 'app-picks-my',
  standalone: true,
  imports: [RouterLink, PicksPageHeroComponent, PageSkeletonComponent, CheckIconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './picks-my.component.html',
  styleUrls: ['./picks-my.component.css', '../../shared/picks-shared.css'],
})
export class PicksMyComponent {
  protected readonly copy = messageCatalog['pt-BR'].picksPage;
  protected readonly pickCopy = messageCatalog['pt-BR'].pickTemplatePage;
  protected readonly status = signal<PicksLoadState>('loading');
  protected readonly page = signal(1);
  protected readonly picks = signal<PicksMyPickPage | null>(null);
  protected readonly templateCount = signal<number | null>(null);
  protected readonly error = signal('');
  protected readonly statsText = computed(() => {
    const page = this.picks();
    const templates = this.templateCount();
    if (!page || templates === null) return null;
    return this.copy.pickStats
      .replace('{picks}', new Intl.NumberFormat('pt-BR').format(page.totalElements))
      .replace('{templates}', new Intl.NumberFormat('pt-BR').format(templates));
  });
  protected readonly backdropPath = computed(() => this.picks()?.backdropPath ?? null);

  private readonly api = inject(PicksApiService);
  private readonly pageSize = 10;

  constructor() {
    this.load();
    this.api.getMyTemplates({ page: 1, size: 1 }).subscribe({
      next: (templates) => this.templateCount.set(templates.totalElements),
      error: () => this.templateCount.set(0),
    });
  }

  protected load(): void {
    this.status.set('loading');
    this.error.set('');
    this.api.getMyPicksView(this.page(), this.pageSize).subscribe({
      next: (page) => { this.picks.set(page); this.status.set('ready'); },
      error: (error: unknown) => {
        this.status.set('error');
        this.error.set(error instanceof HttpErrorResponse && error.status === 0 ? this.copy.connectionError : this.copy.loadPicksError);
      },
    });
  }

  protected nextPage(): void {
    if (!this.picks()?.hasNext) return;
    this.page.update((value) => value + 1);
    this.load();
  }

  protected previousPage(): void {
    if (this.page() <= 1) return;
    this.page.update((value) => value - 1);
    this.load();
  }

  protected trackPick(_index: number, pick: PicksMyPickCard): string { return pick.id; }
  protected pickRoute(pick: PicksMyPickCard): string[] { return ['/picks', pick.id]; }
  protected creatorName(pick: PicksMyPickCard): string { return pick.picksTemplate.creator?.name || pick.picksTemplate.creator?.username || this.copy.unknownCreator; }
  protected creatorHandle(pick: PicksMyPickCard): string | null { return pick.picksTemplate.creator?.username ? '@' + pick.picksTemplate.creator.username : null; }
  protected visibilityLabel(pick: PicksMyPickCard): string {
    if (pick.visibility === 'FOLLOWERS') return this.pickCopy.followers;
    if (pick.visibility === 'PRIVATE') return this.pickCopy.private;
    return this.pickCopy.public;
  }
  protected dateLabel(date: string | null): string {
    if (!date) return '';
    return new Intl.DateTimeFormat('pt-BR', { day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(date));
  }
  protected progressLabel(pick: PicksMyPickCard): string {
    return this.copy.pickProgress
      .replace('{answered}', new Intl.NumberFormat('pt-BR').format(pick.answeredCategoriesCount))
      .replace('{total}', new Intl.NumberFormat('pt-BR').format(pick.totalCategoriesCount));
  }
  protected progressPercent(pick: PicksMyPickCard): number {
    if (!pick.totalCategoriesCount) return 0;
    return Math.min(100, Math.round((pick.answeredCategoriesCount / pick.totalCategoriesCount) * 100));
  }
  protected extraAnswers(pick: PicksMyPickCard): number {
    return Math.max(0, pick.answeredCategoriesCount - (pick.answeredCategories?.length ?? 0));
  }
  protected countLabel(count: number): string {
    return this.copy.templateCount.replace('{count}', new Intl.NumberFormat('pt-BR').format(count));
  }
  protected pageLabel(): string {
    return this.copy.pageOf
      .replace('{page}', this.page().toString())
      .replace('{total}', (this.picks()?.totalPages ?? 1).toString());
  }
}
