import { execFile } from 'node:child_process';
import { appendFile, readFile, writeFile } from 'node:fs/promises';
import { setTimeout as delay } from 'node:timers/promises';
import { promisify } from 'node:util';

const exec = promisify(execFile);
const hashPattern = /^[0-9a-f]{64}$/;
const identity = 'watchwise_benchmark_exec_v2';
const required = ['series_progress_season_metadata', 'series_progress_metadata',
  'content_release_date_snapshots', 'diary_entries', 'user_lists', 'refresh_tokens', 'shared_limiter_state'];

function stateTime(state, requireApi, database) {
  if (state?.database !== database || requireApi && state.apiBound !== true ||
      !Number.isInteger(state.busy) || state.busy < 0 ||
      !/Z$/.test(state.utc) || !Number.isFinite(Date.parse(state.utc)) ||
      Object.keys(state.tables ?? {}).length !== 54 || required.some((key) => !state.tables[key]) ||
      !state.sequences || !Object.hasOwn(state.sequences, 'refresh_observation_generation_seq')) {
    throw Error('invalid-state-or-target');
  }
  for (const value of Object.values(state.tables)) {
    if (!Number.isSafeInteger(value.count) || value.count < 0 || !hashPattern.test(value.hash)) {
      throw Error('invalid-table-fingerprint');
    }
  }
  return Date.parse(state.utc);
}

function changes(before, after, policy) {
  const allowed = [];
  const unexpected = [];
  for (const name of new Set([...Object.keys(before.tables), ...Object.keys(after.tables)])) {
    const expected = before.tables[name] ?? null;
    const observed = after.tables[name] ?? null;
    if (expected?.count === observed?.count && expected?.hash === observed?.hash) continue;
    const entry = { table: name, expected, observed };
    const delta = observed && expected ? observed.count - expected.count : Infinity;
    if ((name === 'refresh_tokens' && policy === 'login' && delta === 1) ||
        (name === 'shared_limiter_state' && ['login', 'read'].includes(policy) && delta >= 0 && delta <= 8)) {
      allowed.push(entry);
    } else {
      unexpected.push(entry);
    }
  }
  for (const name of new Set([...Object.keys(before.sequences), ...Object.keys(after.sequences)])) {
    if (!Object.hasOwn(before.sequences, name) || !Object.hasOwn(after.sequences, name) ||
        before.sequences[name] !== after.sequences[name]) {
      unexpected.push({ sequence: name, expected: before.sequences[name], observed: after.sequences[name] });
    }
  }
  return { allowed, unexpected };
}

export class IntegrityStop extends Error {
  constructor() { super('operation-integrity-blocked'); }
}

export function operationIntegrity({ baseline, capture, record, quarantine, isQuarantined,
  database = identity, pause = delay, settleMs = 750, maxChecks = 5, boundaryMs = 120_000 }) {
  let last = baseline;
  let blocked = false;
  let running = false;
  stateTime(last, false, database);
  const stop = async (operation, phase, reason, evidence = {}) => {
    blocked = true;
    const failure = { operation, phase, reason, invalid: true, utc: new Date().toISOString(), ...evidence };
    await quarantine(failure);
    await record(failure);
    throw new IntegrityStop();
  };
  const read = async (operation, phase) => {
    try {
      const state = await capture();
      stateTime(state, true, database);
      return state;
    } catch {
      return stop(operation, phase, 'capture-failed');
    }
  };
  return {
    async run(operation, policy, action, waitForBrowser = async () => {}) {
      if (running || blocked || await isQuarantined()) throw new IntegrityStop();
      running = true;
      try {
        const before = await read(operation, 'before');
        const drift = changes(last, before, 'strict');
        if (drift.unexpected.length) await stop(operation, 'before', 'modified-since-last-check', drift);
        const started = stateTime(before, true, database);
        if (before.busy || 86_400_000 - started % 86_400_000 < boundaryMs) {
          await stop(operation, 'before', before.busy ? 'database-busy' : 'too-close-to-utc-midnight');
        }

        let result;
        let actionFailure;
        try { result = await action(); } catch (error) { actionFailure = error; }
        try { await waitForBrowser(); } catch {
          await stop(operation, 'after', 'browser-did-not-drain');
        }

        let previous;
        for (let check = 0; check < maxChecks; check++) {
          const current = await read(operation, 'after');
          const delta = changes(before, current, policy);
          if (delta.unexpected.length) await stop(operation, 'after', 'unexpected-mutation', delta);
          const observed = stateTime(current, true, database);
          if (observed < started || Math.floor(observed / 86_400_000) !== Math.floor(started / 86_400_000)) {
            await stop(operation, 'after', 'utc-window-changed');
          }
          if (!current.busy && previous && !changes(previous, current, 'strict').unexpected.length) {
            last = current;
            await record({ operation, phase: 'after', invalid: Boolean(actionFailure), beforeUtc: before.utc,
              afterUtc: current.utc, captures: check + 1, ...delta });
            if (actionFailure) throw actionFailure;
            return result;
          }
          previous = current.busy ? undefined : current;
          await pause(settleMs);
        }
        return stop(operation, 'after', 'database-did-not-settle');
      } finally {
        running = false;
      }
    },
  };
}

export async function v2OperationIntegrity({ stateScript, initialState, marker, journal, powershell, database = identity }) {
  const exists = async () => {
    try { await readFile(marker); return true; }
    catch (error) { if (error.code === 'ENOENT') return false; throw error; }
  };
  return operationIntegrity({
    database,
    baseline: JSON.parse((await readFile(initialState, 'utf8')).replace(/^\uFEFF/, '')),
    async capture() {
      const { stdout } = await exec(powershell, ['-NoProfile', '-File', stateScript, '-RequireApi'],
        { timeout: 20_000, maxBuffer: 64_000, windowsHide: true });
      return JSON.parse(stdout);
    },
    isQuarantined: exists,
    record: (row) => appendFile(journal, JSON.stringify(row) + '\n'),
    async quarantine(row) {
      try { await writeFile(marker, JSON.stringify({ database, ...row }, null, 2) + '\n', { flag: 'wx' }); }
      catch (error) { if (error.code !== 'EEXIST') throw error; }
    },
  });
}

export function watchBrowserRequests(context, origin) {
  const pending = new Set();
  const relevant = (request) => {
    const url = new URL(request.url());
    return url.origin === origin && url.pathname.startsWith('/api/v1/');
  };
  let changed = Date.now();
  context.on('request', (request) => {
    if (relevant(request)) { pending.add(request); changed = Date.now(); }
  });
  const finish = (request) => {
    if (pending.delete(request)) changed = Date.now();
  };
  context.on('requestfinished', finish);
  context.on('requestfailed', finish);
  return async () => {
    const deadline = Date.now() + 6_000;
    while (pending.size || Date.now() - changed < 500) {
      if (Date.now() >= deadline) throw Error('browser-did-not-drain');
      await delay(100);
    }
  };
}
