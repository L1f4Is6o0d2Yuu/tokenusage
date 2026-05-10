import "server-only";
import { hermesAdapter } from "./hermes";
import { codexAdapter } from "./codex";
import { claudeCodeAdapter } from "./claude-code";
import { sampleAdapter } from "./sample";
import type { ProviderAdapter, UsageRecord } from "@/lib/types";

const REAL_ADAPTERS: ProviderAdapter[] = [hermesAdapter, codexAdapter, claudeCodeAdapter];

export type ResolvedSource = {
  adapter: ProviderAdapter;
  recordCount: number;
  sourcePath: string;
};

export type LoadResult = {
  records: UsageRecord[];
  sources: ResolvedSource[];
  fellBackToSample: boolean;
};

export async function resolveSources(): Promise<{
  reals: ResolvedSource[];
  fellBackToSample: boolean;
  sampleSource: ResolvedSource | null;
}> {
  const statuses = await Promise.all(
    REAL_ADAPTERS.map(async (a) => ({ a, s: await a.status() }))
  );
  const reals: ResolvedSource[] = [];
  for (const { a, s } of statuses) {
    if (s.ok && s.recordCount > 0) {
      reals.push({ adapter: a, recordCount: s.recordCount, sourcePath: s.sourcePath });
    }
  }

  if (reals.length > 0) {
    return { reals, fellBackToSample: false, sampleSource: null };
  }

  const sampleStatus = await sampleAdapter.status();
  return {
    reals: [],
    fellBackToSample: true,
    sampleSource: {
      adapter: sampleAdapter,
      recordCount: sampleStatus.ok ? sampleStatus.recordCount : 0,
      sourcePath: sampleStatus.sourcePath,
    },
  };
}

export async function loadRecords(): Promise<LoadResult> {
  const { reals, fellBackToSample, sampleSource } = await resolveSources();

  if (fellBackToSample) {
    const records = sampleSource ? await sampleSource.adapter.load() : [];
    return {
      records,
      sources: sampleSource ? [sampleSource] : [],
      fellBackToSample: true,
    };
  }

  const all = await Promise.all(reals.map((r) => r.adapter.load()));
  return {
    records: all.flat(),
    sources: reals,
    fellBackToSample: false,
  };
}
