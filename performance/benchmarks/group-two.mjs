const listId = process.env.BENCHMARK_LIST_ID;
const listPath = '/lists/' + (listId || 'fixture-unavailable');
const ownProfile = '/users/benchviewer';

function connections(kind) {
  return {
    path: ownProfile + '/' + kind,
    modes: ['cold'],
    endpoint: new RegExp('^/api/v1/users/[^/]+/' + kind + '$'),
    ready: (page) => page.locator('.connections-user[href="/users/benchpeer"] strong').filter({ hasText: 'benchpeer' }).first(),
    validate: (body) => body.content?.some(({ username }) => username === 'benchpeer'),
  };
}

export const groupTwo = {
  progress: {
    path: '/progress',
    modes: ['cold'],
    endpoint: /^\/api\/v1\/users\/[^/]+\/series-in-progress$/,
    validate: (body) => body.content?.some((item) =>
      item.seriesTmdbId === '1399' && item.watchedEpisodeCount === 1),
    ready: (page) => page.locator('.profile-progress-card').filter({
      has: page.locator('a[href="/content/series/1399"] h2'),
    }).locator('.profile-progress-count'),
    async verify(page, body) {
      const item = body.content.find((entry) => entry.seriesTmdbId === '1399');
      const percentage = Number.isFinite(item.watchedPercentage)
        ? Math.round(Math.min(100, Math.max(0, item.watchedPercentage))) : 0;
      const card = page.locator('.profile-progress-card').filter({
        has: page.locator('a[href="/content/series/1399"] h2'),
      });
      const count = await card.locator('.profile-progress-count strong').first().textContent();
      const bar = await card.getByRole('progressbar').first().getAttribute('aria-valuenow');
      return Number(count) === item.watchedEpisodeCount && bar === String(percentage);
    },
  },
  'list-detail': {
    path: listPath,
    source: '/lists',
    endpoint: new RegExp('^/api/v1' + listPath + '/view$'),
    link: 'h2 a[href="' + listPath + '"]',
    ready: (page) => page.locator('.list-detail-item-title[href="/content/movie/550"]')
      .filter({ hasText: /Fight Club|Clube da Luta/i }).first(),
    validate: (body, username) => body.id === listId &&
      body.name === 'Benchmark synthetic list' && body.visibility === 'PRIVATE' &&
      body.owner?.username === username && body.items?.content?.some((item) => item.card?.tmdbId === '550'),
    verify: async (page) => (await page.locator('#list-detail-title').textContent())?.trim() === 'Benchmark synthetic list',
  },
  profile: {
    path: ownProfile,
    source: '/home',
    endpoint: /^\/api\/v1\/users\/[^/]+\/summary$/,
    openMenu: '.header-viewer-button',
    link: '.account-menu-viewer[href="' + ownProfile + '"]',
    ready: (page) => page.locator('.profile-summary-card').first(),
    validate: (body) => body.watchTime?.watchedCountLast30Days >= 1,
    async verify(page) {
      const handle = await page.locator('.profile-handle').textContent();
      const counts = await page.locator('.profile-follow-counts strong').allTextContents();
      return handle.includes('@benchviewer') && counts.length === 2 && counts.every((value) => Number(value) === 1);
    },
  },
  followers: connections('followers'),
  following: connections('following'),
  'my-picks': {
    path: '/picks',
    source: '/home',
    endpoint: /^\/api\/v1\/users\/me\/picks\/view$/,
    ready: (page) => page.getByRole('link', { name: 'Benchmark film picks', exact: true }).first(),
    validate: (body) => body.content?.some((pick) =>
      pick.picksTemplate?.name === 'Benchmark film picks' && pick.answeredCategories?.some(({ name }) => name === 'Favorite movie')),
  },
};
