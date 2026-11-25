import '@angular/compiler';
import { HttpClient, HttpErrorResponse, HttpParams } from '@angular/common/http';
import { Injector, runInInjectionContext } from '@angular/core';
import { ActivatedRoute, Router, convertToParamMap } from '@angular/router';
import { BehaviorSubject, Subject } from 'rxjs';
import { describe, expect, it, vi } from 'vitest';
import { ToastNotificationsService } from '../../../../shared/components/toast-notifications/toast-notifications.service';
import { PicksApiService } from '../../data-access/picks-api.service';
import { PickTemplateComponent } from './pick-template.component';

const routeFor = (id = 'a') => '/api/v1/picks-templates/' + id;
const option = (id = 'a', category = 'fixed') => routeFor(id) + '/categories/' + category + '/options/view';
const page = (...ids: string[]) => ({ content: ids.map(id => ({ id })) });
const fixed = (id = 'fixed') => ({ id, optionMode: 'FIXED', options: [{ id: 'raw' }] });
const detail = (categories = [fixed()], id = 'a') => ({ id, name: 'Template ' + id, categories });
const denied = () => new HttpErrorResponse({ status: 403 });

function open() {
  const calls: { url: string; params?: HttpParams; response: Subject<unknown> }[] = [];
  const get = vi.fn((url: string, opts?: { params?: HttpParams }) => {
    const response = new Subject<unknown>();
    calls.push({ url, params: opts?.params, response });
    return response;
  });
  const paramMap = new BehaviorSubject(convertToParamMap({ templateId: 'a' }));
  const injector = Injector.create({ providers: [
    { provide: PicksApiService, useValue: new PicksApiService({ get } as unknown as HttpClient) },
    { provide: ActivatedRoute, useValue: { snapshot: { paramMap: paramMap.value }, paramMap } },
    { provide: Router, useValue: { navigateByUrl: vi.fn() } },
    { provide: ToastNotificationsService, useValue: { error: vi.fn() } },
  ] });
  const component = runInInjectionContext(injector, () => new PickTemplateComponent());
  function resolve(url: string, value: unknown) {
    const request = calls.findLast(c => c.url === url);
    if (!request) throw Error('Request missing: ' + url);
    request.response.next(value);
    request.response.complete();
  }
  return { calls, resolve, destroy: () => injector.destroy(), component, paramMap };
}

function finishIndependent(work: ReturnType<typeof open>, id = 'a') {
  const root = routeFor(id);
  work.resolve(root + '/my-picks/view', page('mine'));
  work.resolve(root + '/picks/view', page('community'));
  work.resolve(root + '/comments', page('comment'));
}

describe('PickTemplateComponent option loading', () => {
  it('starts options before community finishes and preserves content, ordering and API parameters', () => {
    const work = open();
    const { component, calls, resolve } = work;
    const root = routeFor();
    const categories = [fixed(), fixed('second'), { ...fixed('open'), optionMode: 'OPEN' }, { ...fixed('empty'), options: [] }];
    resolve(root, detail(categories));
    expect(calls.map(c => c.url)).toEqual([root, root + '/my-picks/view', root + '/picks/view', root + '/comments', option(), option('a', 'second')]);
    expect(calls[2].params?.toString()).toBe('page=1&size=10&sort=RECENT');
    expect(calls[4].params?.toString()).toBe('page=1&size=100');
    expect(component['status']()).toBe('loading');
    resolve(option('a', 'second'), page('third'));
    resolve(option(), page('first', 'second'));
    finishIndependent(work);
    expect(component['status']()).toBe('ready');
    expect(component['template']()).toEqual(detail(categories));
    expect(component['myPicks']()).toEqual(page('mine').content);
    expect(component['communityPicks']()).toEqual(page('community').content);
    expect(component['comments']()).toEqual(page('comment').content);
    expect([...component['optionViews']()]).toEqual([
      ['fixed', page('first', 'second').content], ['second', page('third').content],
    ]);
    work.destroy();
  });

  it('waits for authorized template when the other endpoints complete first', () => {
    const work = open();
    finishIndependent(work);
    expect(work.calls).toHaveLength(4);
    work.resolve(routeFor(), detail());
    expect(work.calls.at(-1)?.url).toBe(option());
    expect(work.component['status']()).toBe('ready');
    work.destroy();
  });

  it.each([403, 404])('never starts options if the detail returns %s', status => {
    const work = open();
    work.calls[0].response.error(new HttpErrorResponse({ status }));
    expect(work.calls).toHaveLength(4);
    expect(work.component['status']()).toBe('error');
    expect(work.component['error']()).toBe(work.component['copy'].loadError);
    expect(work.calls.every(c => !c.response.observed)).toBe(true);
    work.destroy();
  });

  it('keeps the global error and cancels options after a community error', () => {
    const work = open();
    work.resolve(routeFor(), detail());
    const options = work.calls.at(-1)!;
    expect(options.url).toBe(option());
    work.calls[2].response.error(denied());
    expect(work.component['status']()).toBe('error');
    expect(work.component['template']()).toBeNull();
    expect(work.component['optionViews']().size).toBe(0);
    expect(options.response.observed).toBe(false);
    work.destroy();
  });

  it('preserves the empty visual fallback after an option error and makes one request on retry', () => {
    const work = open();
    work.resolve(routeFor(), detail());
    work.calls.at(-1)!.response.error(denied());
    finishIndependent(work);
    expect(work.component['status']()).toBe('ready');
    expect(work.component['optionViews']().size).toBe(0);
    work.component['load']();
    work.resolve(routeFor(), detail());
    expect(work.calls.filter(c => c.url === option())).toHaveLength(2);
    work.destroy();
  });

  it('cancels an in-flight option page when retrying the same template', () => {
    const work = open();
    work.resolve(routeFor(), detail());
    const old = work.calls.at(-1)!;
    work.component['load']();
    expect(old.response.observed).toBe(false);
    work.resolve(routeFor(), detail());
    finishIndependent(work);
    work.resolve(option(), page('current'));
    old.response.next(page('obsolete'));
    old.response.complete();
    expect(work.calls.filter(c => c.url === option())).toHaveLength(2);
    expect(work.component['optionViews']().get('fixed')).toEqual(page('current').content);
    work.destroy();
  });

  it('cancels stale requests when Angular reuses the route for a different template', () => {
    const work = open();
    work.resolve(routeFor(), detail());
    const old = work.calls.at(-1)!;
    work.paramMap.next(convertToParamMap({ templateId: 'b' }));
    expect(old.response.observed).toBe(false);
    work.resolve(routeFor('b'), detail([fixed()], 'b'));
    finishIndependent(work, 'b');
    work.resolve(option('b'), page('new'));
    old.response.next(page('obsolete'));
    old.response.complete();
    expect(work.component['template']()?.id).toBe('b');
    expect(work.component['optionViews']().get('fixed')).toEqual(page('new').content);
    expect(work.component['answerTemplateRoute']()).toContain('b');
    work.destroy();
  });

  it('cancels the outstanding detail, auxiliary and option subscriptions on destruction', () => {
    const work = open();
    work.calls[0].response.next(detail());
    work.destroy();
    expect(work.calls).toHaveLength(5);
    expect(work.calls.every(c => !c.response.observed)).toBe(true);
    expect(work.paramMap.observed).toBe(false);
  });

  it('does not request options for a template without categories', () => {
    const work = open();
    work.resolve(routeFor(), detail([]));
    finishIndependent(work);
    expect(work.calls).toHaveLength(4);
    expect(work.component['status']()).toBe('ready');
    expect(work.component['optionViews']().size).toBe(0);
    work.destroy();
  });
});
