"use client";

import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { formatUsd } from "@/lib/format";
import type { Forecast } from "@/lib/forecast";
import type { PlanLite } from "@/lib/roi-client";

export function ForecastCard({
  forecast,
  activePlans,
  labels,
}: {
  forecast: Forecast;
  activePlans: PlanLite[];
  labels: {
    title: string;       // "月底预测" / "Month-end forecast"
    pace: string;        // "按日均 {amount} 推算"
    lookback: string;    // "近 {n} 天"
    vsLastMonth: string; // "上月同期"
    higher: string;      // "高 {pct}%"
    lower: string;       // "低 {pct}%"
    flat: string;        // "持平"
    notEnoughData: string; // "数据不足，再用几天再看"
    cheaperSub: string;  // "续订更划算"
    cheaperPaygo: string; // "按用量计费更划算"
  };
}) {
  // Don't render when there's literally no data to base a forecast on.
  if (forecast.confidence === "low" && forecast.monthToDateUsd === 0) {
    return null;
  }

  const subscriptionMonthly = activePlans.reduce((sum, p) => sum + p.monthlyUsd, 0);
  const showSubComparison = subscriptionMonthly > 0;
  const subVsForecast = subscriptionMonthly - forecast.monthEndProjectionUsd;
  // Treat <5% gap as a wash to keep the recommendation honest.
  const decisive =
    Math.abs(subVsForecast) > Math.max(5, subscriptionMonthly * 0.05);

  // Delta vs same day last month.
  const lastSameDay = forecast.lastMonthSameDayUsd;
  let deltaLabel: { text: string; tone: "up" | "down" | "flat" } | null = null;
  if (lastSameDay != null && lastSameDay > 0) {
    const ratio = forecast.monthToDateUsd / lastSameDay;
    const pct = Math.round((ratio - 1) * 100);
    if (Math.abs(pct) < 5) {
      deltaLabel = { text: labels.flat, tone: "flat" };
    } else if (pct > 0) {
      deltaLabel = {
        text: labels.higher.replace("{pct}", String(pct)),
        tone: "up",
      };
    } else {
      deltaLabel = {
        text: labels.lower.replace("{pct}", String(Math.abs(pct))),
        tone: "down",
      };
    }
  }

  const DeltaIcon =
    deltaLabel?.tone === "up"
      ? TrendingUp
      : deltaLabel?.tone === "down"
        ? TrendingDown
        : Minus;

  return (
    <Card className="panel-hover">
      <CardContent className="space-y-3 px-4 py-3">
        <div className="flex items-center justify-between text-[11px] font-medium uppercase tracking-wider text-fg-muted">
          <span>{labels.title}</span>
          {forecast.confidence === "low" && (
            <span className="rounded bg-warning/10 px-1.5 py-0.5 text-[10px] text-warning">
              {labels.notEnoughData}
            </span>
          )}
        </div>

        <div className="flex items-end gap-4">
          <div className="flex-1">
            <div className="text-3xl font-semibold tabular-nums tracking-tight">
              {formatUsd(forecast.monthEndProjectionUsd, { precise: true })}
            </div>
            <div className="mt-0.5 text-xs text-fg-muted">
              {labels.pace
                .replace(
                  "{amount}",
                  formatUsd(forecast.paceUsdPerDay, { precise: true })
                )
                .replace("{n}", String(forecast.lookbackDays))}
            </div>
          </div>

          {deltaLabel && (
            <div
              className={
                deltaLabel.tone === "up"
                  ? "flex items-center gap-1 text-sm font-medium text-warning"
                  : deltaLabel.tone === "down"
                    ? "flex items-center gap-1 text-sm font-medium text-success"
                    : "flex items-center gap-1 text-sm font-medium text-fg-muted"
              }
            >
              <DeltaIcon className="h-3.5 w-3.5" />
              <span>{labels.vsLastMonth}</span>
              <span className="tabular-nums">{deltaLabel.text}</span>
            </div>
          )}
        </div>

        {showSubComparison && decisive && (
          <div className="rounded border border-border-subtle bg-bg-panel-2/50 px-3 py-2 text-xs">
            {subVsForecast > 0 ? (
              <>
                <span className="text-success">✓ {labels.cheaperSub}</span>
                <span className="ml-2 text-fg-muted tabular-nums">
                  ({formatUsd(subscriptionMonthly, { precise: true })} /mo
                  &nbsp;vs&nbsp;
                  ~{formatUsd(forecast.monthEndProjectionUsd, { precise: true })}
                  )
                </span>
              </>
            ) : (
              <>
                <span className="text-warning">→ {labels.cheaperPaygo}</span>
                <span className="ml-2 text-fg-muted tabular-nums">
                  (~{formatUsd(forecast.monthEndProjectionUsd, { precise: true })}
                  &nbsp;vs&nbsp;
                  {formatUsd(subscriptionMonthly, { precise: true })} /mo)
                </span>
              </>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
