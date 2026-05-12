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
import { totalActiveHours } from "@/lib/activity";
import { pickDailyTaunt, pickRoiLine } from "@/lib/encouragement";
import type { Period } from "@/lib/types";

export const runtime = "nodejs";

const VALID: Period[] = ["today", "24h", "7d", "30d", "month", "year", "all"];

// Vertical 1080×1920 phone-shaped share card — the "let me show my
// friend how badly I broke Anthropic" hook. Compose: brand row → user
// chip → hero card (savings + comparison + ratio bar) → models bar
// chart → stats (tokens / sessions / hours + sparkline) → taunt → URL.
// Auth-gated; session cookie required.
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

  const activePlanIds = listUserSubscriptions(user.id);
  const activePlans = activePlanIds
    .map((id) => PLAN_CATALOG.find((p) => p.id === id))
    .filter((p): p is (typeof PLAN_CATALOG)[number] => p != null)
    .map((p) => ({ id: p.id, vendor: p.vendor, name: p.name, monthlyUsd: p.monthlyUsd }));

  const days = periodDays(period);
  const roi = computeRoi(agg.totals.costUsd, activePlans, days);
  const isDaily = period === "today" || period === "24h";
  const userKey = `${user.id}:${Date.now()}`;
  const message = isDaily
    ? pickDailyTaunt(agg.totals.costUsd, activePlans, "zh-CN", userKey, period)
    : pickRoiLine(roi.ratioPct, roi.netUsd, activePlans, "zh-CN", userKey, period);

  const periodLabel: Record<Period, string> = {
    today: "今天",
    "24h": "近 24 小时",
    "7d": "近 7 天",
    "30d": "近 30 天",
    month: "本月",
    year: "今年",
    all: "全部",
    custom: "区间",
  };

  // Period verb arc — plain language, no jargon ("按 API 牌价" out).
  const verb: Record<Period, string> = {
    today: "今天 AI 替我打了",
    "24h": "近 24 小时 AI 替我打了",
    "7d": "本周 AI 替我打了",
    "30d": "近 30 天 AI 替我打了",
    month: "本月 AI 替我打了",
    year: "今年 AI 替我打了",
    all: "至今 AI 替我打了",
    custom: "这段 AI 替我打了",
  };

  const inProfit = roi.netUsd > 0;
  const hasSubs = activePlans.length > 0;

  // Top 3 models by token share.
  const topModels = agg.byModel.slice(0, 3).map((m) => ({
    name: m.model || "unknown",
    provider: m.provider,
    pct:
      agg.totals.totalTokens > 0
        ? (m.totalTokens / agg.totals.totalTokens) * 100
        : 0,
    tokens: m.totalTokens,
  }));

  // Trend bars — up to 14 buckets, height-normalized.
  const trendBuckets = agg.byDay.slice(-14);
  const maxTokens = trendBuckets.reduce(
    (m, d) => (d.totalTokens > m ? d.totalTokens : m),
    1
  );
  const trendBars = trendBuckets.map((d) => ({
    h: Math.max(0.04, d.totalTokens / maxTokens),
  }));

  const codingHours = totalActiveHours(scoped);

  const apiValue = agg.totals.costUsd;
  const subFee = roi.proratedUsd;
  const savings = roi.netUsd;
  const ratioX = roi.ratioPct / 100;

  // Real-world reference: cheeky stuff people in CN actually buy.
  const compare = (() => {
    const u = Math.abs(savings);
    if (u >= 50000) return "≈ 一辆特斯拉 Model S";
    if (u >= 20000) return "≈ 一辆 Tesla Model 3";
    if (u >= 12000) return "≈ 一辆五菱宏光 MINI";
    if (u >= 6000) return "≈ 一台 MacBook Pro M5 满配";
    if (u >= 3500) return "≈ 一台 MacBook Pro";
    if (u >= 1800) return "≈ 一台 MacBook Air";
    if (u >= 1000) return "≈ 一台 iPad Pro";
    if (u >= 500) return "≈ 一台 PS5";
    if (u >= 200) return "≈ 一双 Air Jordan";
    if (u >= 80) return "≈ 一双 Crocs + 配饰";
    if (u >= 30) return "≈ 一顿海底捞";
    if (u >= 10) return "≈ 一份外卖";
    if (u >= 3) return "≈ 一杯瑞幸";
    return "";
  })();

  const multiplier = (() => {
    if (!hasSubs) return "";
    if (ratioX < 1) return `差 ${(100 - roi.ratioPct).toFixed(0)}% 才回本`;
    if (ratioX < 1.5) return `${Math.round((ratioX - 1) * 100)}% 净赚`;
    if (ratioX < 10) return `${ratioX.toFixed(1)}× 套餐价`;
    return `${Math.round(ratioX)}× 套餐价`;
  })();

  const heroColor = inProfit ? "#88FFAB" : "#FFA88A";
  const toneStyle: Record<
    "roast" | "tease" | "shade" | "celebration",
    { bg: string; border: string; tag: string }
  > = {
    roast: {
      bg: "rgba(255, 95, 95, 0.14)",
      border: "rgba(255, 95, 95, 0.5)",
      tag: "🌶️ 锐评",
    },
    tease: {
      bg: "rgba(255, 168, 138, 0.14)",
      border: "rgba(255, 168, 138, 0.5)",
      tag: "😏 调侃",
    },
    shade: {
      bg: "rgba(255, 200, 122, 0.12)",
      border: "rgba(255, 200, 122, 0.5)",
      tag: "🍵 阴阳",
    },
    celebration: {
      bg: "rgba(136, 255, 171, 0.14)",
      border: "rgba(136, 255, 171, 0.5)",
      tag: "🎉 喜报",
    },
  };

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          background:
            "radial-gradient(circle at 25% -5%, #2f2270 0%, #15103a 45%, #06040f 100%)",
          color: "white",
          padding: "70px 60px 50px",
          fontFamily: "ui-monospace, monospace",
          position: "relative",
        }}
      >
        {/* Background grid */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            backgroundImage:
              "linear-gradient(rgba(157, 141, 255, 0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(157, 141, 255, 0.05) 1px, transparent 1px)",
            backgroundSize: "90px 90px",
            display: "flex",
          }}
        />
        {/* Brand + user row */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            zIndex: 1,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
            <svg width="56" height="42" viewBox="0 0 64 48" fill="none" stroke="#9D8DFF">
              <path
                d="M4 38 L 13 22 L 22 31 L 32 13 L 42 24 L 52 8 L 60 16"
                strokeWidth="5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <circle cx="60" cy="16" r="6" fill="#9D8DFF" />
            </svg>
            <div style={{ display: "flex", fontSize: 40, fontWeight: 600 }}>
              <span>token</span>
              <span style={{ color: "#9D8DFF" }}>u</span>
              <span>sage</span>
            </div>
          </div>
          <div
            style={{
              display: "flex",
              padding: "10px 22px",
              borderRadius: 999,
              background: "rgba(123, 111, 255, 0.18)",
              border: "1px solid rgba(157, 141, 255, 0.5)",
              fontSize: 26,
              color: "#C9BEFF",
            }}
          >
            {periodLabel[period]}
          </div>
        </div>

        {/* User chip */}
        <div
          style={{
            display: "flex",
            marginTop: 28,
            fontSize: 30,
            color: "#9D8DFF",
            zIndex: 1,
          }}
        >
          @{user.username}
        </div>

        {/* HERO CARD */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            marginTop: 30,
            padding: "44px 44px 40px",
            borderRadius: 32,
            background:
              "linear-gradient(165deg, rgba(123, 111, 255, 0.18) 0%, rgba(123, 111, 255, 0.04) 100%)",
            border: "1px solid rgba(157, 141, 255, 0.28)",
            zIndex: 1,
          }}
        >
          <div
            style={{
              display: "flex",
              fontSize: 28,
              color: "#c4bce0",
              letterSpacing: 1,
            }}
          >
            {verb[period]}
          </div>
          <div
            style={{
              display: "flex",
              fontSize: 180,
              fontWeight: 800,
              letterSpacing: -5,
              lineHeight: 1,
              marginTop: 10,
              color: heroColor,
            }}
          >
            ${apiValue.toFixed(2)}
          </div>
          <div
            style={{
              display: "flex",
              fontSize: 28,
              color: "#c4bce0",
              marginTop: 12,
            }}
          >
            的活 — 这是 API 官网价
          </div>

          {hasSubs && (
            <>
              {/* Subscription comparison bar */}
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  marginTop: 38,
                  gap: 14,
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                  }}
                >
                  <div style={{ display: "flex", fontSize: 26, color: "#9D8DFF" }}>
                    套餐花了
                  </div>
                  <div style={{ display: "flex", fontSize: 32, fontWeight: 600, color: "white" }}>
                    ${subFee.toFixed(2)}
                  </div>
                </div>
                <div
                  style={{
                    display: "flex",
                    height: 14,
                    width: "100%",
                    background: "rgba(157, 141, 255, 0.12)",
                    borderRadius: 999,
                    overflow: "hidden",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      height: "100%",
                      width: `${Math.min(100, (subFee / Math.max(apiValue, subFee)) * 100)}%`,
                      background: "linear-gradient(90deg, #7B6FFF 0%, #9D8DFF 100%)",
                    }}
                  />
                </div>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    marginTop: 6,
                  }}
                >
                  <div style={{ display: "flex", fontSize: 26, color: heroColor }}>
                    {inProfit ? "省下" : "还差"}
                  </div>
                  <div
                    style={{
                      display: "flex",
                      fontSize: 32,
                      fontWeight: 600,
                      color: heroColor,
                    }}
                  >
                    ${Math.abs(savings).toFixed(2)}
                  </div>
                </div>
                <div
                  style={{
                    display: "flex",
                    height: 14,
                    width: "100%",
                    background: "rgba(157, 141, 255, 0.12)",
                    borderRadius: 999,
                    overflow: "hidden",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      height: "100%",
                      width: `${Math.min(100, (Math.abs(savings) / Math.max(apiValue, subFee)) * 100)}%`,
                      background: inProfit
                        ? "linear-gradient(90deg, #4dd47a 0%, #88FFAB 100%)"
                        : "linear-gradient(90deg, #d47a5a 0%, #FFA88A 100%)",
                    }}
                  />
                </div>
              </div>

              {/* Multiplier + comparison */}
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  marginTop: 30,
                  gap: 20,
                }}
              >
                <div
                  style={{
                    display: "flex",
                    padding: "12px 22px",
                    borderRadius: 12,
                    background: inProfit
                      ? "rgba(136, 255, 171, 0.14)"
                      : "rgba(255, 168, 138, 0.14)",
                    border: `1px solid ${inProfit ? "rgba(136, 255, 171, 0.4)" : "rgba(255, 168, 138, 0.4)"}`,
                    fontSize: 32,
                    fontWeight: 600,
                    color: heroColor,
                  }}
                >
                  {multiplier}
                </div>
                {compare && (
                  <div
                    style={{
                      display: "flex",
                      fontSize: 30,
                      color: "#c4bce0",
                    }}
                  >
                    {compare}
                  </div>
                )}
              </div>
            </>
          )}
        </div>

        {/* Models card */}
        {topModels.length > 0 && (
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              marginTop: 28,
              padding: "30px 36px 32px",
              borderRadius: 24,
              background: "rgba(157, 141, 255, 0.05)",
              border: "1px solid rgba(157, 141, 255, 0.18)",
              zIndex: 1,
            }}
          >
            <div
              style={{
                display: "flex",
                fontSize: 22,
                color: "#9D8DFF",
                textTransform: "uppercase",
                letterSpacing: 4,
                marginBottom: 22,
              }}
            >
              动用了这些模型
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
              {topModels.map((m, i) => (
                <div
                  key={i}
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: 8,
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        fontSize: 30,
                        color: "white",
                        fontWeight: 500,
                      }}
                    >
                      {m.name}
                    </div>
                    <div
                      style={{
                        display: "flex",
                        fontSize: 28,
                        color: "#9D8DFF",
                        fontWeight: 600,
                      }}
                    >
                      {m.pct < 1 ? "<1%" : `${m.pct.toFixed(0)}%`}
                    </div>
                  </div>
                  <div
                    style={{
                      display: "flex",
                      height: 12,
                      width: "100%",
                      background: "rgba(157, 141, 255, 0.10)",
                      borderRadius: 999,
                      overflow: "hidden",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        height: "100%",
                        width: `${Math.max(0.5, m.pct)}%`,
                        background:
                          i === 0
                            ? "linear-gradient(90deg, #7B6FFF 0%, #C9BEFF 100%)"
                            : i === 1
                              ? "linear-gradient(90deg, #5b4fdb 0%, #9D8DFF 100%)"
                              : "linear-gradient(90deg, #4a3fb8 0%, #7B6FFF 100%)",
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Stats row + sparkline */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            marginTop: 24,
            padding: "30px 36px 32px",
            borderRadius: 24,
            background: "rgba(157, 141, 255, 0.05)",
            border: "1px solid rgba(157, 141, 255, 0.18)",
            zIndex: 1,
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "flex-end",
              justifyContent: "space-between",
              gap: 30,
            }}
          >
            <Stat label="TOKENS" value={formatTokensShort(agg.totals.totalTokens)} />
            <Stat label="会话" value={String(agg.totals.records)} />
            <Stat label="编程时长" value={`${codingHours.toFixed(0)}h`} />
          </div>
          {trendBars.length >= 2 && (
            <div
              style={{
                display: "flex",
                marginTop: 26,
                height: 80,
                alignItems: "flex-end",
                gap: 6,
              }}
            >
              {trendBars.map((b, i) => (
                <div
                  key={i}
                  style={{
                    display: "flex",
                    flex: 1,
                    height: `${b.h * 100}%`,
                    minHeight: 4,
                    background:
                      "linear-gradient(180deg, #C9BEFF 0%, #7B6FFF 100%)",
                    borderRadius: 4,
                  }}
                />
              ))}
            </div>
          )}
        </div>

        {/* Taunt card */}
        {message && (
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              marginTop: 24,
              padding: "28px 32px 30px",
              borderRadius: 24,
              background: toneStyle[message.tone].bg,
              border: `2px solid ${toneStyle[message.tone].border}`,
              zIndex: 1,
            }}
          >
            <div
              style={{
                display: "flex",
                fontSize: 24,
                color: "#C9BEFF",
                marginBottom: 12,
                letterSpacing: 2,
              }}
            >
              {toneStyle[message.tone].tag}
            </div>
            <div
              style={{
                display: "flex",
                fontSize: 36,
                lineHeight: 1.4,
                fontWeight: 500,
                color: "#FFFFFF",
              }}
            >
              「{message.text}」
            </div>
          </div>
        )}

        {/* Footer */}
        <div
          style={{
            display: "flex",
            justifyContent: "center",
            marginTop: "auto",
            paddingTop: 24,
            fontSize: 22,
            color: "#6a6680",
            letterSpacing: 2,
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

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
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
          fontSize: 60,
          fontWeight: 700,
          lineHeight: 1,
          color: "white",
        }}
      >
        {value}
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
