import { AfterViewInit, Directive, ElementRef, Input, OnChanges, OnDestroy, Renderer2 } from '@angular/core';

@Directive({ selector: '[wwTooltipWhenTruncated]', standalone: true })
export class TooltipWhenTruncatedDirective implements AfterViewInit, OnChanges, OnDestroy {
  @Input() wwTooltipWhenTruncated = '';

  private readonly element: HTMLElement;
  private readonly renderer: Renderer2;
  private resizeObserver: ResizeObserver | null = null;
  private pendingFrame: number | null = null;
  private viewReady = false;
  private destroyed = false;

  constructor(elementRef: ElementRef<HTMLElement>, renderer: Renderer2) {
    this.element = elementRef.nativeElement;
    this.renderer = renderer;
  }

  ngAfterViewInit(): void {
    this.viewReady = true;

    if (typeof ResizeObserver !== 'undefined') {
      this.resizeObserver = new ResizeObserver(() => this.updateTooltip());
      this.resizeObserver.observe(this.element);
    }

    this.scheduleUpdate();
    void this.element.ownerDocument.fonts?.ready.then(() => this.scheduleUpdate());
  }

  ngOnChanges(): void {
    this.scheduleUpdate();
  }

  ngOnDestroy(): void {
    this.destroyed = true;
    this.resizeObserver?.disconnect();

    const view = this.element.ownerDocument.defaultView;
    if (this.pendingFrame !== null && view) view.cancelAnimationFrame(this.pendingFrame);
  }

  private scheduleUpdate(): void {
    if (!this.viewReady || this.destroyed) return;

    const view = this.element.ownerDocument.defaultView;
    if (!view) return;

    if (this.pendingFrame !== null) view.cancelAnimationFrame(this.pendingFrame);
    this.pendingFrame = view.requestAnimationFrame(() => {
      this.pendingFrame = null;
      this.updateTooltip();
    });
  }

  private updateTooltip(): void {
    if (this.destroyed) return;

    const isTruncated = this.element.scrollWidth > this.element.clientWidth
      || this.element.scrollHeight > this.element.clientHeight;

    if (this.wwTooltipWhenTruncated && isTruncated) {
      this.renderer.setAttribute(this.element, 'title', this.wwTooltipWhenTruncated);
    } else {
      this.renderer.removeAttribute(this.element, 'title');
    }
  }
}
