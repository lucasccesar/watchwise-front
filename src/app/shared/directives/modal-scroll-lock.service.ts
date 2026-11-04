import { DOCUMENT } from '@angular/common';
import { Injectable, inject } from '@angular/core';

type InlineScrollStyles = {
  htmlOverflow: string;
  bodyOverflow: string;
  bodyPosition: string;
  bodyTop: string;
  bodyLeft: string;
  bodyRight: string;
  bodyWidth: string;
  bodyPaddingRight: string;
};

@Injectable({ providedIn: 'root' })
export class ModalScrollLockService {
  private readonly document = inject(DOCUMENT);
  private lockCount = 0;
  private scrollY = 0;
  private originalStyles: InlineScrollStyles | null = null;

  acquire(): () => void {
    if (this.lockCount === 0) this.lock();
    this.lockCount += 1;
    let released = false;
    return () => {
      if (released) return;
      released = true;
      this.lockCount = Math.max(0, this.lockCount - 1);
      if (this.lockCount === 0) this.unlock();
    };
  }

  private lock(): void {
    const view = this.document.defaultView;
    const body = this.document.body;
    if (!view || !body) return;

    const htmlStyle = this.document.documentElement.style;
    const bodyStyle = body.style;
    this.scrollY = view.scrollY || this.document.documentElement.scrollTop;
    this.originalStyles = {
      htmlOverflow: htmlStyle.overflow,
      bodyOverflow: bodyStyle.overflow,
      bodyPosition: bodyStyle.position,
      bodyTop: bodyStyle.top,
      bodyLeft: bodyStyle.left,
      bodyRight: bodyStyle.right,
      bodyWidth: bodyStyle.width,
      bodyPaddingRight: bodyStyle.paddingRight,
    };

    const scrollbarWidth = Math.max(0, view.innerWidth - this.document.documentElement.clientWidth);
    const currentPadding = Number.parseFloat(view.getComputedStyle(body).paddingRight) || 0;
    htmlStyle.overflow = 'hidden';
    bodyStyle.overflow = 'hidden';
    bodyStyle.position = 'fixed';
    bodyStyle.top = `-${this.scrollY}px`;
    bodyStyle.left = '0';
    bodyStyle.right = '0';
    bodyStyle.width = '100%';
    if (scrollbarWidth) bodyStyle.paddingRight = `${currentPadding + scrollbarWidth}px`;
  }

  private unlock(): void {
    const view = this.document.defaultView;
    const body = this.document.body;
    const original = this.originalStyles;
    if (!view || !body || !original) return;

    const htmlStyle = this.document.documentElement.style;
    const bodyStyle = body.style;
    htmlStyle.overflow = original.htmlOverflow;
    bodyStyle.overflow = original.bodyOverflow;
    bodyStyle.position = original.bodyPosition;
    bodyStyle.top = original.bodyTop;
    bodyStyle.left = original.bodyLeft;
    bodyStyle.right = original.bodyRight;
    bodyStyle.width = original.bodyWidth;
    bodyStyle.paddingRight = original.bodyPaddingRight;
    this.originalStyles = null;
    view.scrollTo(0, this.scrollY);
  }
}
