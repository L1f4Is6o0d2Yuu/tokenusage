import "server-only";
import { hermesAdapter } from "./hermes";
import { sampleAdapter } from "./sample";
import type { ProviderAdapter, UsageRecord } from "@/lib/types";

// Adapter registry. v0.2 will add codex/claude-code adapters that read
// ~/.codex/sessions and ~/.claude/projects directly.
const ALL_ADAPTERS: ProviderAdapter[] = [hermesAdapter, sampleAdapter];

export type ResolvedAdapter = {
  adapter: ProviderAdapter;
  recordCount: number;
  sourcePath: string;
  fellBackToSample: boolean;
};

export async function resolveAdapter(): Promise<ResolvedAdapter> {
  // Pick the first adapter whose data source exists. Hermes wins if present;
  // sample is the fallback so the dashboard always renders something.
  for (const adapter of ALL_ADAPTERS) {
    const status = await adapter.status();
    if (status.ok && status.recordCount > 0) {
      return {
        adapter,
        recordCount: status.recordCount,
        sourcePath: status.sourcePath,
        fellBackToSample: adapter.id === "sample",
      };
    }
  }
  // Nothing found — return sample even if empty so the UI can show a clear empty state.
  const status = await sampleAdapter.status();
  return {
    adapter: sampleAdapter,
    recordCount: status.ok ? status.recordCount : 0,
    sourcePath: status.sourcePath,
    fellBackToSample: true,
  };
}

export async function loadRecords(): Promise<{
  records: UsageRecord[];
  resolved: ResolvedAdapter;
}> {
  const resolved = await resolveAdapter();
  const records = await resolved.adapter.load();
  return { records, resolved };
}
