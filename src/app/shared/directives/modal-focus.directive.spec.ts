import '@angular/compiler';
import { DOCUMENT } from '@angular/common';
import { ElementRef, Injector, runInInjectionContext } from '@angular/core';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ModalFocusDirective } from './modal-focus.directive';

const active: any[] = [];
function modal() {
  const opener = { focus: vi.fn() };
  const document = { activeElement: opener };
  const first = { focus: vi.fn(() => document.activeElement = first) };
  const last = { focus: vi.fn(() => document.activeElement = last) };
  const root = { querySelectorAll: () => [first, last], contains: (element: unknown) => element === first || element === last, focus: vi.fn() };
  const injector = Injector.create({ providers: [{ provide: DOCUMENT, useValue: document }, { provide: ElementRef, useValue: new ElementRef(root) }] });
  const directive = runInInjectionContext(injector, () => new ModalFocusDirective()) as any;
  const dismissed = vi.fn();
  directive.modalDismiss.subscribe(dismissed);
  active.push(directive);
  directive.ngAfterViewInit();
  return { directive, dismissed, document, first, last, opener, root };
}
const key = (key: string, shiftKey = false) => ({ key, shiftKey, preventDefault: vi.fn(), stopPropagation: vi.fn() });
describe('Shared dialog focus lifecycle', () => {
  afterEach(() => { while (active.length) active.pop().ngOnDestroy(); });
  it('moves focus to the first dialog control', () => {
    const { document, first } = modal();
    expect(document.activeElement).toBe(first);
  });
  it('traps both Tab directions and recaptures escaped focus', () => {
    const { directive, document, first, last, opener } = modal();
    document.activeElement = last;
    directive.handleKeydown(key('Tab'));
    expect(document.activeElement).toBe(first);
    directive.handleKeydown(key('Tab', true));
    expect(document.activeElement).toBe(last);
    document.activeElement = opener;
    directive.handleKeydown(key('Tab'));
    expect(document.activeElement).toBe(first);
  });
  it('Escape requests cancellation without triggering a confirm action', () => {
    const { directive, dismissed } = modal();
    const event = key('Escape');
    directive.handleKeydown(event);
    expect(dismissed).toHaveBeenCalledOnce();
    expect(event.preventDefault).toHaveBeenCalledOnce();
  });
  it('restores the opener on destruction and supports a persistent return target', () => {
    const { directive, opener } = modal();
    const persistent = { focus: vi.fn() };
    directive.modalReturnFocus = () => persistent;
    directive.ngOnDestroy();
    expect(persistent.focus).toHaveBeenCalledOnce();
    expect(opener.focus).not.toHaveBeenCalled();
  });
  it('lets only the topmost dialog handle Escape', () => {
    const lower = modal();
    const upper = modal();
    lower.directive.handleKeydown(key('Escape'));
    upper.directive.handleKeydown(key('Escape'));
    expect(lower.dismissed).not.toHaveBeenCalled();
    expect(upper.dismissed).toHaveBeenCalledOnce();
  });
});
