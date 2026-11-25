import '@angular/compiler';
import { Injector, runInInjectionContext } from '@angular/core';
import { Router } from '@angular/router';
import { of } from 'rxjs';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ToastNotificationsService } from '../../../../shared/components/toast-notifications/toast-notifications.service';
import { ContentApiService } from '../../../content/data-access/content-api.service';
import { SearchApiService } from '../../../search-content/data-access/search-api.service';
import { PicksApiService } from '../../data-access/picks-api.service';
import { PickCreateComponent } from './pick-create.component';

class DraftEditor extends PickCreateComponent {
  setTitle(title: string): void {
    this.name.set(title);
  }

  append(name: string): string {
    this.addCategory();
    const key = this.categories().at(-1)!.key;
    this.categories.update(items => items.map(item => item.key === key ? { ...item, name } : item));
    return key;
  }

  remove(key: string): void {
    this.removeCategory(key);
  }

  submitDraft(): void {
    this.submit();
  }
}

function setup() {
  const createTemplate = vi.fn().mockReturnValue(of({ id: 'template-id' }));
  const navigate = vi.fn();
  const injector = Injector.create({ providers: [
    { provide: Router, useValue: { navigate } },
    { provide: PicksApiService, useValue: { createTemplate } },
    { provide: SearchApiService, useValue: {} },
    { provide: ContentApiService, useValue: {} },
    { provide: ToastNotificationsService, useValue: {} },
  ] });
  const editor = runInInjectionContext(injector, () => new DraftEditor());
  return { editor, createTemplate, navigate };
}

describe('Pick template creation category order', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('sends the first order as one and keeps the template creation payload', () => {
    vi.stubGlobal('history', { state: {} });
    const { editor, createTemplate, navigate } = setup();
    editor.setTitle('  Modelo  ');
    editor.append('  Melhor filme  ');

    editor.submitDraft();

    expect(createTemplate).toHaveBeenCalledExactlyOnceWith({
      name: 'Modelo', description: null, coverImage: null, eligibilityStartDate: null, eligibilityEndDate: null,
      categories: [{
        name: 'Melhor filme', description: null, group: 'PRIMARY', displayOrder: 1,
        allowedType: 'MOVIE', optionMode: 'OPEN',
      }],
    });
    expect(navigate).toHaveBeenCalledExactlyOnceWith(['/picks/templates', 'template-id']);
  });

  it('uses the final draft order after removing and appending a category again', () => {
    vi.stubGlobal('history', { state: {} });
    const { editor, createTemplate } = setup();
    editor.setTitle('Modelo');
    const a = editor.append('A');
    editor.append('B');
    editor.append('C');
    editor.remove(a);
    editor.append('A');

    editor.submitDraft();

    expect(createTemplate.mock.calls[0][0].categories.map(({ name, displayOrder }: { name: string; displayOrder: number }) =>
      [name, displayOrder])).toEqual([['B', 1], ['C', 2], ['A', 3]]);
  });

  it('assigns positive orders in the imported draft order and preserves the category groups', () => {
    vi.stubGlobal('history', { state: { importedTemplate: {
      title: 'Modelo importado', description: 'Descrição', coverImage: '',
      eligibilityStartDate: '', eligibilityEndDate: '',
      categories: [
        { name: 'Secundária', description: '', group: 'SECONDARY', allowedType: 'SERIES', optionMode: 'OPEN', nominees: [] },
        { name: 'Primária', description: '', group: 'PRIMARY', allowedType: 'MOVIE', optionMode: 'OPEN', nominees: [] },
      ],
    } } });
    const { editor, createTemplate } = setup();

    editor.submitDraft();

    expect(createTemplate.mock.calls[0][0].categories).toEqual([
      { name: 'Secundária', description: null, group: 'SECONDARY', displayOrder: 1, allowedType: 'SERIES', optionMode: 'OPEN' },
      { name: 'Primária', description: null, group: 'PRIMARY', displayOrder: 2, allowedType: 'MOVIE', optionMode: 'OPEN' },
    ]);
  });
});
