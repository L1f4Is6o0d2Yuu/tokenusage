import test from 'node:test';
import assert from 'node:assert/strict';

const { aggregate } = await import('../src/lib/aggregate.ts');

function record(overrides) {
  return {
    id: overrides.id ?? 'r1',
    provider: overrides.provider ?? 'hermes',
    source: overrides.source ?? 'cli',
    model: overrides.model ?? 'gpt-5.5',
    startedAt: overrides.startedAt ?? Date.UTC(2026, 4, 22, 1, 0, 0),
    endedAt: overrides.endedAt ?? Date.UTC(2026, 4, 22, 1, 1, 0),
    inputTokens: overrides.inputTokens ?? 100,
    outputTokens: overrides.outputTokens ?? 50,
    cacheReadTokens: overrides.cacheReadTokens ?? 0,
    cacheWriteTokens: overrides.cacheWriteTokens ?? 0,
    reasoningTokens: overrides.reasoningTokens ?? 0,
    costUsd: overrides.costUsd ?? null,
    costStatus: overrides.costStatus ?? null,
    apiCallCount: overrides.apiCallCount ?? 1,
    title: overrides.title ?? null,
  };
}

test('Hermes CLI gpt usage is attributed to Codex via Hermes in model breakdowns', () => {
  const agg = aggregate([
    record({ id: 'h1', provider: 'hermes', source: 'cli', model: 'gpt-5.5', inputTokens: 100, outputTokens: 50 }),
    record({ id: 'c1', provider: 'codex', source: 'vscode', model: 'gpt-5.5', inputTokens: 10, outputTokens: 5 }),
  ]);

  const hermesWrapped = agg.byModel.find((row) => row.model === 'gpt-5.5' && row.provider === 'codex via hermes');
  assert.ok(hermesWrapped, 'Hermes-wrapped GPT usage should not remain under provider=hermes');
  assert.equal(hermesWrapped.totalTokens, 150);

  const nativeCodex = agg.byModel.find((row) => row.model === 'gpt-5.5' && row.provider === 'codex');
  assert.ok(nativeCodex, 'native Codex usage should remain distinct from Hermes-wrapped Codex usage');
  assert.equal(nativeCodex.totalTokens, 15);
});

test('Hermes model routes are attributed to their runtime backend instead of Hermes', () => {
  const agg = aggregate([
    record({ id: 'm1', provider: 'hermes', source: 'cron', model: 'mimo-v2.5-pro', inputTokens: 20, outputTokens: 1 }),
    record({ id: 'd1', provider: 'hermes', source: 'cli', model: 'deepseek-v4-pro', inputTokens: 30, outputTokens: 2 }),
    record({ id: 'g1', provider: 'hermes', source: 'telegram', model: 'gemini-3.1-pro-preview', inputTokens: 40, outputTokens: 3 }),
    record({ id: 'o1', provider: 'hermes', source: 'cli', model: 'openrouter/free', inputTokens: 50, outputTokens: 4 }),
  ]);

  assert.ok(agg.byModel.some((row) => row.provider === 'mimo via hermes' && row.totalTokens === 21));
  assert.ok(agg.byModel.some((row) => row.provider === 'deepseek via hermes' && row.totalTokens === 32));
  assert.ok(agg.byModel.some((row) => row.provider === 'gemini via hermes' && row.totalTokens === 43));
  assert.ok(agg.byModel.some((row) => row.provider === 'openrouter via hermes' && row.totalTokens === 54));
  assert.equal(agg.byModel.some((row) => row.provider === 'hermes'), false);
});
