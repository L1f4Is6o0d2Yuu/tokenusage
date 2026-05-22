import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const pricing = await import('../src/lib/pricing.ts');

test('Hermes included/zero-cost sessions are repriced from the runtime model', () => {
  assert.equal(typeof pricing.resolveUsageCost, 'function');

  const resolved = pricing.resolveUsageCost({
    provider: 'hermes',
    model: 'gpt-5.5',
    costUsd: 0,
    costStatus: 'included',
    tokens: {
      input: 1_000_000,
      output: 100_000,
      cacheRead: 2_000_000,
      cacheWrite: 0,
      reasoning: 10_000,
    },
  });

  assert.equal(resolved.status, 'estimated');
  assert.equal(resolved.costUsd, 9.3);
});

test('non-Hermes zero-cost sessions keep their source cost semantics', () => {
  assert.equal(typeof pricing.resolveUsageCost, 'function');

  const resolved = pricing.resolveUsageCost({
    provider: 'openrouter',
    model: 'openrouter/free',
    costUsd: 0,
    costStatus: 'estimated',
    tokens: {
      input: 1_000_000,
      output: 100_000,
      cacheRead: 0,
      cacheWrite: 0,
      reasoning: 0,
    },
  });

  assert.equal(resolved.status, 'estimated');
  assert.equal(resolved.costUsd, 0);
});

test('leaderboard totals use resolved costs instead of summing raw stored cost_usd', () => {
  const source = readFileSync(new URL('../src/lib/leaderboard.ts', import.meta.url), 'utf8');
  assert.match(source, /resolveUsageCost/);
  assert.doesNotMatch(source, /SUM\(s\.cost_usd\)/);
});
