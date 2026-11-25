import { performance } from 'node:perf_hooks';

const round = (value) => Number(value.toFixed(2));
const pathFor = (url) => new URL(url).pathname
  .replace(/\b[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}\b/gi, ':id');

export function observe(page, origin) {
  const requests = new Map();
  const diagnostics = [];
  const start = performance.now();
  const elapsed = () => round(performance.now() - start);
  const api = (url) => new URL(url).origin === origin && url.startsWith(origin + '/api/v1/');
  const local = (url) => url.startsWith(origin + '/');
  const pending = new Set();
  const detach = [];
  function on(event, callback) {
    page.on(event, callback);
    detach.push(() => page.off(event, callback));
  }
  on('request', (request) => {
    if (!api(request.url())) return;
    requests.set(request, { method: request.method(), endpoint: pathFor(request.url()), startedMs: elapsed(), outcome: 'pending' });
  });
  on('response', (response) => {
    const row = requests.get(response.request());
    if (row) row.status = response.status();
    if (response.status() >= 400) diagnostics.push({
      kind: 'http', scope: local(response.url()) ? 'local' : 'external',
      resourceType: response.request().resourceType(), status: response.status(),
      ...(local(response.url()) ? { endpoint: pathFor(response.url()) } : {}),
    });
  });
  on('requestfailed', (request) => {
    const row = requests.get(request);
    if (row) {
      const message = request.failure()?.errorText ?? '';
      row.failed = true;
      row.outcome = /ERR_ABORTED/i.test(message) ? 'cancelled' : 'failed';
      row.failureCode = message.match(/(?:ERR|NS_ERROR)_[A-Z_]+/)?.[0] ?? 'unknown-network-error';
      row.finishedMs = elapsed();
    }
    if (request.failure()?.errorText === 'net::ERR_ABORTED' && ['image', 'media'].includes(request.resourceType())) return;
    diagnostics.push({ kind: 'network', scope: local(request.url()) ? 'local' : 'external', resourceType: request.resourceType() });
  });
  on('pageerror', () => diagnostics.push({ kind: 'javascript' }));
  on('console', (message) => {
    if (message.type() === 'error' && !message.text().startsWith('Failed to load resource:')) {
      diagnostics.push({ kind: 'console', scope: local(message.location().url || '') ? 'local' : 'unknown' });
    }
  });
  on('requestfinished', (request) => {
    const row = requests.get(request);
    if (!row) return;
    row.outcome = 'finished';
    const timing = request.timing();
    row.finishedMs = elapsed();
    row.durationMs = timing.responseEnd >= 0 ? round(timing.responseEnd) : null;
    row.ttfbMs = timing.responseStart >= 0 && timing.requestStart >= 0
      ? round(timing.responseStart - timing.requestStart) : null;
    const task = request.sizes().then(({ responseBodySize }) => {
      row.responseBodyBytes = responseBodySize >= 0 ? responseBodySize : null;
    }).catch(() => { row.responseBodyBytes = null; });
    pending.add(task);
    void task.finally(() => pending.delete(task));
  });
  return {
    elapsed,
    async stop() {
      detach.forEach((off) => off());
      await Promise.all(pending);
      const rows = [...requests.values()].map((row) => ({
        ...row,
        ...(row.status === undefined ? { status: null, missingStatusReason:
          row.outcome === 'pending' ? 'no-terminal-event-at-collector-stop' :
          row.outcome === 'finished' ? 'response-event-not-observed' : row.failureCode } : {}),
      }));
      const groups = new Map();
      for (const row of rows) {
        const key = `${row.method} ${row.endpoint}`;
        groups.set(key, (groups.get(key) || 0) + 1);
      }
      const sequential = rows.flatMap((row, index) => {
        const previous = rows.slice(0, index).findLast(({ finishedMs }) => finishedMs <= row.startedMs);
        return previous ? [{ after: previous.endpoint, next: row.endpoint }] : [];
      });
      return { requests: rows, requestCount: rows.length, duplicates: [...groups].filter(([, count]) => count > 1), sequential, diagnostics };
    },
  };
}

export function hasFailure({ diagnostics }) {
  return diagnostics.some((item) => item.kind === 'javascript' ||
    item.kind === 'console' && item.scope !== 'external' ||
    item.scope === 'local' && !['image', 'media', 'font'].includes(item.resourceType));
}
