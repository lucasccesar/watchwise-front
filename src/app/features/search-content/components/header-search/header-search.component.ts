import { HttpErrorResponse } from '@angular/common/http';
import {
  Component,
  DestroyRef,
  ElementRef,
  inject,
  output,
  signal,
  ViewChild,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NavigationStart, Router, RouterLink } from '@angular/router';
import { catchError, filter, map, of, Subject, switchMap, timer } from 'rxjs';
import {
  SearchApiService,
  SearchContentView,
  SearchListView,
  SearchPersonView,
  SearchPicksTemplateView,
  SearchScope,
  SearchUserView,
  SearchView,
} from '../../data-access/search-api.service';
import { messageCatalog } from '../../../../shared/i18n/messages';

type SearchSuggestionKind = 'content' | 'person' | 'list' | 'template' | 'user';

interface SearchSuggestion {
  kind: SearchSuggestionKind;
  scope: SearchScope;
  username?: string;
  privateProfile?: boolean;
  tmdbId?: string;
  title: string;
  meta: string;
  imageUrl: string | null;
  imageShape: 'poster' | 'avatar' | 'cover' | 'icon';
  initials: string;
}

interface SearchRequest {
  query: string;
  scope: SearchScope;
}

type SearchResult =
  | { request: SearchRequest; response: SearchView }
  | { request: SearchRequest; error: unknown }
  | null;

@Component({
  imports: [RouterLink],
  host: { '[class.header-search-host--open]': 'isOpen()' },
  selector: 'app-header-search',
  standalone: true,
  templateUrl: './header-search.component.html',
})
export class HeaderSearchComponent {
  protected readonly copy = messageCatalog['pt-BR'].home;
  protected readonly isOpen = signal(false);
  protected readonly isScopeMenuOpen = signal(false);
  protected readonly query = signal('');
  protected readonly selectedScope = signal<SearchScope>('CONTENT');
  protected readonly isLoading = signal(false);
  protected readonly hasSearched = signal(false);
  protected readonly results = signal<SearchSuggestion[]>([]);
  protected readonly errorMessage = signal<string | null>(null);
  protected readonly opened = output<void>();

  @ViewChild('searchInput') private searchInput?: ElementRef<HTMLInputElement>;
  @ViewChild('searchTrigger') private searchTrigger?: ElementRef<HTMLButtonElement>;

  private readonly searchRequests = new Subject<SearchRequest | null>();
  private readonly searchApi = inject(SearchApiService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly router = inject(Router);

  protected readonly searchScopes: Array<{ value: SearchScope; label: string }> = [
    { value: 'CONTENT', label: this.copy.searchScopeContent },
    { value: 'MOVIE', label: this.copy.searchScopeMovies },
    { value: 'SERIES', label: this.copy.searchScopeSeries },
    { value: 'PERSON', label: this.copy.searchScopePeople },
    { value: 'LIST', label: this.copy.searchScopeLists },
    { value: 'PICKS_TEMPLATE', label: this.copy.searchScopePicksTemplates },
    { value: 'USER', label: this.copy.searchScopeUsers },
  ];

  protected get selectedScopeLabel(): string {
    return (
      this.searchScopes.find((scope) => scope.value === this.selectedScope())?.label ??
      this.copy.searchScopeContent
    );
  }

  protected get selectedScopePlaceholder(): string {
    const placeholders: Record<SearchScope, string> = {
      CONTENT: this.copy.searchPlaceholderContent,
      MOVIE: this.copy.searchPlaceholderMovies,
      SERIES: this.copy.searchPlaceholderSeries,
      PERSON: this.copy.searchPlaceholderPeople,
      LIST: this.copy.searchPlaceholderLists,
      PICKS_TEMPLATE: this.copy.searchPlaceholderPicksTemplates,
      USER: this.copy.searchPlaceholderUsers,
    };

    return placeholders[this.selectedScope()];
  }

  constructor() {
    this.searchRequests
      .pipe(
        switchMap((request) => {
          if (!request) {
            return of(null);
          }

          return timer(300).pipe(
            switchMap(() =>
              this.searchApi.search(request.query, request.scope).pipe(
                map((response): SearchResult => ({ request, response })),
                catchError((error: unknown) => of({ request, error })),
              ),
            ),
          );
        }),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((result) => this.applySearchResult(result));

    this.router.events
      .pipe(
        filter((event) => event instanceof NavigationStart),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe(() => this.closeSearch(false));
  }

  protected openSearch(): void {
    this.isOpen.set(true);
    this.isScopeMenuOpen.set(false);
    this.opened.emit();
    requestAnimationFrame(() => this.searchInput?.nativeElement.focus());
    this.runSearch(this.query());
  }

  protected closeSearch(restoreFocus = true): void {
    this.isOpen.set(false);
    this.isScopeMenuOpen.set(false);
    this.isLoading.set(false);
    this.hasSearched.set(false);
    this.results.set([]);
    this.errorMessage.set(null);
    this.searchRequests.next(null);

    if (restoreFocus) {
      requestAnimationFrame(() => this.searchTrigger?.nativeElement.focus());
    }
  }

  protected toggleScopeMenu(): void {
    this.isScopeMenuOpen.update((open) => !open);
  }

  protected selectScope(scope: SearchScope): void {
    this.selectedScope.set(scope);
    this.isScopeMenuOpen.set(false);
    this.runSearch(this.query());
  }

  protected onQueryInput(value: string): void {
    this.query.set(value);
    this.runSearch(value);
  }

  protected onSubmit(event: SubmitEvent): void {
    event.preventDefault();
  }

  protected onEscape(event: Event): void {
    event.stopPropagation();

    if (this.isScopeMenuOpen()) {
      this.isScopeMenuOpen.set(false);
      return;
    }

    this.closeSearch();
  }

  protected showSearchPanel(): boolean {
    return this.isOpen() && this.query().trim().length >= 3;
  }

  protected resultQueryParams(): { q: string; scope: SearchScope } {
    return { q: this.query().trim(), scope: this.selectedScope() };
  }

  private runSearch(rawQuery: string): void {
    const query = rawQuery.trim();

    if (!this.isOpen() || query.length < 3) {
      this.isLoading.set(false);
      this.hasSearched.set(false);
      this.results.set([]);
      this.errorMessage.set(null);
      this.searchRequests.next(null);
      return;
    }

    this.isLoading.set(true);
    this.hasSearched.set(false);
    this.results.set([]);
    this.errorMessage.set(null);
    this.searchRequests.next({ query, scope: this.selectedScope() });
  }

  private applySearchResult(result: SearchResult): void {
    if (!result) {
      return;
    }

    this.isLoading.set(false);
    this.hasSearched.set(true);

    if ('error' in result) {
      this.errorMessage.set(this.getErrorMessage(result.error));
      this.results.set([]);
      return;
    }

    this.errorMessage.set(null);
    this.results.set(this.mapResults(result.response, result.request.scope).slice(0, 5));
  }

  private mapResults(response: SearchView, scope: SearchScope): SearchSuggestion[] {
    if (scope === 'CONTENT' || scope === 'MOVIE' || scope === 'SERIES') {
      return response.contents.map((content) => this.mapContent(content));
    }

    if (scope === 'PERSON') {
      return response.people.map((person) => this.mapPerson(person));
    }

    if (scope === 'LIST') {
      return response.lists.map((list) => this.mapList(list));
    }

    if (scope === 'PICKS_TEMPLATE') {
      return response.templates.map((template) => this.mapTemplate(template));
    }

    return response.users.map((user) => this.mapUser(user));
  }

  private mapContent(content: SearchContentView): SearchSuggestion {
    const label = content.type === 'MOVIE' ? this.copy.searchMovie : this.copy.searchSeriesItem;
    const year = content.releaseYear ? ` · ${content.releaseYear}` : '';

    return {
      kind: 'content',
      scope: content.type,
      tmdbId: content.tmdbId,
      title: content.title || this.copy.searchTitleUnavailable,
      meta: `${label}${year}`,
      imageUrl: content.posterUrl ?? null,
      imageShape: 'poster',
      initials: '',
    };
  }

  private mapPerson(person: SearchPersonView): SearchSuggestion {
    const title = person.name || this.copy.searchPersonUnavailable;

    return {
      kind: 'person',
      scope: 'PERSON',
      title,
      meta: this.copy.searchPerson,
      imageUrl: person.photoUrl ?? null,
      imageShape: 'avatar',
      initials: this.getInitials(title),
    };
  }

  private mapList(list: SearchListView): SearchSuggestion {
    const countLabel = list.itemsCount === 1 ? this.copy.searchItem : this.copy.searchItems;
    const owner = list.owner.username ? `@${list.owner.username} · ` : '';

    return {
      kind: 'list',
      scope: 'LIST',
      title: list.name,
      meta: `${owner}${list.itemsCount} ${countLabel}`,
      imageUrl: list.previewCards[0]?.posterUrl ?? null,
      imageShape: list.previewCards[0]?.posterUrl ? 'poster' : 'icon',
      initials: '',
    };
  }

  private mapTemplate(template: SearchPicksTemplateView): SearchSuggestion {
    const categoriesCount = template.categoriesCount ?? 0;
    const countLabel =
      categoriesCount === 1
        ? this.copy.searchCategory
        : this.copy.searchCategories;
    const creator = template.creator?.username
      ? `@${template.creator.username} · `
      : '';

    return {
      kind: 'template',
      scope: 'PICKS_TEMPLATE',
      title: template.name || this.copy.searchTemplateUnavailable,
      meta: `${creator}${categoriesCount} ${countLabel}`,
      imageUrl: template.coverImage ?? null,
      imageShape: template.coverImage ? 'cover' : 'icon',
      initials: '',
    };
  }

  private mapUser(user: SearchUserView): SearchSuggestion {
    return {
      kind: 'user',
      scope: 'USER',
      username: user.username,
      privateProfile: !user.profileDetailsVisible,
      title: user.name || this.copy.searchUserUnavailable,
      meta: `@${user.username}`,
      imageUrl: user.profilePicture || '/default-user-avatar.png',
      imageShape: 'avatar',
      initials: this.getInitials(user.name),
    };
  }

  private getInitials(value: string): string {
    return value
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((part) => part.charAt(0))
      .join('')
      .toLocaleUpperCase('pt-BR');
  }

  private getErrorMessage(error: unknown): string {
    if (error instanceof HttpErrorResponse && error.status === 401) {
      return this.copy.searchSessionError;
    }

    if (error instanceof HttpErrorResponse && error.status === 429) {
      return this.copy.searchRateLimitError;
    }

    return this.copy.searchError;
  }
}
