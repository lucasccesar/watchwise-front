import { ModalFocusDirective } from '../../../../shared/directives/modal-focus.directive';
import { DialogBackdropComponent } from '../../../../shared/components/dialog-backdrop/dialog-backdrop.component';
import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, OnDestroy, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { forkJoin, Subscription } from 'rxjs';
import { ContentApiService, ContentEpisodeSelection, ContentSeasonSelection } from '../../../content/data-access/content-api.service';
import { SearchApiService, SearchContentView, SearchPersonView, SearchView } from '../../../search-content/data-access/search-api.service';
import { ContentImageAction, ContentImageActionSelection, ContentImageActionsComponent } from '../../../../shared/components/content-image-actions/content-image-actions.component';
import { messageCatalog } from '../../../../shared/i18n/messages';
import { PickCreationSelection, PicksApiService, PicksOptionView, PicksTargetSearch, PicksTemplateCategory, PicksTemplateDetail } from '../../data-access/picks-api.service';
import { PageSkeletonComponent } from '../../../../shared/components/page-skeleton/page-skeleton.component';
import { ToastNotificationsService } from '../../../../shared/components/toast-notifications/toast-notifications.service';
import { CheckIconComponent } from '../../../../shared/components/check-icon/check-icon.component';
import { tmdbImageUrl, type TmdbImageSize } from '../../../../shared/utils/tmdb-image-url';

type PickVisibility = 'PUBLIC' | 'FOLLOWERS' | 'PRIVATE';
type PickAnswerState = { target: PickCreationSelection['target']; label: string; image: string | null; subtitle: string | null; option?: PicksOptionView };
type SearchState = { contents: SearchContentView[]; people: SearchPersonView[] };

@Component({
  selector: 'app-pick-fill',
  standalone: true,
  imports: [DialogBackdropComponent, ModalFocusDirective, RouterLink, ContentImageActionsComponent, PageSkeletonComponent, CheckIconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './pick-fill.component.html',
  styleUrl: './pick-fill.component.css',
})
export class PickFillComponent implements OnDestroy {
  protected readonly copy = messageCatalog['pt-BR'].pickFillPage;
  protected readonly templateCopy = messageCatalog['pt-BR'].pickTemplatePage;
  protected readonly picksCopy = messageCatalog['pt-BR'].picksPage;
  protected readonly homeCopy = messageCatalog['pt-BR'].home;
  protected readonly templateId = inject(ActivatedRoute).snapshot.paramMap.get('templateId') ?? '';
  protected readonly template = signal<PicksTemplateDetail | null>(null);
  protected readonly loading = signal(true);
  protected readonly loadError = signal('');
  protected readonly activeCategoryId = signal<string | null>(null);
  protected readonly answers = signal<ReadonlyMap<string, PickAnswerState>>(new Map());
  protected readonly visibility = signal<PickVisibility>('PUBLIC');
  protected readonly optionViews = signal<ReadonlyMap<string, PicksOptionView[]>>(new Map());
  protected readonly searchQuery = signal('');
  protected readonly searchBusy = signal(false);
  protected readonly searchError = signal('');
  protected readonly searchResults = signal<SearchState>({ contents: [], people: [] });
  protected readonly selectedSeries = signal<SearchContentView | null>(null);
  protected readonly seriesSeasons = signal<ContentSeasonSelection[]>([]);
  protected readonly episodeSeason = signal<number | null>(null);
  protected readonly publishing = signal(false);
  protected readonly publishError = signal('');
  protected readonly imageActions: readonly ContentImageAction[] = [{ id: 'open', label: this.copy.selected, icon: 'eye' }];
  protected readonly groups = computed(() => ({
    primary: (this.template()?.categories ?? []).filter((item) => item.group === 'PRIMARY').sort((a, b) => a.displayOrder - b.displayOrder),
    secondary: (this.template()?.categories ?? []).filter((item) => item.group === 'SECONDARY').sort((a, b) => a.displayOrder - b.displayOrder),
  }));
  protected readonly answeredCount = computed(() => this.answers().size);
  protected readonly categoriesCount = computed(() => this.template()?.categories.length ?? 0);
  protected readonly activeCategory = computed(() => this.template()?.categories.find((category) => category.id === this.activeCategoryId()) ?? null);
  protected readonly activeOptions = computed(() => this.optionViews().get(this.activeCategoryId() ?? '') ?? []);
  protected readonly currentSeriesEpisodes = signal<ContentEpisodeSelection[]>([]);

  private readonly api = inject(PicksApiService);
  private readonly searchApi = inject(SearchApiService);
  private readonly contentApi = inject(ContentApiService);
  private readonly router = inject(Router);
  private readonly toasts = inject(ToastNotificationsService);

  constructor() {
    if (!this.templateId) { void this.router.navigateByUrl('/picks'); return; }
    this.loadTemplate();
  }

  protected loadTemplate(): void {
    this.loading.set(true); this.loadError.set('');
    this.api.getTemplate(this.templateId).subscribe({
      next: (template) => { this.template.set(template); this.loading.set(false); this.loadOptionViews(template); },
      error: (error: unknown) => { this.loading.set(false); this.loadError.set(error instanceof HttpErrorResponse && error.status === 0 ? this.templateCopy.connectionError : this.templateCopy.loadError); },
    });
  }

  protected categoryRoute(): string[] { return ['/picks/templates', this.templateId]; }
  protected openCategory(category: PicksTemplateCategory): void {
    this.activeCategoryId.set(category.id); this.searchQuery.set(''); this.searchError.set(''); this.searchResults.set({ contents: [], people: [] });
    this.selectedSeries.set(null); this.seriesSeasons.set([]); this.clearEpisodeRequests(); this.episodeSeason.set(null);
  }
  protected closeCategory(): void { this.clearEpisodeRequests(); this.activeCategoryId.set(null); this.searchQuery.set(''); this.searchError.set(''); }
  protected isAnswered(categoryId: string): boolean { return this.answers().has(categoryId); }
  protected answerFor(categoryId: string): PickAnswerState | null { return this.answers().get(categoryId) ?? null; }
  protected answerName(categoryId: string): string { return this.answerFor(categoryId)?.label ?? ''; }
  protected categoryState(category: PicksTemplateCategory): string { return this.isAnswered(category.id) ? this.copy.answered : this.copy.notAnswered; }
  protected updateQuery(event: Event): void { this.searchQuery.set((event.target as HTMLInputElement).value); }
  protected search(event: Event): void {
    event.preventDefault(); const query = this.searchQuery().trim(); const category = this.activeCategory();
    if (!query || !category || this.searchBusy()) return;
    const scope = category.allowedType === 'PERSON' ? 'PERSON' : category.allowedType === 'MOVIE' ? 'MOVIE' : 'SERIES';
    this.searchBusy.set(true); this.searchError.set('');
    this.searchApi.search(query, scope).subscribe({
      next: (result) => { this.searchBusy.set(false); this.setSearchResults(result); },
      error: () => { this.searchBusy.set(false); this.searchError.set(this.copy.searchError); },
    });
  }
  protected chooseFixed(option: PicksOptionView): void {
    const category = this.activeCategory(); if (!category) return;
    const target = this.targetFromOption(option.target);
    this.saveAnswer(category.id, { target, label: this.optionLabel(option), image: this.optionImage(option), subtitle: this.optionSubtitle(option), option });
    this.closeCategory();
  }
  protected chooseContent(item: SearchContentView): void {
    const category = this.activeCategory(); if (!category) return;
    if (category.allowedType === 'EPISODE') { this.loadSeriesEpisodes(item); return; }
    const target = { content: { type: item.type, tmdbId: item.tmdbId, seriesTmdbId: null, seasonNumber: null, episodeNumber: null } };
    this.saveAnswer(category.id, { target, label: item.title || this.copy.resultMovie, image: this.imageUrl(item.posterUrl, 'w342'), subtitle: this.contentSubtitle(item) });
    this.closeCategory();
  }
  protected choosePerson(person: SearchPersonView): void {
    const category = this.activeCategory(); if (!category) return;
    this.saveAnswer(category.id, { target: { personTmdbId: person.tmdbId }, label: person.name || this.copy.resultPerson, image: this.imageUrl(person.photoUrl, 'w185'), subtitle: person.knownForDepartment ?? null });
    this.closeCategory();
  }
  protected chooseEpisode(episode: ContentEpisodeSelection): void {
    const category = this.activeCategory(); const series = this.selectedSeries();
    if (!category || !series || episode.seasonNumber === null || episode.episodeNumber === null) return;
    const target = { content: { type: 'EPISODE' as const, tmdbId: null, seriesTmdbId: series.tmdbId, seasonNumber: episode.seasonNumber, episodeNumber: episode.episodeNumber } };
    const label = `${series.title || this.copy.resultSeries} · T${episode.seasonNumber} E${episode.episodeNumber}${episode.name ? ` · ${episode.name}` : ''}`;
    this.saveAnswer(category.id, { target, label, image: this.imageUrl(episode.stillUrl || series.posterUrl, 'w500'), subtitle: episode.airDate ?? null });
    this.closeCategory();
  }
  protected setSeason(event: Event): void { const raw = (event.target as HTMLSelectElement).value; this.episodeSeason.set(raw !== '' && Number.isInteger(Number(raw)) ? Number(raw) : null); this.loadSeasonEpisodes(); }
  protected clearAnswer(categoryId: string, event: Event): void {
    event.stopPropagation(); this.answers.update((current) => { const next = new Map(current); next.delete(categoryId); return next; });
  }
  protected setVisibility(value: PickVisibility): void { this.visibility.set(value); }
  protected publish(): void {
    if (this.publishing()) return;
    if (!this.answers().size) { this.publishError.set(this.copy.minimumOne); return; }
    this.publishing.set(true); this.publishError.set('');
    const selections: PickCreationSelection[] = [...this.answers()].map(([categoryId, answer]) => ({ categoryId, target: answer.target }));
    this.api.createPick(this.templateId, { visibility: this.visibility(), selections }).subscribe({
      next: (result) => { this.publishing.set(false); void this.router.navigate(['/picks', result.id]); },
      error: () => { this.publishing.set(false); this.toasts.error(this.copy.publishError); },
    });
  }
  protected optionLabel(option: PicksOptionView): string { return option.preview.contentCard?.title || option.preview.person?.name || this.copy.searchEmpty; }
  protected optionImage(option: PicksOptionView): string | null { return this.imageUrl(option.preview.contentCard?.customPosterUrl || option.preview.contentCard?.posterPath || option.preview.person?.profileUrl, 'w342'); }
  protected optionSubtitle(option: PicksOptionView): string | null { return option.preview.contentCard?.releaseYear?.toString() ?? option.preview.contentCard?.type ?? null; }
  protected optionRating(option: PicksOptionView): string | null { const rating = option.preview.contentCard?.stats?.averageScore; return rating === null || rating === undefined ? null : new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 }).format(rating); }
  protected optionRatingLabel(option: PicksOptionView): string { const rating = this.optionRating(option); return rating ? `${this.homeCopy.communityAverage}: ${rating}` : ''; }
  protected optionMenuKey(option: PicksOptionView): string { return `${this.activeCategoryId()}:${option.id}`; }
  protected menuExpanded(option: PicksOptionView): boolean { return this.openMenu() === this.optionMenuKey(option); }
  protected readonly openMenu = signal('');
  protected toggleOptionMenu(option: PicksOptionView, event: MouseEvent): void { event.stopPropagation(); const key = this.optionMenuKey(option); this.openMenu.update((current) => current === key ? '' : key); }
  protected optionAction(option: PicksOptionView, action: ContentImageActionSelection): void { this.openMenu.set(''); if (action.action.id !== 'open') return; this.openTarget(option.target); }
  protected pickOption(event: Event, option: PicksOptionView): void { event.preventDefault(); event.stopPropagation(); this.chooseFixed(option); }
  protected fixedOptions(categoryId: string): PicksOptionView[] { return this.optionViews().get(categoryId) ?? []; }
  protected hasOpenSearchResults(): boolean { return this.searchResults().contents.length > 0 || this.searchResults().people.length > 0; }
  protected contentSubtitle(item: SearchContentView): string { return [item.releaseYear, item.genres?.slice(0, 2).join(', ')].filter(Boolean).join(' · '); }
  protected resultType(item: SearchContentView): string { return item.type === 'MOVIE' ? this.copy.resultMovie : this.copy.resultSeries; }
  protected searchContentAction(item: SearchContentView): void {
    if (item.type === 'MOVIE') void this.router.navigate(['/content/movie', item.tmdbId]);
    else void this.router.navigate(['/content/series', item.tmdbId]);
  }
  protected closeOnBackdrop(event: MouseEvent): void { if (event.target === event.currentTarget) this.closeCategory(); }
  protected selectedSeriesTitle(): string { return this.selectedSeries()?.title ?? this.copy.resultSeries; }
  protected seasonChoices(): Array<{ seasonNumber: number; name: string }> {
    return this.seriesSeasons().filter((season) => season.seasonNumber !== null && season.seasonNumber >= 0).map((season) => ({ seasonNumber: season.seasonNumber as number, name: season.name || `${this.templateCopy.type.SERIES} ${season.seasonNumber}` }));
  }
  protected episodeLabel(episode: ContentEpisodeSelection): string { return `E${episode.episodeNumber} · ${episode.name || this.copy.episode}`; }
  protected episodeImage(episode: ContentEpisodeSelection): string | null { return this.imageUrl(episode.stillUrl, 'w500'); }
  protected imageUrl(path: string | null | undefined, size: TmdbImageSize = 'w342'): string | null { return tmdbImageUrl(path, size); }

  private setSearchResults(result: SearchView): void {
    this.searchResults.set({ contents: result.contents ?? [], people: result.people ?? [] });
  }
  private seriesRequest?: Subscription;
  private episodeRequest?: Subscription;

  ngOnDestroy(): void { this.clearEpisodeRequests(); }

  private clearEpisodeRequests(): void {
    this.seriesRequest?.unsubscribe(); this.episodeRequest?.unsubscribe();
    this.currentSeriesEpisodes.set([]); this.searchBusy.set(false);
  }

  private loadSeriesEpisodes(series: SearchContentView): void {
    this.clearEpisodeRequests(); this.seriesSeasons.set([]); this.selectedSeries.set(series);
    this.searchBusy.set(true); this.searchError.set('');
    this.seriesRequest = this.contentApi.getSeriesSeasons(series.tmdbId).subscribe({
      next: seasons => {
        this.seriesSeasons.set(seasons); this.searchBusy.set(false);
        this.episodeSeason.set(seasons[0]?.seasonNumber ?? null); this.loadSeasonEpisodes();
      },
      error: () => { this.searchBusy.set(false); this.searchError.set(this.copy.seriesLoadError); },
    });
  }

  private loadSeasonEpisodes(): void {
    this.episodeRequest?.unsubscribe(); this.currentSeriesEpisodes.set([]);
    const series = this.selectedSeries(); const season = this.episodeSeason();
    if (!series || season === null) { this.searchBusy.set(false); return; }
    this.searchBusy.set(true); this.searchError.set('');
    this.episodeRequest = this.contentApi.getSeasonEpisodes(series.tmdbId, season).subscribe({
      next: episodes => { this.currentSeriesEpisodes.set(episodes); this.searchBusy.set(false); },
      error: () => { this.searchBusy.set(false); this.searchError.set(this.copy.seriesLoadError); },
    });
  }
  private saveAnswer(categoryId: string, answer: PickAnswerState): void { this.answers.update((current) => new Map(current).set(categoryId, answer)); this.publishError.set(''); }
  private targetFromOption(target: PicksTargetSearch): PickCreationSelection['target'] {
    const result: PickCreationSelection['target'] = {};
    if (target.content) result.content = target.content;
    if (target.personTmdbId) result.personTmdbId = target.personTmdbId;
    if (target.contextContent) result.contextContent = target.contextContent;
    return result;
  }
  private openTarget(target: PicksTargetSearch): void {
    const content = target.content ?? target.contextContent;
    if (content?.tmdbId && content.type === 'MOVIE') void this.router.navigate(['/content/movie', content.tmdbId]);
    else if (content?.tmdbId && content.type === 'SERIES') void this.router.navigate(['/content/series', content.tmdbId]);
  }
  private loadOptionViews(template: PicksTemplateDetail): void {
    const categories = template.categories.filter((category) => category.optionMode === 'FIXED' && category.options.length > 0);
    if (!categories.length) { this.optionViews.set(new Map()); return; }
    forkJoin(categories.map((category) => this.api.getTemplateOptionViews(template.id, category.id))).subscribe({
      next: (pages) => this.optionViews.set(new Map(categories.map((category, index) => [category.id, pages[index].content]))),
      error: () => this.optionViews.set(new Map()),
    });
  }
}
