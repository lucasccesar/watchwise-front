import { DOCUMENT } from '@angular/common';
import { AfterViewInit, Directive, ElementRef, HostListener, OnDestroy, inject, input, output } from '@angular/core';

@Directive({ selector: '[appModalFocus]', standalone: true, host: { tabindex: '-1' } })
export class ModalFocusDirective implements AfterViewInit, OnDestroy {
  readonly modalReturnFocus = input<HTMLElement | null>(null);
  readonly modalDismiss = output<void>();
  private static readonly stack: ModalFocusDirective[] = [];
  private readonly document = inject(DOCUMENT);
  private readonly root = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;
  private readonly opener = this.document.activeElement as HTMLElement | null;
  private destroyed = false;

  ngAfterViewInit(): void {
    ModalFocusDirective.stack.push(this);
    (this.controls()[0] ?? this.root).focus();
  }

  @HostListener('document:keydown', ['$event'])
  handleKeydown(event: KeyboardEvent): void {
    if (ModalFocusDirective.stack.at(-1) !== this) return;
    if (event.key === 'Escape') {
      event.preventDefault(); event.stopPropagation(); this.modalDismiss.emit();
      return;
    }
    if (event.key !== 'Tab') return;
    const controls = this.controls(); const first = controls[0]; const last = controls.at(-1);
    if (!first) { event.preventDefault(); this.root.focus(); }
    else if (!this.root.contains(this.document.activeElement)) {
      event.preventDefault(); (event.shiftKey ? last : first)?.focus();
    } else if (event.shiftKey && this.document.activeElement === first) {
      event.preventDefault(); last?.focus();
    } else if (!event.shiftKey && this.document.activeElement === last) {
      event.preventDefault(); first.focus();
    }
  }

  ngOnDestroy(): void {
    if (this.destroyed) return;
    this.destroyed = true;
    const index = ModalFocusDirective.stack.indexOf(this);
    if (index >= 0) ModalFocusDirective.stack.splice(index, 1);
    (this.modalReturnFocus() ?? this.opener)?.focus();
  }

  private controls(): HTMLElement[] {
    return Array.from(this.root.querySelectorAll<HTMLElement>('button:not([disabled]), a[href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'));
  }
}
