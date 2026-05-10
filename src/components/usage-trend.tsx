"use client";

import { useEffect, useState } from "react";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { DailyPoint } from "@/lib/types";
import { formatTokens, formatUsd } from "@/lib/format";

// Recharts measures its parent's width on mount via ResizeObserver. When the
// chart is rendered during SSR the initial paint can show stale or partial
// geometry, and any animation that fires before the resize observation
// completes will draw against the wrong width — that's why headless
// screenshots used to capture a half-empty curve.
//
// Gating render on a post-hydration `useEffect` flag means the chart only
// ever mounts on the client, after layout. Animation is then safe to keep on.
export function UsageTrend({
  data,
  labels,
}: {
  data: DailyPoint[];
  labels: { tokens: string; cost: string; empty: string };
}) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);

  if (data.length === 0) {
    return (
      <div className="flex h-64 items-center justify-center text-sm text-muted-foreground">
        {labels.empty}
      </div>
    );
  }

  if (!mounted) {
    return <div className="h-64 w-full" aria-hidden />;
  }

  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 8, right: 16, bottom: 0, left: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
          <XAxis
            dataKey="date"
            stroke="var(--muted-foreground)"
            fontSize={12}
            tickFormatter={(v: string) => v.slice(5)}
          />
          <YAxis
            yAxisId="tokens"
            stroke="var(--muted-foreground)"
            fontSize={12}
            tickFormatter={(v: number) => formatTokens(v)}
          />
          <YAxis
            yAxisId="cost"
            orientation="right"
            stroke="var(--muted-foreground)"
            fontSize={12}
            tickFormatter={(v: number) => formatUsd(v)}
          />
          <Tooltip
            contentStyle={{
              background: "var(--popover)",
              border: "1px solid var(--border)",
              borderRadius: 6,
              fontSize: 12,
            }}
            formatter={(value, name) => {
              const n = typeof value === "number" ? value : Number(value);
              if (name === "totalTokens") return [formatTokens(n), labels.tokens];
              if (name === "costUsd") return [formatUsd(n, { precise: true }), labels.cost];
              return [String(value), String(name)];
            }}
          />
          <Line
            yAxisId="tokens"
            type="monotone"
            dataKey="totalTokens"
            stroke="var(--chart-1)"
            strokeWidth={2}
            dot={false}
            animationDuration={600}
            name="totalTokens"
          />
          <Line
            yAxisId="cost"
            type="monotone"
            dataKey="costUsd"
            stroke="var(--chart-2)"
            strokeWidth={2}
            dot={false}
            animationDuration={600}
            name="costUsd"
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
