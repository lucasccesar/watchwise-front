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

  it('keeps future signup and recovery links on valid routes', () => {
    expect(findRoute('register')).toBeDefined();
    expect(findRoute('forgot-password')).toBeDefined();
  });

  it('leaves the future public presentation route unassigned', () => {
    expect(findRoute('explore')).toBeUndefined();
  });
});
