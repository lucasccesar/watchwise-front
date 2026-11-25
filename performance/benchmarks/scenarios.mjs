import { groupSix } from './group-six.mjs';
import { groupFive } from './group-five.mjs';
import { groupFour } from './group-four.mjs';
import { groupThree } from './group-three.mjs';
import { groupTwo } from './group-two.mjs';

export const screens = {
  ...groupTwo,
  ...groupThree,
  ...groupFour,
  ...groupFive,
  ...groupSix,
  home: {
    path: '/home',
    source: '/lists',
    endpoint: /^\/api\/v1\/users\/[^/]+\/summary\/home$/,
    ready: (page) => page.locator('.recent-card').filter({
      has: page.locator('a[href="/content/movie/550"]'),
    }).first(),
    validate: (body, username) => body.viewer?.username === username &&
      body.recentlyWatched?.some(({ content }) => content?.tmdbId === '550'),
  },
  lists: {
    path: '/lists',
    source: '/home',
    endpoint: /^\/api\/v1\/users\/me\/lists\/view$/,
    ready: (page) => page.getByRole('link', { name: 'Benchmark synthetic list', exact: true }).first(),
    validate: (body) => body.content?.some(({ name }) => name === 'Benchmark synthetic list'),
  },
  diary: {
    path: '/diary', source: '/home',
    endpoint: /^\/api\/v1\/users\/[^/]+\/diary(?:\/view)?$/,
    ready: (page) => page.locator('.diary-entry-title strong').filter({ hasText: /Fight Club|Clube da Luta/i }).first(),
    validate: (body) => body.content?.some(({ entry }) => entry?.content?.tmdbId === '550'),
  },
  watchlist: {
    path: '/watchlist', source: '/home',
    endpoint: /^\/api\/v1\/users\/[^/]+\/watchlist\/view$/,
    ready: (page) => page.locator('.watchlist-card-title[href="/content/movie/680"]').first(),
    validate: (body) => body.content?.some((item) => item.card?.tmdbId === '680'),
  },
  social: {
    path: '/social', source: '/home',
    endpoint: /^\/api\/v1\/feed$/,
    ready: (page) => page.locator('a.social-author-avatar[href="/users/benchpeer"]').first(),
    validate: (body) => body.content?.some(({ user }) => user?.username === 'benchpeer'),
  },
  notifications: {
    path: '/notifications', source: '/home',
    endpoint: /^\/api\/v1\/notifications\/view$/,
    link: 'a[href="/notifications"]',
    ready: (page) => page.locator('.notification-message').filter({hasText: 'benchpeer'}).first(),
    validate: (body) => body.content?.length > 0,
  },
  calendar: {
    path: '/calendar', source: '/home',
    endpoint: /^\/api\/v1\/users\/me\/calendar$/,
    ready: (page) => page.locator('.calendar-event').filter({hasText: 'Benchmark calendar fixture'}).first(),
    validate: (body) => body.events?.length > 0,
  },
  movie: {
    path: '/content/movie/550', source: '/home',
    endpoint: /^\/api\/v1\/contents\/[^/]+\/page$/,
    link: '.home-content-title-link[href="/content/movie/550"]',
    ready: (page) => page.locator('#movie-title').filter({hasText: /Fight Club|Clube da Luta/i}),
    validate: (body) => Boolean(body.details?.title),
  },
};

export async function navigate(page, screen, mode) {
  if (mode === 'cold') {
    await page.goto(screen.path, { waitUntil: 'commit' });
  } else if (screen.click) {
    await screen.click(page);
  } else {
    if (screen.openMenu) await page.locator(screen.openMenu).click();
    await page.locator(screen.link ?? `.navigation-link[href="${screen.path}"]`).filter({ visible: true }).first().click();
  }
  await page.waitForURL((url) => url.pathname === screen.path);
}
