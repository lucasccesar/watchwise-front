import { DOCUMENT } from '@angular/common';
import { Injectable, inject } from '@angular/core';

type InlineScrollStyles = {
  htmlOverflow: string;
  bodyOverflow: string;
  bodyPaddingRight: string;
};

@Injectable({ providedIn: 'root' })
export class ModalScrollLockService {
  private readonly document = inject(DOCUMENT);
  private readonly activeLocks = new Map<symbol, HTMLElement | null>();
  private originalStyles: InlineScrollStyles | null = null;
  private observer: MutationObserver | null = null;

  constructor() {
    this.clearOrphanedLegacyLock();
  }

  acquire(owner: HTMLElement | null = null): () => void {
    const lockToken = Symbol('modal-scroll-lock');
    if (this.activeLocks.size === 0) this.lock();
    this.activeLocks.set(lockToken, owner);
    if (this.activeLocks.size === 1) this.observeOwners();
    let released = false;
    return () => {
      if (released) return;
      released = true;
      this.activeLocks.delete(lockToken);
      if (this.activeLocks.size === 0) this.unlock();
    };
  }

  private lock(): void {
    const view = this.document.defaultView;
    const body = this.document.body;
    const root = this.document.documentElement;
    if (!view || !body || !root) return;

    const htmlStyle = root.style;
    const bodyStyle = body.style;
    this.originalStyles = {
      htmlOverflow: htmlStyle.overflow,
      bodyOverflow: bodyStyle.overflow,
      bodyPaddingRight: bodyStyle.paddingRight,
    };

    const scrollbarWidth = Math.max(0, view.innerWidth - this.document.documentElement.clientWidth);
    const currentPadding = Number.parseFloat(view.getComputedStyle(body).paddingRight) || 0;
    root.classList.add('ww-modal-scroll-locked');
    body.classList.add('ww-modal-scroll-locked');
    if (scrollbarWidth) bodyStyle.paddingRight = `${currentPadding + scrollbarWidth}px`;
  }

  private unlock(): void {
    this.observer?.disconnect();
    this.observer = null;
    const view = this.document.defaultView;
    const body = this.document.body;
    const root = this.document.documentElement;
    const original = this.originalStyles;
    this.originalStyles = null;
    if (!view || !body || !root || !original) return;

    root.classList.remove('ww-modal-scroll-locked');
    body.classList.remove('ww-modal-scroll-locked');
    const htmlStyle = root.style;
    const bodyStyle = body.style;
    htmlStyle.overflow = original.htmlOverflow;
    bodyStyle.overflow = original.bodyOverflow;
    bodyStyle.paddingRight = original.bodyPaddingRight;
  }

  private observeOwners(): void {
    const root = this.document.documentElement;
    const view = this.document.defaultView;
    if (!root || !view?.MutationObserver) return;
    this.observer = new view.MutationObserver(() => this.releaseInactiveOwners());
    this.observer.observe(root, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['aria-hidden', 'class', 'hidden', 'style'],
    });
  }

  private releaseInactiveOwners(): void {
    for (const [token, owner] of this.activeLocks) {
      if (owner && this.isOwnerInactive(owner)) this.activeLocks.delete(token);
    }
    if (this.activeLocks.size === 0) this.unlock();
  }

  private isOwnerInactive(owner: HTMLElement): boolean {
    if (!owner.isConnected) return true;
    const view = this.document.defaultView;
    if (!view) return false;
    for (let element: HTMLElement | null = owner; element; element = element.parentElement) {
      if (element.hidden || element.getAttribute('aria-hidden') === 'true') return true;
      const style = view.getComputedStyle(element);
      if (style.display === 'none' || style.visibility === 'hidden') return true;
    }
    return false;
  }

  private clearOrphanedLegacyLock(): void {
    const root = this.document.documentElement;
    const body = this.document.body;
    if (!root || !body || root.classList.contains('ww-modal-scroll-locked') || body.classList.contains('ww-modal-scroll-locked')) return;

    // Earlier versions left inline overflow behind after a modal was removed during navigation.
    if (root.style.overflow === 'hidden') root.style.removeProperty('overflow');
    if (body.style.overflow === 'hidden') {
      body.style.removeProperty('overflow');
      body.style.removeProperty('padding-right');
    }
  }
}
