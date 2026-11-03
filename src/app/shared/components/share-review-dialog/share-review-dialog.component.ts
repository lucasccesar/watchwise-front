import { DOCUMENT } from '@angular/common';
import { ChangeDetectionStrategy, Component, OnDestroy, Renderer2, effect, inject, input, output, signal } from '@angular/core';
import { Subscription } from 'rxjs';
import { ContentApiService, ContentImageSelection, ContentImageSelectionKind, ContentImageSelectionType } from '../../../features/content/data-access/content-api.service';
import { ModalFocusDirective } from '../../directives/modal-focus.directive';

export interface ShareReviewDialogModel {
  title: string;
  subtitle?: string | null;
  rating: number | null;
  review: string | null;
  backgroundUrl: string | null;
  posterUrl: string | null;
  username: string | null;
  avatarUrl: string | null;
  selectionType: ContentImageSelectionType | null;
  tmdbId: string | null;
}

export interface ShareReviewDialogCopy {
  shareTitle: string;
  shareDescription: string;
  shareImageAlt: string;
  shareImages: string;
  shareChangeImage: string;
  shareChangePoster: string;
  shareImageLoading: string;
  shareImageEmpty: string;
  shareImageLoadError: string;
  shareSelectPoster: string;
  shareSelectBackdrop: string;
  shareUploadImage: string;
  retry: string;
  shareOriginalImages: string;
  shareZoom: string;
  zoomOut: string;
  zoomIn: string;
  sharePosition: string;
  shareHorizontal: string;
  shareVertical: string;
  sharePositionHint: string;
  shareResetBackground: string;
  shareShowReview: string;
  shareReviewVisible: string;
  shareReviewHidden: string;
  cancel: string;
  shareCopyImage: string;
  shareCopying: string;
  shareImageCopied: string;
  shareImageTypeError: string;
  shareError: string;
  closeDialog: string;
}

@Component({
  selector: 'app-share-review-dialog',
  standalone: true,
  imports: [ModalFocusDirective],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './share-review-dialog.component.html',
  styleUrl: './share-review-dialog.component.css',
})
export class ShareReviewDialogComponent implements OnDestroy {
  readonly model = input.required<ShareReviewDialogModel>();
  readonly copy = input.required<ShareReviewDialogCopy>();
  readonly returnFocusTarget = input<HTMLElement | null>(null);
  readonly closed = output<void>();
  protected readonly shareImageUrl = signal<string | null>(null);
  protected readonly sharePosterUrl = signal<string | null>(null);
  protected readonly shareZoom = signal(120);
  protected readonly shareX = signal(50);
  protected readonly shareY = signal(30);
  protected readonly shareShowReview = signal(true);
  protected readonly shareError = signal('');
  protected readonly shareCopySuccess = signal('');
  protected readonly shareCopyPending = signal(false);
  protected readonly activeImagePicker = signal<ContentImageSelectionKind | null>(null);
  protected readonly posterOptions = signal<ContentImageSelection[]>([]);
  protected readonly backdropOptions = signal<ContentImageSelection[]>([]);
  protected readonly posterOptionsStatus = signal<'idle' | 'loading' | 'ready' | 'error'>('idle');
  protected readonly backdropOptionsStatus = signal<'idle' | 'loading' | 'ready' | 'error'>('idle');
  protected readonly selectedPosterUrl = signal<string | null>(null);
  protected readonly selectedBackdropUrl = signal<string | null>(null);
  protected readonly imageOptionSkeletons = [0, 1, 2, 3, 4, 5];
  private shareDrag: { x: number; y: number; startX: number; startY: number } | null = null;
  private imageRequests = new Subscription();
  private readonly document = inject(DOCUMENT);
  private readonly renderer = inject(Renderer2);
  private readonly contentApi = inject(ContentApiService);

  constructor() {
    effect((onCleanup) => {
      const root = this.document.documentElement;
      const body = this.document.body;
      const previousRootOverflow = root.style.overflow;
      const previousBodyOverflow = body.style.overflow;
      this.renderer.setStyle(root, 'overflow', 'hidden');
      this.renderer.setStyle(body, 'overflow', 'hidden');
      onCleanup(() => {
        this.renderer.setStyle(root, 'overflow', previousRootOverflow);
        this.renderer.setStyle(body, 'overflow', previousBodyOverflow);
      });
    });
  }

  ngOnDestroy(): void {
    this.releaseShareImages();
    this.imageRequests.unsubscribe();
  }

  protected close(): void {
    this.closed.emit();
  }

  protected dismissFromBackdrop(event: MouseEvent): void {
    if (event.target === event.currentTarget) this.close();
  }

  protected onShareImageChanged(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      this.shareError.set(this.copy().shareImageTypeError);
      input.value = '';
      return;
    }
    this.revokeUrl(this.shareImageUrl());
    this.shareImageUrl.set(URL.createObjectURL(file));
    this.selectedBackdropUrl.set(null);
    this.shareX.set(50);
    this.shareY.set(50);
    this.shareZoom.set(120);
    this.shareError.set('');
    this.shareCopySuccess.set('');
  }

  protected onSharePosterChanged(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      this.shareError.set(this.copy().shareImageTypeError);
      input.value = '';
      return;
    }
    this.revokeUrl(this.sharePosterUrl());
    this.sharePosterUrl.set(URL.createObjectURL(file));
    this.selectedPosterUrl.set(null);
    this.shareError.set('');
    this.shareCopySuccess.set('');
  }

  protected onCustomImageChanged(kind: ContentImageSelectionKind, event: Event): void {
    if (kind === 'posters') this.onSharePosterChanged(event);
    else this.onShareImageChanged(event);
  }

  protected toggleImagePicker(kind: ContentImageSelectionKind): void {
    if (this.activeImagePicker() === kind) {
      this.activeImagePicker.set(null);
      return;
    }
    this.activeImagePicker.set(kind);
    const status = kind === 'posters' ? this.posterOptionsStatus() : this.backdropOptionsStatus();
    if (status === 'idle' || status === 'error') this.loadImageOptions(kind);
  }

  protected handleDialogClick(event: MouseEvent): void {
    const target = event.target;
    if (target instanceof Element
      && !target.closest('.movie-share-image-options')
      && !target.closest('.movie-share-image-picker')) {
      this.activeImagePicker.set(null);
    }
    event.stopPropagation();
  }

  protected retryImageOptions(kind: ContentImageSelectionKind): void {
    this.loadImageOptions(kind);
  }

  protected imageOptions(kind: ContentImageSelectionKind): ContentImageSelection[] {
    return kind === 'posters' ? this.posterOptions() : this.backdropOptions();
  }

  protected imageOptionsStatus(kind: ContentImageSelectionKind): 'idle' | 'loading' | 'ready' | 'error' {
    return kind === 'posters' ? this.posterOptionsStatus() : this.backdropOptionsStatus();
  }

  protected selectAvailableImage(kind: ContentImageSelectionKind, image: ContentImageSelection): void {
    if (kind === 'posters') {
      this.revokeUrl(this.sharePosterUrl());
      this.sharePosterUrl.set(null);
      this.selectedPosterUrl.set(image.url);
    } else {
      this.revokeUrl(this.shareImageUrl());
      this.shareImageUrl.set(null);
      this.selectedBackdropUrl.set(image.url);
    }
    this.activeImagePicker.set(null);
    this.shareError.set('');
    this.shareCopySuccess.set('');
  }

  protected isSelectedImage(kind: ContentImageSelectionKind, image: ContentImageSelection): boolean {
    const selected = kind === 'posters' ? this.selectedPosterUrl() : this.selectedBackdropUrl();
    const original = kind === 'posters' ? this.model().posterUrl : this.model().backgroundUrl;
    return (selected ?? original) === image.url;
  }

  protected selectedPoster(): string | null {
    return this.selectedPosterUrl() || this.model().posterUrl;
  }

  protected selectedBackdrop(): string | null {
    return this.selectedBackdropUrl() || this.model().backgroundUrl || this.selectedPoster();
  }

  protected changeShareZoom(delta: number): void {
    this.shareZoom.update((zoom) => Math.min(250, Math.max(100, zoom + delta)));
  }

  protected shareWheel(event: WheelEvent): void {
    event.preventDefault();
    if (event.deltaY !== 0) this.changeShareZoom(event.deltaY < 0 ? 10 : -10);
  }

  protected resetShareBackground(): void {
    this.shareX.set(50);
    this.shareY.set(30);
    this.shareZoom.set(120);
  }

  protected resetShareImages(): void {
    this.releaseShareImages();
    this.selectedPosterUrl.set(null);
    this.selectedBackdropUrl.set(null);
    this.activeImagePicker.set(null);
    this.resetShareBackground();
    this.shareError.set('');
    this.shareCopySuccess.set('');
  }

  protected shareDragStart(event: PointerEvent): void {
    if (event.button !== 0) return;
    this.shareDrag = { x: event.clientX, y: event.clientY, startX: this.shareX(), startY: this.shareY() };
    (event.currentTarget as HTMLElement).setPointerCapture(event.pointerId);
  }

  protected shareDragMove(event: PointerEvent): void {
    if (!this.shareDrag) return;
    const bounds = (event.currentTarget as HTMLElement).getBoundingClientRect();
    if (!bounds.width || !bounds.height) return;
    this.shareX.set(Math.min(100, Math.max(0, this.shareDrag.startX - (event.clientX - this.shareDrag.x) / bounds.width * 100)));
    this.shareY.set(Math.min(100, Math.max(0, this.shareDrag.startY - (event.clientY - this.shareDrag.y) / bounds.height * 100)));
  }

  protected shareDragEnd(): void {
    this.shareDrag = null;
  }

  protected async copyShareImage(): Promise<void> {
    if (this.shareCopyPending()) return;
    this.shareCopyPending.set(true);
    this.shareCopySuccess.set('');
    this.shareError.set('');
    try {
      const clipboard = navigator.clipboard;
      if (!clipboard?.write || typeof ClipboardItem === 'undefined') {
        throw new Error('clipboard-unavailable');
      }
      const imageBlob = this.createShareImageBlob();
      await clipboard.write([new ClipboardItem({ 'image/png': imageBlob })]);
      this.shareCopySuccess.set(this.copy().shareImageCopied);
    } catch {
      this.shareError.set(this.copy().shareError);
    } finally {
      this.shareCopyPending.set(false);
    }
  }

  private async createShareImageBlob(): Promise<Blob> {
    const model = this.model();
    const canvas = this.document.createElement('canvas');
    canvas.width = 540;
    canvas.height = 960;
    const context = canvas.getContext('2d');
    if (!context) throw new Error('canvas-unavailable');

    try {
      context.fillStyle = '#181818';
      context.fillRect(0, 0, 540, 960);
      const background = this.shareImageUrl() || this.selectedBackdrop() || model.posterUrl;
      if (background) {
        const image = await this.loadShareImage(background);
        const height = 1008 * this.shareZoom() / 100;
        const width = height * image.naturalWidth / image.naturalHeight;
        const x = (540 - width) * this.shareX() / 100;
        const y = (960 - height) * this.shareY() / 100;
        context.save();
        context.filter = 'blur(3px)';
        context.drawImage(image, x, y, width, height);
        context.restore();
      }

      const shade = context.createLinearGradient(0, 0, 0, 960);
      for (const [stop, opacity] of [[0, .45], [.3, .35], [.55, .8], [.75, .96], [1, 1]]) {
        shade.addColorStop(stop, `rgba(24,24,24,${opacity})`);
      }
      context.fillStyle = shade;
      context.fillRect(0, 0, 540, 960);

      const username = model.username ? `@${model.username}` : 'Watchwise';
      context.font = '600 14px Inter, sans-serif';
      const authorWidth = Math.min(320, context.measureText(username).width + 52);
      const authorX = (540 - authorWidth) / 2;
      context.fillStyle = 'rgba(24,24,24,.72)';
      context.beginPath();
      context.roundRect(authorX, 110, authorWidth, 34, 17);
      context.fill();
      const avatar = await this.loadShareImage(model.avatarUrl || '/default-user-avatar.png');
      context.save();
      context.beginPath();
      context.arc(authorX + 17, 127, 12, 0, Math.PI * 2);
      context.clip();
      context.drawImage(avatar, authorX + 5, 115, 24, 24);
      context.restore();
      context.fillStyle = '#F2F7FA';
      context.fillText(username, authorX + 36, 132);

      const poster = this.sharePosterUrl() || this.selectedPoster();
      if (poster) {
        const image = await this.loadShareImage(poster);
        context.save();
        context.beginPath();
        context.roundRect(150, 164, 240, 360, 12);
        context.clip();
        context.drawImage(image, 150, 164, 240, 360);
        context.restore();
      }

      context.textAlign = 'center';
      context.fillStyle = '#F2F7FA';
      context.font = '700 30px Inter, sans-serif';
      context.fillText(`${model.title}${model.subtitle ? `  ${model.subtitle}` : ''}`, 270, 580, 444);
      if (model.rating !== null) {
        context.fillStyle = '#F59E0B';
        context.font = '700 28px Inter, sans-serif';
        context.fillText('★', 218, 630);
        context.fillStyle = '#F2F7FA';
        context.font = '700 30px Inter, sans-serif';
        context.fillText(`${model.rating}/10`, 285, 630);
      }
      if (this.shareShowReview() && model.review?.trim()) {
        context.textAlign = 'center';
        context.font = '16px Inter, sans-serif';
        const reviewLines = this.wrapShareText(context, `“${model.review}”`, 402, 4);
        const reviewTextWidth = Math.min(402, Math.max(...reviewLines.map((line) => {
          const metrics = context.measureText(line);
          return metrics.actualBoundingBoxLeft + metrics.actualBoundingBoxRight;
        })));
        const reviewWidth = reviewTextWidth + 20;
        const reviewX = (540 - reviewWidth) / 2;
        const reviewHeight = reviewLines.length * 24 + 34;
        context.fillStyle = 'rgba(28,28,28,.72)';
        context.beginPath();
        context.roundRect(reviewX, 655, reviewWidth, reviewHeight, 12);
        context.fill();
        context.fillStyle = '#F2F7FA';
        this.drawShareText(context, reviewLines, 270, 683, 24);
      }
      context.fillStyle = '#F2F7FA';
      context.textAlign = 'left';
      context.font = '600 12px Inter, sans-serif';
      context.fillText('ON', 188, 855);
      const logo = await this.loadShareImage('/watchwise-logo.svg');
      context.drawImage(logo, 222, 835, 126, 24);

      return await new Promise<Blob>((resolve, reject) => {
        canvas.toBlob((blob) => blob ? resolve(blob) : reject(new Error('image-encode-failed')), 'image/png');
      });
    } catch (error) {
      throw error;
    }
  }

  private loadShareImage(url: string): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
      const image = new Image();
      image.crossOrigin = 'anonymous';
      image.onload = () => resolve(image);
      image.onerror = () => reject(new Error('image-load'));
      image.src = url;
    });
  }

  private loadImageOptions(kind: ContentImageSelectionKind): void {
    const model = this.model();
    const type = model.selectionType;
    const tmdbId = model.tmdbId;
    if (!type || !tmdbId) {
      this.setImageOptionsStatus(kind, 'error');
      return;
    }

    this.setImageOptionsStatus(kind, 'loading');
    this.imageRequests.add(this.contentApi.getContentImages(type, tmdbId, kind).subscribe({
      next: (images) => {
        if (kind === 'posters') this.posterOptions.set(images);
        else this.backdropOptions.set(images);
        this.setImageOptionsStatus(kind, 'ready');
      },
      error: () => this.setImageOptionsStatus(kind, 'error'),
    }));
  }

  private setImageOptionsStatus(kind: ContentImageSelectionKind, status: 'idle' | 'loading' | 'ready' | 'error'): void {
    if (kind === 'posters') this.posterOptionsStatus.set(status);
    else this.backdropOptionsStatus.set(status);
  }

  private wrapShareText(context: CanvasRenderingContext2D, value: string, width: number, maxLines: number): string[] {
    const lines: string[] = [];
    for (const paragraph of value.split(/\r\n|\r|\n/)) {
      const words = paragraph.trim().split(/\s+/).filter(Boolean);
      if (!words.length) {
        lines.push('');
        if (lines.length >= maxLines) return lines;
        continue;
      }

      let line = '';
      for (const word of words) {
        const next = line ? `${line} ${word}` : word;
        if (context.measureText(next).width > width && line) {
          lines.push(line);
          if (lines.length >= maxLines) return lines;
          line = word;
        } else {
          line = next;
        }
      }
      if (line) {
        lines.push(line);
        if (lines.length >= maxLines) return lines;
      }
    }
    return lines;
  }

  private drawShareText(context: CanvasRenderingContext2D, lines: string[], x: number, y: number, lineHeight: number): void {
    lines.forEach((line, index) => context.fillText(line, x, y + index * lineHeight));
  }

  private releaseShareImages(): void {
    this.revokeUrl(this.shareImageUrl());
    this.revokeUrl(this.sharePosterUrl());
    this.shareImageUrl.set(null);
    this.sharePosterUrl.set(null);
  }

  private revokeUrl(url: string | null): void {
    if (url?.startsWith('blob:')) URL.revokeObjectURL(url);
  }
}
