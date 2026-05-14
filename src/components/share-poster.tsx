// Shareable poster JSX, used by both server-side rendering (Satori,
// via /api/share/[period]) and client-side rendering (html-to-image,
// via ShareButton). Keep CSS within the Satori subset:
//   * display: flex only (no grid, no block)
//   * no transforms / filters that browsers tolerate but Satori drops
//   * inline styles only (no className → Tailwind doesn't run here)
//
// Both render paths feed the same `SharePosterData` so the visual is
// guaranteed to match.

import type { Aggregation, Period } from "@/lib/types";
import type { PlanLite, RoiResult } from "@/lib/roi-client";
import {
  pickHoursTaunt,
  pickTokenTaunt,
  tokenComparison,
} from "@/lib/encouragement";
import { spendPercentile, tierLabel, TIER_LABEL_ZH } from "@/lib/percentile";

export type SharePosterData = {
  username: string;
  period: Period;
  periodLabel: string;
  verb: string;
  apiValue: number;
  subFee: number;
  savings: number;
  ratioPct: number;
  hasSubs: boolean;
  inProfit: boolean;
  totalTokens: number;
  totalSessions: number;
  codingHours: number;
  hoursPerDay: number;
  days: number;
  topModels: { name: string; pct: number }[];
  tokenRef: string;
  tokenTaunt: string | null;
  hoursTaunt: string | null;
  multiplier: string;
  compare: string;
  hoursOpinionLabel: string;
  hoursOpinionAccent: { fg: string; bg: string; border: string };
  heroColor: string;
  // Meta chips next to @username — optional, won't render if empty.
  deviceLabel?: string; // "macOS · Apple Silicon"
  geoLabel?: string; // "上海" / "Shanghai" / "China"
  savedAt?: string; // "2026-05-13"
  // Industry percentile chip (e.g., "已超 95% 开发者 · 卷王") — derived
  // from spendUsdPerDay against the vibes-based reference distribution
  // in lib/percentile.ts.
  percentileLabel?: string;
  percentileTier?: "mute" | "ok" | "warn" | "danger";
};

const PERIOD_LABEL: Record<Period, string> = {
  "1h": "近 1 小时",
  today: "今天",
  "24h": "近 24 小时",
  "7d": "近 7 天",
  "30d": "近 30 天",
  month: "本月",
  year: "今年",
  all: "全部",
  custom: "区间",
};

const VERB: Record<Period, string> = {
  "1h": "近 1 小时 AI 替我打了",
  today: "今天 AI 替我打了",
  "24h": "近 24 小时 AI 替我打了",
  "7d": "本周 AI 替我打了",
  "30d": "近 30 天 AI 替我打了",
  month: "本月 AI 替我打了",
  year: "今年 AI 替我打了",
  all: "至今 AI 替我打了",
  custom: "这段 AI 替我打了",
};

// Real-world reference: cheeky stuff people in CN actually buy.
// Tiers re-priced 2026 — MacBook Air starts at $999, iPad Pro $799,
// PS5 $499, iPhone 17 Pro $1199, Tesla Model 3 ~$36k.
function spendCompare(usd: number): string {
  const u = Math.abs(usd);
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
}

function hoursOpinion(hpd: number): string {
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

function hoursOpinionAccent(hpd: number): { fg: string; bg: string; border: string } {
  if (hpd < 5)
    return {
      fg: "#a39dc0",
      bg: "rgba(157, 141, 255, 0.10)",
      border: "rgba(157, 141, 255, 0.35)",
    };
  if (hpd < 9)
    return {
      fg: "#FFC589",
      bg: "rgba(255, 197, 137, 0.15)",
      border: "rgba(255, 197, 137, 0.5)",
    };
  return {
    fg: "#FF8A8A",
    bg: "rgba(255, 95, 95, 0.18)",
    border: "rgba(255, 95, 95, 0.6)",
  };
}

function percentileChipStyle(
  tier: SharePosterData["percentileTier"]
): { background: string; color: string; border: string } {
  switch (tier) {
    case "ok":
      return {
        background: "rgba(159, 232, 112, 0.18)",
        color: "#9fe870",
        border: "1px solid rgba(159, 232, 112, 0.5)",
      };
    case "warn":
      return {
        background: "rgba(255, 197, 137, 0.18)",
        color: "#FFC589",
        border: "1px solid rgba(255, 197, 137, 0.55)",
      };
    case "danger":
      return {
        background: "rgba(255, 95, 95, 0.18)",
        color: "#FF8A8A",
        border: "1px solid rgba(255, 95, 95, 0.6)",
      };
    default:
      return {
        background: "rgba(201, 190, 255, 0.14)",
        color: "#cdffad",
        border: "1px solid rgba(201, 190, 255, 0.4)",
      };
  }
}

// Inline USD formatter (mirrors lib/format.ts but pinned to the
// poster's audience — always shows the cent). Returns "$1,247.36".
function fmtUsd(n: number): string {
  const abs = Math.abs(n);
  if (abs < 1) return `$${n.toFixed(4)}`;
  const [whole, frac] = n.toFixed(2).split(".");
  return `$${Number(whole).toLocaleString("en-US")}.${frac}`;
}

export function formatTokensShort(n: number): string {
  if (n >= 1_000_000_000) return `${(n / 1_000_000_000).toFixed(1)}B`;
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(Math.round(n));
}

// Pure builder — both server and client call this with the same inputs
// so the visual is deterministic across both render paths.
export function computeSharePosterData(args: {
  username: string;
  period: Period;
  agg: Aggregation;
  roi: RoiResult;
  activePlans: PlanLite[];
  days: number;
  codingHours: number;
  userKey: string;
  deviceLabel?: string;
  geoLabel?: string;
  savedAt?: string;
}): SharePosterData {
  const {
    username,
    period,
    agg,
    roi,
    activePlans,
    days,
    codingHours,
    userKey,
    deviceLabel,
    geoLabel,
    savedAt,
  } = args;

  const hasSubs = activePlans.length > 0;
  const inProfit = roi.netUsd > 0;
  const ratioX = roi.ratioPct / 100;

  const modelMerged = new Map<string, number>();
  for (const m of agg.byModel) {
    const key = m.model || "unknown";
    modelMerged.set(key, (modelMerged.get(key) ?? 0) + m.totalTokens);
  }
  const topModels = [...modelMerged.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([name, tokens]) => ({
      name,
      pct:
        agg.totals.totalTokens > 0
          ? (tokens / agg.totals.totalTokens) * 100
          : 0,
    }));

  const hoursPerDay = codingHours / Math.max(1, days);

  const compare = spendCompare(roi.netUsd);
  const multiplier = (() => {
    if (!hasSubs) return "";
    if (ratioX < 1) return `差 ${(100 - roi.ratioPct).toFixed(0)}% 才回本`;
    if (ratioX < 1.5) return `${Math.round((ratioX - 1) * 100)}% 净赚`;
    if (ratioX < 10) return `${ratioX.toFixed(1)}× 套餐价`;
    return `${Math.round(ratioX)}× 套餐价`;
  })();

  return {
    username,
    period,
    periodLabel: PERIOD_LABEL[period],
    verb: VERB[period],
    apiValue: agg.totals.costUsd,
    subFee: roi.proratedUsd,
    savings: roi.netUsd,
    ratioPct: roi.ratioPct,
    hasSubs,
    inProfit,
    totalTokens: agg.totals.totalTokens,
    totalSessions: agg.totals.records,
    codingHours,
    hoursPerDay,
    days,
    topModels,
    tokenRef: tokenComparison(agg.totals.totalTokens, userKey, period),
    tokenTaunt: pickTokenTaunt(
      agg.totals.totalTokens,
      "zh-CN",
      userKey,
      period
    ),
    hoursTaunt: pickHoursTaunt(codingHours, days, "zh-CN", userKey, period),
    multiplier,
    compare,
    hoursOpinionLabel: hoursOpinion(hoursPerDay),
    hoursOpinionAccent: hoursOpinionAccent(hoursPerDay),
    heroColor: inProfit ? "#9fe870" : "#FFA88A",
    deviceLabel,
    geoLabel,
    savedAt,
    percentileLabel: (() => {
      const spendPerDay = agg.totals.costUsd / Math.max(1, days);
      const pct = spendPercentile(spendPerDay);
      const tier = tierLabel(pct);
      // Below p25 the chip is more shame than flex — skip it so the
      // poster doesn't sell light users short.
      if (pct < 25) return undefined;
      return `已超 ${pct.toFixed(0)}% 开发者 · ${TIER_LABEL_ZH[tier.key]}`;
    })(),
    percentileTier: (() => {
      const spendPerDay = agg.totals.costUsd / Math.max(1, days);
      const pct = spendPercentile(spendPerDay);
      if (pct < 25) return undefined;
      return tierLabel(pct).color;
    })(),
  };
}

// ─────────────────────────────────────────────────────────────────────
// The poster JSX. Inline styles only, flex-only layout — same tree
// works in Satori (server) and in a hidden DOM node (client).
// ─────────────────────────────────────────────────────────────────────

export function SharePoster({ data }: { data: SharePosterData }) {
  const {
    periodLabel,
    verb,
    username,
    apiValue,
    subFee,
    savings,
    hasSubs,
    inProfit,
    totalSessions,
    codingHours,
    hoursPerDay,
    days,
    topModels,
    tokenRef,
    tokenTaunt,
    hoursTaunt,
    multiplier,
    compare,
    hoursOpinionLabel,
    hoursOpinionAccent,
    heroColor,
  } = data;

  return (
    <div
      style={{
        width: "1080px",
        height: "1920px",
        display: "flex",
        flexDirection: "column",
        // Wise dark variant — ink base with a subtle lime-tinted halo
        // top-left. Reads as "Wise's brand color over Wise's ink"
        // rather than the previous Anthropic-leaning indigo gradient.
        background:
          "radial-gradient(circle at 25% -5%, #1a2515 0%, #0e0f0c 55%, #060604 100%)",
        color: "white",
        padding: "70px 60px 50px",
        fontFamily: "'Noto Sans SC', ui-monospace, monospace",
        position: "relative",
        whiteSpace: "nowrap",
      }}
    >
      {/* Background grid — sage-tinted hairlines so the Wise brand color
          peeks through subtly under the ink. */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          backgroundImage:
            "linear-gradient(rgba(159, 232, 112, 0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(159, 232, 112, 0.05) 1px, transparent 1px)",
          backgroundSize: "90px 90px",
          display: "flex",
        }}
      />
      {/* Brand + period chip */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          zIndex: 1,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
          <svg width="56" height="42" viewBox="0 0 64 48" fill="none" stroke="#9fe870">
            <path
              d="M4 38 L 13 22 L 22 31 L 32 13 L 42 24 L 52 8 L 60 16"
              strokeWidth="5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <circle cx="60" cy="16" r="6" fill="#9fe870" />
          </svg>
          <div style={{ display: "flex", fontSize: 40, fontWeight: 600 }}>
            <span>token</span>
            <span style={{ color: "#9fe870" }}>u</span>
            <span>sage</span>
          </div>
        </div>
        <div
          style={{
            display: "flex",
            padding: "10px 22px",
            borderRadius: 999,
            background: "rgba(159, 232, 112, 0.15)",
            border: "1px solid rgba(159, 232, 112, 0.5)",
            fontSize: 26,
            color: "#cdffad",
          }}
        >
          {periodLabel}
        </div>
      </div>

      {/* User chip + meta (device · geo · timestamp) */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          marginTop: 28,
          gap: 14,
          flexWrap: "wrap",
          zIndex: 1,
        }}
      >
        <div style={{ display: "flex", fontSize: 30, color: "#9fe870" }}>
          @{username}
        </div>
        {[data.deviceLabel, data.geoLabel, data.savedAt]
          .filter((x): x is string => Boolean(x))
          .map((text, i) => (
            <div
              key={i}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                fontSize: 20,
                color: "#8a8585",
              }}
            >
              <div style={{ display: "flex", color: "#5a5a55" }}>·</div>
              <div style={{ display: "flex" }}>{text}</div>
            </div>
          ))}
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
            "linear-gradient(165deg, rgba(159, 232, 112, 0.14) 0%, rgba(159, 232, 112, 0.03) 100%)",
          border: "1px solid rgba(159, 232, 112, 0.28)",
          boxShadow: "0 30px 80px -40px rgba(159, 232, 112, 0.4)",
          zIndex: 1,
        }}
      >
        <div
          style={{
            display: "flex",
            fontSize: 28,
            color: "#a8ada3",
            letterSpacing: 1,
          }}
        >
          {verb}
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
          {fmtUsd(apiValue)}
        </div>

        {data.percentileLabel && (
          <div
            style={{
              display: "flex",
              alignSelf: "flex-start",
              marginTop: 24,
              padding: "8px 18px",
              borderRadius: 999,
              fontSize: 24,
              fontWeight: 600,
              letterSpacing: 0.5,
              ...percentileChipStyle(data.percentileTier),
            }}
          >
            {data.percentileLabel}
          </div>
        )}

        {hasSubs && (
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              marginTop: 36,
            }}
          >
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
                    color: "#e2f6d5",
                    fontWeight: 500,
                    letterSpacing: 0.5,
                  }}
                >
                  {inProfit ? "白嫖" : "差"} {compare.replace(/^≈\s*/, "")}
                </div>
              )}
            </div>

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
                <div style={{ display: "flex", color: "#9fe870" }}>
                  套餐 {fmtUsd(subFee)}
                </div>
                <div style={{ display: "flex", color: heroColor, fontWeight: 600 }}>
                  {inProfit ? "省下" : "还差"} {fmtUsd(Math.abs(savings))}
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
                    background: "linear-gradient(90deg, #9fe870 0%, #9fe870 100%)",
                  }}
                />
                <div
                  style={{
                    display: "flex",
                    height: "100%",
                    flex: 1,
                    background: inProfit
                      ? "linear-gradient(90deg, #2ead4b 0%, #9fe870 100%)"
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
              color: "#9fe870",
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
                      color: "#9fe870",
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
                          ? "linear-gradient(90deg, #9fe870 0%, #cdffad 100%)"
                          : i === 1
                            ? "linear-gradient(90deg, #2ead4b 0%, #9fe870 100%)"
                            : "linear-gradient(90deg, #163300 0%, #9fe870 100%)",
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
        accentColor="#9fe870"
        big={formatTokensShort(data.totalTokens)}
        bigUnit="tokens"
        sub={tokenRef}
        subRight={`${totalSessions} 个会话`}
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
        subRight={hoursOpinionLabel}
        subRightAccent={hoursOpinionAccent}
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
  );
}

function DataPanel({
  label,
  accentColor,
  big,
  bigUnit,
  sub,
  subRight,
  subRightAccent,
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
  subRightAccent?: { fg: string; bg: string; border: string };
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
        {subRight &&
          (subRightAccent ? (
            <div
              style={{
                display: "flex",
                padding: "6px 16px",
                borderRadius: 999,
                background: subRightAccent.bg,
                border: `1px solid ${subRightAccent.border}`,
                fontSize: 22,
                color: subRightAccent.fg,
                fontWeight: 600,
                letterSpacing: 1,
              }}
            >
              {subRight}
            </div>
          ) : (
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
          ))}
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
              color: "#a8ada3",
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
            // Override the root's nowrap so multi-sentence taunts
            // wrap naturally instead of overflowing the card.
            whiteSpace: "normal",
          }}
        >
          {taunt}
        </div>
      )}
    </div>
  );
}
