"use client";

import { useEffect, useRef, useState } from "react";
import { SharePoster, type SharePosterData } from "./share-poster";

// Apple-style sticky-scroll deep dive. Left column stays pinned while
// the right column's narrative beats scroll past. The pinned visual
// swaps in step with whichever beat is currently in the middle of the
// viewport — IntersectionObserver with a tight rootMargin so the
// transition fires near the visual's vertical center, not when the
// beat first appears at the edge.
//
// Each beat is the founder's story of "why this exists" — that's the
// hook that justifies the extra scroll real estate. The product
// features were already covered by the five alternating sections above.

const W = {
  primary: "#9fe870",
  primaryPale: "#e2f6d5",
  ink: "#0e0f0c",
  inkDeep: "#163300",
  body: "#454745",
  mute: "#868685",
  canvas: "#ffffff",
  canvasSoft: "#e8ebe6",
  positive: "#2ead4b",
  panelBorder: "#dde0d8",
};

const SCENES: {
  key: string;
  number: string;
  title: string;
  body: string;
  posterAccent: string;
  apiValue: number;
  ratioPct: number;
}[] = [
  {
    key: "scene-1",
    number: "01",
    title: "起因：账单到了我傻了",
    body: "去年某天，我同时跑着 Claude Pro、Codex Plus、Cursor。三个 dashboard 三种货币三个周期，月底加起来超 $2K。我那会儿还以为自己每个套餐都赚到了。",
    posterAccent: "#FF8A8A",
    apiValue: 2147.36,
    ratioPct: 977,
  },
  {
    key: "scene-2",
    number: "02",
    title: "卡点：市面上没人统一汇总",
    body: "搜了一圈：要么只看一家、要么收钱要数据。开源世界倾向给老板做的工具，不是给开发者自己用的。我要的就两件事 — 本地跑、把账拍一起。",
    posterAccent: "#FFD66B",
    apiValue: 1247.36,
    ratioPct: 567,
  },
  {
    key: "scene-3",
    number: "03",
    title: "结果：自己用了三个月，再也没续错套餐",
    body: "agent 周末写完，前端两个晚上做完。装在自己机器上每天看一眼，从那以后该退的退、该上的上，再也没多花一笔不该花的订阅。这玩意叫 tokenusage。",
    posterAccent: "#88FFAB",
    apiValue: 487.55,
    ratioPct: 221,
  },
];

const STICKY_POSTER: SharePosterData = {
  username: "yyz73",
  period: "30d",
  periodLabel: "近 30 天",
  verb: "近一月 AI 替我打了",
  apiValue: 1247.36,
  subFee: 220,
  savings: 1027.36,
  ratioPct: 567,
  hasSubs: true,
  inProfit: true,
  totalTokens: 1_843_500_000,
  totalSessions: 187,
  codingHours: 142,
  hoursPerDay: 4.7,
  days: 30,
  topModels: [
    { name: "claude-opus-4-7", pct: 88 },
    { name: "gpt-5.5", pct: 9 },
    { name: "deepseek-v4-pro", pct: 3 },
  ],
  tokenRef: "≈ 2,525 本《红楼梦》",
  tokenTaunt: "1B+ — 「这量值得 IPO 招股书」",
  hoursTaunt: "4.7h/天 — 「稳定输出」",
  multiplier: "5.6× 套餐价",
  compare: "≈ 半台 MacBook Pro M5",
  hoursOpinionLabel: "稳定卷王",
  hoursOpinionAccent: {
    fg: "#88FFAB",
    bg: "rgba(88, 255, 171, 0.18)",
    border: "rgba(88, 255, 171, 0.6)",
  },
  heroColor: "#88FFAB",
  deviceLabel: "macOS · Apple Silicon",
  geoLabel: "上海",
  savedAt: "2026-05-21",
  percentileLabel: "已超 85% 开发者",
  percentileTier: "warn",
};

export function LandingDeepDive() {
  const [activeIdx, setActiveIdx] = useState(0);
  const refs = useRef<Array<HTMLDivElement | null>>([]);

  useEffect(() => {
    const els = refs.current.filter((r): r is HTMLDivElement => r != null);
    if (els.length === 0) return;

    // rootMargin: shift the trigger band toward the middle 30% of the
    // viewport. A beat is "active" while it sits in the middle third.
    // Threshold 0 = fire as soon as the observed area enters that band.
    const io = new IntersectionObserver(
      (entries) => {
        // Pick the entry with the largest intersectionRatio that is
        // currently intersecting. That maps to "this beat is most
        // visible in the middle band right now".
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio);
        if (visible.length === 0) return;
        const idx = Number(
          (visible[0].target as HTMLElement).dataset.beat ?? 0
        );
        setActiveIdx(idx);
      },
      {
        rootMargin: "-35% 0px -35% 0px",
        threshold: [0, 0.25, 0.5, 0.75, 1],
      }
    );

    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, []);

  const scene = SCENES[activeIdx];
  // Variant of the canned poster that picks up the active scene's
  // accent + apiValue. Shallow merge — the rest of the poster doesn't
  // change so identity of the centerpiece stays stable.
  const posterForScene: SharePosterData = {
    ...STICKY_POSTER,
    apiValue: scene.apiValue,
    ratioPct: scene.ratioPct,
    heroColor: scene.posterAccent,
    hoursOpinionAccent: {
      fg: scene.posterAccent,
      bg: `${scene.posterAccent}2e`,
      border: `${scene.posterAccent}99`,
    },
  };

  return (
    <section
      style={{
        background: W.canvas,
        padding: "120px 32px",
        borderTop: `1px solid ${W.panelBorder}`,
      }}
    >
      <div
        className="tu-sticky"
        style={{
          maxWidth: 1200,
          margin: "0 auto",
          display: "grid",
          gridTemplateColumns: "minmax(0, 1fr) minmax(0, 1.05fr)",
          gap: 80,
        }}
      >
        {/* Left: sticky pinned visual */}
        <div
          className="tu-sticky-pin"
          style={{
            position: "sticky",
            top: "18vh",
            alignSelf: "start",
            height: "64vh",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: 16,
          }}
        >
          <ScaledStickyPoster data={posterForScene} />
          <div style={{ display: "flex", gap: 6 }}>
            {SCENES.map((_, i) => (
              <span
                key={i}
                style={{
                  width: i === activeIdx ? 24 : 8,
                  height: 4,
                  borderRadius: 2,
                  background: i === activeIdx ? W.ink : W.panelBorder,
                  transition: "width .3s ease, background .3s ease",
                }}
              />
            ))}
          </div>
        </div>

        {/* Right: scrolling narrative beats */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 0,
            paddingTop: "12vh",
            paddingBottom: "12vh",
          }}
        >
          {SCENES.map((s, i) => (
            <div
              key={s.key}
              ref={(el) => {
                refs.current[i] = el;
              }}
              data-beat={i}
              style={{
                minHeight: "70vh",
                display: "flex",
                flexDirection: "column",
                justifyContent: "center",
                gap: 18,
              }}
            >
              <span
                style={{
                  fontFamily: 'ui-monospace, "SF Mono", Menlo, monospace',
                  fontSize: 13,
                  color: W.primary,
                  fontWeight: 700,
                  letterSpacing: 1.4,
                }}
              >
                {s.number}
              </span>
              <h3
                style={{
                  fontSize: 40,
                  fontWeight: 900,
                  letterSpacing: -1.5,
                  lineHeight: 1.1,
                  margin: 0,
                  color: W.ink,
                }}
              >
                {s.title}
              </h3>
              <p
                style={{
                  fontSize: 18,
                  color: W.body,
                  lineHeight: 1.65,
                  margin: 0,
                  maxWidth: 480,
                }}
              >
                {s.body}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function ScaledStickyPoster({ data }: { data: SharePosterData }) {
  const size = 320;
  const scale = size / 1080;
  const height = size * (1920 / 1080);
  return (
    <div
      style={{
        width: size,
        height,
        overflow: "hidden",
        borderRadius: 24,
        boxShadow: "0 30px 60px -30px rgba(14,15,12,0.5)",
        background: W.ink,
        position: "relative",
        flexShrink: 0,
        // Subtle pulse when the sticky visual swaps. Listen for the
        // outermost wrapper re-render via key — the parent passes a
        // fresh object every scene change so React diffs and applies
        // the animation. CSS keyframe is defined in landing.tsx.
        animation: "tu-fade-up .4s cubic-bezier(.2,.8,.2,1)",
      }}
    >
      <div
        style={{
          transform: `scale(${scale})`,
          transformOrigin: "top left",
          width: 1080,
          height: 1920,
        }}
      >
        <SharePoster data={data} />
      </div>
    </div>
  );
}
