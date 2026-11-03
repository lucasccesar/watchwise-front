import { ChangeDetectionStrategy, Component, OnDestroy, computed, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { Subscription } from 'rxjs';
import { ContentApiService, ContentEpisodeSelection, ContentSeasonSelection } from '../../../content/data-access/content-api.service';
import { ListsApiService, ListContentReference, ListVisibility } from '../../data-access/lists-api.service';
import { SearchApiService, SearchContentView } from '../../../search-content/data-access/search-api.service';
import { messageCatalog } from '../../../../shared/i18n/messages';
import { ToastNotificationsService } from '../../../../shared/components/toast-notifications/toast-notifications.service';

type ListCreateKind = 'MOVIES_AND_SERIES' | 'SEASONS' | 'EPISODES';
type ListComposerItem = {
  key: string;
  reference: ListContentReference;
  title: string;
  year: string | number | null;
  imageUrl: string | null;
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
  protected readonly name = signal('');
  protected readonly description = signal('');
  protected readonly visibility = signal<ListVisibility>('PUBLIC');
  protected readonly kind = signal<ListCreateKind>('MOVIES_AND_SERIES');
  protected readonly searchQuery = signal('');
  protected readonly searchResults = signal<SearchContentView[]>([]);
  protected readonly highlightedResult = signal<SearchContentView | null>(null);
  protected readonly selectedSeries = signal<SearchContentView | null>(null);
  protected readonly seasons = signal<ContentSeasonSelection[]>([]);
  protected readonly selectedSeason = signal<number | null>(null);
  protected readonly episodes = signal<ContentEpisodeSelection[]>([]);
  protected readonly selectedItems = signal<ListComposerItem[]>([]);
  protected readonly searching = signal(false);
  protected readonly creating = signal(false);
  protected readonly searchError = signal('');
  protected readonly formError = signal('');
  protected readonly nameLength = computed(() => this.name().length);
  protected readonly itemCount = computed(() => this.selectedItems().length);
  protected readonly itemCountLabel = computed(() => (this.itemCount() === 1 ? this.copy.singleTitleCount : this.copy.titleCount).replace('{count}', this.itemCount().toString()));
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

  private readonly router = inject(Router);
  private readonly listsApi = inject(ListsApiService);
  private readonly searchApi = inject(SearchApiService);
  private readonly contentApi = inject(ContentApiService);
  private readonly toasts = inject(ToastNotificationsService);
  private searchTimer?: ReturnType<typeof setTimeout>;
  private searchRequest?: Subscription;
  private selectionRequest?: Subscription;
  private nextItemKey = 0;

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
    this.highlightedResult.set(null);
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
    this.kind.set(kind);
    this.searchResults.set([]);
    this.highlightedResult.set(null);
    this.selectedSeries.set(null);
    this.seasons.set([]);
    this.selectedSeason.set(null);
    this.episodes.set([]);
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
    this.highlightedResult.set(result);
  }

  protected canAddHighlightedResult(): boolean {
    const result = this.highlightedResult();
    return Boolean(result && this.kind() === 'MOVIES_AND_SERIES' && this.itemCount() < 100 && !this.isAlreadyAdded({ type: result.type, tmdbId: result.tmdbId }));
  }

  protected addHighlightedResult(): void {
    const result = this.highlightedResult();
    if (!result || this.kind() !== 'MOVIES_AND_SERIES') return;
    this.addItem({
      reference: { type: result.type, tmdbId: result.tmdbId },
      title: result.title || this.copy.titleUnavailable,
      year: result.releaseYear ?? null,
      imageUrl: result.posterUrl ?? null,
    });
    this.highlightedResult.set(null);
  }

  protected selectSeries(series: SearchContentView): void {
    this.searchResults.set([]);
    this.highlightedResult.set(null);
    this.selectedSeries.set(series);
    this.seasons.set([]);
    this.episodes.set([]);
    this.selectedSeason.set(null);
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
    const value = Number((event.target as HTMLSelectElement).value);
    if (Number.isInteger(value)) this.setSelectedSeason(value);
  }

  protected addSeason(season: ContentSeasonSelection): void {
    const series = this.selectedSeries();
    if (!series || season.seasonNumber === null) return;
    this.addItem({
      reference: { type: 'SEASON', seriesTmdbId: series.tmdbId, seasonNumber: season.seasonNumber },
      title: `${series.title || this.copy.series} · ${season.name || `${this.copy.season} ${season.seasonNumber}`}`,
      year: this.yearFromDate(season.releaseDate),
      imageUrl: season.posterUrl ?? series.posterUrl ?? null,
    });
  }

  protected addEpisode(episode: ContentEpisodeSelection): void {
    const series = this.selectedSeries();
    if (!series || episode.seasonNumber === null || episode.episodeNumber === null) return;
    const episodeCode = `T${episode.seasonNumber} E${episode.episodeNumber}`;
    this.addItem({
      reference: { type: 'EPISODE', seriesTmdbId: series.tmdbId, seasonNumber: episode.seasonNumber, episodeNumber: episode.episodeNumber },
      title: `${series.title || this.copy.series} · ${episodeCode}${episode.name ? ` · ${episode.name}` : ''}`,
      year: this.yearFromDate(episode.airDate),
      imageUrl: episode.stillUrl ?? series.posterUrl ?? null,
    });
  }

  protected returnToSeriesSearch(): void {
    this.selectedSeries.set(null);
    this.seasons.set([]);
    this.selectedSeason.set(null);
    this.episodes.set([]);
    if (this.searchQuery().trim().length >= 2) this.searchTimer = setTimeout(() => this.runSearch(), 0);
  }

  protected removeItem(key: string): void {
    this.selectedItems.update((items) => items.filter((item) => item.key !== key));
    this.formError.set('');
  }

  protected isAlreadyAdded(reference: ListContentReference): boolean {
    const key = this.referenceKey(reference);
    return this.selectedItems().some((item) => this.referenceKey(item.reference) === key);
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
        if (!merged.some((existing) => this.referenceKey(existing.reference) === this.referenceKey(item.reference))) {
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
      description: this.description().trim() || undefined,
      visibility: this.visibility(),
    };
    this.creating.set(true);
    this.formError.set('');
    const createRequest = this.selectedItems().length
      ? this.listsApi.createListWithItems({ ...request, items: this.selectedItems().map((item) => item.reference) })
      : this.listsApi.createList(request);
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

  ngOnDestroy(): void {
    if (this.searchTimer) clearTimeout(this.searchTimer);
    this.searchRequest?.unsubscribe();
    this.selectionRequest?.unsubscribe();
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

  private addItem(item: Omit<ListComposerItem, 'key'>): void {
    const items = this.selectedItems();
    if (items.some((existing) => this.referenceKey(existing.reference) === this.referenceKey(item.reference))) return;
    if (items.length >= 100) {
      this.formError.set(this.copy.itemLimit);
      return;
    }
    this.selectedItems.set([...items, { ...item, key: `item-${++this.nextItemKey}` }]);
    this.formError.set('');
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
      imageUrl: typeof row['posterUrl'] === 'string' ? row['posterUrl'] : null,
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
