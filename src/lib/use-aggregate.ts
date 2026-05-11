"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  aggregate,
  filterByPeriod,
  periodWindow,
  pickGranularity,
} from "@/lib/aggregate";
import type {
  Aggregation,
  CustomRange,
  Granularity,
  Period,
  UsageRecord,
} from "@/lib/types";
import type { AggregateRes } from "@/workers/aggregate.worker";

// Threshold past which we shove the aggregation onto a Web Worker. The sync
// path is < 5ms for a few thousand records — main thread is faster than
// the round-trip there. Past ~10k records the math starts to stall input,
// so we trade structured-clone cost for an unblocked UI.
const WORKER_THRESHOLD = 10_000;

type Result = {
  agg: Aggregation;
  scoped: UsageRecord[];
  granularity: Granularity;
};

function computeSync(
  records: UsageRecord[],
  period: Period,
  customRange?: CustomRange
): Result {
  const win = periodWindow(period, new Date(), customRange);
  const scoped = filterByPeriod(records, period, customRange);
  const granularity = pickGranularity(scoped, period);
  const agg = aggregate(scoped, granularity, win);
  return { agg, scoped, granularity };
}

// Lazily-instantiated singleton — workers cost a few ms to spawn and bring
// in their own bundle, so we only pay that once across the page lifetime.
let workerRef: Worker | null = null;
function getWorker(): Worker | null {
  if (typeof window === "undefined") return null;
  if (workerRef) return workerRef;
  try {
    workerRef = new Worker(
      new URL("../workers/aggregate.worker.ts", import.meta.url),
      { type: "module" }
    );
  } catch {
    workerRef = null;
  }
  return workerRef;
}

let nextId = 1;

export function useAggregate(
  records: UsageRecord[],
  period: Period,
  customRange?: CustomRange
): Result {
  // Sync path: cheap useMemo for small datasets. Falls through to the
  // worker for big ones — the memo returns a stale-friendly stand-in
  // (last known result, or an empty agg on first paint) while the
  // worker computes off-thread.
  const useWorker = records.length > WORKER_THRESHOLD;

  const sync = useMemo<Result | null>(() => {
    if (useWorker) return null;
    return computeSync(records, period, customRange);
  }, [records, period, customRange, useWorker]);

  const [asyncResult, setAsyncResult] = useState<Result | null>(null);
  const requestId = useRef(0);

  useEffect(() => {
    if (!useWorker) return;
    const worker = getWorker();
    if (!worker) {
      // No worker support — fall back to sync compute (will block, but
      // that's better than nothing).
      setAsyncResult(computeSync(records, period, customRange));
      return;
    }
    const id = ++nextId;
    requestId.current = id;
    const onMessage = (e: MessageEvent<AggregateRes>) => {
      if (e.data.id !== requestId.current) return;
      setAsyncResult({
        agg: e.data.agg,
        scoped: e.data.scoped,
        granularity: e.data.granularity,
      });
    };
    worker.addEventListener("message", onMessage);
    worker.postMessage({ id, records, period, customRange });
    return () => worker.removeEventListener("message", onMessage);
  }, [records, period, customRange, useWorker]);

  // Render path:
  //   • sync available     → use it
  //   • worker has a result → use it
  //   • neither yet         → compute once synchronously as a fallback
  //                           (this still beats showing a flash of empty)
  if (sync) return sync;
  if (asyncResult) return asyncResult;
  return computeSync(records, period, customRange);
}
