import { ModalFocusDirective } from '../../../../shared/directives/modal-focus.directive';
import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, OnDestroy, computed, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { Subscription } from 'rxjs';
import { ContentApiService, ContentEpisodeSelection, ContentSeasonSelection } from '../../../content/data-access/content-api.service';
import { SearchApiService, SearchContentView, SearchPersonView, SearchView } from '../../../search-content/data-access/search-api.service';
import { PicksApiService, PickCreationSelection, PicksTemplateCategoryInput } from '../../data-access/picks-api.service';
import { messageCatalog } from '../../../../shared/i18n/messages';

type PickType = 'MOVIE' | 'SERIES' | 'EPISODE' | 'PERSON';
type CategoryGroup = 'PRIMARY' | 'SECONDARY';
type OptionMode = 'OPEN' | 'FIXED';
type DraftOption = { key: string; target: PickCreationSelection['target']; label: string; image: string | null; subtitle: string | null };
type DraftCategory = { key: string; name: string; description: string; group: CategoryGroup; allowedType: PickType; optionMode: OptionMode; options: DraftOption[]; pendingNames: string[] };
type ImportedData = { title: string; description: string; coverImage: string; eligibilityStartDate: string; eligibilityEndDate: string; categories: Array<{ name: string; description: string; group: CategoryGroup; allowedType: PickType; optionMode: OptionMode; nominees: string[] }> };

@Component({
  selector: 'app-pick-create',
  standalone: true,
  imports: [ModalFocusDirective, RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './pick-create.component.html',
  styleUrl: './pick-create.component.css',
})
export class PickCreateComponent implements OnDestroy {
  protected readonly copy = messageCatalog['pt-BR'].pickCreatePage;
  protected readonly picksCopy = messageCatalog['pt-BR'].picksPage;
  protected readonly importCopy = messageCatalog['pt-BR'].pickImportPage;
  protected readonly step = signal(1);
  protected readonly name = signal('');
  protected readonly description = signal('');
  protected readonly coverImage = signal('');
  protected readonly limitByDate = signal(false);
  protected readonly eligibilityStartDate = signal('');
  protected readonly eligibilityEndDate = signal('');
  protected readonly categories = signal<DraftCategory[]>([]);
  protected readonly formError = signal('');
  protected readonly creating = signal(false);
  protected readonly activeCategoryKey = signal<string | null>(null);
  protected readonly optionQuery = signal('');
  protected readonly optionSearchBusy = signal(false);
  protected readonly optionSearchError = signal('');
  protected readonly optionResults = signal<{ contents: SearchContentView[]; people: SearchPersonView[] }>({ contents: [], people: [] });
  protected readonly pendingNominee = signal<string | null>(null);
  protected readonly selectedSeries = signal<SearchContentView | null>(null);
  protected readonly seriesSeasons = signal<ContentSeasonSelection[]>([]);
  protected readonly seriesSeason = signal<number | null>(null);
  protected readonly categoryCount = computed(() => this.categories().length);
  protected readonly activeCategory = computed(() => this.categories().find((item) => item.key === this.activeCategoryKey()) ?? null);
  protected readonly activeCategoryOptions = computed(() => this.activeCategory()?.options ?? []);
  protected readonly seasonEpisodes = signal<ContentEpisodeSelection[]>([]);
  protected readonly nomineeCount = computed(() => this.categories().reduce((sum, item) => sum + item.options.length + item.pendingNames.length, 0));
  protected readonly errorText = computed(() => this.formError());

  private readonly router = inject(Router);
  private readonly api = inject(PicksApiService);
  private readonly searchApi = inject(SearchApiService);
  private readonly contentApi = inject(ContentApiService);
  private nextCategoryId = 0;
  private nextOptionId = 0;

  constructor() {
    const imported = history.state?.['importedTemplate'] as ImportedData | undefined;
    if (imported) this.loadImportedData(imported);
  }

  protected goToStep(step: number): void {
    if (step < this.step()) { this.step.set(step); this.formError.set(''); return; }
    this.nextStep();
  }
  protected nextStep(): void {
    this.formError.set('');
    if (this.step() === 1 && !this.name().trim()) { this.formError.set(this.copy.nameRequired); return; }
    if (this.step() === 2) {
      if (!this.categories().length || this.categories().some((item) => !item.name.trim())) { this.formError.set(this.copy.categoryNameRequired); return; }
    }
    if (this.step() === 3) {
      const invalid = this.categories().some((item) => item.optionMode === 'FIXED' && (item.options.length === 0 || item.pendingNames.length > 0));
      if (invalid) { this.formError.set(this.copy.optionsRequired); return; }
    }
    this.step.update((current) => Math.min(4, current + 1));
  }
  protected previousStep(): void { this.formError.set(''); this.step.update((current) => Math.max(1, current - 1)); }
  protected cancel(): void { void this.router.navigateByUrl('/picks'); }
  protected updateName(event: Event): void { this.name.set((event.target as HTMLInputElement).value); }
  protected updateDescription(event: Event): void { this.description.set((event.target as HTMLTextAreaElement).value); }
  protected updateCover(event: Event): void { this.coverImage.set((event.target as HTMLInputElement).value); }
  protected setDateLimit(event: Event): void { this.limitByDate.set((event.target as HTMLInputElement).checked); }
  protected setEligibilityStart(event: Event): void { this.eligibilityStartDate.set((event.target as HTMLInputElement).value); }
  protected setEligibilityEnd(event: Event): void { this.eligibilityEndDate.set((event.target as HTMLInputElement).value); }
  protected addCategory(): void {
    const items = this.categories();
    this.categories.set([...items, { key: `draft-${++this.nextCategoryId}`, name: '', description: '', group: items.length < 3 ? 'PRIMARY' : 'SECONDARY', allowedType: 'MOVIE', optionMode: 'OPEN', options: [], pendingNames: [] }]);
  }
  protected removeCategory(key: string): void { this.categories.update((items) => items.filter((item) => item.key !== key)); }
  protected setCategoryName(key: string, event: Event): void { this.patchCategory(key, { name: (event.target as HTMLInputElement).value }); }
  protected setCategoryDescription(key: string, event: Event): void { this.patchCategory(key, { description: (event.target as HTMLInputElement).value }); }
  protected setCategoryGroup(key: string, event: Event): void { this.patchCategory(key, { group: (event.target as HTMLSelectElement).value as CategoryGroup }); }
  protected setCategoryType(key: string, event: Event): void {
    const allowedType = (event.target as HTMLSelectElement).value as PickType;
    this.patchCategory(key, { allowedType, options: [], pendingNames: [] });
  }
  protected setOptionMode(key: string, event: Event): void {
    const optionMode = (event.target as HTMLSelectElement).value as OptionMode;
    this.patchCategory(key, { optionMode, options: [], pendingNames: [] });
  }
  protected openOptions(category: DraftCategory): void {
    this.activeCategoryKey.set(category.key); this.optionQuery.set(''); this.optionResults.set({ contents: [], people: [] }); this.optionSearchError.set(''); this.pendingNominee.set(null); this.selectedSeries.set(null); this.seriesSeasons.set([]); this.clearEpisodeRequests(); this.seriesSeason.set(null);
  }
  protected closeOptions(): void { this.activeCategoryKey.set(null); this.pendingNominee.set(null); this.optionQuery.set(''); this.selectedSeries.set(null); this.seriesSeasons.set([]); this.clearEpisodeRequests(); }
  protected setOptionQuery(event: Event): void { this.optionQuery.set((event.target as HTMLInputElement).value); }
  protected searchOptions(event: Event): void { event.preventDefault(); this.searchCurrentOption(); }
  protected searchPendingNominee(category: DraftCategory, nominee: string): void { this.activeCategoryKey.set(category.key); this.pendingNominee.set(nominee); this.optionQuery.set(nominee); this.optionResults.set({ contents: [], people: [] }); this.optionSearchError.set(''); this.searchCurrentOption(); }
  protected chooseSearchContent(content: SearchContentView): void {
    const category = this.activeCategory(); if (!category) return;
    if (category.allowedType === 'EPISODE') { this.loadSeries(content); return; }
    const target = { content: { type: content.type, tmdbId: content.tmdbId, seriesTmdbId: null, seasonNumber: null, episodeNumber: null } };
    this.addOption(category, { target, label: content.title || this.copy.movie, image: content.posterUrl ?? null, subtitle: [content.releaseYear, content.genres?.slice(0, 2).join(', ')].filter(Boolean).join(' · ') });
  }
  protected choosePerson(person: SearchPersonView): void {
    const category = this.activeCategory(); if (!category) return;
    this.addOption(category, { target: { personTmdbId: person.tmdbId }, label: person.name || this.copy.person, image: person.photoUrl ?? null, subtitle: person.knownForDepartment ?? null });
  }
  protected setSeriesSeason(event: Event): void { const raw = (event.target as HTMLSelectElement).value; this.seriesSeason.set(raw !== '' && Number.isInteger(Number(raw)) ? Number(raw) : null); this.loadSeasonEpisodes(); }
  protected seasonChoices(): Array<{ number: number; name: string }> { return this.seriesSeasons().filter((season) => season.seasonNumber !== null && season.seasonNumber >= 0).map((season) => ({ number: season.seasonNumber as number, name: season.name || `${this.copy.season} ${season.seasonNumber}` })); }
  protected addEpisodeOption(episode: ContentEpisodeSelection): void {
    const category = this.activeCategory(); const series = this.selectedSeries();
    if (!category || !series || episode.seasonNumber === null || episode.episodeNumber === null) return;
    const target = { content: { type: 'EPISODE' as const, tmdbId: null, seriesTmdbId: series.tmdbId, seasonNumber: episode.seasonNumber, episodeNumber: episode.episodeNumber } };
    this.addOption(category, { target, label: `${series.title || this.copy.series} · T${episode.seasonNumber} E${episode.episodeNumber}${episode.name ? ` · ${episode.name}` : ''}`, image: episode.stillUrl ? episode.stillUrl : series.posterUrl ?? null, subtitle: episode.airDate ?? null });
  }
  protected removeOption(categoryKey: string, optionKey: string): void { this.categories.update((items) => items.map((item) => item.key === categoryKey ? { ...item, options: item.options.filter((option) => option.key !== optionKey) } : item)); }
  protected typeLabel(value: PickType): string { return value === 'MOVIE' ? this.copy.movie : value === 'SERIES' ? this.copy.series : value === 'EPISODE' ? this.copy.episode : this.copy.person; }
  protected optionCountLabel(count: number): string { return this.copy.previewOptions.replace('{count}', String(count)); }
  protected optionNames(category: DraftCategory): string { return category.options.map((option) => option.label).join(' · '); }
  protected hasFixedCategories(): boolean { return this.categories().some((category) => category.optionMode === 'FIXED'); }
  protected submit(): void {
    if (this.creating()) return;
    const name = this.name().trim(); const categories = this.categories();
    if (!name) { this.step.set(1); this.formError.set(this.copy.nameRequired); return; }
    if (!categories.length || categories.some((item) => !item.name.trim())) { this.step.set(2); this.formError.set(this.copy.categoryNameRequired); return; }
    if (categories.some((item) => item.optionMode === 'FIXED' && (!item.options.length || item.pendingNames.length))) { this.step.set(3); this.formError.set(this.copy.optionsRequired); return; }
    const requestCategories: PicksTemplateCategoryInput[] = categories.map((item, index) => ({
      name: item.name.trim(), description: item.description.trim() || null, group: item.group, displayOrder: index, allowedType: item.allowedType, optionMode: item.optionMode,
      ...(item.optionMode === 'FIXED' ? { options: item.options.map((option) => ({ target: option.target })) } : {}),
    }));
    this.creating.set(true); this.formError.set('');
    this.api.createTemplate({ name, description: this.description().trim() || null, coverImage: this.coverImage().trim() || null, eligibilityStartDate: this.limitByDate() ? this.eligibilityStartDate() || null : null, eligibilityEndDate: this.limitByDate() ? this.eligibilityEndDate() || null : null, categories: requestCategories }).subscribe({
      next: (template) => { this.creating.set(false); void this.router.navigate(['/picks/templates', template.id]); },
      error: (error: unknown) => { this.creating.set(false); this.formError.set(error instanceof HttpErrorResponse && error.status === 0 ? this.picksCopy.connectionError : this.copy.createError); },
    });
  }

  private patchCategory(key: string, patch: Partial<DraftCategory>): void { this.categories.update((items) => items.map((item) => item.key === key ? { ...item, ...patch } : item)); }
  private addOption(category: DraftCategory, option: Omit<DraftOption, 'key'>): void {
    const current = this.categories().find((item) => item.key === category.key); if (!current) return;
    const duplicate = current.options.some((item) => JSON.stringify(item.target) === JSON.stringify(option.target));
    if (!duplicate) {
      this.patchCategory(category.key, { options: [...current.options, { ...option, key: `option-${++this.nextOptionId}` }], pendingNames: this.pendingNominee() ? current.pendingNames.filter((name, index) => index !== current.pendingNames.indexOf(this.pendingNominee() as string)) : current.pendingNames });
    }
    this.optionResults.set({ contents: [], people: [] }); this.pendingNominee.set(null); this.optionQuery.set('');
  }
  private searchCurrentOption(): void {
    const category = this.activeCategory(); const query = this.optionQuery().trim(); if (!category || !query || this.optionSearchBusy()) return;
    const scope = category.allowedType === 'PERSON' ? 'PERSON' : category.allowedType === 'MOVIE' ? 'MOVIE' : 'SERIES';
    this.optionSearchBusy.set(true); this.optionSearchError.set('');
    this.searchApi.search(query, scope).subscribe({ next: (result) => { this.optionSearchBusy.set(false); this.setResults(result); }, error: () => { this.optionSearchBusy.set(false); this.optionSearchError.set(this.copy.createError); } });
  }
  private setResults(result: SearchView): void { this.optionResults.set({ contents: result.contents ?? [], people: result.people ?? [] }); }
  private seriesRequest?: Subscription;
  private episodeRequest?: Subscription;

  ngOnDestroy(): void { this.clearEpisodeRequests(); }

  private clearEpisodeRequests(): void {
    this.seriesRequest?.unsubscribe(); this.episodeRequest?.unsubscribe();
    this.seasonEpisodes.set([]); this.optionSearchBusy.set(false);
  }

  private loadSeries(series: SearchContentView): void {
    this.clearEpisodeRequests(); this.seriesSeasons.set([]); this.selectedSeries.set(series);
    this.optionSearchBusy.set(true); this.optionSearchError.set('');
    this.seriesRequest = this.contentApi.getSeriesSeasons(series.tmdbId).subscribe({
      next: seasons => {
        this.seriesSeasons.set(seasons); this.optionSearchBusy.set(false);
        this.seriesSeason.set(seasons[0]?.seasonNumber ?? null); this.loadSeasonEpisodes();
      },
      error: () => { this.optionSearchBusy.set(false); this.optionSearchError.set(this.copy.seriesError); },
    });
  }

  private loadSeasonEpisodes(): void {
    this.episodeRequest?.unsubscribe(); this.seasonEpisodes.set([]);
    const series = this.selectedSeries(); const season = this.seriesSeason();
    if (!series || season === null) { this.optionSearchBusy.set(false); return; }
    this.optionSearchBusy.set(true); this.optionSearchError.set('');
    this.episodeRequest = this.contentApi.getSeasonEpisodes(series.tmdbId, season).subscribe({
      next: episodes => { this.seasonEpisodes.set(episodes); this.optionSearchBusy.set(false); },
      error: () => { this.optionSearchBusy.set(false); this.optionSearchError.set(this.copy.seriesError); },
    });
  }
  private loadImportedData(imported: ImportedData): void {
    this.name.set(imported.title); this.description.set(imported.description); this.coverImage.set(imported.coverImage); this.eligibilityStartDate.set(imported.eligibilityStartDate); this.eligibilityEndDate.set(imported.eligibilityEndDate); this.limitByDate.set(Boolean(imported.eligibilityStartDate || imported.eligibilityEndDate));
    this.categories.set(imported.categories.map((category, index) => ({ key: `import-${++this.nextCategoryId}`, name: category.name, description: category.description, group: category.group, allowedType: category.allowedType, optionMode: category.optionMode, options: [], pendingNames: [...category.nominees] })));
  }
}
