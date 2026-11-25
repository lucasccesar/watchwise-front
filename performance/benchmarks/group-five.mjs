const id = process.env.BENCHMARK_TEMPLATE_ID ?? 'fixture-unavailable';
const template = '/picks/templates/' + id;
const title = 'Benchmark film picks';
const category = 'Favorite movie';
const endpoint = new RegExp('^/api/v1/picks-templates/' + id + '$');
const fixture = (body) => body.id === id && body.name === title &&
  body.categories?.some((item) => item.name === category && item.allowedType === 'MOVIE' && item.optionMode === 'OPEN');
const templateLink = (page) => page.getByRole('link', { name: title, exact: true }).first();
const templateTitle = (page) => page.getByRole('heading', { level: 1, name: title, exact: true });

const entries = {
  trending: {
    path: '/trending', source: '/home',
    endpoint: /^\/api\/v1\/trending$/,
    validate: (body) => Array.isArray(body.movies) && Array.isArray(body.series),
    ready(page, body) {
      const item = [...body.movies, ...body.series].find(({ tmdbId, title }) => tmdbId && title);
      if (!item) return page.locator('.tr-empty').first();
      return page.locator('.tr-title-link').filter({ hasText: item.title }).first();
    },
    classify: (body) => body.movies.length + body.series.length === 0 ? 'empty' : 'catalog-results',
  },
  'picks-templates': {
    path: '/picks/templates', source: '/picks/explore',
    link: 'a[href^="/picks/templates?"]',
    endpoint: /^\/api\/v1\/picks-templates$/,
    validate: (body) => body.content?.some((item) => item.id === id && item.name === title),
    ready: templateLink,
  },
  'template-detail': {
    path: template, source: '/picks/templates', link: 'h3 a[href="' + template + '"]',
    endpoint, validate: fixture,
    ready: (page) => page.locator('.pick-category-card h4').filter({ hasText: category }).first(),
    verify: async (page) => await templateTitle(page).isVisible() &&
      await page.locator('a[href="' + template + '/new"]').first().isVisible(),
  },
  'pick-fill': {
    path: template + '/new', source: template, link: 'a[href="' + template + '/new"]',
    endpoint, validate: fixture,
    ready: (page) => page.getByRole('button', { name: /^Favorite movie,/ }),
    async verify(page) {
      return await templateTitle(page).isVisible() &&
        await page.getByRole('progressbar').getAttribute('aria-valuenow') === '0' &&
        await page.locator('input[name="pick-visibility"]').count() === 3 &&
        await page.locator('.pick-fill-publish button').isDisabled();
    },
    async after(page) {
      await page.getByRole('button', { name: /^Favorite movie,/ }).click();
      await page.locator('#pick-fill-search-input').waitFor({ state: 'visible' });
      return await page.locator('#pick-fill-search-input').inputValue() === '';
    },
  },
  'template-create': {
    path: '/picks/create', source: '/picks',
    link: 'a[href="/picks/create"]',
    ready: (page) => page.locator('input[maxlength="120"]'),
    async verify(page) {
      const name = page.locator('input[maxlength="120"]');
      const cover = page.locator('input[type="url"]');
      return await name.isEditable() && await name.inputValue() === '' &&
        await page.locator('textarea[rows="3"]').isEditable() &&
        await cover.isEditable() && await cover.inputValue() === '';
    },
  },
  'template-import': {
    path: '/picks/import', source: '/picks/create', link: 'a[href="/picks/import"]',
    ready: (page) => page.locator('#pick-import-json-text'),
    async verify(page) {
      const editor = page.locator('#pick-import-json-text');
      const json = JSON.parse(await editor.inputValue());
      const accepts = await page.locator('input[type="file"]').getAttribute('accept');
      return await editor.isEditable() && accepts?.includes('.json') &&
        Boolean(json) && await page.locator('.pick-import-status.valid').isVisible();
    },
  },
};

export const groupFive = Object.fromEntries(Object.entries(entries).map(([name, screen]) => [
  name, { ...screen, readOnly: true },
]));
