import '@angular/compiler';
import { HttpClient } from '@angular/common/http';
import { Injector, runInInjectionContext } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { of, Subject, throwError } from 'rxjs';
import { describe, expect, it, vi } from 'vitest';
import { AuthSessionService } from '../../../../core/session/session.service';
import { ToastNotificationsService } from '../../../../shared/components/toast-notifications/toast-notifications.service';
import { ContentApiService } from '../../../content/data-access/content-api.service';
import { SearchApiService } from '../../../search-content/data-access/search-api.service';
import { ListsApiService } from '../../data-access/lists-api.service';
import { ListCreateComponent } from './list-create.component';

const fields = { name: 'Queue', description: 'Example', visibility: 'PRIVATE', itemScope: 'MOVIE_OR_SERIES' };
const item = (i: number) => ({
  id: 'item-'+i, card: { type: i % 2 ? 'MOVIE' : 'SERIES', tmdbId: String(i),
    title: 'Title '+i, releaseYear: 2005, posterPath: '/poster.jpg' }, customPosterUrl: i === 1 ? 'https://cdn.example/custom.jpg' : null,
  position: i, nestedList: null,
});
const items = (n: number) => Array.from({length:n}, (_,i)=>item(i+1));
const ready = (n:number) => ({ status:'READY', ...fields, items:items(n) });

function setup(response: ReturnType<typeof of> | Subject<unknown> = of(ready(0)), pages: unknown[] = []) {
  const getDetail = vi.fn();
  for(const page of pages) getDetail.mockReturnValueOnce(of(page));
  const api = { getEditor: vi.fn().mockReturnValue(response), getDetail,
    updateList: vi.fn().mockReturnValue(of({})), removeItem: vi.fn().mockReturnValue(of(undefined)),
    addItem: vi.fn().mockReturnValue(of({})) };
  const router = { navigate: vi.fn() };
  const toast = {success:vi.fn(),error:vi.fn()};
  const injector = Injector.create({ providers: [
    { provide: ActivatedRoute, useValue: { pathFromRoot:[{snapshot:{ paramMap:{get:()=> 'list-1'} }}] } },
    { provide: Router, useValue: router },
    { provide: ListsApiService, useValue: api },
    { provide: ContentApiService, useValue: {} },
    { provide: SearchApiService, useValue: {} },
    { provide: AuthSessionService, useValue: {user:()=>({id:'viewer'})} },
    { provide: ToastNotificationsService, useValue: toast },
  ] });
  const page = runInInjectionContext(injector,()=>new ListCreateComponent()) as any;
  return {page,api,router,toast};
}

describe('List editor read model', () => {
  it.each([0,12,30,31,48,61,100])('opens %i items with one read and retains order', n => {
    const response=new Subject<unknown>();
    const {page,api}=setup(response);
    expect(page.loadingList()).toBe(true);
    expect(page.selectedItems()).toEqual([]);
    expect(api.getEditor).toHaveBeenCalledExactlyOnceWith('list-1');
    response.next(ready(n));
    expect(page.loadingList()).toBe(false);
    expect(page.selectedItems().map((x:any)=>x.existingListItemId)).toEqual(items(n).map(x=>x.id));
    expect(page.name()).toBe('Queue');
    expect(api.getDetail).not.toHaveBeenCalled();
  });
  it('preserves over-100 legacy lists through pagination', () => {
    const all=items(101);
    const pages=Array.from({length:4},(_,i)=>({...fields, owner:{id:'viewer'},items:{content:all.slice(i*30,(i+1)*30),hasNext:i<3}}));
    const {page,api}=setup(of({status:'LEGACY'}),pages);
    expect(api.getDetail).toHaveBeenCalledTimes(4);
    expect(page.selectedItems().map((x:any)=>x.existingListItemId)).toEqual(all.map(x=>x.id));
    expect(page.loadingList()).toBe(false);
  });
  it('preserves nested cards and the legacy loading path', () => {
    const nested={id:'nested-item',card:null,nestedList:{id:'child',name:'Child',previewCards:[{customPosterUrl:'https://cdn.example/child.jpg'}]}};
    const {page}=setup(of({status:'LEGACY'}),[{...fields,owner:{id:'viewer'},itemScope:'LIST',items:{content:[nested],hasNext:false}}]);
    expect(page.nestedListEdit()).toBe(true);
    expect(page.selectedItems()[0]).toMatchObject({existingListItemId:'nested-item',nestedListId:'child',imageUrl:'https://cdn.example/child.jpg'});
  });
  it('redirects readers with view permission and reports denied or failed reads', () => {
    const reader=setup(of({status:'READ_ONLY'}));
    expect(reader.router.navigate).toHaveBeenCalledWith(['/lists','list-1']);
    expect(reader.api.getDetail).not.toHaveBeenCalled();
    const failed=setup(throwError(()=>new Error('Forbidden')));
    expect(failed.page.loadError()).not.toBe('');
    expect(failed.api.getDetail).not.toHaveBeenCalled();
    failed.api.getEditor.mockReturnValue(of(ready(0)));
    failed.page.retryLoadList();
    expect(failed.page.loadError()).toBe('');
    expect(failed.page.loadingList()).toBe(false);
  });
  it('preserves duplicate detection, the inclusion limit and the save diff', () => {
    const {page,api}=setup(of(ready(100)));
    const duplicate={type:'MOVIE',tmdbId:'1',title:'Duplicate'};
    const novel={type:'MOVIE',tmdbId:'200',title:'Novel'};
    expect(page.isAlreadyAdded(duplicate)).toBe(true);
    page.selectSearchResult(duplicate);
    page.selectSearchResult(novel);
    expect(page.selectedItems()).toHaveLength(100);
    expect(page.formError()).not.toBe('');
    page.removeItem('existing-item-2');
    page.selectSearchResult(novel);
    expect(page.selectedItems()).toHaveLength(100);
    expect(page.selectedItems()[0].imageUrl).toBe('https://cdn.example/custom.jpg');
    page.submit({preventDefault(){}});
    expect(api.updateList).toHaveBeenCalledWith('list-1',{name:'Queue',description:'Example',visibility:'PRIVATE'});
    expect(api.removeItem).toHaveBeenCalledExactlyOnceWith('list-1','item-2');
    expect(api.addItem).toHaveBeenCalledExactlyOnceWith('list-1',{type:'MOVIE',tmdbId:'200'});
  });
  it('keeps the optimized route separate from paginated detail', () => {
    const http={get:vi.fn()};
    const api=new ListsApiService(http as unknown as HttpClient);
    api.getEditor('list/a');
    api.getDetail('list/a',{page:2,size:30});
    expect(http.get.mock.calls.map(([url])=>url)).toEqual(['/api/v1/lists/list%2Fa/editor','/api/v1/lists/list%2Fa/view']);
  });
});

