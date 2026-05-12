import { ImageResponse } from "next/og";
import { readCurrentUser } from "@/lib/auth";
import { loadRecords } from "@/lib/adapters";
import {
  aggregate,
  filterByPeriod,
  periodWindow,
  pickGranularity,
} from "@/lib/aggregate";
import { listUserSubscriptions, PLAN_CATALOG } from "@/lib/subscriptions";
import { computeRoi, periodDays } from "@/lib/roi-client";
import { pickDailyTaunt, pickRoiLine } from "@/lib/encouragement";
import type { Period } from "@/lib/types";

export const runtime = "nodejs";

const VALID: Period[] = ["today", "24h", "7d", "30d", "month", "year", "all"];

// Vertical 1080×1920 phone-shaped share card. Pulls the visible period
// from the URL, computes the same KPI numbers the dashboard would, and
// renders a poster with the current encouragement line at the bottom —
// the "let me show my friend how badly I broke Anthropic" hook.
//
// Auth-gated for v1 — the request needs to land with the user's
// session cookie. Public signed-URL sharing is a future layer.
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ period: string }> }
) {
  const user = await readCurrentUser();
  if (!user) return new Response("not signed in", { status: 401 });

  const { period: rawPeriod } = await params;
  const period: Period = (VALID as string[]).includes(rawPeriod)
    ? (rawPeriod as Period)
    : "today";

  const { records } = await loadRecords();
  const window = periodWindow(period);
  const scoped = filterByPeriod(records, period);
  const granularity = pickGranularity(scoped, period);
  const agg = aggregate(scoped, granularity, window);

  // Plans for ROI math + vendor mention in the encouragement line.
  const activePlanIds = listUserSubscriptions(user.id);
  const activePlans = activePlanIds
    .map((id) => PLAN_CATALOG.find((p) => p.id === id))
    .filter((p): p is (typeof PLAN_CATALOG)[number] => p != null)
    .map((p) => ({ id: p.id, vendor: p.vendor, name: p.name, monthlyUsd: p.monthlyUsd }));

  const days = periodDays(period);
  const roi = computeRoi(agg.totals.costUsd, activePlans, days);
  const isDaily = period === "today" || period === "24h";
  // Fresh line every request — the share image isn't a re-render
  // surface, the user explicitly clicked "Share" expecting something
  // new each time.
  const userKey = `${user.id}:${Date.now()}`;
  const message = isDaily
    ? pickDailyTaunt(agg.totals.costUsd, activePlans, "zh-CN", userKey, period)
    : pickRoiLine(roi.ratioPct, roi.netUsd, activePlans, "zh-CN", userKey, period);

  const periodLabel: Record<Period, string> = {
    today: "今日",
    "24h": "近 24 小时",
    "7d": "近 7 天",
    "30d": "近 30 天",
    month: "本月",
    year: "今年",
    all: "全部",
    custom: "区间",
  };

  const inProfit = roi.netUsd > 0;
  const ratioPct = roi.ratioPct;
  const topModel = agg.byModel[0]?.model ?? "—";
  const topModelPct =
    agg.totals.totalTokens > 0 && agg.byModel[0]
      ? Math.round((agg.byModel[0].totalTokens / agg.totals.totalTokens) * 100)
      : 0;

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          background:
            "radial-gradient(circle at 30% 0%, #2a1f5c 0%, #0f0a1f 60%, #060410 100%)",
          color: "white",
          padding: "80px 70px",
          fontFamily: "ui-monospace, monospace",
          position: "relative",
        }}
      >
        {/* Subtle grid background */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            backgroundImage:
              "linear-gradient(rgba(123, 111, 255, 0.06) 1px, transparent 1px), linear-gradient(90deg, rgba(123, 111, 255, 0.06) 1px, transparent 1px)",
            backgroundSize: "80px 80px",
            display: "flex",
          }}
        />

        {/* Brand row */}
        <div style={{ display: "flex", alignItems: "center", gap: 20, zIndex: 1 }}>
          <svg width="60" height="45" viewBox="0 0 64 48" fill="none" stroke="#7B6FFF">
            <path
              d="M4 38 L 13 22 L 22 31 L 32 13 L 42 24 L 52 8 L 60 16"
              strokeWidth="5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <circle cx="60" cy="16" r="6" fill="#7B6FFF" />
          </svg>
          <div style={{ display: "flex", fontSize: 44, fontWeight: 600 }}>
            <span>token</span>
            <span style={{ color: "#9D8DFF" }}>u</span>
            <span>sage</span>
          </div>
        </div>

        {/* Username + period chip */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 18,
            marginTop: 40,
            zIndex: 1,
          }}
        >
          <div style={{ display: "flex", fontSize: 32, color: "#9D8DFF" }}>
            @{user.username}
          </div>
          <div
            style={{
              display: "flex",
              padding: "8px 20px",
              borderRadius: 999,
              background: "rgba(123, 111, 255, 0.15)",
              border: "1px solid rgba(123, 111, 255, 0.4)",
              fontSize: 28,
              color: "#C9BEFF",
            }}
          >
            {periodLabel[period]}
          </div>
        </div>

        {/* Hero spend */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            marginTop: 60,
            zIndex: 1,
          }}
        >
          <div style={{ display: "flex", fontSize: 32, color: "#8a85a8" }}>
            按 API 牌价
          </div>
          <div
            style={{
              display: "flex",
              fontSize: 220,
              fontWeight: 800,
              letterSpacing: -4,
              lineHeight: 1,
              marginTop: 8,
              color: inProfit ? "#88FFAB" : "#FFFFFF",
            }}
          >
            ${agg.totals.costUsd.toFixed(2)}
          </div>
          {activePlans.length > 0 && (
            <div
              style={{
                display: "flex",
                fontSize: 36,
                marginTop: 24,
                color: inProfit ? "#88FFAB" : "#FFA88A",
              }}
            >
              {inProfit
                ? `回本 ${ratioPct}% · 多薅 $${roi.netUsd.toFixed(2)}`
                : `回本 ${ratioPct}% · 还差 $${Math.abs(roi.netUsd).toFixed(2)}`}
            </div>
          )}
        </div>

        {/* Stat row */}
        <div
          style={{
            display: "flex",
            marginTop: 80,
            gap: 60,
            zIndex: 1,
          }}
        >
          <Stat label="TOKENS" value={formatTokensShort(agg.totals.totalTokens)} />
          <Stat label="SESSIONS" value={String(agg.totals.records)} />
          {topModel !== "—" && (
            <Stat
              label="TOP MODEL"
              value={`${topModel.slice(0, 14)}`}
              small
              meta={`${topModelPct}%`}
            />
          )}
        </div>

        {/* Encouragement line — the actual shareable hook */}
        {message && (
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              marginTop: "auto",
              padding: "32px 36px",
              borderRadius: 28,
              background:
                message.tone === "roast"
                  ? "rgba(255, 95, 95, 0.12)"
                  : message.tone === "shade"
                    ? "rgba(255, 200, 122, 0.10)"
                    : message.tone === "celebration"
                      ? "rgba(136, 255, 171, 0.12)"
                      : "rgba(123, 111, 255, 0.12)",
            border: `2px solid ${
              message.tone === "roast"
                ? "rgba(255, 95, 95, 0.4)"
                : message.tone === "shade"
                  ? "rgba(255, 200, 122, 0.4)"
                  : message.tone === "celebration"
                    ? "rgba(136, 255, 171, 0.4)"
                    : "rgba(123, 111, 255, 0.4)"
            }`,
              zIndex: 1,
            }}
          >
            <div
              style={{
                display: "flex",
                fontSize: 22,
                color: "#9D8DFF",
                marginBottom: 12,
                textTransform: "uppercase",
                letterSpacing: 4,
              }}
            >
              tokenusage 评语
            </div>
            <div
              style={{
                display: "flex",
                fontSize: 42,
                lineHeight: 1.35,
                fontWeight: 500,
                color: "#FFFFFF",
              }}
            >
              「{message.text}」
            </div>
          </div>
        )}

        {/* Footer URL */}
        <div
          style={{
            display: "flex",
            justifyContent: "center",
            marginTop: 30,
            fontSize: 24,
            color: "#6a6680",
            zIndex: 1,
          }}
        >
          tokenusage.online
        </div>
      </div>
    ),
    { width: 1080, height: 1920 }
  );
}

function Stat({
  label,
  value,
  small,
  meta,
}: {
  label: string;
  value: string;
  small?: boolean;
  meta?: string;
}) {
  return (
    <div style={{ display: "flex", flexDirection: "column" }}>
      <div
        style={{
          display: "flex",
          fontSize: 22,
          color: "#9D8DFF",
          textTransform: "uppercase",
          letterSpacing: 3,
        }}
      >
        {label}
      </div>
      <div
        style={{
          display: "flex",
          alignItems: "baseline",
          gap: 12,
          marginTop: 8,
        }}
      >
        <div
          style={{
            display: "flex",
            fontSize: small ? 44 : 70,
            fontWeight: 700,
            lineHeight: 1,
            color: "white",
          }}
        >
          {value}
        </div>
        {meta && (
          <div style={{ display: "flex", fontSize: 30, color: "#8a85a8" }}>
            {meta}
          </div>
        )}
      </div>
    </div>
  );
}

function formatTokensShort(n: number): string {
  if (n >= 1_000_000_000) return `${(n / 1_000_000_000).toFixed(1)}B`;
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(Math.round(n));
}
