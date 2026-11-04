import { DecimalPipe, DOCUMENT } from '@angular/common';
import { ChangeDetectionStrategy, Component, ElementRef, HostListener, OnDestroy, ViewChild, computed, inject, input, output, signal } from '@angular/core';
import { ToastNotificationsService } from '../toast-notifications/toast-notifications.service';
import { messageCatalog } from '../../i18n/messages';
import { ModalScrollLockDirective } from '../../directives/modal-scroll-lock.directive';
import { WATCHWISE_STAR_PATH } from '../../utils/watchwise-star';

export type ShareCardKind = 'episode' | 'profile' | 'ratings-map' | 'list' | 'picks';

export interface ShareCardItem {
  title: string;
  imageUrl?: string | null;
  label?: string | null;
  rating?: number | null;
}

export interface ShareCardScoreGroup {
  label: string;
  average: number | null;
  scores: readonly (number | null)[];
}

export interface ShareRatingsMatrix {
  columnLabels: readonly string[];
  rowLabels: readonly string[];
  cells: readonly (readonly (number | null)[])[];
  averages: readonly (number | null)[];
}

export interface ShareCardModel {
  kind: ShareCardKind;
  title: string;
  subtitle?: string | null;
  description?: string | null;
  authorName?: string | null;
  username?: string | null;
  avatarUrl?: string | null;
  backgroundUrl?: string | null;
  imageUrl?: string | null;
  rating?: number | null;
  quote?: string | null;
  items?: readonly ShareCardItem[];
  recentItems?: readonly ShareCardItem[];
  scores?: readonly (number | null)[];
  scoreGroups?: readonly ShareCardScoreGroup[];
  ratingsMatrix?: ShareRatingsMatrix;
  itemCount?: number;
}

@Component({
  selector: 'app-share-preview',
  standalone: true,
  imports: [DecimalPipe, ModalScrollLockDirective],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './share-preview.component.html',
  styleUrl: './share-preview.component.css',
})
export class SharePreviewComponent implements OnDestroy {
  readonly model = input.required<ShareCardModel>();
  readonly shareUrl = input('');
  readonly returnFocusTarget = input<HTMLElement | null>(null);
  protected readonly closed = output<void>();
  protected readonly listCopy = messageCatalog['pt-BR'].shareListPreview;
  protected readonly listBackgroundUrl = signal<string | null>(null);
  protected readonly listBackgroundPickerOpen = signal(false);
  protected readonly listShowDescription = signal(true);
  protected readonly listShowRank = signal(true);
  protected readonly listCopyPending = signal(false);
  protected readonly listBackgroundZoom = signal(120);
  protected readonly listBackgroundX = signal(50);
  protected readonly listBackgroundY = signal(30);
  protected readonly listBackgroundImage = computed(() => this.listBackgroundUrl() || this.model().backgroundUrl || this.model().imageUrl || null);
  protected readonly listItemCount = computed(() => this.model().itemCount ?? this.model().items?.length ?? 0);
  protected readonly listRemainingCount = computed(() => Math.max(0, this.listItemCount() - this.previewItems().length));
  private readonly toasts = inject(ToastNotificationsService);
  private readonly document = inject(DOCUMENT);
  private readonly opener = this.document.activeElement as HTMLElement | null;
  private dialogElement?: HTMLElement;
  private focusRestored = false;
  private backgroundDragStart: { pointerX: number; pointerY: number; backgroundX: number; backgroundY: number } | null = null;

  @ViewChild('shareDialog')
  protected set dialog(value: ElementRef<HTMLElement> | undefined) {
    this.dialogElement = value?.nativeElement;
    (this.focusableControls()[0] ?? this.dialogElement)?.focus();
  }

  @ViewChild('listSharePreview')
  private listSharePreview?: ElementRef<HTMLElement>;

  ngOnDestroy(): void {
    this.restoreFocus();
  }

  protected close(): void {
    this.restoreFocus();
    this.closed.emit();
  }

  protected onBackdropClick(event: MouseEvent): void {
    if (event.target === event.currentTarget) this.close();
  }

  @HostListener('document:keydown', ['$event'])
  protected handleKeydown(event: KeyboardEvent): void {
    if (event.key === 'Escape') {
      if (this.listBackgroundPickerOpen()) {
        event.preventDefault();
        event.stopPropagation();
        this.listBackgroundPickerOpen.set(false);
        return;
      }
      event.preventDefault();
      event.stopPropagation();
      this.close();
      return;
    }
    if (event.key !== 'Tab') return;
    const controls = this.focusableControls();
    const first = controls[0];
    const last = controls.at(-1);
    if (!first) {
      event.preventDefault();
      this.dialogElement?.focus();
    } else if (!this.dialogElement?.contains(this.document.activeElement)) {
      event.preventDefault();
      (event.shiftKey ? last : first)?.focus();
    } else if (event.shiftKey && this.document.activeElement === first) {
      event.preventDefault();
      last?.focus();
    } else if (!event.shiftKey && this.document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  }

  private focusableControls(): HTMLElement[] {
    return Array.from(this.dialogElement?.querySelectorAll<HTMLElement>(
      'button:not([disabled]), a[href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
    ) ?? []);
  }

  private restoreFocus(): void {
    if (this.focusRestored) return;
    this.focusRestored = true;
    (this.returnFocusTarget() ?? this.opener)?.focus();
  }

  protected readonly previewItems = () => this.model().items?.slice(0, this.model().kind === 'list' ? 20 : 16) ?? [];
  protected readonly listBackgroundOptions = computed(() => this.previewItems().filter((item) => Boolean(item.imageUrl)));
  protected readonly previewRecentItems = () => this.model().recentItems?.slice(0, 5) ?? [];
  protected readonly kindLabel = () => ({
    episode: 'Episódio',
    profile: 'Perfil',
    'ratings-map': 'Mapa de notas',
    list: 'Lista',
    picks: 'Picks',
  })[this.model().kind];

  protected async copyLink(): Promise<void> {
    const link = this.shareUrl();
    if (!link) return;
    try {
      await navigator.clipboard.writeText(link);
      this.toasts.success('Link copiado.');
    } catch {
      this.toasts.error('Não foi possível copiar o link.');
    }
  }

  protected listItemCountLabel(): string {
    const count = new Intl.NumberFormat('pt-BR').format(this.listItemCount());
    return this.listItemCount() === 1 ? this.listCopy.oneTitle.replace('{count}', count) : this.listCopy.manyTitles.replace('{count}', count);
  }

  protected toggleListDescription(): void { this.listShowDescription.update((value) => !value); }
  protected toggleListRank(): void { this.listShowRank.update((value) => !value); }

  protected toggleListBackgroundPicker(): void { this.listBackgroundPickerOpen.update((open) => !open); }

  protected selectListBackground(imageUrl: string): void {
    this.listBackgroundUrl.set(imageUrl);
    this.listBackgroundPickerOpen.set(false);
  }

  protected isListBackgroundSelected(imageUrl: string | null | undefined): boolean {
    return Boolean(imageUrl && this.listBackgroundImage() === imageUrl);
  }

  @HostListener('document:click', ['$event'])
  protected dismissListBackgroundPicker(event: MouseEvent): void {
    if (!this.listBackgroundPickerOpen()) return;
    const picker = this.dialogElement?.querySelector('.list-share-image-picker-wrap');
    if (picker && !picker.contains(event.target as Node)) this.listBackgroundPickerOpen.set(false);
  }

  protected adjustListBackgroundZoom(amount: number): void {
    this.listBackgroundZoom.update((value) => Math.max(100, Math.min(250, value + amount)));
  }

  protected listBackgroundWheel(event: WheelEvent): void {
    event.preventDefault();
    if (event.deltaY !== 0) this.adjustListBackgroundZoom(event.deltaY < 0 ? 10 : -10);
  }

  protected resetListBackground(): void {
    this.listBackgroundZoom.set(120);
    this.listBackgroundX.set(50);
    this.listBackgroundY.set(30);
  }

  protected updateListBackgroundZoom(event: Event): void {
    this.listBackgroundZoom.set(Number((event.currentTarget as HTMLInputElement).value));
  }

  protected updateListBackgroundPosition(axis: 'x' | 'y', event: Event): void {
    const value = Number((event.currentTarget as HTMLInputElement).value);
    (axis === 'x' ? this.listBackgroundX : this.listBackgroundY).set(value);
  }

  protected startListBackgroundDrag(event: PointerEvent): void {
    if (event.button !== 0 || !this.listBackgroundImage()) return;
    const target = event.currentTarget as HTMLElement;
    target.setPointerCapture(event.pointerId);
    this.backgroundDragStart = {
      pointerX: event.clientX,
      pointerY: event.clientY,
      backgroundX: this.listBackgroundX(),
      backgroundY: this.listBackgroundY(),
    };
  }

  protected moveListBackground(event: PointerEvent): void {
    if (!this.backgroundDragStart) return;
    const bounds = (event.currentTarget as HTMLElement).getBoundingClientRect();
    if (!bounds.width || !bounds.height) return;
    this.listBackgroundX.set(this.clampPosition(this.backgroundDragStart.backgroundX - ((event.clientX - this.backgroundDragStart.pointerX) / bounds.width) * 100));
    this.listBackgroundY.set(this.clampPosition(this.backgroundDragStart.backgroundY - ((event.clientY - this.backgroundDragStart.pointerY) / bounds.height) * 100));
  }

  protected endListBackgroundDrag(): void { this.backgroundDragStart = null; }

  private clampPosition(value: number): number { return Math.max(0, Math.min(100, value)); }

  protected downloadCard(): void {
    const model = this.model();
    if (model.kind === 'list') {
      this.downloadListCard();
      return;
    }
    const title = this.escape(model.title);
    const subtitle = this.escape(model.subtitle || this.kindLabel());
    const author = this.escape(model.authorName || 'Watchwise');
    const handle = this.escape(model.username ? `@${model.username}` : '');
    const description = this.escape(model.quote || model.description || '');
    const bg = model.backgroundUrl || model.imageUrl || '';
    const imageLayer = bg ? `<image href="${this.escape(bg)}" x="-28" y="-28" width="1136" height="1976" preserveAspectRatio="xMidYMid slice" opacity=".45" filter="url(#blur)"/>` : '';
    const items = (model.items ?? []).slice(0, 16);
    const renderPosterGrid = (gridItems: readonly ShareCardItem[], startY: number, posterWidth: number, columns: number, options: { showLabels?: boolean; showRatings?: boolean; numbered?: boolean } = {}) => {
      const posterHeight = Math.round(posterWidth * 1.48);
      const gap = Math.round((1080 - columns * posterWidth - 112) / Math.max(1, columns - 1));
      return gridItems.map((item, index) => {
        const x = 56 + (index % columns) * (posterWidth + gap);
        const y = startY + Math.floor(index / columns) * (posterHeight + 38);
        const poster = item.imageUrl ? `<image href="${this.escape(item.imageUrl)}" x="${x}" y="${y}" width="${posterWidth}" height="${posterHeight}" preserveAspectRatio="xMidYMid slice" clip-path="url(#posterClip${options.numbered ? 'list-' : options.showRatings ? 'recent-' : 'grid-'}${index})"/>` : `<rect x="${x}" y="${y}" width="${posterWidth}" height="${posterHeight}" rx="10" fill="#29292e"/>`;
        const clipId = `posterClip${options.numbered ? 'list-' : options.showRatings ? 'recent-' : 'grid-'}${index}`;
        const number = options.numbered ? `<text x="${x + 12}" y="${y + 28}" class="rank">${index + 1}</text>` : '';
        const itemLabel = this.escape(item.label || item.title).slice(0, 38);
        const label = options.showLabels ? `<text x="${x}" y="${y + posterHeight + 24}" class="item-title">${itemLabel}</text>` : '';
        const rating = options.showRatings && item.rating !== null && item.rating !== undefined
          ? `<rect x="${x + posterWidth - 70}" y="${y + posterHeight - 38}" width="64" height="30" rx="7" fill="#101115" fill-opacity=".88"/><svg x="${x + posterWidth - 66}" y="${y + posterHeight - 33}" width="18" height="18" viewBox="0 0 24 24" fill="#F59E0B" stroke="#F59E0B" stroke-width="2" stroke-linejoin="round"><path d="${WATCHWISE_STAR_PATH}"/></svg><text x="${x + posterWidth - 26}" y="${y + posterHeight - 17}" text-anchor="middle" class="rating-small">${this.escape(item.rating.toLocaleString('pt-BR', { maximumFractionDigits: 1 }))}</text>`
          : '';
        return `<clipPath id="${clipId}"><rect x="${x}" y="${y}" width="${posterWidth}" height="${posterHeight}" rx="10"/></clipPath>${poster}${number}${rating}${label}`;
      }).join('');
    };
    const columns = model.kind === 'profile' ? 5 : 4;
    const posterWidth = model.kind === 'profile' ? 168 : 205;
    const posterGrid = renderPosterGrid(items, model.kind === 'profile' ? 900 : 465, posterWidth, columns, { showLabels: model.kind !== 'profile' });
    const recentGrid = model.kind === 'profile' ? renderPosterGrid((model.recentItems ?? []).slice(0, 5), 1310, 168, 5, { showRatings: true }) : '';
    const rating = model.rating === null || model.rating === undefined ? '' : `<svg x="56" y="364" width="30" height="30" viewBox="0 0 24 24" fill="#F59E0B" stroke="#F59E0B" stroke-width="2" stroke-linejoin="round"><path d="${WATCHWISE_STAR_PATH}"/></svg><text x="92" y="390" class="rating">${this.escape(String(model.rating.toLocaleString('pt-BR', { maximumFractionDigits: 1 })))}</text>`;
    const avatarClip = model.kind === 'profile' ? 'profileAvatarClip' : 'avatarClip';
    const avatar = model.avatarUrl ? `<image href="${this.escape(model.avatarUrl)}" x="${model.kind === 'profile' ? 488 : 56}" y="${model.kind === 'profile' ? 205 : 132}" width="${model.kind === 'profile' ? 104 : 72}" height="${model.kind === 'profile' ? 104 : 72}" preserveAspectRatio="xMidYMid slice" clip-path="url(#${avatarClip})"/>` : '';
    const ratingsMap = model.ratingsMatrix?.columnLabels.length
      ? (() => {
          const matrix = model.ratingsMatrix!;
          const left = 56;
          const labelWidth = 74;
          const averageWidth = 82;
          const cellWidth = Math.min(128, (968 - labelWidth - averageWidth) / matrix.columnLabels.length);
          const startY = 468;
          const rowHeight = Math.min(47, 590 / Math.max(1, matrix.rowLabels.length));
          const header = `<text x="${left + labelWidth / 2}" y="${startY - 14}" text-anchor="middle" class="meta">Ep.</text>${matrix.columnLabels.map((label, index) => `<text x="${left + labelWidth + cellWidth * (index + .5)}" y="${startY - 14}" text-anchor="middle" class="meta">${this.escape(label)}</text>`).join('')}<text x="${left + labelWidth + matrix.columnLabels.length * cellWidth + averageWidth / 2}" y="${startY - 14}" text-anchor="middle" class="meta">Média</text>`;
          const rows = matrix.rowLabels.map((label, row) => {
            const y = startY + row * rowHeight;
            const cells = matrix.columnLabels.map((_, col) => {
              const x = left + labelWidth + col * cellWidth;
              const score = matrix.cells[row]?.[col] ?? 0;
              return `<rect x="${x + 2}" y="${y}" width="${cellWidth - 4}" height="${rowHeight - 3}" rx="5" fill="#222329" stroke="#444650"/><text x="${x + cellWidth / 2}" y="${y + rowHeight * .67}" text-anchor="middle" class="map-score">${this.escape(String(score))}</text>`;
            }).join('');
            return `<text x="${left + labelWidth / 2}" y="${y + rowHeight * .67}" text-anchor="middle" class="meta">${this.escape(label)}</text>${cells}`;
          }).join('');
          const averageY = startY + matrix.rowLabels.length * rowHeight;
          const averages = matrix.averages.map((average, index) => {
            const x = left + labelWidth + index * cellWidth;
            return `<text x="${x + cellWidth / 2}" y="${averageY + 27}" text-anchor="middle" class="map-score">${this.escape(average === null ? '0.0' : average.toFixed(1))}</text>`;
          }).join('');
          return `${header}${rows}<text x="${left + labelWidth / 2}" y="${averageY + 27}" text-anchor="middle" class="meta">Média</text>${averages}`;
        })()
      : '';
    const scores = ratingsMap || (model.scoreGroups?.length
      ? model.scoreGroups.slice(0, 8).map((group, row) => {
          const y = 470 + row * 92;
          const cells = group.scores.slice(0, 9).map((score, col) => {
            const x = 170 + col * 86;
            return `<rect x="${x}" y="${y}" width="72" height="64" rx="8" fill="#222329" stroke="#444650"/><text x="${x + 36}" y="${y + 41}" class="map-score">${this.escape(score === null || score === undefined ? '0' : String(score))}</text>`;
          }).join('');
          return `<text x="56" y="${y + 40}" class="meta">${this.escape(group.label)}</text>${cells}<text x="958" y="${y + 40}" class="map-score">${this.escape(group.average === null ? '0' : group.average.toFixed(1))}</text>`;
        }).join('')
      : (model.scores ?? []).slice(0, 48).map((score, index) => {
          const col = index % 8;
          const row = Math.floor(index / 8);
          const x = 56 + col * 120;
          const y = 480 + row * 102;
          return `<rect x="${x}" y="${y}" width="104" height="78" rx="10" fill="#222329" stroke="#444650"/><text x="${x + 52}" y="${y + 48}" class="map-score">${this.escape(score === null || score === undefined ? '0' : String(score))}</text>`;
        }).join(''));
    const episodeImage = model.kind === 'episode' && model.imageUrl ? `<image href="${this.escape(model.imageUrl)}" x="56" y="440" width="968" height="420" preserveAspectRatio="xMidYMid slice" clip-path="url(#episodeClip)"/>` : '';
    const profileBio = model.kind === 'profile' && model.description
      ? this.wrapLines(model.description, 66).slice(0, 3).map((line, index) => `<text x="540" y="${586 + index * 34}" text-anchor="middle" class="body-small">${this.escape(line)}</text>`).join('')
      : '';
    const profileHeaders = model.kind === 'profile'
      ? `${avatar}<text x="540" y="470" text-anchor="middle" class="profile-title">${title.slice(0, 46)}</text><text x="540" y="512" text-anchor="middle" class="profile-handle">${handle}</text>${profileBio}<text x="56" y="850" class="section-title">Top 5</text>${posterGrid}<text x="56" y="1260" class="section-title">Atividade recente</text>${recentGrid}`
      : `${avatar}<text x="56" y="170" class="meta">${author}</text><text x="56" y="208" class="meta">${handle || subtitle}</text><text x="56" y="310" class="title">${title.slice(0, 46)}</text><text x="56" y="365" class="body">${description.slice(0, 96)}</text>`;
    const content = model.kind === 'episode' ? episodeImage : model.kind === 'ratings-map' ? scores : posterGrid;
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1080" height="1920" viewBox="0 0 1080 1920"><defs><linearGradient id="shade" x1="0" y1="0" x2="0" y2="1"><stop stop-color="#101115" stop-opacity=".38"/><stop offset="1" stop-color="#101115" stop-opacity=".96"/></linearGradient><filter id="blur"><feGaussianBlur stdDeviation="18"/></filter><clipPath id="avatarClip"><circle cx="92" cy="168" r="36"/></clipPath><clipPath id="profileAvatarClip"><circle cx="540" cy="257" r="52"/></clipPath><clipPath id="episodeClip"><rect x="56" y="440" width="968" height="420" rx="16"/></clipPath><style>.meta{font:600 25px Arial,sans-serif;fill:#d7d9df}.title{font:700 52px Arial,sans-serif;fill:#fff}.body{font:400 25px Arial,sans-serif;fill:#d8d9df}.body-small{font:400 27px Arial,sans-serif;fill:#d8d9df}.profile-title{font:700 43px Arial,sans-serif;fill:#fff}.profile-handle{font:600 22px Arial,sans-serif;fill:#d7d9df}.section-title{font:700 28px Arial,sans-serif;fill:#fff}.rating{font:700 34px Arial,sans-serif;fill:#ffcf49}.rating-small{font:700 18px Arial,sans-serif;fill:#ffcf49}.item-title{font:600 20px Arial,sans-serif;fill:#f3f4f6}.rank{font:700 24px Arial,sans-serif;fill:#fff}.map-score{font:700 30px Arial,sans-serif;fill:#ffd25a}.watermark{font:700 30px Arial,sans-serif;fill:#fff;letter-spacing:2px}</style></defs><rect width="1080" height="1920" fill="#17181d"/>${imageLayer}<rect width="1080" height="1920" fill="url(#shade)"/>${profileHeaders}${model.kind === 'profile' ? '' : `${rating}${content}`}<text x="56" y="1780" class="watermark">ON WATCHWISE</text></svg>`;
    const blob = new Blob([svg], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `watchwise-${model.kind}.svg`;
    anchor.click();
    URL.revokeObjectURL(url);
  }

  protected async copyListImage(): Promise<void> {
    if (this.listCopyPending()) return;
    this.listCopyPending.set(true);
    try {
      const clipboard = navigator.clipboard;
      if (!clipboard?.write || typeof ClipboardItem === 'undefined') throw new Error('clipboard-unavailable');
      const imageBlob = await this.createListImageBlob();
      await clipboard.write([new ClipboardItem({ 'image/png': imageBlob })]);
      this.toasts.success(this.listCopy.imageCopied);
    } catch {
      this.toasts.error(this.listCopy.copyError);
    } finally {
      this.listCopyPending.set(false);
    }
  }

  private async downloadListCard(): Promise<void> {
    const svg = await this.createListCardSvg();
    const url = URL.createObjectURL(new Blob([svg], { type: 'image/svg+xml;charset=utf-8' }));
    const anchor = this.document.createElement('a');
    anchor.href = url;
    anchor.download = 'watchwise-lista.svg';
    anchor.click();
    setTimeout(() => URL.revokeObjectURL(url), 0);
  }

  private async createListCardSvg(): Promise<string> {
    const preview = this.listSharePreview?.nativeElement;
    if (!preview) throw new Error('list-preview-unavailable');

    const bounds = preview.getBoundingClientRect();
    if (!bounds.width || !bounds.height) throw new Error('list-preview-not-rendered');

    const clone = preview.cloneNode(true) as HTMLElement;
    await this.copyComputedPreviewStyles(preview, clone);
    await this.inlinePreviewImages(preview, clone);

    const foreignObject = new XMLSerializer().serializeToString(clone);
    const fontFaces = await this.inlineInterFontFaces();
    return `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xhtml="http://www.w3.org/1999/xhtml" width="1080" height="1920" viewBox="0 0 ${bounds.width} ${bounds.height}" preserveAspectRatio="none"><defs><style>${fontFaces}</style></defs><foreignObject x="0" y="0" width="${bounds.width}" height="${bounds.height}">${foreignObject}</foreignObject></svg>`;
  }

  private async copyComputedPreviewStyles(source: HTMLElement, clone: HTMLElement): Promise<void> {
    const view = this.document.defaultView;
    if (!view) throw new Error('preview-window-unavailable');

    const computed = view.getComputedStyle(source);
    const declarations: string[] = [];
    for (let index = 0; index < computed.length; index += 1) {
      const property = computed.item(index);
      const value = property === 'background-image'
        ? await this.inlineCssImageUrls(computed.getPropertyValue(property))
        : computed.getPropertyValue(property);
      declarations.push(`${property}:${value};`);
    }
    clone.setAttribute('style', declarations.join(''));

    const sourceChildren = Array.from(source.children) as HTMLElement[];
    const cloneChildren = Array.from(clone.children) as HTMLElement[];
    await Promise.all(sourceChildren.map((child, index) => this.copyComputedPreviewStyles(child, cloneChildren[index])));

    const before = this.clonePseudoElement(source, '::before', view);
    const after = this.clonePseudoElement(source, '::after', view);
    if (before) clone.insertBefore(before, clone.firstChild);
    if (after) clone.append(after);
  }

  private clonePseudoElement(source: HTMLElement, pseudo: '::before' | '::after', view: Window): HTMLElement | null {
    const computed = view.getComputedStyle(source, pseudo);
    if (!computed.content || computed.content === 'none' || computed.content === 'normal') return null;

    const pseudoElement = this.document.createElement('span');
    const declarations: string[] = [];
    for (let index = 0; index < computed.length; index += 1) {
      const property = computed.item(index);
      if (property === 'content') continue;
      declarations.push(`${property}:${computed.getPropertyValue(property)};`);
    }
    pseudoElement.setAttribute('style', declarations.join(''));
    const text = computed.content.replace(/^(['"])(.*)\1$/s, '$2');
    pseudoElement.textContent = text === 'none' || text === 'normal' ? '' : text;
    return pseudoElement;
  }

  private async inlinePreviewImages(source: HTMLElement, clone: HTMLElement): Promise<void> {
    const sourceImages = Array.from(source.querySelectorAll('img'));
    const cloneImages = Array.from(clone.querySelectorAll('img'));
    await Promise.all(sourceImages.map(async (image, index) => {
      const url = image.currentSrc || image.src;
      if (!url) return;
      cloneImages[index].src = await this.imageAsDataUrl(url);
      cloneImages[index].removeAttribute('loading');
      cloneImages[index].setAttribute('draggable', 'false');
    }));
  }

  private async inlineCssImageUrls(value: string): Promise<string> {
    const urls = Array.from(value.matchAll(/url\((['"]?)(.*?)\1\)/g));
    let result = value;
    for (const match of urls) {
      const source = match[2];
      if (!source || source.startsWith('data:')) continue;
      const dataUrl = await this.imageAsDataUrl(source);
      result = result.replace(match[0], `url("${dataUrl}")`);
    }
    return result;
  }

  private async imageAsDataUrl(source: string): Promise<string> {
    const url = new URL(source, this.document.baseURI).href;
    if (url.startsWith('data:')) return url;
    const response = await fetch(url, { mode: 'cors' });
    if (!response.ok) throw new Error('image-load-failed');
    return this.blobAsDataUrl(await response.blob());
  }

  private async inlineInterFontFaces(): Promise<string> {
    const fontLink = this.document.querySelector<HTMLLinkElement>('link[href*="fonts.googleapis.com/css2?family=Inter"]');
    if (!fontLink) return '';

    try {
      const stylesheet = await fetch(fontLink.href);
      if (!stylesheet.ok) return '';
      const rules = (await stylesheet.text()).match(/@font-face\s*\{[^}]+\}/g) ?? [];
      const weights = [400, 500, 600, 700];
      const faces = await Promise.all(weights.map(async (weight) => {
        const rule = rules.find((candidate) =>
          new RegExp(`font-weight:\\s*${weight}(?:\\s|;)`, 'i').test(candidate) && /unicode-range:\s*U\+0000-00FF/i.test(candidate),
        );
        const source = rule?.match(/src:\s*url\((['"]?)(.*?)\1\)/i)?.[2];
        if (!source) return '';
        const fontData = await this.imageAsDataUrl(source);
        return `@font-face{font-family:Inter;font-style:normal;font-weight:${weight};src:url("${fontData}") format("woff2");}`;
      }));
      return faces.join('');
    } catch {
      return '';
    }
  }

  private async createListImageBlob(): Promise<Blob> {
    const svgDocument = new DOMParser().parseFromString(await this.createListCardSvg(), 'image/svg+xml');
    if (svgDocument.querySelector('parsererror')) throw new Error('invalid-svg');

    const svg = new XMLSerializer().serializeToString(svgDocument.documentElement);
    const objectUrl = URL.createObjectURL(new Blob([svg], { type: 'image/svg+xml;charset=utf-8' }));
    try {
      const image = this.document.createElement('img');
      image.src = objectUrl;
      await image.decode();
      const canvas = this.document.createElement('canvas');
      canvas.width = 1080;
      canvas.height = 1920;
      const context = canvas.getContext('2d');
      if (!context) throw new Error('canvas-unavailable');
      context.drawImage(image, 0, 0);
      return await new Promise<Blob>((resolve, reject) => {
        canvas.toBlob((blob) => blob ? resolve(blob) : reject(new Error('image-encode-failed')), 'image/png');
      });
    } finally {
      URL.revokeObjectURL(objectUrl);
    }
  }

  private blobAsDataUrl(blob: Blob): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => typeof reader.result === 'string' ? resolve(reader.result) : reject(new Error('image-read-failed'));
      reader.onerror = () => reject(reader.error ?? new Error('image-read-failed'));
      reader.readAsDataURL(blob);
    });
  }

  private escape(value: string): string {
    return value.replace(/[&<>"']/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;' })[character]!);
  }

  private wrapLines(value: string, maxLength: number): string[] {
    const lines: string[] = [];
    let line = '';
    for (const word of value.trim().split(/\s+/)) {
      const next = line ? `${line} ${word}` : word;
      if (next.length > maxLength && line) {
        lines.push(line);
        line = word;
      } else {
        line = next;
      }
    }
    if (line) lines.push(line);
    return lines;
  }
}
