import { ImageResponse } from "next/og";
import { readFileSync } from "fs";
import path from "path";
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
import {
  pickHoursTaunt,
  pickTokenTaunt,
  tokenComparison,
} from "@/lib/encouragement";
import type { Period } from "@/lib/types";

export const runtime = "nodejs";

const VALID: Period[] = ["today", "24h", "7d", "30d", "month", "year", "all"];

// CJK glyph reliability: Satori has no built-in CJK. Without an
// explicit font we get sporadic tofu boxes on Alpine. Load Noto Sans
// SC (chinese-simplified subset, ~1.5MB WOFF) once at module init and
// keep it in memory.
const FONT_DIR = path.join(process.cwd(), "src", "fonts");
let cjkFontData: Buffer | null = null;
let latinFontData: Buffer | null = null;
function getCjkFont(): Buffer {
  if (!cjkFontData) {
    cjkFontData = readFileSync(path.join(FONT_DIR, "NotoSansSC-500.woff"));
  }
  return cjkFontData;
}
function getLatinFont(): Buffer {
  if (!latinFontData) {
    latinFontData = readFileSync(
      path.join(FONT_DIR, "NotoSansSC-Latin-500.woff")
    );
  }
  return latinFontData;
}

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
  const userKey = `${user.id}:${Date.now()}`;

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

  const codingHours = totalActiveHours(scoped);
  const hoursPerDay = codingHours / Math.max(1, days);
  const hoursTaunt = pickHoursTaunt(codingHours, days, "zh-CN", userKey, period);
  const tokenTaunt = pickTokenTaunt(
    agg.totals.totalTokens,
    "zh-CN",
    userKey,
    period
  );
  const tokenRef = tokenComparison(
    agg.totals.totalTokens,
    userKey,
    period
  );

  const apiValue = agg.totals.costUsd;
  const subFee = roi.proratedUsd;
  const savings = roi.netUsd;
  const ratioX = roi.ratioPct / 100;

  // Real-world reference: cheeky stuff people in CN actually buy.
  // Tiers re-priced 2026 — MacBook Air starts at $999, iPad Pro $799,
  // PS5 $499, Switch 2 $449, iPhone 17 Pro $1199, Tesla Model 3 ~$36k.
  const compare = (() => {
    const u = Math.abs(savings);
    if (u >= 80000) return "≈ 一辆 Tesla Model S Plaid";
    if (u >= 36000) return "≈ 一辆 Tesla Model 3";
    if (u >= 18000) return "≈ 一辆五菱宏光 MINI";
    if (u >= 7500) return "≈ 一台 Mac Studio M5";
    if (u >= 3500) return "≈ 一台 MacBook Pro M5 满配";
    if (u >= 2000) return "≈ 一台 MacBook Pro M5";
    if (u >= 1200) return "≈ 一台 iPhone 17 Pro";
    if (u >= 900) return "≈ 一台 MacBook Air";
    if (u >= 600) return "≈ 一台 iPad Pro";
    if (u >= 400) return "≈ 一台 PS5";
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
          fontFamily: "Noto Sans SC, ui-monospace, monospace",
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
            marginTop: 28,
            padding: "44px 48px 42px",
            borderRadius: 32,
            background:
              "linear-gradient(165deg, rgba(123, 111, 255, 0.20) 0%, rgba(123, 111, 255, 0.04) 100%)",
            border: "1px solid rgba(157, 141, 255, 0.30)",
            boxShadow: "0 30px 80px -40px rgba(123, 111, 255, 0.6)",
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
              fontSize: 188,
              fontWeight: 800,
              letterSpacing: -6,
              lineHeight: 1,
              marginTop: 10,
              color: heroColor,
            }}
          >
            ${apiValue.toFixed(2)}
          </div>

          {hasSubs && (
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                marginTop: 36,
              }}
            >
              {/* Multiplier headline + comparison */}
              <div
                style={{
                  display: "flex",
                  alignItems: "baseline",
                  flexWrap: "wrap",
                  gap: 22,
                }}
              >
                <div
                  style={{
                    display: "flex",
                    fontSize: 64,
                    fontWeight: 800,
                    letterSpacing: -1,
                    lineHeight: 1,
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
                      color: "#dcd3ff",
                      fontWeight: 500,
                      letterSpacing: 0.5,
                    }}
                  >
                    {inProfit ? "白嫖" : "差"} {compare.replace(/^≈\s*/, "")}
                  </div>
                )}
              </div>

              {/* Single stacked savings bar */}
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  marginTop: 32,
                  gap: 14,
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    fontSize: 24,
                  }}
                >
                  <div style={{ display: "flex", color: "#9D8DFF" }}>
                    套餐 ${subFee.toFixed(2)}
                  </div>
                  <div style={{ display: "flex", color: heroColor, fontWeight: 600 }}>
                    {inProfit ? "省下" : "还差"} ${Math.abs(savings).toFixed(2)}
                  </div>
                </div>
                <div
                  style={{
                    display: "flex",
                    height: 22,
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
                      width: `${Math.min(100, (subFee / Math.max(apiValue, subFee)) * 100)}%`,
                      background: "linear-gradient(90deg, #7B6FFF 0%, #9D8DFF 100%)",
                    }}
                  />
                  <div
                    style={{
                      display: "flex",
                      height: "100%",
                      flex: 1,
                      background: inProfit
                        ? "linear-gradient(90deg, #4dd47a 0%, #88FFAB 100%)"
                        : "linear-gradient(90deg, #d47a5a 0%, #FFA88A 100%)",
                    }}
                  />
                </div>
              </div>
            </div>
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

        {/* Token panel */}
        <DataPanel
          label="烧了多少 TOKEN"
          accentColor="#9D8DFF"
          big={formatTokensShort(agg.totals.totalTokens)}
          bigUnit="tokens"
          sub={tokenRef}
          subRight={`${agg.totals.records} 个会话`}
          taunt={tokenTaunt}
          toneBg="rgba(123, 111, 255, 0.10)"
          toneBorder="rgba(123, 111, 255, 0.35)"
        />

        {/* Hours panel */}
        <DataPanel
          label="编程时长"
          accentColor="#FFC589"
          big={`${codingHours.toFixed(0)}`}
          bigUnit="h"
          sub={
            days > 1
              ? `${hoursPerDay >= 10 ? hoursPerDay.toFixed(0) : hoursPerDay.toFixed(1)} h / 天`
              : ""
          }
          subRight={hoursOpinion(hoursPerDay, days)}
          taunt={hoursTaunt}
          toneBg="rgba(255, 197, 137, 0.10)"
          toneBorder="rgba(255, 197, 137, 0.4)"
        />

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
    {
      width: 1080,
      height: 1920,
      fonts: [
        {
          name: "Noto Sans SC",
          data: getLatinFont(),
          style: "normal",
          weight: 500,
        },
        {
          name: "Noto Sans SC",
          data: getCjkFont(),
          style: "normal",
          weight: 500,
        },
      ],
    }
  );
}

function formatTokensShort(n: number): string {
  if (n >= 1_000_000_000) return `${(n / 1_000_000_000).toFixed(1)}B`;
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(Math.round(n));
}

// One-word label for the work-intensity tier — used as a chip next to
// the avg/day inside the hours panel.
function hoursOpinion(hpd: number, days: number): string {
  if (days <= 1) return "";
  if (hpd < 1) return "佛系";
  if (hpd < 3) return "摸鱼";
  if (hpd < 5) return "正常";
  if (hpd < 7) return "班味";
  if (hpd < 9) return "班味浓郁";
  if (hpd < 12) return "卷王预备";
  if (hpd < 16) return "真·卷王";
  if (hpd < 20) return "不分日夜";
  return "AGI 化身";
}

// Shared panel — accent-coloured card with a big stat, a sub-line on
// the left + right, and a single taunt line. The two panels (token,
// hours) reuse this so they read as a series.
function DataPanel({
  label,
  accentColor,
  big,
  bigUnit,
  sub,
  subRight,
  taunt,
  toneBg,
  toneBorder,
}: {
  label: string;
  accentColor: string;
  big: string;
  bigUnit: string;
  sub: string;
  subRight: string;
  taunt: string | null;
  toneBg: string;
  toneBorder: string;
}) {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        marginTop: 22,
        padding: "26px 34px 28px",
        borderRadius: 26,
        background: toneBg,
        border: `1px solid ${toneBorder}`,
        zIndex: 1,
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
            fontSize: 22,
            color: accentColor,
            textTransform: "uppercase",
            letterSpacing: 4,
          }}
        >
          {label}
        </div>
        {subRight && (
          <div
            style={{
              display: "flex",
              fontSize: 22,
              color: "#a39dc0",
              letterSpacing: 1,
            }}
          >
            {subRight}
          </div>
        )}
      </div>
      <div
        style={{
          display: "flex",
          alignItems: "baseline",
          gap: 14,
          marginTop: 8,
        }}
      >
        <div
          style={{
            display: "flex",
            fontSize: 92,
            fontWeight: 800,
            lineHeight: 1,
            color: "white",
            letterSpacing: -2,
          }}
        >
          {big}
        </div>
        <div
          style={{
            display: "flex",
            fontSize: 30,
            color: "#a39dc0",
            fontWeight: 600,
          }}
        >
          {bigUnit}
        </div>
        {sub && (
          <div
            style={{
              display: "flex",
              fontSize: 26,
              color: "#c4bce0",
              marginLeft: "auto",
            }}
          >
            {sub}
          </div>
        )}
      </div>
      {taunt && (
        <div
          style={{
            display: "flex",
            marginTop: 18,
            fontSize: 30,
            lineHeight: 1.4,
            color: "white",
            fontWeight: 500,
          }}
        >
          「{taunt}」
        </div>
      )}
    </div>
  );
}
