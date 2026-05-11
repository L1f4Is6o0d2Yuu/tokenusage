// Aggregation off the main thread. Same pure functions used in the
// server / sync path, just running in a worker so a 50k-record
// breakdown doesn't stall the UI.
//
// Wire format is intentionally trivial: a numeric id round-trips so
// the calling hook can ignore stale responses when the user clicks
// faster than the worker can answer.

/// <reference lib="webworker" />

import { aggregate, filterByPeriod, pickGranularity } from "@/lib/aggregate";
import type { CustomRange, Period, UsageRecord, Aggregation, Granularity } from "@/lib/types";

type Req = {
  id: number;
  records: UsageRecord[];
  period: Period;
  customRange?: CustomRange;
};

export type AggregateRes = {
  id: number;
  agg: Aggregation;
  scoped: UsageRecord[];
  granularity: Granularity;
};

const ctx: DedicatedWorkerGlobalScope = self as unknown as DedicatedWorkerGlobalScope;

ctx.onmessage = (e: MessageEvent<Req>) => {
  const { id, records, period, customRange } = e.data;
  const scoped = filterByPeriod(records, period, customRange);
  const granularity = pickGranularity(scoped, period);
  const agg = aggregate(scoped, granularity);
  ctx.postMessage({ id, agg, scoped, granularity } satisfies AggregateRes);
};

export {}; // module worker
