"use client";

import { useEffect, useState } from "react";
import { Target, X } from "lucide-react";
import { formatUsd } from "@/lib/format";

// Lightweight client-side overlay opened when a row above the current
// user is clicked. Shows the gap-to-overtake, the daily pace needed to
// close it before month-end, and a humorous taunt. Pure presentation —
// no server round trip, all numbers derived from the props passed in.

export type ChallengeProps = {
  meCost: number;
  targetCost: number;
  targetName: string;
  targetRank: number;
  daysLeft: number;
  // i18n labels collapsed into one object so the parent (server
  // component) controls copy.
  labels: {
    challenge: string;
    gap: string;
    perDay: string;
    daysLeft: string;
    monthEnd: string;
    close: string;
    accept: string;
    tauntDoable: string;
    tauntSteep: string;
    tauntCrushing: string;
  };
};

export function LeaderboardChallenge({
  meCost,
  targetCost,
  targetName,
  targetRank,
  daysLeft,
  labels,
}: ChallengeProps) {
  const [open, setOpen] = useState(false);

  // Esc closes the challenge modal. Listener attached only while
  // open so background pages don't pay for an idle keydown handler.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);
  const gap = Math.max(0, targetCost - meCost);
  // Pace to close the gap before month-end. Guard against division by
  // zero on the last day of the month.
  const perDay = gap / Math.max(1, daysLeft);
  // Pick a taunt tier — keeps the panel mood-aware without needing a
  // long branch in the JSX.
  let taunt = labels.tauntDoable;
  if (perDay > 30) taunt = labels.tauntCrushing;
  else if (perDay > 10) taunt = labels.tauntSteep;

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1 rounded px-2 py-0.5 text-[11px] font-medium text-fg-muted transition-colors hover:bg-bg-panel-2 hover:text-fg-strong"
        aria-label={labels.challenge}
      >
        <Target className="h-3 w-3" />
        <span>{labels.challenge}</span>
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm tu-fade-in"
          onClick={() => setOpen(false)}
          role="dialog"
          aria-modal="true"
        >
          <div
            className="relative w-full max-w-sm rounded-lg border border-border-subtle bg-bg-app p-6 shadow-2xl tu-pop-in"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label={labels.close}
              className="absolute right-3 top-3 rounded p-1 text-fg-muted hover:bg-bg-panel-2 hover:text-fg-strong"
            >
              <X className="h-4 w-4" />
            </button>

            <div className="mb-1 text-[11px] font-medium uppercase tracking-wider text-fg-muted">
              #{targetRank} · {targetName}
            </div>
            <h3 className="text-lg font-semibold text-fg-strong">
              {labels.challenge}
            </h3>

            <div className="mt-5 space-y-3 text-sm">
              <div className="flex items-baseline justify-between gap-3">
                <span className="text-fg-muted">{labels.gap}</span>
                <span className="text-2xl font-semibold tabular-nums tracking-tight">
                  {formatUsd(gap, { precise: true })}
                </span>
              </div>

              <div className="flex items-baseline justify-between gap-3 border-t border-border-subtle pt-3">
                <span className="text-fg-muted">
                  {labels.perDay} · {labels.daysLeft.replace("{n}", String(daysLeft))}
                </span>
                <span className="text-lg font-semibold tabular-nums tracking-tight">
                  {formatUsd(perDay, { precise: true })}
                </span>
              </div>

              <p className="rounded bg-bg-panel-2/40 px-3 py-2 text-xs text-fg-muted">
                {taunt}
              </p>
            </div>

            <button
              type="button"
              onClick={() => setOpen(false)}
              className="mt-5 w-full rounded-md bg-fg-strong px-4 py-2 text-sm font-medium text-bg-app hover:opacity-90"
            >
              {labels.accept}
            </button>
          </div>
        </div>
      )}
    </>
  );
}
