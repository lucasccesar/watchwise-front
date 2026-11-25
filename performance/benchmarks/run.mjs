import { chromium } from 'playwright';
import { mkdir, writeFile } from 'node:fs/promises';
import { screens as defaultScreens, navigate } from './scenarios.mjs';
import { observe, hasFailure } from './http.mjs';
import { productionRun, classifyAttempts } from './production-run.mjs';
import { replayOffset, replayObservation } from './replay-observation.mjs';
import { IntegrityStop, v2OperationIntegrity, watchBrowserRequests } from './operation-integrity.mjs';

const origin = 'http://localhost:5173';
const options = Object.fromEntries(process.argv.slice(2).map((arg) => arg.replace(/^--/, '').split('=')));
const production = productionRun();
const output = production?.output ?? options.output ?? '.local/results';
const executionV2 = options.dataset === 'exec-v2';
const execution = options.dataset === 'exec' || executionV2;
const replayLog = production && execution ? process.env.WW_EXEC_REPLAY_LOG : undefined;
const screens = execution ? (await import('./execution-scenarios.mjs')).executionScreens : defaultScreens;
if (!production && !['results', 'results/etapa-3b', 'results/etapa-3b-grupo-2', 'results/etapa-3b-grupo-3', 'results/etapa-3b-grupo-4', 'results/etapa-3b-grupo-5', 'results/etapa-3b-grupo-6', '.local/results'].includes(output) &&
    !(execution && /^results\/etapa-3c-b\/(exec-(history|social|watchlist)|tmdb-replay-watchlist)$/.test(output))) throw Error('Invalid output directory.');
const names = (options.screens ?? 'home,lists').split(',');
const repetitions = production?.repetitions ?? Number(options.repetitions ?? 2);
const warmups = production?.warmups ?? Number(options.warmups ?? 0);
if (production && production.dataset !== options.dataset) throw Error('Dataset mismatch.');
const modeFilter = production ? (production.mode === 'applicable' ? null : production.mode) : options.mode;
if (modeFilter && !['cold', 'internal'].includes(modeFilter)) throw Error('Invalid mode.');
if (!names.every((name) => Object.hasOwn(screens, name)) ||
    ![repetitions, warmups].every(Number.isSafeInteger) || repetitions < 1 || warmups < 0) {
  throw Error('Use known screens and integer repetition counts.');
}
const username = process.env.BENCHMARK_IDENTIFIER;
const password = process.env.BENCHMARK_PASSWORD;
const anonymousOnly = names.every((name) => screens[name].anonymous);
if (!anonymousOnly && (!username || !password)) throw Error('Synthetic benchmark credentials are required.');
const viewport = { width: 1440, height: 900 };
let guard;
if (executionV2) {
  if (!production || names.join() !== 'notifications' || modeFilter !== 'cold' || repetitions !== 1 || warmups !== 0) {
    throw Error('V2 is limited to the authorized Notifications smoke.');
  }
  await mkdir(output, { recursive: true });
  guard = await v2OperationIntegrity({
    stateScript: process.env.WW_V2_STATE_SCRIPT, initialState: process.env.WW_V2_INITIAL_STATE,
    marker: process.env.WW_V2_MARKER, journal: output + '/operation-integrity.ndjson',
    powershell: process.env.WW_V2_POWERSHELL,
  });
}
const browser = await chromium.launch();
const report = {
  schema: 1, startedAt: new Date().toISOString(), origin, node: process.version,
  chromium: browser.version(), viewport, workers: 1, repetitions, warmups, screens: names,
  api: executionV2 ? '127.0.0.1:18082' : '127.0.0.1:8080',
  database: (executionV2 ? 'watchwise_benchmark_exec_v2' : execution ? 'watchwise_benchmark_exec' : 'watchwise_benchmark') + '@127.0.0.1:15433',
  fixtures: execution ? 'hybrid.1' : 'minimal synthetic',
  ...(process.env.BENCHMARK_EXEC_TMDB_REPLAY === '1' && execution && !executionV2 ? { catalog: 'local-replay-warm' } : {}),
  ...(production ? { production } : {}),
  results: [], smoke: null,
};
async function context(state, allowLogin = false) {
  const session = await browser.newContext({ baseURL: origin, viewport, locale: 'pt-BR', storageState: state, serviceWorkers: 'block' });
  if (execution || production) await session.route(/^https?:\/\//, (route) => {
    const request = route.request();
    const url = new URL(request.url());
    const refresh = request.method() === 'POST' && url.pathname === '/api/v1/auth/refresh';
    const login = allowLogin && request.method() === 'POST' && url.pathname === '/api/v1/auth/login';
    const read = ['GET', 'HEAD', 'OPTIONS'].includes(request.method());
    return url.origin === origin && (!production || read || refresh || login) ? route.continue() : route.abort();
  });
  return session;
}
function responseFor(page, screen) {
  if (!screen.endpoint) return null;
  return page.waitForResponse((response) => {
    const url = new URL(response.url());
    return url.origin === origin && screen.endpoint.test(url.pathname) && response.request().method() === 'GET';
  });
}
async function ready(page, screen, response) {
  let body;
  if (response) {
    const result = await response;
    if (!result.ok()) throw Error('Screen API rejected the request.');
    body = await result.json();
    if (!screen.validate(body, username)) throw Error('Unexpected fixture payload.');
  }
  await screen.ready(page, body).waitFor({ state: 'visible' });
  if (screen.verify && !(await screen.verify(page, body))) throw Error('Rendered fixture mismatch.');
  return screen.classify?.(body);
}
async function sessionSmoke() {
  if (guard) {
    return guard.run('notifications:authenticate', 'login', async () => {
      const session = await context();
      try {
        const login = await session.request.post('/api/v1/auth/login', {
          headers: { Origin: origin }, data: { identifier: username, password, rememberMe: false },
          timeout: 10_000,
        });
        if (!login.ok()) throw Error('V2 login rejected.');
        const identity = await session.request.get('/api/v1/users/me', { timeout: 10_000 });
        if (!identity.ok() || (await identity.json()).username !== username) {
          throw Error('V2 identity mismatch.');
        }
        report.smoke = { ok: true, loginStatus: login.status(), identityStatus: identity.status() };
        return await session.storageState();
      } finally {
        await session.close();
      }
    });
  }
  const session = await context(undefined, true);
  try {
    const page = await session.newPage();
    page.setDefaultTimeout(20_000);
    const observer = observe(page, origin);
    let stage = 'open-login';
    try {
      await page.goto('/login');
      await page.locator('[formcontrolname="identifier"]').fill(username);
      await page.locator('[formcontrolname="password"]').fill(password);
      stage = 'login-and-home';
      if (execution) {
        const [login] = await Promise.all([
          page.waitForResponse((response) => response.url() === origin + '/api/v1/auth/login' &&
            response.request().method() === 'POST'),
          page.locator('button[type=submit]').click(),
        ]);
        if (!login.ok()) throw Error('Execution clone login rejected.');
        await page.waitForURL((url) => url.pathname === '/home');
        const identity = await page.request.get('/api/v1/users/me');
        if (!identity.ok() || (await identity.json()).username !== username) {
          throw Error('Execution clone identity mismatch.');
        }
      } else {
        await Promise.all([
          ready(page, screens.home, responseFor(page, screens.home)),
          page.locator('button[type=submit]').click(),
        ]);
      }
      if (!execution) {
        stage = 'authenticated-navigation';
        await Promise.all([
        ready(page, screens.lists, responseFor(page, screens.lists)),
        navigate(page, screens.lists, 'internal'),
        ]);
      await Promise.all([
        ready(page, screens.home, responseFor(page, screens.home)),
        navigate(page, screens.home, 'internal'),
        ]);
      }
      const network = await observer.stop();
      report.smoke = { ok: (!production && execution) || !hasFailure(network), ...network };
      if (!report.smoke.ok) throw Error('Browser diagnostics failed.');
      return await session.storageState();
    } catch {
      report.smoke ??= { ok: false, stage, ...(await observer.stop()) };
      return null;
    }
  } finally {
    await session.close();
  }
}
async function measure(name, mode, state, index, warmup) {
  const session = await context(state);
  const drain = guard && watchBrowserRequests(session, origin);
  const measureSample = async () => {
    const page = await session.newPage();
    page.setDefaultTimeout(20_000);
    const screen = screens[name];
    if (mode === 'internal') {
      const source = Object.values(screens).find(({ path }) => path === screen.source);
      try {
        await Promise.all([ready(page, source, responseFor(page, source)), navigate(page, source, 'cold')]);
      } catch {
        return { name, mode, index, warmup, valid: false, failure: 'source-not-ready' };
      }
    }
    const replayFrom = await replayOffset(replayLog);
    const observer = observe(page, origin);
    let usefulMs = null;
    let state;
    try {
      [state] = await Promise.all([ready(page, screen, responseFor(page, screen)), navigate(page, screen, mode)]);
      usefulMs = observer.elapsed();
      // Observe late failures for one second, outside the useful-content duration.
      await new Promise((resolve) => setTimeout(resolve, 1000));
    } catch {
      // The bounded browser diagnostics below omit raw URLs, errors, and credentials.
    }
    const network = await observer.stop();
    let check = null;
    if (usefulMs !== null && !hasFailure(network) && screen.after) {
      const verification = observe(page, origin);
      let passed = false;
      try { passed = await screen.after(page); } catch { /* reported separately */ }
      const diagnostics = await verification.stop();
      check = { passed: passed && !hasFailure(diagnostics), ...diagnostics };
    }
    const unexpectedWrite = screen.readOnly && [...network.requests, ...(check?.requests ?? [])]
      .some(({ method, endpoint }) => !['GET', 'HEAD', 'OPTIONS'].includes(method) &&
        !(production && method === 'POST' && endpoint === '/api/v1/auth/refresh'));
    const anonymous = screen.anonymous ? !(await session.cookies()).some(({ name }) =>
      ['access_token', 'refresh_token'].includes(name)) : undefined;
    const correctDestination = (!production && !screen.anonymous) || new URL(page.url()).pathname === screen.path;
    const replay = await replayObservation(replayLog, replayFrom);
    const valid = !replay?.failures && correctDestination && anonymous !== false && usefulMs !== null && !hasFailure(network) && (check?.passed ?? true) && !unexpectedWrite;
    return { name, mode, index, warmup, valid, ...(replay?.failures ? { replayFailed: true } : {}), usefulMs: valid ? usefulMs : null,
      ...(replay ? { replay } : {}), ...(state ? { state } : {}), ...(screen.anonymous ? { anonymous, correctDestination } : {}),
      ...(!valid ? { failure: unexpectedWrite ? 'unexpected-write-request' : !correctDestination ? 'unexpected-destination' : anonymous === false ? 'unexpected-session' : usefulMs === null ? 'target-not-ready' : check?.passed === false ? 'follow-up-navigation' : 'browser-diagnostics' } : {}),
      ...network, ...(check ? { followUp: check } : {}) };
  };
  try {
    return guard ? await guard.run(name + ':' + mode + ':open', 'read', measureSample, drain) : await measureSample();
  } finally {
    await session.close();
  }
}
function modesFor(name) {
  const modes = screens[name].modes ?? ['cold', 'internal'];
  return modeFilter ? modes.filter((mode) => mode === modeFilter) : modes;
}
function summarize() {
  return names.flatMap((name) => modesFor(name).map((mode) => {
    const rows = report.results.filter((row) => row.name === name && row.mode === mode && !row.warmup);
    const values = rows.filter((row) => row.valid).map((row) => row.usefulMs).sort((a,b) => a-b);
    const n = values.length;
    return { name, mode, valid: n, failed: rows.length - n,
      medianMs: n ? Number(((values[Math.floor((n - 1) / 2)] + values[Math.floor(n / 2)]) / 2).toFixed(2)) : null,
      p95Ms: n ? values[Math.ceil(n * 0.95) - 1] : null };
  }));
}
try {
  const state = anonymousOnly ? undefined : await sessionSmoke();
  if (anonymousOnly) report.smoke = { ok: true, skipped: 'anonymous-only' };
  if (anonymousOnly || state) {
    for (const name of names) for (const mode of modesFor(name)) {
      for (let index = 0; index < warmups + repetitions; index++) {
        const row = await measure(name, mode, screens[name].anonymous ? undefined : state, index + 1, index < warmups);
        report.results.push(row);
        console.log(name, mode, index + 1, row.valid ? 'valid' : row.failure);
      }
    }
  }
  report.summary = summarize();
  if (production) report.attempts = classifyAttempts(report.results);
  process.exitCode = !report.smoke?.ok || report.results.some((row) => !row.valid) ? 1 : 0;
} catch (error) {
  if (!(error instanceof IntegrityStop)) throw error;
  if (report.smoke?.ok) {
    report.results.push({ name: names[0], mode: modeFilter, index: 1, warmup: false, valid: false,
      failure: 'operation-integrity-blocked' });
  } else report.smoke = { ok: false, stage: 'operation-integrity-blocked' };
  report.summary = summarize();
  report.attempts = classifyAttempts(report.results);
  process.exitCode = 1;
} finally {
  await browser.close();
  const out = output;
  await mkdir(out, { recursive: true });
  await writeFile(`${out}/validation.json`, JSON.stringify(report, null, 2) + '\n');
  const lines = report.summary?.map((row) =>
    `| ${row.name} | ${row.mode} | ${row.valid} | ${row.failed} | ${row.medianMs ?? '—'} | ${row.p95Ms ?? '—'} |`) ?? [];
  await writeFile(`${out}/summary.md`, [
    '# Validação inicial do WatchWise', '', `Smoke visual: ${report.smoke?.ok ? 'passou' : 'falhou'}.`, '',
    '| Tela | Modo | Válidas | Falhas | Mediana (ms) | p95 (ms) |',
    '| --- | --- | ---: | ---: | ---: | ---: |', ...lines, '',
  ].join('\n'));
}
