"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  spendPercentile,
  tokenPercentile,
  hoursPercentile,
  tierLabel,
  spendReference,
} from "@/lib/percentile";
import { formatUsd } from "@/lib/format";
import type { Dictionary } from "@/i18n/types";
import type { Period } from "@/lib/types";

const fmtUsd = formatUsd;

// Three-axis "how do I rank" card. Compares the user's per-day spend,
// token throughput, and coding hours against a vibes-based industry
// distribution (lib/percentile.ts). Not a scientific benchmark; the
// UI is explicit about "行业估值参考".

export function CompareCard({
  spendUsdPerDay,
  tokensPerDay,
  hoursPerDay,
  t,
}: {
  spendUsdPerDay: number;
  tokensPerDay: number;
  hoursPerDay: number;
  period: Period;
  t: Dictionary["compare"];
}) {
  const spendPct = spendPercentile(spendUsdPerDay);
  const tokenPct = tokenPercentile(tokensPerDay);
  const hoursPct = hoursPercentile(hoursPerDay);
  const tier = tierLabel(spendPct);
  const ref = spendReference();
  const tierName = t.tiers[tier.key];

  return (
    <Card className="panel-hover">
      <CardHeader className="flex flex-col items-start gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div className="space-y-1">
          <CardTitle className="flex items-center gap-2">
            {t.title}
            <span className={tierChipClass(tier.color)}>{tierName}</span>
          </CardTitle>
          <CardDescription>{t.description}</CardDescription>
        </div>
        <div className="text-[11px] uppercase tracking-wider text-fg-muted">
          {t.disclaimer}
        </div>
      </CardHeader>
      <CardContent className="grid grid-cols-1 gap-5 md:grid-cols-3">
        <PercentileBar
          label={t.spendLabel}
          pct={spendPct}
          valueLabel={`${fmtUsd(spendUsdPerDay)} ${t.perDay}`}
          referenceLabel={`p50 $${ref.p50} · p90 $${ref.p90} · p99 $${ref.p99}`}
          exceedsTpl={t.exceeds}
        />
        <PercentileBar
          label={t.tokensLabel}
          pct={tokenPct}
          valueLabel={`${formatTokens(tokensPerDay)} ${t.perDay}`}
          referenceLabel="p50 5M · p90 300M · p99 3B"
          exceedsTpl={t.exceeds}
        />
        <PercentileBar
          label={t.hoursLabel}
          pct={hoursPct}
          valueLabel={`${hoursPerDay >= 10 ? hoursPerDay.toFixed(0) : hoursPerDay.toFixed(1)} h ${t.perDay}`}
          referenceLabel="p50 2h · p90 7h · p99 15h"
          exceedsTpl={t.exceeds}
        />
      </CardContent>
    </Card>
  );
}

function PercentileBar({
  label,
  pct,
  valueLabel,
  referenceLabel,
  exceedsTpl,
}: {
  label: string;
  pct: number;
  valueLabel: string;
  referenceLabel: string;
  exceedsTpl: string;
}) {
  // Pct is 0-100. Clamp display + bar.
  const clamped = Math.max(0, Math.min(99.99, pct));
  // Color the fill based on tier — green up to 50, accent through 90, warning past.
  const fillColor =
    pct < 50
      ? "bg-fg-muted"
      : pct < 90
        ? "bg-accent"
        : pct < 99
          ? "bg-warning"
          : "bg-danger";
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-baseline justify-between gap-2 text-xs">
        <span className="font-medium uppercase tracking-wider text-fg-muted">
          {label}
        </span>
        <span className="tabular-nums text-fg-default">{valueLabel}</span>
      </div>
      <div className="text-2xl font-semibold tabular-nums text-fg-strong">
        {exceedsTpl.replace("{pct}", clamped.toFixed(0))}
      </div>
      <div className="relative h-2 w-full overflow-hidden rounded-full bg-bg-panel-2">
        {/* Reference tick marks at 25/50/75/90 */}
        <div className="absolute inset-0 flex">
          {[25, 50, 75, 90].map((p) => (
            <div
              key={p}
              className="absolute top-0 h-full w-px bg-border-strong/40"
              style={{ left: `${p}%` }}
            />
          ))}
        </div>
        <div
          className={`relative h-full ${fillColor} transition-[width] duration-700 ease-out`}
          style={{ width: `${clamped}%` }}
        />
      </div>
      <div className="text-[10px] tabular-nums text-fg-faint">
        {referenceLabel}
      </div>
    </div>
  );
}

function tierChipClass(color: "mute" | "ok" | "warn" | "danger"): string {
  const base =
    "inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider border";
  switch (color) {
    case "mute":
      return `${base} border-border-subtle bg-bg-panel-2 text-fg-muted`;
    case "ok":
      return `${base} border-success/40 bg-success/10 text-success`;
    case "warn":
      return `${base} border-warning/40 bg-warning/10 text-warning`;
    case "danger":
      return `${base} border-danger/40 bg-danger/10 text-danger`;
  }
}

function formatTokens(n: number): string {
  if (n >= 1_000_000_000) return `${(n / 1_000_000_000).toFixed(1)}B`;
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(Math.round(n));
}
