import { DOCUMENT } from '@angular/common';
import { Injectable, inject } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class ModalScrollLockService {
  private readonly document = inject(DOCUMENT);
  private readonly activeLocks = new Set<symbol>();
  private originalBodyPaddingRight = '';

  constructor() {
    this.clearOrphanedLock();
  }

  acquire(): () => void {
    const token = Symbol('modal-scroll-lock');
    if (this.activeLocks.size === 0) this.lock();
    this.activeLocks.add(token);

    let released = false;
    return () => {
      if (released) return;
      released = true;
      this.activeLocks.delete(token);
      if (this.activeLocks.size === 0) this.unlock();
    };
  }

  private lock(): void {
    const view = this.document.defaultView;
    const body = this.document.body;
    const root = this.document.documentElement;
    if (!view || !body || !root) return;

    this.originalBodyPaddingRight = body.style.paddingRight;
    const scrollbarWidth = Math.max(0, view.innerWidth - root.clientWidth);
    const currentPadding = Number.parseFloat(view.getComputedStyle(body).paddingRight) || 0;
    root.classList.add('ww-modal-scroll-locked');
    body.classList.add('ww-modal-scroll-locked');
    if (scrollbarWidth > 0) body.style.paddingRight = `${currentPadding + scrollbarWidth}px`;
  }

  private unlock(): void {
    const body = this.document.body;
    const root = this.document.documentElement;
    if (!body || !root) return;

    root.classList.remove('ww-modal-scroll-locked');
    body.classList.remove('ww-modal-scroll-locked');
    body.style.paddingRight = this.originalBodyPaddingRight;
    this.originalBodyPaddingRight = '';
  }

  private clearOrphanedLock(): void {
    const root = this.document.documentElement;
    const body = this.document.body;
    if (!root || !body) return;

    const hadOrphanedClass = root.classList.contains('ww-modal-scroll-locked')
      || body.classList.contains('ww-modal-scroll-locked');
    root.classList.remove('ww-modal-scroll-locked');
    body.classList.remove('ww-modal-scroll-locked');

    // Earlier lock implementations used inline overflow as well as the class.
    if (hadOrphanedClass && root.style.overflow === 'hidden') root.style.removeProperty('overflow');
    if (hadOrphanedClass && body.style.overflow === 'hidden') {
      body.style.removeProperty('overflow');
      body.style.removeProperty('padding-right');
    }
  }
}
