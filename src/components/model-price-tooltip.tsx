"use client";

import * as React from "react";
import { Tooltip } from "@base-ui/react/tooltip";
import { formatUsd } from "@/lib/format";
import type { ModelPricing } from "@/lib/pricing";
import type { Dictionary } from "@/i18n/types";

const PER_M = 1_000_000;

type RowUsage = {
  input: number;
  output: number;
  cacheRead: number;
  cacheWrite: number;
  reasoning: number;
};

type Props = {
  model: string;
  provider: string;
  pricing: ModelPricing | null;
  usage?: RowUsage;
  t: Dictionary["priceTooltip"];
  children: React.ReactNode;
  className?: string;
};

function fmtRate(perToken: number): string {
  // Per-M is how the industry quotes prices — much easier to read than per-token.
  return formatUsd(perToken * PER_M, { precise: true });
}

export function ModelPriceTooltip({
  model,
  provider,
  pricing,
  usage,
  t,
  children,
  className,
}: Props) {
  if (!pricing) {
    return <span className={className}>{children}</span>;
  }

  // Match the fallback logic in estimateCost so the tooltip never lies about
  // the rate that was actually applied.
  const cacheReadRate = pricing.cacheReadPerToken ?? pricing.inputPerToken * 0.1;
  const cacheWriteRate = pricing.cacheWritePerToken ?? pricing.inputPerToken * 1.25;
  const reasoningRate = pricing.reasoningPerToken ?? pricing.outputPerToken;
  const cacheReadFallback = pricing.cacheReadPerToken == null;
  const cacheWriteFallback = pricing.cacheWritePerToken == null;

  const lines: Array<{ key: string; label: string; cost: number }> = [];
  if (usage) {
    if (usage.input > 0)
      lines.push({ key: "in", label: t.input, cost: usage.input * pricing.inputPerToken });
    if (usage.output > 0)
      lines.push({ key: "out", label: t.output, cost: usage.output * pricing.outputPerToken });
    if (usage.cacheRead > 0)
      lines.push({ key: "cr", label: t.cacheRead, cost: usage.cacheRead * cacheReadRate });
    if (usage.cacheWrite > 0)
      lines.push({ key: "cw", label: t.cacheWrite, cost: usage.cacheWrite * cacheWriteRate });
    if (usage.reasoning > 0)
      lines.push({ key: "rs", label: t.reasoning, cost: usage.reasoning * reasoningRate });
  }
  const total = lines.reduce((s, l) => s + l.cost, 0);

  return (
    <Tooltip.Root>
      <Tooltip.Trigger
        delay={150}
        render={
          <span
            className={
              className
                ? `${className} cursor-help underline decoration-dotted decoration-muted-foreground/40 underline-offset-2 hover:decoration-foreground/60`
                : "cursor-help underline decoration-dotted decoration-muted-foreground/40 underline-offset-2 hover:decoration-foreground/60"
            }
          />
        }
      >
        {children}
      </Tooltip.Trigger>
      <Tooltip.Portal>
        <Tooltip.Positioner sideOffset={6} className="z-50 outline-none">
          <Tooltip.Popup className="w-72 max-w-[90vw] rounded-md border border-border bg-popover px-3 py-2.5 text-popover-foreground shadow-md data-[ending-style]:opacity-0 data-[starting-style]:opacity-0 transition-opacity duration-150">
            <div className="flex items-baseline justify-between gap-3">
              <span className="font-mono text-xs">{model}</span>
              <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
                {provider}
              </span>
            </div>
            <div className="my-2 h-px bg-border" />
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
              {t.priceTable}
            </div>
            <div className="mt-1.5 grid grid-cols-[1fr_auto] gap-x-3 gap-y-1 text-xs">
              <RateRow label={t.input} rate={fmtRate(pricing.inputPerToken)} perM={t.perM} />
              <RateRow label={t.output} rate={fmtRate(pricing.outputPerToken)} perM={t.perM} />
              <RateRow
                label={t.cacheRead}
                rate={fmtRate(cacheReadRate)}
                perM={t.perM}
                approx={cacheReadFallback}
              />
              <RateRow
                label={t.cacheWrite}
                rate={fmtRate(cacheWriteRate)}
                perM={t.perM}
                approx={cacheWriteFallback}
              />
            </div>
            {lines.length > 0 && (
              <>
                <div className="my-2 h-px bg-border" />
                <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
                  {t.thisRow}
                </div>
                <div className="mt-1.5 grid grid-cols-[1fr_auto] gap-x-3 gap-y-0.5 text-xs">
                  {lines.map((l) => (
                    <React.Fragment key={l.key}>
                      <span className="text-muted-foreground">{l.label}</span>
                      <span className="font-mono tabular-nums">
                        {formatUsd(l.cost, { precise: true })}
                      </span>
                    </React.Fragment>
                  ))}
                  <span className="mt-1 border-t border-border pt-1.5 font-medium">
                    {t.total}
                  </span>
                  <span className="mt-1 border-t border-border pt-1.5 font-mono font-semibold tabular-nums">
                    {formatUsd(total, { precise: true })}
                  </span>
                </div>
              </>
            )}
          </Tooltip.Popup>
        </Tooltip.Positioner>
      </Tooltip.Portal>
    </Tooltip.Root>
  );
}

function RateRow({
  label,
  rate,
  perM,
  approx,
}: {
  label: string;
  rate: string;
  perM: string;
  approx?: boolean;
}) {
  return (
    <>
      <span className="text-muted-foreground">
        {label}
        {approx && (
          <span className="ml-1 text-[10px] text-muted-foreground/60" title="approximate">
            ~
          </span>
        )}
      </span>
      <span className="font-mono tabular-nums">
        {rate}
        <span className="ml-1 text-muted-foreground">{perM}</span>
      </span>
    </>
  );
}
