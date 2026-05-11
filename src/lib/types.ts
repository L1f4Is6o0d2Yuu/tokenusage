export type Period = "today" | "24h" | "7d" | "30d" | "month" | "year" | "all" | "custom";

export type Granularity = "hour" | "day" | "month";

export const PERIOD_LABELS: Record<Period, string> = {
  today: "Today",
  "24h": "Last 24h",
  "7d": "Last 7 days",
  "30d": "Last 30 days",
  month: "This month",
  year: "This year",
  all: "All time",
  custom: "Custom",
};

export type CustomRange = { from: string; to: string }; // YYYY-MM-DD local dates

export type UsageRecord = {
  id: string;
  provider: string;
  source: string;
  model: string | null;
  startedAt: number;
  endedAt: number | null;
  inputTokens: number;
  outputTokens: number;
  cacheReadTokens: number;
  cacheWriteTokens: number;
  reasoningTokens: number;
  costUsd: number | null;
  costStatus: string | null;
  apiCallCount: number;
  title: string | null;
};

export type AdapterStatus =
  | { ok: true; recordCount: number; sourcePath: string }
  | { ok: false; reason: string; sourcePath: string };

export interface ProviderAdapter {
  readonly id: string;
  readonly label: string;
  status(): Promise<AdapterStatus>;
  load(): Promise<UsageRecord[]>;
}

export type ModelBreakdownRow = {
  provider: string;
  model: string;
  records: number;
  inputTokens: number;
  outputTokens: number;
  cacheReadTokens: number;
  cacheWriteTokens: number;
  reasoningTokens: number;
  totalTokens: number;
  costUsd: number;
  costKnown: boolean;
};

export type DailyPoint = {
  date: string;
  totalTokens: number;
  costUsd: number;
};

export type Aggregation = {
  totals: {
    records: number;
    inputTokens: number;
    outputTokens: number;
    cacheReadTokens: number;
    cacheWriteTokens: number;
    reasoningTokens: number;
    totalTokens: number;
    costUsd: number;
    costKnown: boolean;
  };
  byModel: ModelBreakdownRow[];
  byDay: DailyPoint[];
};
