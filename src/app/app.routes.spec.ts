import '@angular/compiler';
import { describe, expect, it } from 'vitest';
import { routes } from './app.routes';

function findRoute(path: string, routeTree = routes) {
  for (const route of routeTree) {
    if (route.path === path) {
      return route;
    }

    const nestedRoute = route.children ? findRoute(path, route.children) : undefined;
    if (nestedRoute) {
      return nestedRoute;
    }
  }

  return undefined;
}

describe('auth destinations', () => {
  it('resolves the post-login home destination', () => {
    expect(findRoute('home')).toBeDefined();
  });

  it('loads the signup screen from the registration route', async () => {
    const signupRoute = findRoute('register');
    expect(signupRoute).toBeDefined();
    expect(signupRoute?.data).toBeUndefined();

    const loadComponent = signupRoute?.loadComponent as
      | (() => Promise<unknown>)
      | undefined;
    expect(loadComponent).toBeTypeOf('function');
    expect(await loadComponent?.()).toHaveProperty('name', 'SignupComponent');
  });

  it('keeps the future recovery link on a valid route', () => {
    expect(findRoute('forgot-password')).toBeDefined();
  });

  it('leaves the future public presentation route unassigned', () => {
    expect(findRoute('explore')).toBeUndefined();
  });
});
