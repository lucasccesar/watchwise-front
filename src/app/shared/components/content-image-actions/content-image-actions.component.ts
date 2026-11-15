import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  EventEmitter,
  HostListener,
  Input,
  OnDestroy,
  Output,
  signal,
  ViewChild,
} from '@angular/core';
import { CdkConnectedOverlay, CdkOverlayOrigin, ConnectedPosition } from '@angular/cdk/overlay';
import { Router } from '@angular/router';
import { Observable, Subscription, of, switchMap, throwError } from 'rxjs';
import { AuthSessionService } from '../../../core/session/session.service';
import { ContentApiService, ContentPageResult, UserListDetailItem, UserListSummary } from '../../../features/content/data-access/content-api.service';
import { messageCatalog } from '../../i18n/messages';
import { ToastNotificationsService } from '../toast-notifications/toast-notifications.service';
import { CheckIconComponent } from '../check-icon/check-icon.component';

export type ContentImageActionIcon = 'check' | 'star' | 'eye' | 'trash' | 'ban' | 'rewatch' | 'share' | 'bookmark' | 'bookmark-filled' | 'list';

export interface ContentImageAction {
  id: string;
  label: string;
  icon: ContentImageActionIcon;
  disabled?: boolean;
}

export interface ContentImageActionSelection {
  action: ContentImageAction;
  event: MouseEvent;
}

export type ContentListTarget =
  | { type: 'MOVIE'; tmdbId: string; contentId?: string | null }
  | { type: 'SERIES'; tmdbId: string; contentId?: string | null }
  | { type: 'SEASON'; seriesTmdbId: string; seasonNumber: number; contentId?: string | null }
  | { type: 'EPISODE'; seriesTmdbId: string; seasonNumber: number; episodeNumber: number; contentId?: string | null };

@Component({
  selector: 'app-content-image-actions',
  standalone: true,
  imports: [CdkConnectedOverlay, CdkOverlayOrigin, CheckIconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './content-image-actions.component.html',
  styleUrl: './content-image-actions.component.css',
})
export class ContentImageActionsComponent implements OnDestroy {
  private static nextMenuId = 0;
  protected readonly menuId = `content-image-actions-menu-${++ContentImageActionsComponent.nextMenuId}`;
  protected readonly menuTriggerId = `${this.menuId}-trigger`;

  @Input() ratingValue: string | null = null;
  @Input() ratingLabel = '';
  @Input() optionsLabel = '';
  @Input() expanded: boolean | undefined;
  @Input() actions: readonly ContentImageAction[] = [];
  @Input() listTarget: ContentListTarget | null = null;

  @Output() readonly toggle = new EventEmitter<MouseEvent>();
  @Output() readonly actionSelected =
    new EventEmitter<ContentImageActionSelection>();

  protected internalExpanded = false;
  protected readonly menuPositions: ConnectedPosition[] = [
    { originX: 'end', originY: 'bottom', overlayX: 'end', overlayY: 'top', offsetY: 4 },
    { originX: 'end', originY: 'top', overlayX: 'end', overlayY: 'bottom', offsetY: -4 },
    { originX: 'start', originY: 'bottom', overlayX: 'start', overlayY: 'top', offsetY: 4 },
    { originX: 'start', originY: 'top', overlayX: 'start', overlayY: 'bottom', offsetY: -4 },
  ];
  protected readonly menuViewportMargin = { top: 72, right: 12, bottom: 12, left: 12 };
  protected readonly listPickerOpen = signal(false);
  protected readonly listPickerPosition = signal<{ top: number; left: number } | null>(null);
  protected readonly userLists = signal<UserListSummary[]>([]);
  protected readonly userListsPage = signal<ContentPageResult<UserListSummary> | null>(null);
  protected readonly listStatus = signal<'loading' | 'ready' | 'error'>('loading');
  protected readonly listError = signal('');
  protected readonly listLoadingMore = signal(false);
  protected readonly busyListId = signal<string | null>(null);
  protected readonly listCopy = messageCatalog['pt-BR'].trendingPage;
  protected readonly listSkeletonRows = [0, 1, 2];

  @ViewChild('trigger')
  private trigger?: ElementRef<HTMLButtonElement>;

  private listRequests = new Subscription();
  private readonly resolvedListContentId = signal('');

  constructor(
    private readonly element: ElementRef<HTMLElement>,
    private readonly contentApi: ContentApiService,
    private readonly session: AuthSessionService,
    private readonly router: Router,
    private readonly toasts: ToastNotificationsService,
  ) {}

  ngOnDestroy(): void {
    this.listRequests.unsubscribe();
  }

  protected menuActions(): readonly ContentImageAction[] {
    if (!this.listTarget || this.actions.some((action) => action.id === 'add-to-list')) return this.actions;
    return [...this.actions, { id: 'add-to-list', label: this.listCopy.addToList, icon: 'list' }];
  }

  protected menuExpanded(): boolean {
    return this.expanded ?? this.internalExpanded;
  }

  protected toggleMenu(event: MouseEvent): void {
    event.preventDefault();
    event.stopPropagation();
    const willOpen = this.expanded === undefined ? !this.internalExpanded : !this.expanded;
    if (this.expanded === undefined) this.internalExpanded = willOpen;
    this.toggle.emit(event);
  }

  @HostListener('document:click', ['$event'])
  protected dismissInternalMenu(event: MouseEvent): void {
    if (this.expanded !== undefined || !this.internalExpanded) return;
    if (this.eventOriginatedInMenu(event.target)) return;
    if (event.target instanceof Node && !this.element.nativeElement.contains(event.target)) {
      this.internalExpanded = false;
    }
  }

  @HostListener('document:keydown.escape', ['$event'])
  protected dismissInternalMenuOnEscape(event: Event): void {
    if (this.expanded !== undefined || !this.internalExpanded) return;
    event.stopPropagation();
    this.internalExpanded = false;
    this.trigger?.nativeElement.focus();
  }

  protected selectAction(action: ContentImageAction, event: MouseEvent): void {
    event.preventDefault();
    event.stopPropagation();
    if (action.id === 'add-to-list' && this.listTarget) {
      this.openListPicker(event);
      return;
    }
    if (this.listPickerOpen()) this.closeListPicker(false);
    if (this.expanded === undefined) this.internalExpanded = false;
    this.actionSelected.emit({ action, event });
  }

  protected canToggleList(list: UserListSummary): boolean {
    if (list.containsContent) return true;
    const scope = list.itemScope;
    const type = this.listTarget?.type;
    if (type === 'MOVIE' || type === 'SERIES') return scope === null || scope === 'MOVIE_OR_SERIES' || scope === 'MIXED';
    if (type === 'SEASON') return scope === null || scope === 'SEASON' || scope === 'MIXED';
    if (type === 'EPISODE') return scope === null || scope === 'EPISODE' || scope === 'MIXED';
    return false;
  }

  protected toggleList(list: UserListSummary): void {
    const target = this.listTarget;
    const userId = this.session.user()?.id;
    if (!target || !userId || this.busyListId() || !this.canToggleList(list)) return;
    const removing = list.containsContent === true;
    this.busyListId.set(list.id);
    const request = (this.resolvedListContentId() ? of(this.resolvedListContentId()) : this.contentReference(target)).pipe(switchMap((contentId) => removing
      ? this.findListItem(list.id, contentId, target.type).pipe(switchMap((itemId) => itemId
        ? this.contentApi.removeListItem(list.id, itemId)
        : throwError(() => new Error('O conteúdo indicado não foi encontrado na lista.'))))
      : this.addListItem(list.id, target)));
    this.listRequests.add(request.subscribe({
      next: () => {
        this.busyListId.set(null);
        this.updateListMembership(list.id, !removing);
        this.closeListPicker();
        this.toasts.success(removing ? this.listCopy.listRemoved : this.listCopy.listAdded);
      },
      error: (error: unknown) => {
        this.busyListId.set(null);
        if (this.handleSessionError(error)) return;
        this.listError.set(this.listCopy.actionError);
        this.toasts.error(this.listCopy.actionError);
      },
    }));
  }

  protected loadMoreLists(): void {
    const page = this.userListsPage();
    if (!page?.hasNext || this.listLoadingMore()) return;
    this.loadLists(page.page + 1);
  }

  protected retryLists(): void {
    this.loadLists(1);
  }

  protected goToListCreate(): void {
    this.closeListPicker(false);
    void this.router.navigateByUrl('/lists/create');
  }

  protected closeListPicker(restoreFocus = true): void {
    if (this.busyListId()) return;
    this.listPickerOpen.set(false);
    this.listPickerPosition.set(null);
    this.listError.set('');
    this.listRequests.unsubscribe();
    this.listRequests = new Subscription();
    if (restoreFocus) this.trigger?.nativeElement.focus();
  }

  @HostListener('document:click', ['$event'])
  protected dismissListPicker(event: MouseEvent): void {
    if (!this.listPickerOpen()) return;
    if (this.eventOriginatedInMenu(event.target)) return;
    const target = event.target;
    if (target instanceof Node && this.element.nativeElement.contains(target)) return;
    this.closeListPicker(false);
  }

  @HostListener('document:keydown.escape', ['$event'])
  protected dismissListPickerOnEscape(event: Event): void {
    if (!this.listPickerOpen()) return;
    event.stopPropagation();
    this.closeListPicker();
  }

  private openListPicker(event: MouseEvent): void {
    const target = this.listTarget;
    const userId = this.session.user()?.id;
    if (!target) return;
    if (!userId) {
      void this.router.navigateByUrl('/login');
      return;
    }
    const rect = this.trigger?.nativeElement.getBoundingClientRect() ?? (event.currentTarget as HTMLElement).getBoundingClientRect();
    const width = Math.min(264, window.innerWidth - 24);
    const height = Math.min(420, window.innerHeight - 32);
    const top = rect.bottom + 8 + height > window.innerHeight ? Math.max(16, rect.top - height - 8) : rect.bottom + 8;
    this.listPickerPosition.set({ top, left: Math.max(12, Math.min(rect.right - width, window.innerWidth - width - 12)) });
    this.listPickerOpen.set(true);
    this.listStatus.set('loading');
    this.listError.set('');
    this.userLists.set([]);
    this.userListsPage.set(null);
    this.listRequests.unsubscribe();
    this.listRequests = new Subscription();
    this.resolvedListContentId.set('');
    this.loadReference(target, userId);
  }

  private eventOriginatedInMenu(target: EventTarget | null): boolean {
    return target instanceof Element && target.closest('[data-ww-menu]') !== null;
  }

  private loadReference(target: ContentListTarget, userId: string): void {
    this.listRequests.add(this.contentReference(target).subscribe({
      next: (contentId) => {
        this.resolvedListContentId.set(contentId);
        this.loadLists(1, userId, contentId);
      },
      error: (error: unknown) => {
        if (this.handleSessionError(error)) return;
        this.listStatus.set('error');
        this.listError.set(this.listCopy.listLoadError);
      },
    }));
  }

  private contentReference(target: ContentListTarget): Observable<string> {
    if (target.contentId) return of(target.contentId);
    if (target.type === 'MOVIE') return this.contentApi.createMovieReference(target.tmdbId).pipe(switchMap((reference) => of(reference.id)));
    if (target.type === 'SERIES') return this.contentApi.createSeriesReference(target.tmdbId).pipe(switchMap((reference) => of(reference.id)));
    if (target.type === 'SEASON') return this.contentApi.createSeasonReference(target.seriesTmdbId, target.seasonNumber).pipe(switchMap((reference) => of(reference.id)));
    return this.contentApi.createEpisodeReference(target.seriesTmdbId, target.seasonNumber, target.episodeNumber).pipe(switchMap((reference) => of(reference.id)));
  }

  private addListItem(listId: string, target: ContentListTarget): Observable<unknown> {
    if (target.type === 'MOVIE') return this.contentApi.addMovieToList(listId, target.tmdbId);
    if (target.type === 'SERIES') return this.contentApi.addSeriesToList(listId, target.tmdbId);
    if (target.type === 'SEASON') return this.contentApi.addSeasonToList(listId, target.seriesTmdbId, target.seasonNumber);
    return this.contentApi.addEpisodeToList(listId, target.seriesTmdbId, target.seasonNumber, target.episodeNumber);
  }

  private findListItem(listId: string, contentId: string, type: ContentListTarget['type'], page = 1): Observable<string | null> {
    return this.contentApi.getListItems(listId, page, type).pipe(switchMap((response) => {
      const match = response.items.find((item: UserListDetailItem) => item.content?.id === contentId);
      if (match) return of(match.id);
      return response.itemsHasNext ? this.findListItem(listId, contentId, type, page + 1) : of(null);
    }));
  }

  private updateListMembership(listId: string, containsContent: boolean): void {
    const update = (list: UserListSummary): UserListSummary => list.id === listId
      ? { ...list, containsContent, itemsCount: Math.max(0, (list.itemsCount ?? 0) + (containsContent ? 1 : -1)) }
      : list;
    this.userLists.update((lists) => lists.map(update));
    this.userListsPage.update((page) => page ? { ...page, content: page.content.map(update) } : page);
  }

  private loadLists(page = 1, userId = this.session.user()?.id, contentId = this.resolvedListContentId()): void {
    if (!userId || !contentId) return;
    this.listStatus.set('loading');
    this.listError.set('');
    if (page > 1) this.listLoadingMore.set(true);
    this.listRequests.add(this.contentApi.getUserLists(userId, contentId, page).subscribe({
      next: (response) => {
        this.userListsPage.set(response);
        this.userLists.update((lists) => page === 1 ? response.content : [...lists, ...response.content]);
        this.listStatus.set('ready');
        this.listLoadingMore.set(false);
      },
      error: (error: unknown) => {
        this.listLoadingMore.set(false);
        if (this.handleSessionError(error)) return;
        this.listStatus.set('error');
        this.listError.set(this.listCopy.listLoadError);
      },
    }));
  }

  private handleSessionError(error: unknown): boolean {
    if ((error as { status?: number })?.status !== 401) return false;
    this.closeListPicker();
    void this.router.navigateByUrl('/login');
    return true;
  }
}
