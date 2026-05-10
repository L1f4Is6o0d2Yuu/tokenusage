import "server-only";
import { hermesAdapter } from "./hermes";
import { codexAdapter } from "./codex";
import { claudeCodeAdapter } from "./claude-code";
import { sampleAdapter } from "./sample";
import { countServerRecords, loadServerRecords } from "./server";
import { isMultiUserMode } from "@/lib/server-db";
import { readCurrentUser } from "@/lib/auth";
import type { ProviderAdapter, UsageRecord } from "@/lib/types";

const REAL_ADAPTERS: ProviderAdapter[] = [hermesAdapter, codexAdapter, claudeCodeAdapter];

export type ResolvedSource = {
  adapter: { id: string; label: string };
  recordCount: number;
  sourcePath: string;
};

export type LoadResult = {
  records: UsageRecord[];
  sources: ResolvedSource[];
  fellBackToSample: boolean;
  mode: "single" | "multi";
};

export async function loadRecords(): Promise<LoadResult> {
  if (isMultiUserMode()) {
    const user = await readCurrentUser();
    if (!user) {
      return { records: [], sources: [], fellBackToSample: false, mode: "multi" };
    }
    const records = loadServerRecords(user.id);
    const count = records.length;
    return {
      records,
      sources: [
        {
          adapter: { id: "server", label: `${user.username} @ server` },
          recordCount: count,
          sourcePath: "data/server.db",
        },
      ],
      fellBackToSample: false,
      mode: "multi",
    };
  }

  // Single-user mode: keep the existing local-file adapter merge.
  const statuses = await Promise.all(
    REAL_ADAPTERS.map(async (a) => ({ a, s: await a.status() }))
  );
  const reals: ResolvedSource[] = [];
  for (const { a, s } of statuses) {
    if (s.ok && s.recordCount > 0) {
      reals.push({
        adapter: { id: a.id, label: a.label },
        recordCount: s.recordCount,
        sourcePath: s.sourcePath,
      });
    }
  }

  if (reals.length > 0) {
    const all = await Promise.all(
      REAL_ADAPTERS.filter((_, i) => statuses[i].s.ok && statuses[i].s.recordCount > 0).map(
        (a) => a.load()
      )
    );
    return { records: all.flat(), sources: reals, fellBackToSample: false, mode: "single" };
  }

  const sampleStatus = await sampleAdapter.status();
  const records = await sampleAdapter.load();
  return {
    records,
    sources: [
      {
        adapter: { id: sampleAdapter.id, label: sampleAdapter.label },
        recordCount: sampleStatus.ok ? sampleStatus.recordCount : 0,
        sourcePath: sampleStatus.sourcePath,
      },
    ],
    fellBackToSample: true,
    mode: "single",
  };
}

// Re-exported so the ingest endpoint can update last_used_at independently.
export { countServerRecords };
