import { ChangeDetectionStrategy, Component, ElementRef, EventEmitter, HostListener, Input, OnDestroy, Output, ViewChild, signal } from '@angular/core';
import { Subscription } from 'rxjs';
import { ContentApiService, ContentImageSelection, ContentImageSelectionType } from '../../../features/content/data-access/content-api.service';
import { ToastNotificationsService } from '../toast-notifications/toast-notifications.service';
import { tmdbImageUrl } from '../../utils/tmdb-image-url';

type PickerStatus = 'idle' | 'loading' | 'ready' | 'error';

@Component({
  selector: 'app-content-poster-picker',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './content-poster-picker.component.html',
  styleUrl: './content-poster-picker.component.css',
})
export class ContentPosterPickerComponent implements OnDestroy {
  @Input({ required: true }) contentId = '';
  @Input({ required: true }) tmdbId: string | number | null = null;
  @Input({ required: true }) contentType: ContentImageSelectionType = 'MOVIE';
  @Input() selectedPosterPath: string | null = null;
  @Input() label = 'Alterar pôster';
  @Input() selectionLabel = 'Selecionar pôster';
  @Input() loadingLabel = 'Carregando pôsteres';
  @Input() loadErrorLabel = 'Não foi possível carregar os pôsteres.';
  @Input() retryLabel = 'Tentar novamente';
  @Input() emptyLabel = 'Nenhum pôster disponível.';
  @Input() saveSuccessLabel = 'Pôster atualizado.';
  @Input() saveErrorLabel = 'Não foi possível atualizar o pôster. Tente novamente.';
  @Output() readonly posterSaved = new EventEmitter<string>();

  protected readonly open = signal(false);
  protected readonly status = signal<PickerStatus>('idle');
  protected readonly images = signal<ContentImageSelection[]>([]);
  protected readonly savingUrl = signal<string | null>(null);
  protected readonly position = signal<{ top: number; left: number } | null>(null);
  protected readonly skeletons = [0, 1, 2, 3, 4, 5, 6, 7];
  private readonly requests = new Subscription();
  private trigger: HTMLElement | null = null;

  @ViewChild('optionsPanel')
  private set optionsPanel(reference: ElementRef<HTMLDivElement> | undefined) {
    if (!reference || !this.open()) return;
    reference.nativeElement.showPopover();
  }

  constructor(
    private readonly api: ContentApiService,
    private readonly toasts: ToastNotificationsService,
    private readonly element: ElementRef<HTMLElement>,
  ) {}

  ngOnDestroy(): void {
    this.requests.unsubscribe();
  }

  protected toggle(event: MouseEvent): void {
    event.preventDefault();
    event.stopPropagation();
    if (this.open()) {
      this.closePicker();
      return;
    }
    this.trigger = event.currentTarget as HTMLElement;
    this.position.set(this.popupPosition(this.trigger));
    this.open.set(true);
    if (this.status() === 'idle' || this.status() === 'error') this.load();
  }

  protected imageUrl(path: string): string | null {
    return tmdbImageUrl(path, 'w500');
  }

  protected isSelected(image: ContentImageSelection): boolean {
    return this.posterPath(image.url) === this.posterPath(this.selectedPosterPath);
  }

  protected retry(): void {
    this.load();
  }

  protected select(image: ContentImageSelection): void {
    const path = this.posterPath(image.url);
    if (!path || this.savingUrl()) return;
    if (!this.contentId) {
      this.toasts.error(this.saveErrorLabel);
      return;
    }
    this.savingUrl.set(image.url);
    this.requests.add(this.api.setCustomContentPoster(this.contentId, path).subscribe({
      next: () => {
        this.selectedPosterPath = path;
        this.savingUrl.set(null);
        this.closePicker();
        const details = this.element.nativeElement.closest('details');
        if (details instanceof HTMLDetailsElement) details.open = false;
        this.posterSaved.emit(path);
        this.toasts.success(this.saveSuccessLabel);
      },
      error: () => {
        this.savingUrl.set(null);
        this.toasts.error(this.saveErrorLabel);
      },
    }));
  }

  @HostListener('document:click', ['$event'])
  protected dismissOutside(event: MouseEvent): void {
    if (!this.open() || !(event.target instanceof Node) || this.element.nativeElement.contains(event.target)) return;
    this.closePicker();
  }

  @HostListener('document:keydown.escape')
  protected dismissOnEscape(): void {
    if (!this.open()) return;
    const trigger = this.trigger;
    this.closePicker();
    trigger?.focus();
  }

  @HostListener('window:resize')
  @HostListener('window:scroll')
  protected reposition(): void {
    if (!this.open() || !this.trigger?.isConnected) return;
    this.position.set(this.popupPosition(this.trigger));
  }

  protected panelId(): string {
    return `content-poster-options-${this.contentId}`;
  }

  private closePicker(): void {
    this.open.set(false);
    this.position.set(null);
    this.trigger = null;
  }

  private load(): void {
    const tmdbId = this.tmdbId == null ? '' : String(this.tmdbId).trim();
    if (!tmdbId) {
      this.status.set('error');
      return;
    }
    this.status.set('loading');
    this.requests.add(this.api.getContentImages(this.contentType, tmdbId, 'posters').subscribe({
      next: (images) => {
        const resolvedImages = images.map((image) => ({
          ...image,
          url: tmdbImageUrl(image.url, 'w500') ?? image.url,
        }));
        this.images.set(resolvedImages);
        this.status.set('ready');
      },
      error: () => this.status.set('error'),
    }));
  }

  private posterPath(value: string | null): string {
    if (!value) return '';
    try {
      const pathname = /^https?:\/\//i.test(value) ? new URL(value).pathname : value;
      const filename = pathname.split('/').filter(Boolean).at(-1) ?? '';
      return filename ? `/${filename}` : '';
    } catch {
      return '';
    }
  }

  private popupPosition(trigger: HTMLElement): { top: number; left: number } {
    const rect = trigger.getBoundingClientRect();
    const viewportWidth = document.documentElement.clientWidth || window.innerWidth;
    const viewportHeight = window.innerHeight;
    const width = Math.min(360, viewportWidth - 24);
    const height = Math.min(320, viewportHeight * 0.45);
    const left = Math.max(12, Math.min(rect.right - width, viewportWidth - width - 12));
    const below = rect.bottom + 8;
    const top = below + height <= viewportHeight - 12 ? below : Math.max(12, rect.top - height - 8);
    return { top, left };
  }
}
