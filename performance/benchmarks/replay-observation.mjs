import { open, stat } from 'node:fs/promises';

export async function replayOffset(path) {
  return path ? (await stat(path)).size : null;
}

export async function replayObservation(path, from) {
  if (from === null) return undefined;
  const to = await replayOffset(path);
  if (to < from) throw Error('Replay log was restarted during the sample.');
  const file = await open(path);
  let rows;
  try {
    const buffer = Buffer.alloc(to - from);
    for (let offset = 0; offset < buffer.length;) {
      const { bytesRead } = await file.read(buffer, offset, buffer.length - offset, from + offset);
      if (!bytesRead) throw Error('Replay log ended during the sample.');
      offset += bytesRead;
    }
    rows = buffer.toString('utf8').split('\n').filter(Boolean).map((line) => JSON.parse(line));
    if (rows.some(({ event }) => !event)) throw Error('Replay log was restarted during the sample.');
  } finally {
    await file.close();
  }
  const keys = new Map();
  const resources = {};
  let failures = 0;
  let possibleRetries = 0;
  for (const row of rows) {
    const key = [row.family, row.id, row.variant, row.language, row.page].join(':');
    const bucket = resources[row.family] ??= { calls: 0, unique: 0, failures: 0, statuses: {} };
    bucket.calls++;
    bucket.unique += Number(!keys.has(key));
    if (keys.has(key) && ![200, 404].includes(keys.get(key))) possibleRetries++;
    keys.set(key, row.status);
    const failed = row.status !== 200;
    failures += Number(failed);
    bucket.failures += Number(failed);
    const status = row.status ?? 'disconnected';
    bucket.statuses[status] = (bucket.statuses[status] ?? 0) + 1;
  }
  return { from, to, calls: rows.length, unique: keys.size, repeats: rows.length - keys.size,
    possibleRetries, failures, resources };
}
