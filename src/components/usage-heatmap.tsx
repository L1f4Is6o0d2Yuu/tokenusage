"use client";

import { useMemo, useState } from "react";
import type { CSSProperties } from "react";
import type { UsageRecord } from "@/lib/types";
import { formatUsd } from "@/lib/format";

// GitHub-style contribution graph for AI cost. Last 365 days bucketed
// by local-day; intensity buckets driven by quantile (not absolute
// threshold) so the gradient reads sensibly whether the user burns
// $1/day or $100/day. Pure CSS hover for the tooltip — no portal, no
// state churn per cell, scales fine to 7×53 = 371 nodes.

type DayBucket = {
  date: string;        // YYYY-MM-DD (local)
  costUsd: number;
  sessions: number;
};

function ymdLocal(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function buildBuckets(records: UsageRecord[], days: number): DayBucket[] {
  // Anchor on local midnight today; walk backwards `days` slots.
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const buckets: DayBucket[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    buckets.push({ date: ymdLocal(d), costUsd: 0, sessions: 0 });
  }
  const idxByDate = new Map(buckets.map((b, i) => [b.date, i]));

  // Records: bucket by startedAt's local day. Sessions that span midnight
  // get attributed to their start day — slight inaccuracy but matches
  // every other "daily cost" view in the app.
  for (const r of records) {
    const d = new Date(r.startedAt);
    const idx = idxByDate.get(ymdLocal(d));
    if (idx == null) continue;
    buckets[idx].costUsd += r.costUsd ?? 0;
    buckets[idx].sessions += 1;
  }
  return buckets;
}

// Map a cost value to one of 5 intensity buckets (0 = empty, 1-4 = scale).
// Use quantile of *non-zero* days so a user with one $400 outlier doesn't
// crush every other day to bucket 1. Returns the per-day bucket index.
function bucketize(values: number[]): (v: number) => 0 | 1 | 2 | 3 | 4 {
  const nonzero = values.filter((v) => v > 0).sort((a, b) => a - b);
  if (nonzero.length === 0) return () => 0;
  const q = (p: number) => nonzero[Math.floor(nonzero.length * p)];
  const q25 = q(0.25);
  const q50 = q(0.5);
  const q75 = q(0.75);
  return (v: number) => {
    if (v <= 0) return 0;
    if (v <= q25) return 1;
    if (v <= q50) return 2;
    if (v <= q75) return 3;
    return 4;
  };
}

const MONTHS = [
  "1月", "2月", "3月", "4月", "5月", "6月",
  "7月", "8月", "9月", "10月", "11月", "12月",
];
const DOW = ["日", "一", "二", "三", "四", "五", "六"];

const HEAT_OPACITY = [1, 0.22, 0.42, 0.68, 1] as const;

function heatCellStyle(level: 0 | 1 | 2 | 3 | 4): CSSProperties {
  return {
    fill: level === 0 ? "var(--bg-panel-2)" : "var(--accent)",
    opacity: HEAT_OPACITY[level],
  };
}

function heatSwatchStyle(level: 0 | 1 | 2 | 3 | 4): CSSProperties {
  return {
    backgroundColor: level === 0 ? "var(--bg-panel-2)" : "var(--accent)",
    opacity: HEAT_OPACITY[level],
  };
}

export function UsageHeatmap({ records }: { records: UsageRecord[] }) {
  // Always 53 weeks back so the column count is stable across renders
  // (and across users) — Sunday-anchored grid that aligns with the
  // GitHub convention people already pattern-match against.
  const buckets = useMemo(() => buildBuckets(records, 7 * 53), [records]);
  const total = useMemo(
    () => buckets.reduce((s, b) => s + b.costUsd, 0),
    [buckets]
  );
  const activeDays = useMemo(
    () => buckets.filter((b) => b.costUsd > 0).length,
    [buckets]
  );
  const maxDay = useMemo(
    () => buckets.reduce((m, b) => (b.costUsd > m.costUsd ? b : m), buckets[0]),
    [buckets]
  );
  const bucketize_ = useMemo(
    () => bucketize(buckets.map((b) => b.costUsd)),
    [buckets]
  );

  // Layout as 53 weeks × 7 rows. Shift the first column to align to
  // Sunday — the first cell may be a few days before our 365-day window
  // started; we render those as transparent placeholders so the grid
  // shape stays GitHub-classic.
  const firstDate = new Date(buckets[0].date + "T00:00:00");
  const firstDow = firstDate.getDay(); // 0=Sun
  const cells: ({ b: DayBucket } | null)[] = [
    ...new Array<null>(firstDow).fill(null),
    ...buckets.map((b) => ({ b })),
  ];
  const weeks: ({ b: DayBucket } | null)[][] = [];
  for (let i = 0; i < cells.length; i += 7) {
    weeks.push(cells.slice(i, i + 7));
  }

  // Month labels — show the month name on the first week-column that
  // crosses into a new month. Same heuristic as GitHub.
  const monthLabels: { col: number; label: string }[] = [];
  let lastMonth = -1;
  weeks.forEach((week, col) => {
    const firstCell = week.find((c) => c != null);
    if (!firstCell) return;
    const m = new Date(firstCell.b.date + "T00:00:00").getMonth();
    if (m !== lastMonth) {
      monthLabels.push({ col, label: MONTHS[m] });
      lastMonth = m;
    }
  });

  const [hover, setHover] = useState<{
    b: DayBucket;
    x: number;
    y: number;
  } | null>(null);

  const CELL = 12; // px
  const GAP = 3;
  const STRIDE = CELL + GAP;

  return (
    <div className="rounded-lg border border-border-subtle bg-bg-panel p-4">
      <div className="mb-3 flex items-baseline justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold text-fg-strong">
            近 365 天热力图
          </h3>
          <p className="mt-0.5 text-[11px] text-fg-muted">
            {activeDays} 天有活动 · 累计{" "}
            <span className="font-semibold tabular-nums text-foreground">
              {formatUsd(total, { precise: true })}
            </span>
            {maxDay.costUsd > 0 && (
              <>
                {" · 单日峰值 "}
                <span className="font-semibold tabular-nums text-foreground">
                  {formatUsd(maxDay.costUsd, { precise: true })}
                </span>
                {" ("}
                {maxDay.date}
                {")"}
              </>
            )}
          </p>
        </div>
        <Legend />
      </div>

      <div className="relative overflow-x-auto" onMouseLeave={() => setHover(null)}>
        <div className="inline-block min-w-full">
          {/* Month labels row */}
          <div
            className="relative ml-6 mb-1"
            style={{ height: 14, width: weeks.length * STRIDE }}
          >
            {monthLabels.map((m) => (
              <span
                key={`${m.col}-${m.label}`}
                className="absolute text-[10px] text-fg-faint"
                style={{ left: m.col * STRIDE }}
              >
                {m.label}
              </span>
            ))}
          </div>

          <div className="flex gap-1">
            {/* DOW column — show only Mon / Wed / Fri to save space */}
            <div className="flex flex-col gap-[3px] pr-1">
              {DOW.map((d, i) => (
                <div
                  key={d}
                  className="text-right text-[9px] text-fg-faint"
                  style={{ height: CELL, lineHeight: `${CELL}px` }}
                >
                  {i % 2 === 1 ? d : ""}
                </div>
              ))}
            </div>

            {/* Heatmap grid */}
            <svg
              role="img"
              aria-label="活动热力图"
              width={weeks.length * STRIDE}
              height={7 * STRIDE}
              style={{ display: "block" }}
            >
              {weeks.map((week, col) =>
                week.map((cell, row) => {
                  if (!cell) {
                    return null;
                  }
                  const lvl = bucketize_(cell.b.costUsd);
                  return (
                    <rect
                      key={`${col}-${row}`}
                      x={col * STRIDE}
                      y={row * STRIDE}
                      width={CELL}
                      height={CELL}
                      rx={2.5}
                      className={`heat-${lvl}`}
                      style={heatCellStyle(lvl)}
                      onMouseEnter={() => {
                        setHover({
                          b: cell.b,
                          x: col * STRIDE,
                          y: row * STRIDE,
                        });
                      }}
                      onMouseLeave={() => setHover(null)}
                    />
                  );
                })
              )}
            </svg>
          </div>
        </div>

        {hover && (
          <div
            role="tooltip"
            className="pointer-events-none absolute z-10 rounded-md border border-border-subtle bg-bg-panel px-2 py-1.5 text-xs shadow-lg tu-pop-in"
            style={{
              left: Math.min(hover.x, weeks.length * STRIDE - 140),
              top: hover.y + STRIDE + 4,
            }}
          >
            <div className="font-mono text-[10px] text-fg-muted">
              {hover.b.date}
            </div>
            <div className="mt-0.5 tabular-nums font-semibold text-foreground">
              {hover.b.costUsd > 0
                ? `${formatUsd(hover.b.costUsd, { precise: true })} · ${hover.b.sessions} sessions`
                : "0 — 摸鱼日"}
            </div>
          </div>
        )}
      </div>

      {/* Keep hover animation in CSS, but make the actual intensity color
       * an inline SVG style. Some browsers/theme skins reject newer CSS color
       * functions as SVG fill, which made active days render as if the heatmap
       * had no intensity. */}
      <style>{`
        rect[class^="heat-"] {
          cursor: pointer;
          transition: filter 120ms ease-out, transform 120ms ease-out;
          transform-box: fill-box;
          transform-origin: center;
        }
        rect[class^="heat-"]:hover {
          filter: brightness(1.2);
          transform: scale(1.25);
        }
      `}</style>
    </div>
  );
}

function Legend() {
  return (
    <div className="flex items-center gap-1.5 text-[10px] text-fg-faint">
      <span>少</span>
      {[0, 1, 2, 3, 4].map((l) => (
        <span
          key={l}
          className={`heat-${l}`}
          style={{
            width: 11,
            height: 11,
            borderRadius: 2.5,
            display: "inline-block",
            ...heatSwatchStyle(l as 0 | 1 | 2 | 3 | 4),
          }}
        />
      ))}
      <span>多</span>
    </div>
  );
}
