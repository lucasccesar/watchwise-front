const listName = 'Benchmark synthetic list';
const communityName = 'Benchmark community list';
const pickName = 'Benchmark film picks';
const privateList = '/lists/' + (process.env.BENCHMARK_LIST_ID ?? 'fixture-unavailable');
const pickId = process.env.BENCHMARK_PICK_ID;
const pickPath = '/picks/' + (pickId ?? 'fixture-unavailable');
const film = /Fight Club|Clube da Luta/i;
const namedLink = (page, name) => page.getByRole('link', { name, exact: true }).first();
const forms = (page) => page.locator('form.list-create-form #list-name');
const fixtureOwner = (body, username) => body.owner?.username === username;
const publicListFixture = (body) => body.content?.find((item) => item.visibility === 'PUBLIC' &&
  (item.name === communityName || (process.env.BENCHMARK_FIXTURE_PROFILE && /^WatchWise 3C list \d+$/.test(item.name))));
const pickTemplateFixture = (body) => body.content?.find((item) => item.name === pickName ||
  (process.env.BENCHMARK_FIXTURE_PROFILE && /^WatchWise 3C template \d+$/.test(item.name)));

export const groupFour = {
  'community-lists': {
    path: '/lists/community', source: '/lists',
    link: 'a[href="/lists/community"]',
    endpoint: /^\/api\/v1\/lists\/discover\/view$/,
    ready: (page, body) => namedLink(page, publicListFixture(body).name),
    validate: (body) => Boolean(publicListFixture(body)),
    async after(page) {
      const link = process.env.BENCHMARK_FIXTURE_PROFILE
        ? page.getByRole('link', { name: /^(Benchmark community list|WatchWise 3C list \d+)$/ }).first()
        : namedLink(page, communityName);
      const name = (await link.innerText()).trim();
      const path = await link.getAttribute('href');
      if (!/^\/lists\/[\da-f-]{36}$/i.test(path ?? '')) return false;
      const detail = page.waitForResponse((response) => new URL(response.url()).pathname === '/api/v1' + path + '/view');
      await link.click();
      await page.waitForURL((url) => url.pathname === path);
      const result = await detail;
      if (!result.ok()) return false;
      const body = await result.json();
      await page.locator('#list-detail-title').filter({ hasText: name }).waitFor({ state: 'visible' });
      return body.name === name && body.visibility === 'PUBLIC';
    },
  },
  'list-create': {
    path: '/lists/create', source: '/lists', link: '.lists-create-button',
    ready: forms,
    async verify(page) {
      return await forms(page).isEditable() && await forms(page).inputValue() === '' &&
        await page.locator('#list-description').isEditable() &&
        await page.locator('#list-description').inputValue() === '' &&
        await page.locator('#list-search').isEditable() &&
        await page.locator('.list-create-choice[aria-pressed="true"]').first().isVisible();
    },
  },
  'list-edit': {
    path: privateList + '/edit', source: '/lists',
    endpoint: new RegExp('^/api/v1' + privateList + '/view$'),
    async click(page) {
      const card = page.locator('.list-card').filter({has: namedLink(page, listName)});
      await card.locator('.list-card-more').click();
      await card.getByRole('menuitem', {name: 'Editar', exact: true}).click();
    },
    ready: forms,
    validate: (body, username) => fixtureOwner(body, username) && body.name === listName &&
      body.visibility === 'PRIVATE' && body.items?.content?.some((item) => item.card?.tmdbId === '550'),
    async verify(page, body) {
      return await forms(page).inputValue() === body.name &&
        await page.locator('#list-description').inputValue() === (body.description ?? '') &&
        await page.locator('.list-create-choice[aria-pressed="true"]').filter({hasText: /Privada/}).isVisible() &&
        await page.locator('.list-create-selected-card').filter({hasText: film}).first().isVisible();
    },
  },
  settings: {
    path: '/settings', source: '/home', openMenu: '.header-viewer-button',
    link: '.account-menu-item[href="/settings"]',
    endpoint: /^\/api\/v1\/users\/me\/settings$/,
    ready: (page) => page.locator('.settings-profile-preview').getByText('@benchviewer', {exact: true}),
    validate: (body, username) => body.profile?.username === username && body.profile?.isProfilePublic === true,
    async verify(page, body) {
      const preferences = page.locator('.settings-preferences-panel select');
      return await page.locator('#settings-privacy h2').isVisible() && await page.locator('#settings-account h2').isVisible() &&
        await page.locator('input[autocomplete="username"]').inputValue() === body.profile.username &&
        await preferences.nth(0).inputValue() === (body.contentPreferences.preferredLanguage ?? 'pt-BR') &&
        await preferences.nth(1).inputValue() === (body.contentPreferences.preferredRegion ?? 'BR');
    },
  },
  'picks-explore': {
    path: '/picks/explore', source: '/picks', link: 'a[href="/picks/explore"]',
    endpoint: /^\/api\/v1\/picks-templates$/,
    ready: (page, body) => namedLink(page, pickTemplateFixture(body).name),
    validate: (body) => Boolean(pickTemplateFixture(body)),
  },
  'pick-detail': {
    path: pickPath, source: '/picks', link: 'h3 a[href="' + pickPath + '"]',
    endpoint: new RegExp('^/api/v1' + pickPath + '/view$'),
    ready: (page) => page.locator('.pick-detail-answer-card').filter({hasText: 'Favorite movie'})
      .locator('a[href="/content/movie/550"]').filter({hasText: film}).first(),
    validate: (body, username) => body.id === pickId && body.user?.username === username &&
      body.picksTemplate?.name === pickName && body.answers?.some((answer) =>
        answer.name === 'Favorite movie' && answer.target?.content?.tmdbId === '550'),
    verify: async (page) => await page.locator('.pick-detail-header h1').innerText() === pickName,
  },
};
