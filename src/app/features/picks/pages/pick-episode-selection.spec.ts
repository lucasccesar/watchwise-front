import '@angular/compiler';
import { Injector, runInInjectionContext } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { NEVER, of } from 'rxjs';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ContentApiService } from '../../content/data-access/content-api.service';
import { SearchApiService } from '../../search-content/data-access/search-api.service';
import { PicksApiService } from '../data-access/picks-api.service';
import { PickCreateComponent } from './pick-create/pick-create.component';
import { PickFillComponent } from './pick-fill/pick-fill.component';

describe('Picks episode selection', () => {
  afterEach(() => vi.unstubAllGlobals());
  it.each(['create', 'fill'])('selects actual season episodes in %s with no SERIES details episode array', mode => {
    vi.stubGlobal('history', { state: {} });
    const episode = { seriesTmdbId: 'show', seasonNumber: 2, episodeNumber: 1, name: 'Capítulo', stillUrl: 'https://example.com/still.jpg', airDate: '2024-01-01' };
    const seasons = [{ seriesTmdbId: 'show', seasonNumber: 2, name: 'Segunda', episodeCount: 1, posterUrl: null, releaseDate: null }];
    const api = {
      createSeriesReference: vi.fn().mockReturnValue(of({ id: 'show-id' })), getSeriesPage: vi.fn().mockReturnValue(of({ details: { seasons, episodes: null } })),
      getSeriesSeasons: vi.fn().mockReturnValue(of(seasons)), getSeasonEpisodes: vi.fn().mockReturnValue(of([episode])),
    };
    const injector = Injector.create({ providers: [
      { provide: ActivatedRoute, useValue: { snapshot: { paramMap: { get: () => 'template' } } } },
      { provide: Router, useValue: {} }, { provide: ContentApiService, useValue: api },
      { provide: SearchApiService, useValue: {} }, { provide: PicksApiService, useValue: { getTemplate: () => NEVER } },
    ] });
    const page = runInInjectionContext(injector, () => mode === 'create' ? new PickCreateComponent() : new PickFillComponent()) as any;
    const category = { key: 'category', id: 'category', allowedType: 'EPISODE', optionMode: 'FIXED', options: [], pendingNames: [] };
    if (mode === 'create') { page.categories.set([category]); page.openOptions(category); }
    else { page.template.set({ categories: [category] }); page.openCategory(category); }
    const series = { type: 'SERIES', tmdbId: 'show', title: 'Série', posterUrl: null };
    page[mode === 'create' ? 'chooseSearchContent' : 'chooseContent'](series);
    expect(api.getSeriesSeasons).toHaveBeenCalledWith('show');
    expect(api.getSeasonEpisodes).toHaveBeenCalledWith('show', 2);
    const choices = page[mode === 'create' ? 'seasonEpisodes' : 'currentSeriesEpisodes']();
    expect(choices).toEqual([episode]);
    page[mode === 'create' ? 'addEpisodeOption' : 'chooseEpisode'](choices[0]);
    const answer = mode === 'create' ? page.categories()[0].options[0] : page.answers().get('category');
    expect(answer.target.content).toEqual({ type: 'EPISODE', tmdbId: null, seriesTmdbId: 'show', seasonNumber: 2, episodeNumber: 1 });
    expect(answer.image).toBe('https://example.com/still.jpg');
    page.ngOnDestroy();
  });
});
