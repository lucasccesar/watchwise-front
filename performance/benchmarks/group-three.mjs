const series = '/content/series/1399';
const season = series + '/season/1';
const episode = season + '/episode/1';
const listId = process.env.BENCHMARK_LIST_ID ?? 'fixture-unavailable';
const entryId = process.env.BENCHMARK_ENTRY_ID ?? 'fixture-unavailable';
const entry = '/diary/entry/' + entryId;
const listProgress = '/lists/' + listId + '/progress';
const film = /Fight Club|Clube da Luta/i;
const seriesTitle = /Game of Thrones|Guerra dos Tronos/i;
const diaryComment = 'Synthetic benchmark fixture';
const pageEndpoint = (type) => new RegExp('^/api/v1/contents/' +
  (process.env['BENCHMARK_' + type + '_ID'] ?? 'fixture-unavailable') + '/page$');

function contentScreen(path, source, link, title, expected, match, related) {
  return {
    path, source, link,
    endpoint: pageEndpoint(match),
    ready: (page) => page.locator(title).filter({ hasText: expected }),
    validate: (body) => body.details?.type === match && expected.test(body.details?.title ?? ''),
    async verify(page) {
      await page.locator(related).filter({ visible: true }).first().waitFor({ state: 'visible' });
      return true;
    },
  };
}

export const groupThree = {
  'diary-reviews': {
    path: '/diary/reviews', source: '/diary', link: '.diary-tabs a[href="/diary/reviews"], a[href="/diary/reviews"]',
    endpoint: /^\/api\/v1\/users\/[^/]+\/reviews$/,
    ready: (page) => page.locator('.diary-review-item').filter({ hasText: diaryComment })
      .filter({ has: page.locator('a[href="' + entry + '"]', { hasText: film }) }).first(),
    validate: (body) => body.content?.some((item) => item.id === entryId && item.comment === diaryComment &&
      item.content?.tmdbId === '550'),
  },
  'diary-entry': {
    path: entry, source: '/diary/reviews', link: '.diary-review-item a[href="' + entry + '"]',
    endpoint: new RegExp('^/api/v1/diary/' + entryId + '$'),
    ready: (page) => page.locator('.review-detail-text').getByText(diaryComment, { exact: true }),
    validate: (body) => body.id === entryId && body.comment === diaryComment && body.content?.tmdbId === '550',
    verify: async (page) => film.test(await page.locator('#review-content-title').innerText()) &&
      await page.locator('#review-content-title a[href="/content/movie/550"]').isVisible(),
  },
  series: contentScreen(series, '/progress', '.profile-progress-title-row a[href="' + series + '"]',
    '#series-title', seriesTitle, 'SERIES',
    '.series-season-details[href="' + season + '"]'),
  season: contentScreen(season, series, '.series-season-details[href="' + season + '"]',
    '#season-title', /Season 1|Temporada 1/i,
    'SEASON',
    'a[href="' + episode + '"]'),
  episode: contentScreen(episode, season, '.series-episode-heading a[href="' + episode + '"]',
    '#episode-title', /Winter Is Coming|O inverno está chegando/i,
    'EPISODE',
    'a[href="' + season + '"]'),
  'list-progress': {
    path: listProgress, source: '/lists', link: '.list-card-action--progress[href="' + listProgress + '"]',
    endpoint: new RegExp('^/api/v1' + listProgress + '$'),
    ready: (page) => page.locator('.profile-progress-metrics dt').first(),
    validate: (body) => body.id === listId && body.visibility === 'PRIVATE' &&
      (process.env.BENCHMARK_FIXTURE_PROFILE
        ? body.totalItems === (process.env.BENCHMARK_FIXTURE_PROFILE === 'intense' ? 24 : 8) &&
          [['1399', 3, 'partial'], ['87108', 5, 'complete'], ['1396', 0, 'unstarted']].every(([id, count, state]) => {
            const progress = body.items?.find((item) => item.content?.tmdbId === id)?.seriesProgress;
            const percent = progress?.watchedPercentage;
            return progress?.watchedEpisodeCount === count &&
              (state === 'partial' ? percent > 0 && percent < 100 : percent === (state === 'complete' ? 100 : 0));
          })
        : body.movieProgress?.totalItems === 1 && body.seriesProgressAggregate?.totalSeriesCount === 0),
    async verify(page, body) {
      const metrics = await page.locator('.profile-progress-metrics dt').allTextContents();
      if (process.env.BENCHMARK_FIXTURE_PROFILE) {
        const expected = body.items.filter((item) => item.seriesProgress);
        const cards = page.locator('.profile-progress-card');
        if (await cards.count() !== expected.length) return false;
        for (const item of expected) {
          const card = cards.filter({ has: page.locator(
            'a[href="/content/series/' + item.content.tmdbId + '"] h2',
          ) });
          if (await card.count() !== 1 || !(await card.locator('h2').innerText()).trim() ||
              Number(await card.getByRole('progressbar').getAttribute('aria-valuenow')) !==
                item.seriesProgress.watchedPercentage) return false;
        }
      }
      return (await page.locator('.list-progress-owner span').innerText()).trim() === body.name &&
        Number(metrics[0]) === body.seriesProgressAggregate.remainingEpisodeCount &&
        Number(metrics[2]) === body.seriesProgressAggregate.totalSeriesCount;
    },
  },
};
