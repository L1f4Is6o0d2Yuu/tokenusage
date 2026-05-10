"use client";

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

export function UsageTrend({ data }: { data: DailyPoint[] }) {
  if (data.length === 0) {
    return (
      <div className="flex h-64 items-center justify-center text-sm text-muted-foreground">
        No data in the selected period.
      </div>
    );
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
              if (name === "totalTokens") return [formatTokens(n), "Tokens"];
              if (name === "costUsd") return [formatUsd(n, { precise: true }), "Cost"];
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
            isAnimationActive={false}
            name="totalTokens"
          />
          <Line
            yAxisId="cost"
            type="monotone"
            dataKey="costUsd"
            stroke="var(--chart-2)"
            strokeWidth={2}
            dot={false}
            isAnimationActive={false}
            name="costUsd"
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
