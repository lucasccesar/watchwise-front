import { ChangeDetectionStrategy, Component, OnDestroy, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { concatMap, from, Subscription, toArray } from 'rxjs';
import { ContentApiService, ContentEpisodeSelection, ContentSeasonSelection } from '../../../content/data-access/content-api.service';
import { ListsApiService, ListCardPreview, ListContentReference, ListDetailItem, ListDetailView, ListVisibility } from '../../data-access/lists-api.service';
import { SearchApiService, SearchContentView } from '../../../search-content/data-access/search-api.service';
import { messageCatalog } from '../../../../shared/i18n/messages';
import { ToastNotificationsService } from '../../../../shared/components/toast-notifications/toast-notifications.service';
import { AuthSessionService } from '../../../../core/session/session.service';
import { tmdbImageUrl } from '../../../../shared/utils/tmdb-image-url';

type ListCreateKind = 'MOVIES_AND_SERIES' | 'SEASONS' | 'EPISODES';
type ListComposerItem = {
  key: string;
  reference?: ListContentReference;
  title: string;
  inlineInfo?: string;
  year: string | number | null;
  imageUrl: string | null;
  existingListItemId?: string;
  nestedListId?: string;
};

@Component({
  selector: 'app-list-create',
  standalone: true,
  imports: [RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './list-create.component.html',
  styleUrl: './list-create.component.css',
})
export class ListCreateComponent implements OnDestroy {
  protected readonly copy = messageCatalog['pt-BR'].listsPage;
  protected readonly detailCopy = messageCatalog['pt-BR'].listDetailPage;
  protected readonly name = signal('');
  protected readonly description = signal('');
  protected readonly visibility = signal<ListVisibility>('PUBLIC');
  protected readonly kind = signal<ListCreateKind>('MOVIES_AND_SERIES');
  protected readonly searchQuery = signal('');
  protected readonly searchResults = signal<SearchContentView[]>([]);
  protected readonly selectedSeries = signal<SearchContentView | null>(null);
  protected readonly seasons = signal<ContentSeasonSelection[]>([]);
  protected readonly selectedSeason = signal<number | null>(null);
  protected readonly episodes = signal<ContentEpisodeSelection[]>([]);
  protected readonly selectedEpisode = signal<number | null>(null);
  protected readonly selectedItems = signal<ListComposerItem[]>([]);
  private readonly itemDraftsByKind = signal<ReadonlyMap<ListCreateKind, ListComposerItem[]>>(new Map());
  protected readonly editListId = signal<string | null>(null);
  protected readonly loadingList = signal(false);
  protected readonly loadError = signal('');
  protected readonly nestedListEdit = signal(false);
  protected readonly originalItemIds = signal<ReadonlySet<string>>(new Set());
  protected readonly searching = signal(false);
  protected readonly creating = signal(false);
  protected readonly searchError = signal('');
  protected readonly formError = signal('');
  protected readonly nameLength = computed(() => this.name().length);
  protected readonly itemCount = computed(() => this.selectedItems().length);
  protected readonly itemCountLabel = computed(() => {
    const count = this.itemCount().toString();
    return this.nestedListEdit()
      ? this.copy.listCount.replace('{count}', count)
      : (this.itemCount() === 1 ? this.copy.singleTitleCount : this.copy.titleCount).replace('{count}', count);
  });
  protected readonly selectionCountLabel = computed(() => {
    if (this.kind() === 'SEASONS' && this.selectedSeries()) return `${this.seasons().length} ${this.copy.seasons.toLowerCase()}`;
    if (this.kind() === 'EPISODES' && this.selectedSeason() !== null) return `${this.episodes().length} ${this.copy.episodes.toLowerCase()}`;
    return this.itemCountLabel();
  });
  protected readonly canAddSelection = computed(() => {
    if (this.searching() || this.itemCount() >= 100) return false;
    const series = this.selectedSeries();
    if (!series) return false;
    if (this.kind() === 'SEASONS') {
      const season = this.seasons().find((option) => option.seasonNumber === this.selectedSeason());
      return !!season && !this.isAlreadyAdded({ type: 'SEASON', seriesTmdbId: series.tmdbId, seasonNumber: season.seasonNumber! });
    }
    if (this.kind() === 'EPISODES') {
      const episode = this.episodes().find((option) => option.episodeNumber === this.selectedEpisode());
      return !!episode && !this.isAlreadyAdded({ type: 'EPISODE', seriesTmdbId: series.tmdbId, seasonNumber: episode.seasonNumber!, episodeNumber: episode.episodeNumber! });
    }
    return false;
  });
  protected readonly itemsTitle = computed(() => this.isEditing() && this.nestedListEdit() ? this.copy.nestedLists : this.typeTitle());
  protected readonly selectedItemsTitle = computed(() => this.nestedListEdit() ? this.copy.nestedLists : this.copy.selected);
  protected readonly typeTitle = computed(() => {
    const labels: Record<ListCreateKind, string> = {
      MOVIES_AND_SERIES: this.copy.moviesAndSeries,
      SEASONS: this.copy.seasons,
      EPISODES: this.copy.episodes,
    };
    return labels[this.kind()];
  });
  protected readonly searchPlaceholder = computed(() => {
    if (this.kind() === 'SEASONS') return this.copy.searchSeriesForSeasons;
    if (this.kind() === 'EPISODES') return this.copy.searchSeriesForEpisodes;
    return this.copy.searchMoviesAndSeries;
  });
  protected readonly isEditing = computed(() => this.editListId() !== null);
  protected readonly cancelRoute = computed(() => this.editListId() ? ['/lists', this.editListId()!] : ['/lists']);

  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly listsApi = inject(ListsApiService);
  private readonly searchApi = inject(SearchApiService);
  private readonly contentApi = inject(ContentApiService);
  private readonly session = inject(AuthSessionService);
  private readonly toasts = inject(ToastNotificationsService);
  private searchTimer?: ReturnType<typeof setTimeout>;
  private searchRequest?: Subscription;
  private selectionRequest?: Subscription;
  private listRequest?: Subscription;
  private nextItemKey = 0;

  constructor() {
    const listId = this.route.pathFromRoot.map((route) => route.snapshot.paramMap.get('listId')).find((value) => value !== null) ?? null;
    if (!listId) return;
    this.editListId.set(listId);
    this.loadingList.set(true);
    this.loadExistingList(listId, 1, []);
  }

  protected updateName(event: Event): void {
    this.name.set((event.target as HTMLInputElement).value.slice(0, 100));
    this.formError.set('');
  }

  protected updateDescription(event: Event): void {
    this.description.set((event.target as HTMLTextAreaElement).value);
  }

  protected updateSearch(event: Event): void {
    const query = (event.target as HTMLInputElement).value;
    this.searchQuery.set(query);
    this.searchResults.set([]);
    this.searchError.set('');
    this.searchRequest?.unsubscribe();
    if (this.searchTimer) clearTimeout(this.searchTimer);
    if (query.trim().length < 2) {
      this.searching.set(false);
      return;
    }
    this.searchTimer = setTimeout(() => this.runSearch(), 280);
  }

  protected setKind(kind: ListCreateKind): void {
    if (this.kind() === kind) return;
    const currentKind = this.kind();
    this.itemDraftsByKind.update((drafts) => new Map(drafts).set(currentKind, this.selectedItems()));
    this.selectedItems.set(this.itemDraftsByKind().get(kind) ?? []);
    this.kind.set(kind);
    this.searchResults.set([]);
    this.selectedSeries.set(null);
    this.seasons.set([]);
    this.selectedSeason.set(null);
    this.episodes.set([]);
    this.selectedEpisode.set(null);
    this.searchError.set('');
    this.searchRequest?.unsubscribe();
    this.selectionRequest?.unsubscribe();
    if (this.searchTimer) clearTimeout(this.searchTimer);
    this.searching.set(false);
    if (this.searchQuery().trim().length >= 2) this.searchTimer = setTimeout(() => this.runSearch(), 100);
  }

  protected setVisibility(visibility: ListVisibility): void {
    this.visibility.set(visibility);
  }

  protected selectSearchResult(result: SearchContentView): void {
    if (this.kind() !== 'MOVIES_AND_SERIES') return;
    this.addItem({
      reference: { type: result.type, tmdbId: result.tmdbId },
      title: result.title || this.copy.titleUnavailable,
      year: result.releaseYear ?? null,
      imageUrl: this.imageUrl(result.posterUrl),
    });
    this.clearSearch();
  }

  protected selectSeries(series: SearchContentView): void {
    this.searchResults.set([]);
    this.selectedSeries.set(series);
    this.seasons.set([]);
    this.episodes.set([]);
    this.selectedSeason.set(null);
    this.selectedEpisode.set(null);
    this.searching.set(true);
    this.searchError.set('');
    this.selectionRequest?.unsubscribe();
    this.selectionRequest = this.contentApi.getSeriesSeasons(series.tmdbId).subscribe({
      next: (seasons) => {
        const available = seasons.filter((season) => season.seasonNumber !== null && season.seasonNumber >= 0);
        this.seasons.set(available);
        this.searching.set(false);
        if (this.kind() === 'EPISODES' && available.length) this.setSelectedSeason(available[0].seasonNumber);
      },
      error: () => {
        this.searching.set(false);
        this.searchError.set(this.copy.searchError);
      },
    });
  }

  protected setSelectedSeason(seasonNumber: number): void {
    this.selectedSeason.set(seasonNumber);
    this.episodes.set([]);
    this.selectedEpisode.set(null);
    const series = this.selectedSeries();
    if (!series || this.kind() !== 'EPISODES') return;
    this.selectionRequest?.unsubscribe();
    this.searching.set(true);
    this.searchError.set('');
    this.selectionRequest = this.contentApi.getSeasonEpisodes(series.tmdbId, seasonNumber).subscribe({
      next: (episodes) => { this.episodes.set(episodes); this.searching.set(false); },
      error: () => { this.searching.set(false); this.searchError.set(this.copy.searchError); },
    });
  }

  protected changeSelectedSeason(event: Event): void {
    const rawValue = (event.target as HTMLSelectElement).value;
    if (!rawValue) {
      this.selectedSeason.set(null);
      this.episodes.set([]);
      this.selectedEpisode.set(null);
      this.selectionRequest?.unsubscribe();
      this.searching.set(false);
      return;
    }
    const value = Number(rawValue);
    if (Number.isInteger(value)) this.setSelectedSeason(value);
  }

  protected changeSelectedEpisode(event: Event): void {
    const rawValue = (event.target as HTMLSelectElement).value;
    const value = Number(rawValue);
    this.selectedEpisode.set(rawValue && Number.isInteger(value) ? value : null);
  }

  protected addSelectedOption(): void {
    if (!this.canAddSelection()) return;
    if (this.kind() === 'SEASONS') {
      const season = this.seasons().find((option) => option.seasonNumber === this.selectedSeason());
      if (season && this.addSeason(season)) this.selectedSeason.set(null);
      return;
    }
    if (this.kind() === 'EPISODES') {
      const episode = this.episodes().find((option) => option.episodeNumber === this.selectedEpisode());
      if (episode && this.addEpisode(episode)) this.selectedEpisode.set(null);
    }
  }

  protected addSeason(season: ContentSeasonSelection): boolean {
    const series = this.selectedSeries();
    if (!series || season.seasonNumber === null) return false;
    return this.addItem({
      reference: { type: 'SEASON', seriesTmdbId: series.tmdbId, seasonNumber: season.seasonNumber },
      title: series.title || this.copy.series,
      inlineInfo: season.name || `T${season.seasonNumber}`,
      year: this.yearFromDate(season.releaseDate),
      imageUrl: this.imageUrl(season.posterUrl || series.posterUrl),
    });
  }

  protected addEpisode(episode: ContentEpisodeSelection): boolean {
    const series = this.selectedSeries();
    if (!series || episode.seasonNumber === null || episode.episodeNumber === null) return false;
    return this.addItem({
      reference: { type: 'EPISODE', seriesTmdbId: series.tmdbId, seasonNumber: episode.seasonNumber, episodeNumber: episode.episodeNumber },
      title: series.title || this.copy.series,
      inlineInfo: `T${episode.seasonNumber} · E${episode.episodeNumber}`,
      year: this.yearFromDate(episode.airDate),
      imageUrl: this.imageUrl(episode.stillUrl || series.posterUrl),
    });
  }

  protected returnToSeriesSearch(): void {
    this.selectionRequest?.unsubscribe();
    this.selectedSeries.set(null);
    this.seasons.set([]);
    this.selectedSeason.set(null);
    this.episodes.set([]);
    this.selectedEpisode.set(null);
    this.searching.set(false);
    this.searchError.set('');
    if (this.searchQuery().trim().length >= 2) this.searchTimer = setTimeout(() => this.runSearch(), 0);
  }

  protected removeItem(key: string): void {
    this.selectedItems.update((items) => items.filter((item) => item.key !== key));
    this.formError.set('');
  }

  protected isAlreadyAdded(reference: ListContentReference): boolean {
    const key = this.referenceKey(reference);
    return this.selectedItems().some((item) => item.reference && this.referenceKey(item.reference) === key);
  }

  protected onImportFile(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';
    if (!file) return;
    this.formError.set('');
    void file.text().then((text) => {
      const parsed: unknown = JSON.parse(text);
      const rawItems = Array.isArray(parsed) ? parsed : (parsed as { items?: unknown } | null)?.items;
      if (!Array.isArray(rawItems)) throw new Error('Missing items');
      const imported = rawItems.map((item) => this.parseImportedItem(item));
      if (!imported.length || imported.some((item) => item === null)) throw new Error('Invalid items');
      const merged = [...this.selectedItems()];
      for (const item of imported as Array<NonNullable<(typeof imported)[number]>>) {
        if (!merged.some((existing) => existing.reference && this.referenceKey(existing.reference) === this.referenceKey(item.reference!))) {
          merged.push({ ...item, key: `item-${++this.nextItemKey}` });
        }
      }
      if (merged.length > 100) {
        this.formError.set(this.copy.itemLimit);
        return;
      }
      this.selectedItems.set(merged);
    }).catch(() => this.formError.set(this.copy.invalidImport));
  }

  protected submit(event: Event): void {
    event.preventDefault();
    const name = this.name().trim();
    if (!name) {
      this.formError.set(this.copy.nameRequired);
      return;
    }
    if (name.length > 100 || this.creating()) return;
    const request = {
      name,
      description: this.description().trim(),
      visibility: this.visibility(),
    };
    this.creating.set(true);
    this.formError.set('');
    if (this.isEditing()) {
      this.saveExistingList(this.editListId()!, request);
      return;
    }
    const createRequest = this.selectedItems().length
      ? this.listsApi.createListWithItems({ ...request, description: request.description || undefined, items: this.selectedItems().map((item) => item.reference!) })
      : this.listsApi.createList({ ...request, description: request.description || undefined });
    createRequest.subscribe({
      next: (list) => {
        this.creating.set(false);
        void this.router.navigate(['/lists', list.id]);
      },
      error: () => {
        this.creating.set(false);
        this.toasts.error(this.copy.createError);
      },
    });
  }

  protected retryLoadList(): void {
    const listId = this.editListId();
    if (!listId) return;
    this.loadError.set('');
    this.loadingList.set(true);
    this.loadExistingList(listId, 1, []);
  }

  ngOnDestroy(): void {
    if (this.searchTimer) clearTimeout(this.searchTimer);
    this.searchRequest?.unsubscribe();
    this.selectionRequest?.unsubscribe();
    this.listRequest?.unsubscribe();
  }

  private loadExistingList(listId: string, page: number, accumulated: ListDetailItem[], firstPage?: ListDetailView): void {
    this.listRequest?.unsubscribe();
    this.listRequest = this.listsApi.getDetail(listId, { page, size: 30, sortBy: 'position', sortDirection: 'asc' }).subscribe({
      next: (detail) => {
        const initial = firstPage ?? detail;
        if (page === 1) {
          if (detail.owner.id !== this.session.user()?.id) {
            this.loadingList.set(false);
            this.toasts.error(this.copy.loadListError);
            void this.router.navigate(['/lists', listId]);
            return;
          }
          this.name.set(detail.name);
          this.description.set(detail.description ?? '');
          this.visibility.set(detail.visibility);
          if (detail.itemScope === 'SEASON') this.kind.set('SEASONS');
          else if (detail.itemScope === 'EPISODE') this.kind.set('EPISODES');
        }
        const items = [...accumulated, ...detail.items.content];
        if (detail.items.hasNext) {
          this.loadExistingList(listId, page + 1, items, initial);
          return;
        }
        const composerItems = items.map((item) => this.toComposerItem(item)).filter((item): item is ListComposerItem => item !== null);
        this.originalItemIds.set(new Set(items.map((item) => item.id)));
        this.selectedItems.set(composerItems);
        this.nestedListEdit.set(initial.itemScope === 'LIST' || composerItems.some((item) => item.nestedListId));
        this.loadingList.set(false);
      },
      error: () => {
        this.loadingList.set(false);
        this.loadError.set(this.copy.loadListError);
      },
    });
  }

  private toComposerItem(item: ListDetailItem): ListComposerItem {
    const card = item.card;
    if (card) {
      return {
        key: `existing-${item.id}`,
        reference: this.referenceFromCard(card) ?? undefined,
        existingListItemId: item.id,
        title: card.title || this.copy.titleUnavailable,
        inlineInfo: card.type === 'SEASON' && card.seasonNumber !== null
          ? `T${card.seasonNumber}`
          : card.type === 'EPISODE' && card.seasonNumber !== null && card.episodeNumber !== null
            ? `T${card.seasonNumber} · E${card.episodeNumber}`
            : undefined,
        year: card.releaseYear,
        imageUrl: this.imageUrl(item.customPosterUrl || card.customPosterUrl || card.posterPath),
      };
    }
    if (item.nestedList) {
      const preview = item.nestedList.previewCards[0];
      return {
        key: `existing-${item.id}`,
        existingListItemId: item.id,
        nestedListId: item.nestedList.id,
        title: item.nestedList.name,
        year: null,
        imageUrl: preview ? this.imageUrl(preview.customPosterUrl || preview.posterPath) : null,
      };
    }
    return {
      key: `existing-${item.id}`,
      existingListItemId: item.id,
      title: this.copy.titleUnavailable,
      year: null,
      imageUrl: this.imageUrl(item.customPosterUrl),
    };
  }

  private referenceFromCard(card: ListCardPreview): ListContentReference | null {
    if ((card.type === 'MOVIE' || card.type === 'SERIES') && card.tmdbId) return { type: card.type, tmdbId: card.tmdbId };
    if (card.type === 'SEASON' && card.seriesTmdbId && card.seasonNumber !== null) {
      return { type: 'SEASON', seriesTmdbId: card.seriesTmdbId, seasonNumber: card.seasonNumber };
    }
    if (card.type === 'EPISODE' && card.seriesTmdbId && card.seasonNumber !== null && card.episodeNumber !== null) {
      return { type: 'EPISODE', seriesTmdbId: card.seriesTmdbId, seasonNumber: card.seasonNumber, episodeNumber: card.episodeNumber };
    }
    return null;
  }

  private saveExistingList(listId: string, request: { name: string; description: string; visibility: ListVisibility }): void {
    this.listsApi.updateList(listId, request).subscribe({
      next: () => {
        const selectedExistingIds = new Set(this.selectedItems().flatMap((item) => item.existingListItemId ? [item.existingListItemId] : []));
        const removedIds = [...this.originalItemIds()].filter((id) => !selectedExistingIds.has(id));
        const newReferences = this.selectedItems().flatMap((item) => !item.existingListItemId && item.reference ? [item.reference] : []);
        const changes = [
          ...removedIds.map((id) => this.listsApi.removeItem(listId, id)),
          ...newReferences.map((reference) => this.listsApi.addItem(listId, reference)),
        ];
        from(changes).pipe(concatMap((change) => change), toArray()).subscribe({
          next: () => {
            this.creating.set(false);
            this.toasts.success(this.copy.listSaved);
            void this.router.navigate(['/lists', listId]);
          },
          error: () => {
            this.creating.set(false);
            this.toasts.error(this.copy.updateListError);
          },
        });
      },
      error: () => {
        this.creating.set(false);
        this.toasts.error(this.copy.updateListError);
      },
    });
  }

  protected responsiveImageUrl(path: string | null | undefined, size: 'w780' | 'w1280'): string | null {
    return tmdbImageUrl(path, size);
  }

  protected imageUrl(path: string | null | undefined): string | null {
    return tmdbImageUrl(path, 'w500');
  }

  private runSearch(): void {
    const query = this.searchQuery().trim();
    if (query.length < 2 || this.selectedSeries()) return;
    this.searchRequest?.unsubscribe();
    this.searching.set(true);
    this.searchError.set('');
    const scope = this.kind() === 'MOVIES_AND_SERIES' ? 'CONTENT' : 'SERIES';
    this.searchRequest = this.searchApi.search(query, scope).subscribe({
      next: (result) => {
        const contents = result.contents ?? [];
        this.searchResults.set(this.kind() === 'MOVIES_AND_SERIES' ? contents : contents.filter((content) => content.type === 'SERIES'));
        this.searching.set(false);
      },
      error: () => {
        this.searching.set(false);
        this.searchError.set(this.copy.searchError);
      },
    });
  }

  private addItem(item: Omit<ListComposerItem, 'key'>): boolean {
    const items = this.selectedItems();
    if (item.reference && items.some((existing) => existing.reference && this.referenceKey(existing.reference) === this.referenceKey(item.reference!))) return false;
    if (items.length >= 100) {
      this.formError.set(this.copy.itemLimit);
      return false;
    }
    this.selectedItems.set([...items, { ...item, key: `item-${++this.nextItemKey}` }]);
    this.formError.set('');
    return true;
  }

  private clearSearch(): void {
    this.searchQuery.set('');
    this.searchResults.set([]);
    this.searchError.set('');
    this.searching.set(false);
    if (this.searchTimer) clearTimeout(this.searchTimer);
    this.searchTimer = undefined;
    this.searchRequest?.unsubscribe();
    this.searchRequest = undefined;
  }

  private parseImportedItem(value: unknown): Omit<ListComposerItem, 'key'> | null {
    if (!value || typeof value !== 'object') return null;
    const row = value as Record<string, unknown>;
    const type = row['type'];
    const tmdbId = row['tmdbId'];
    const seriesTmdbId = row['seriesTmdbId'];
    const seasonNumber = row['seasonNumber'];
    const episodeNumber = row['episodeNumber'];
    let reference: ListContentReference;
    if ((type === 'MOVIE' || type === 'SERIES') && typeof tmdbId === 'string' && tmdbId.trim()) {
      reference = { type, tmdbId };
    } else if (type === 'SEASON' && typeof seriesTmdbId === 'string' && Number.isInteger(seasonNumber) && Number(seasonNumber) >= 0) {
      reference = { type, seriesTmdbId, seasonNumber: Number(seasonNumber) };
    } else if (type === 'EPISODE' && typeof seriesTmdbId === 'string' && Number.isInteger(seasonNumber) && Number(seasonNumber) >= 0 && Number.isInteger(episodeNumber) && Number(episodeNumber) > 0) {
      reference = { type, seriesTmdbId, seasonNumber: Number(seasonNumber), episodeNumber: Number(episodeNumber) };
    } else {
      return null;
    }
    return {
      reference,
      title: typeof row['title'] === 'string' ? row['title'] : `${type} · ${tmdbId ?? seriesTmdbId}`,
      year: typeof row['releaseYear'] === 'number' || typeof row['releaseYear'] === 'string' ? row['releaseYear'] : null,
      imageUrl: typeof row['posterUrl'] === 'string' ? this.imageUrl(row['posterUrl']) : null,
    };
  }

  private referenceKey(reference: ListContentReference): string {
    if (reference.type === 'MOVIE' || reference.type === 'SERIES') return `${reference.type}:${reference.tmdbId}`;
    if (reference.type === 'SEASON') return `${reference.type}:${reference.seriesTmdbId}:${reference.seasonNumber}`;
    return `${reference.type}:${reference.seriesTmdbId}:${reference.seasonNumber}:${reference.episodeNumber}`;
  }

  private yearFromDate(value: string | null): number | null {
    if (!value) return null;
    const year = Number(value.slice(0, 4));
    return Number.isInteger(year) ? year : null;
  }
}
