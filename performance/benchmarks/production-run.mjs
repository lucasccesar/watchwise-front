const localRun = /^\.local\/runs\/(exec|exec-v2)\/[a-zA-Z0-9-]+(?:\/[a-zA-Z0-9-]+)?$/;
const isCount = (value, min, max) => Number.isSafeInteger(value) && value >= min && value <= max;

export function productionRun() {
  if (!process.env.WW_PRODUCTION_RUN) return null;
  const run = JSON.parse(process.env.WW_PRODUCTION_RUN);
  if (!localRun.test(run.output) || !run.output.startsWith('.local/runs/' + run.dataset + '/') ||
      run.cache !== 'retained-local-replay' || !/^[0-9a-f]{64}$/.test(run.build) ||
      !isCount(run.repetitions, 1, 100) || !isCount(run.warmups, 0, 10) ||
      ![run.frontendCommit, run.backendCommit].every((commit) => /^[0-9a-f]{40,64}$/.test(commit))) {
    throw Error('Invalid production run metadata.');
  }
  return run;
}

export function classifyAttempts(results) {
  return {
    valid: results.filter((row) => row.valid && !row.warmup).length,
    invalid: results.filter((row) => !row.valid && !row.warmup).length,
    warmups: results.filter((row) => row.warmup).length,
  };
}
