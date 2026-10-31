import '@angular/compiler';
import { DOCUMENT } from '@angular/common';
import { ElementRef, Injector, runInInjectionContext } from '@angular/core';
import { describe, expect, it, vi } from 'vitest';
import { SharePreviewComponent } from './share-preview.component';

function preview() {
  const opener = { focus: vi.fn() };
  const document = { activeElement: opener };
  const first = { focus: vi.fn(() => { document.activeElement = first; }) };
  const last = { focus: vi.fn(() => { document.activeElement = last; }) };
  const root = { querySelectorAll: () => [first, last], contains: (element: unknown) => element === first || element === last, focus: vi.fn() };
  const injector = Injector.create({ providers: [{ provide: DOCUMENT, useValue: document }] });
  const component = runInInjectionContext(injector, () => new SharePreviewComponent()) as any;
  const closed = vi.fn();
  component.closed.subscribe(closed);
  component.dialog = new ElementRef(root as never);
  return { component, document, root, opener, first, last, closed };
}
const key = (value: string, shiftKey = false) => ({ key: value, shiftKey, preventDefault: vi.fn(), stopPropagation: vi.fn() });

describe('SharePreview keyboard dialog', () => {
  it('focuses the first control when its dialog view appears', () => {
    const { document, first } = preview();
    expect(document.activeElement).toBe(first);
    expect(first.focus).toHaveBeenCalledOnce();
  });
  it('wraps Tab from last to first and Shift+Tab from first to last', () => {
    const { component, document, first, last } = preview();
    document.activeElement = last;
    const tab = key('Tab');
    component.handleKeydown(tab);
    expect(document.activeElement).toBe(first);
    expect(tab.preventDefault).toHaveBeenCalledOnce();
    component.handleKeydown(key('Tab', true));
    expect(document.activeElement).toBe(last);
  });
  it('recaptures Tab when focus has escaped outside the modal', () => {
    const { component, document, opener, first } = preview();
    document.activeElement = opener;
    component.handleKeydown(key('Tab'));
    expect(document.activeElement).toBe(first);
  });
  it('closes on Escape and restores the original opener once', () => {
    const { component, opener, closed } = preview();
    const escape = key('Escape');
    component.handleKeydown(escape);
    expect(closed).toHaveBeenCalledOnce();
    expect(opener.focus).toHaveBeenCalledOnce();
    expect(escape.preventDefault).toHaveBeenCalledOnce();
    component.ngOnDestroy();
    expect(opener.focus).toHaveBeenCalledOnce();
  });
  it('closes only a click on the backdrop, restoring focus', () => {
    const { component, opener, closed, root, first } = preview();
    component.onBackdropClick({ target: first, currentTarget: root });
    expect(closed).not.toHaveBeenCalled();
    component.onBackdropClick({ target: root, currentTarget: root });
    expect(closed).toHaveBeenCalledOnce();
    expect(opener.focus).toHaveBeenCalledOnce();
  });
  it('restores focus if the parent destroys the preview directly', () => {
    const { component, opener, closed } = preview();
    component.ngOnDestroy();
    expect(opener.focus).toHaveBeenCalledOnce();
    expect(closed).not.toHaveBeenCalled();
  });
  it('returns to a persistent menu trigger when the original menu item was removed', () => {
    const { component, opener } = preview();
    const persistent = { focus: vi.fn() };
    component.returnFocusTarget = () => persistent;
    component.close();
    expect(persistent.focus).toHaveBeenCalledOnce();
    expect(opener.focus).not.toHaveBeenCalled();
  });
});
