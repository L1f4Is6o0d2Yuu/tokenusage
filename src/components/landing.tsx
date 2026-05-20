// Public landing page for tokenusage.online — shown to non-signed-in
// visitors at /. Authed users go straight to the dashboard.
//
// Voice target: match the share-poster corpus (cynical, internet-CN,
// 薅羊毛/卷王/班味-flavored), not generic SaaS feature-grid copy.
// Visual: Wise palette but asymmetric — one real scaled SharePoster
// instead of three abstract preview cards.

import Link from "next/link";
import { SharePoster, type SharePosterData } from "./share-poster";

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
};

const FONT_STACK =
  '-apple-system, BlinkMacSystemFont, "Segoe UI", Inter, system-ui, "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", sans-serif';

// One canned poster used as the centerpiece of the landing. Numbers
// are believable (a real heavy week) and the taunt picks an actual
// line from the live corpus so anyone scrolling in 3 seconds sees
// exactly what the product output looks like.
const SAMPLE: SharePosterData = {
  username: "yyz73",
  period: "7d",
  periodLabel: "近 7 天",
  verb: "本周 AI 替我打了",
  apiValue: 1247.36,
  subFee: 28,
  savings: 1219.36,
  ratioPct: 4454,
  hasSubs: true,
  inProfit: true,
  totalTokens: 1_843_500_000,
  totalSessions: 187,
  codingHours: 142,
  hoursPerDay: 20.3,
  days: 7,
  topModels: [
    { name: "claude-opus-4-7", pct: 94 },
    { name: "gpt-5.5", pct: 5 },
    { name: "deepseek-v4-pro", pct: 0.3 },
  ],
  tokenRef: "≈ 2,525 本《红楼梦》",
  tokenTaunt: "1B+ — 「这 token 量值得一份 IPO 招股书」",
  hoursTaunt: "20+h/天 — 「你不是程序员，你是 AGI」",
  multiplier: "44× 套餐价",
  compare: "≈ 一台 MacBook Pro M5 满配",
  hoursOpinionLabel: "AGI 化身",
  hoursOpinionAccent: {
    fg: "#FF8A8A",
    bg: "rgba(255, 95, 95, 0.18)",
    border: "rgba(255, 95, 95, 0.6)",
  },
  heroColor: "#88FFAB",
  deviceLabel: "macOS · Apple Silicon",
  geoLabel: "上海",
  savedAt: "2026-05-13",
  percentileLabel: "已超 97% 开发者 · 顶流卷王",
  percentileTier: "danger",
};

export function Landing({
  inviteRequired,
  signedInAs,
}: {
  inviteRequired: boolean;
  // When non-null, the visitor already has a session — the page still
  // renders the marketing pitch, but every CTA points back to
  // /dashboard instead of /signup, and the nav greets them by name.
  signedInAs?: string | null;
}) {
  return (
    <div
      style={{
        minHeight: "100vh",
        background: W.canvasSoft,
        color: W.ink,
        fontFamily: FONT_STACK,
      }}
    >
      <style>{`
        @font-face {
          font-family: 'Noto Sans SC';
          src: url('/fonts/NotoSansSC-500.woff') format('woff');
          font-weight: 500;
          font-style: normal;
          font-display: swap;
        }
        .tu-btn { transition: transform .14s ease, box-shadow .14s ease; }
        .tu-btn:hover { transform: translateY(-1px); }
        .tu-btn-primary:hover { box-shadow: 0 8px 24px -10px rgba(159,232,112,0.7); }
        .tu-btn-dark:hover { box-shadow: 0 8px 24px -10px rgba(14,15,12,0.4); }
        .tu-cta:hover .tu-link-arrow { transform: translateX(4px); }
        .tu-link-arrow { transition: transform .18s ease; display: inline-block; }
        html { scroll-behavior: smooth; }
        @keyframes tu-fade-up {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .tu-fade-up { animation: tu-fade-up .6s cubic-bezier(.2,.8,.2,1) both; }
        .tu-poster-frame {
          transition: transform .4s cubic-bezier(.2,.8,.2,1);
          transform: rotate(2deg);
        }
        .tu-poster-frame:hover { transform: rotate(0deg) scale(1.02); }
        /* Mobile: collapse the asymmetric grids to single column so
           the poster lands under the headline instead of being
           crushed. */
        @media (max-width: 880px) {
          .tu-hero, .tu-steps, .tu-feature { grid-template-columns: 1fr !important; }
          .tu-h1 { font-size: 64px !important; }
          .tu-h2 { font-size: 38px !important; }
          .tu-poster-frame { transform: rotate(0deg) !important; }
        }
      `}</style>
      <NavBar signedInAs={signedInAs} />
      <Hero inviteRequired={inviteRequired} signedInAs={signedInAs} />
      <FeatureSection
        title="打开看板，谁在替你打字"
        tagline="本周烧了多少、模型把哪些活儿替你干了、哪些纯属手抽。每张卡右上角有分享按钮，挑个像样的数甩朋友圈。"
        visual={<KpiPreview />}
      />
      <FeatureSection
        title="钱是怎么烧没的"
        tagline="30 天每日成本拉成曲线。哪天你失控了，曲线上一坨突起；第二天再装没看见也来不及。"
        visual={<TrendPreview />}
        reversed
        background={W.canvasSoft}
      />
      <FeatureSection
        title="月底大约多狠，先有个数"
        tagline="按最近 14 天的烧钱节奏估月底总账，再跟上月同期对一刀。势头不对，提前哭比账单到了再哭强。"
        visual={<ForecastPreview />}
      />
      <FeatureSection
        title="套餐还吃得起，还是该换 PAYG"
        tagline="别再凭感觉续费了，那不叫节俭叫送钱。套餐 vs 按用量，每月给你摆张账单：差几倍、贵多少，自己掂量。"
        visual={<SubPaygPreview />}
        reversed
        background={W.canvasSoft}
      />
      <FeatureSection
        title="卷王 vs 冤大头"
        tagline="谁是套餐之神，谁是 OpenAI 年度 VIP，全员公开处刑。可以匿名上榜，但榜上还得有你。"
        visual={<LeaderboardPreview />}
      />
      <Steps />
      <CTABand inviteRequired={inviteRequired} signedInAs={signedInAs} />
      <Footer />
    </div>
  );
}

function NavBar({ signedInAs }: { signedInAs?: string | null }) {
  return (
    <header
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "20px 32px",
        maxWidth: 1200,
        margin: "0 auto",
        width: "100%",
      }}
    >
      <Link href="/" style={{ textDecoration: "none", color: W.ink }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 12,
            fontSize: 22,
            fontWeight: 700,
          }}
        >
          <svg width="32" height="24" viewBox="0 0 64 48" fill="none" stroke={W.inkDeep}>
            <path
              d="M4 38 L 13 22 L 22 31 L 32 13 L 42 24 L 52 8 L 60 16"
              strokeWidth="5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <circle cx="60" cy="16" r="6" fill={W.primary} stroke="none" />
          </svg>
          <span>
            token<span style={{ color: W.positive }}>u</span>sage
          </span>
        </div>
      </Link>
      <nav style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <a
          href="https://github.com/L1f4Is6o0d2Yuu/tokenusage"
          target="_blank"
          rel="noreferrer"
          className="tu-btn"
          style={{
            ...buttonBase,
            background: "transparent",
            color: W.ink,
          }}
        >
          GitHub
        </a>
        {signedInAs ? (
          <Link
            href="/dashboard"
            className="tu-btn tu-btn-dark tu-cta"
            style={{
              ...buttonBase,
              background: W.ink,
              color: W.primary,
              border: `1px solid ${W.ink}`,
            }}
            title={`@${signedInAs}`}
          >
            回看板
            <span className="tu-link-arrow" aria-hidden>
              →
            </span>
          </Link>
        ) : (
          <Link
            href="/login"
            className="tu-btn tu-btn-dark"
            style={{
              ...buttonBase,
              background: W.canvas,
              color: W.ink,
              border: `1px solid ${W.ink}`,
            }}
          >
            登录
          </Link>
        )}
      </nav>
    </header>
  );
}

function Hero({
  inviteRequired,
  signedInAs,
}: {
  inviteRequired: boolean;
  signedInAs?: string | null;
}) {
  return (
    <section
      className="tu-hero"
      style={{
        maxWidth: 1200,
        margin: "0 auto",
        padding: "40px 32px 80px",
        display: "grid",
        gridTemplateColumns: "minmax(0, 1.2fr) minmax(0, 1fr)",
        gap: 48,
        alignItems: "center",
      }}
    >
      <div
        className="tu-fade-up"
        style={{ display: "flex", flexDirection: "column", gap: 24 }}
      >
        <h1
          className="tu-h1"
          style={{
            fontSize: 96,
            lineHeight: 0.92,
            fontWeight: 900,
            letterSpacing: -4,
            margin: 0,
          }}
        >
          这周烧了<br />
          <span style={{ color: W.positive }}>多少</span>钱？
        </h1>

        <p
          style={{
            fontSize: 20,
            lineHeight: 1.55,
            color: W.body,
            margin: 0,
            maxWidth: 520,
          }}
        >
          Claude Code、Codex、Cursor、Hermes、Windsurf 全凑一处。
          月底算账：你是薅了 AI 公司，还是给人家送了一台 MacBook。
        </p>

        <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
          <Link
            href={signedInAs ? "/dashboard" : "/signup"}
            className="tu-btn tu-btn-primary tu-cta"
            style={{
              ...buttonBase,
              background: W.primary,
              color: W.ink,
              fontSize: 17,
              padding: "16px 26px",
            }}
          >
            {signedInAs
              ? "回我的看板"
              : inviteRequired
                ? "我有邀请码"
                : "开撸"}
            <span className="tu-link-arrow" aria-hidden>→</span>
          </Link>
          <a
            href="#how"
            className="tu-btn tu-cta"
            style={{
              ...buttonBase,
              background: "transparent",
              color: W.ink,
              fontSize: 17,
              padding: "16px 12px",
            }}
          >
            {signedInAs ? "再瞄一眼介绍" : "先看长啥样"}
            <span className="tu-link-arrow" aria-hidden>↓</span>
          </a>
        </div>
      </div>

      {/* Real scaled SharePoster as the centerpiece — what you see is
          literally what gets generated when you click "分享". */}
      <div
        style={{
          display: "flex",
          justifyContent: "center",
          paddingTop: 24,
        }}
      >
        <ScaledPoster />
      </div>
    </section>
  );
}

function ScaledPoster({ size = 340 }: { size?: number }) {
  // 1080×1920 source → scale down. Keep transform-origin top-left so
  // the wrapper's natural box stays at the scaled size.
  const scale = size / 1080;
  const height = size * (1920 / 1080);
  return (
    <div
      className="tu-poster-frame"
      style={{
        width: size,
        height,
        overflow: "hidden",
        borderRadius: 28,
        boxShadow: "0 30px 60px -30px rgba(14,15,12,0.4)",
        background: W.ink,
        position: "relative",
        flexShrink: 0,
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
        <SharePoster data={SAMPLE} />
      </div>
    </div>
  );
}

function Steps() {
  return (
    <section
      id="how"
      style={{
        background: W.canvas,
        padding: "72px 32px",
      }}
    >
      <div
        className="tu-steps"
        style={{
          maxWidth: 1200,
          margin: "0 auto",
          display: "grid",
          gridTemplateColumns: "minmax(0, 1fr) minmax(0, 1.1fr)",
          gap: 56,
          alignItems: "start",
        }}
      >
        <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
          <h2
            className="tu-h2"
            style={{
              fontSize: 56,
              fontWeight: 900,
              letterSpacing: -2,
              margin: 0,
              lineHeight: 1,
            }}
          >
            三件事
            <br />
            就开始。
          </h2>
          <p style={{ fontSize: 17, color: W.body, lineHeight: 1.6, margin: 0 }}>
            没说明书，没倒计时，没销售加你微信。注册、装、看。
          </p>
        </div>

        <ol
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 24,
            margin: 0,
            padding: 0,
            listStyle: "none",
          }}
        >
          <Step n="1" title="注册">
            邀请制，找朋友要个码。
            <Link
              href="/signup"
              className="tu-cta"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                color: W.ink,
                fontWeight: 700,
                textDecoration: "none",
                marginLeft: 8,
              }}
            >
              去注册<span className="tu-link-arrow" aria-hidden>→</span>
            </Link>
          </Step>
          <Step n="2" title="装 agent">
            <code style={codeInline}>
              brew install L1f4Is6o0d2Yuu/tap/tokenusage
            </code>
            <br />
            <span style={{ color: W.mute, fontSize: 14 }}>
              或 <code style={{ ...codeInline, fontSize: 13 }}>
                curl -fsSL https://tokenusage.online/install.sh | sh
              </code>
            </span>
          </Step>
          <Step n="3" title="开 dashboard">
            数据 5 分钟内回来。手痒了点「分享」，把战绩甩朋友圈装个 B。
          </Step>
        </ol>
      </div>
    </section>
  );
}

function Step({
  n,
  title,
  children,
}: {
  n: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <li
      style={{
        display: "grid",
        gridTemplateColumns: "auto 1fr",
        gap: 18,
        alignItems: "start",
      }}
    >
      <div
        style={{
          fontSize: 32,
          fontWeight: 900,
          color: W.primary,
          background: W.ink,
          width: 48,
          height: 48,
          borderRadius: 999,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: 'ui-monospace, "SF Mono", Menlo, monospace',
          marginTop: 4,
        }}
      >
        {n}
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        <h3
          style={{
            fontSize: 24,
            fontWeight: 900,
            margin: 0,
            color: W.ink,
            lineHeight: 1.2,
          }}
        >
          {title}
        </h3>
        <div
          style={{
            fontSize: 16,
            color: W.body,
            lineHeight: 1.6,
          }}
        >
          {children}
        </div>
      </div>
    </li>
  );
}

function CTABand({
  inviteRequired,
  signedInAs,
}: {
  inviteRequired: boolean;
  signedInAs?: string | null;
}) {
  return (
    <section
      style={{
        background: W.primaryPale,
        padding: "72px 32px",
      }}
    >
      <div
        style={{
          maxWidth: 920,
          margin: "0 auto",
          display: "flex",
          flexDirection: "column",
          gap: 18,
          textAlign: "center",
        }}
      >
        <h2
          className="tu-h2"
          style={{
            fontSize: 64,
            fontWeight: 900,
            letterSpacing: -2,
            margin: 0,
            lineHeight: 1,
          }}
        >
          {signedInAs ? "卷回去？" : "算一算自己什么段位？"}
        </h2>
        <p
          style={{
            fontSize: 17,
            color: W.body,
            margin: 0,
            maxWidth: 520,
            marginLeft: "auto",
            marginRight: "auto",
            lineHeight: 1.55,
          }}
        >
          {signedInAs
            ? `@${signedInAs}，今天又烧了多少？回看板算账去。`
            : inviteRequired
              ? "邀请制。找熟人要个码，没熟人去 GitHub 蹭一个。"
              : "免费。不要钱，不要信用卡，不要 token 钥匙。"}
        </p>
        <div
          style={{
            display: "flex",
            gap: 12,
            justifyContent: "center",
            flexWrap: "wrap",
            marginTop: 8,
          }}
        >
          <Link
            href={signedInAs ? "/dashboard" : "/signup"}
            className="tu-btn tu-btn-dark tu-cta"
            style={{
              ...buttonBase,
              background: W.ink,
              color: W.primary,
              fontSize: 17,
              padding: "16px 28px",
            }}
          >
            {signedInAs ? "回看板" : "开撸"}
            <span className="tu-link-arrow" aria-hidden>→</span>
          </Link>
          <a
            href="https://github.com/L1f4Is6o0d2Yuu/tokenusage"
            target="_blank"
            rel="noreferrer"
            className="tu-btn tu-btn-dark"
            style={{
              ...buttonBase,
              background: W.canvas,
              color: W.ink,
              border: `1px solid ${W.ink}`,
              fontSize: 17,
              padding: "16px 28px",
            }}
          >
            GitHub
          </a>
        </div>
      </div>
    </section>
  );
}

function Footer() {
  return (
    <footer
      style={{
        background: W.ink,
        color: W.canvasSoft,
        padding: "32px",
      }}
    >
      <div
        style={{
          maxWidth: 1200,
          margin: "0 auto",
          display: "flex",
          flexWrap: "wrap",
          gap: 16,
          justifyContent: "space-between",
          alignItems: "center",
          fontSize: 13,
        }}
      >
        <span>tokenusage · 数据躺你电脑里 · 2026</span>
        <div style={{ display: "flex", gap: 18 }}>
          <a
            href="https://github.com/L1f4Is6o0d2Yuu/tokenusage"
            target="_blank"
            rel="noreferrer"
            style={{ color: W.canvasSoft, textDecoration: "none" }}
          >
            GitHub
          </a>
          <Link href="/about" style={{ color: W.canvasSoft, textDecoration: "none" }}>
            About
          </Link>
          <Link href="/login" style={{ color: W.canvasSoft, textDecoration: "none" }}>
            登录
          </Link>
        </div>
      </div>
    </footer>
  );
}

const buttonBase = {
  display: "inline-flex",
  alignItems: "center",
  gap: 8,
  padding: "10px 20px",
  borderRadius: 24,
  fontSize: 14,
  fontWeight: 700,
  textDecoration: "none",
  border: "none",
  cursor: "pointer",
};

const codeInline = {
  fontFamily: 'ui-monospace, "SF Mono", Menlo, monospace',
  fontSize: 14,
  background: W.canvasSoft,
  color: W.ink,
  padding: "3px 8px",
  borderRadius: 6,
  wordBreak: "break-all" as const,
};

// Extra accent colors used across the dashboard previews below. Kept
// here rather than in `W` so they're only loaded by the section the
// poster doesn't touch.
const W2 = {
  danger: "#c5453d",
  panelBorder: "#dde0d8",
  highlightBg: "#f0fae6",
};

// Section wrapper: title + tagline on one side, scaled preview on the
// other. `reversed` swaps the order; alternating sections + alternating
// background tones (canvas / canvasSoft) give the page rhythm without
// any extra art direction.
function FeatureSection({
  title,
  tagline,
  visual,
  reversed,
  background,
}: {
  title: string;
  tagline: string;
  visual: React.ReactNode;
  reversed?: boolean;
  background?: string;
}) {
  const text = (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <h2
        className="tu-h2"
        style={{
          fontSize: 48,
          fontWeight: 900,
          letterSpacing: -2,
          lineHeight: 1.05,
          margin: 0,
          color: W.ink,
        }}
      >
        {title}
      </h2>
      <p
        style={{
          fontSize: 17,
          color: W.body,
          lineHeight: 1.6,
          margin: 0,
          maxWidth: 460,
        }}
      >
        {tagline}
      </p>
    </div>
  );
  const vis = (
    <div style={{ display: "flex", justifyContent: "center", minWidth: 0 }}>
      <div style={{ width: "100%", maxWidth: 460 }}>{visual}</div>
    </div>
  );
  return (
    <section
      style={{
        background: background ?? W.canvas,
        padding: "72px 32px",
      }}
    >
      <div
        className="tu-feature"
        style={{
          maxWidth: 1200,
          margin: "0 auto",
          display: "grid",
          gridTemplateColumns: "minmax(0, 1fr) minmax(0, 1.1fr)",
          gap: 56,
          alignItems: "center",
        }}
      >
        {reversed ? (
          <>
            {vis}
            {text}
          </>
        ) : (
          <>
            {text}
            {vis}
          </>
        )}
      </div>
    </section>
  );
}

// Mock dashboard KPI cards — same three the live dashboard surfaces,
// with believable numbers from the hero poster sample so the page
// stays internally consistent.
function KpiPreview() {
  const cards = [
    {
      label: "ESTIMATED COST",
      value: "$1,247.36",
      hint: "扣完套餐 $220，还赚 $1,027",
      accent: true,
    },
    {
      label: "TOTAL TOKENS",
      value: "1.84B",
      hint: "187 sessions",
      accent: false,
    },
    {
      label: "INPUT / OUTPUT",
      value: "420M / 51M",
      hint: "不含缓存",
      accent: false,
    },
  ];
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 12,
        width: "100%",
      }}
    >
      {cards.map((card) => (
        <div
          key={card.label}
          style={{
            position: "relative",
            background: W.canvas,
            border: `1px solid ${W2.panelBorder}`,
            borderRadius: 12,
            padding: "16px 20px",
            ...(card.accent
              ? { boxShadow: `inset 4px 0 0 ${W.ink}` }
              : {}),
          }}
        >
          {/* Share icon mimic */}
          <div
            style={{
              position: "absolute",
              top: 10,
              right: 12,
              color: W.mute,
              fontSize: 14,
              opacity: 0.6,
            }}
            aria-hidden
          >
            ↗
          </div>
          <div
            style={{
              fontSize: 10,
              letterSpacing: 1.3,
              color: W.mute,
              fontWeight: 700,
            }}
          >
            {card.label}
          </div>
          <div
            style={{
              fontSize: 32,
              fontWeight: 700,
              color: W.ink,
              marginTop: 4,
              letterSpacing: -1.2,
              fontVariantNumeric: "tabular-nums",
            }}
          >
            {card.value}
          </div>
          <div style={{ fontSize: 12, color: W.body, marginTop: 4 }}>
            {card.hint}
          </div>
        </div>
      ))}
    </div>
  );
}

// 30-day cost trend, mocked with a believable shape (gentle ramp + one
// outlier spike on day 17 — the kind of "I forgot a model running
// overnight" moment the product is designed to catch). Pure SVG so we
// don't pull recharts into the public-facing bundle.
function TrendPreview() {
  const data = [
    8, 12, 6, 18, 22, 14, 10, 28, 35, 24, 19, 32, 41, 38, 29, 45, 89, 52,
    41, 38, 44, 51, 47, 39, 58, 62, 71, 65, 78, 92,
  ];
  const VBW = 720;
  const VBH = 240;
  const PAD = 28;
  const max = Math.max(...data);
  const xAt = (i: number) => PAD + (i / (data.length - 1)) * (VBW - 2 * PAD);
  const yAt = (v: number) => VBH - PAD - (v / max) * (VBH - 2 * PAD);
  const linePoints = data.map((v, i) => `${xAt(i)},${yAt(v)}`).join(" ");
  // Closed area path under the curve for the soft fill.
  const areaPath = `M ${xAt(0)},${VBH - PAD} L ${linePoints
    .split(" ")
    .join(" L ")} L ${xAt(data.length - 1)},${VBH - PAD} Z`;
  const spikeIdx = data.indexOf(Math.max(...data.slice(15, 20)));
  return (
    <div
      style={{
        background: W.canvas,
        border: `1px solid ${W2.panelBorder}`,
        borderRadius: 12,
        padding: 20,
        width: "100%",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "baseline",
          marginBottom: 12,
        }}
      >
        <span
          style={{
            fontSize: 10,
            letterSpacing: 1.3,
            color: W.mute,
            fontWeight: 700,
          }}
        >
          近 30 天 · 每日成本
        </span>
        <span style={{ fontSize: 12, color: W.body, fontWeight: 600 }}>
          ${data.reduce((a, b) => a + b, 0).toLocaleString()} 累计
        </span>
      </div>
      <svg
        viewBox={`0 0 ${VBW} ${VBH}`}
        width="100%"
        height="auto"
        preserveAspectRatio="none"
        style={{ display: "block" }}
      >
        {[0.25, 0.5, 0.75].map((f) => (
          <line
            key={f}
            x1={PAD}
            x2={VBW - PAD}
            y1={PAD + f * (VBH - 2 * PAD)}
            y2={PAD + f * (VBH - 2 * PAD)}
            stroke={W.canvasSoft}
            strokeDasharray="3 4"
          />
        ))}
        <path d={areaPath} fill={W.primaryPale} opacity={0.7} />
        <polyline
          points={linePoints}
          fill="none"
          stroke={W.positive}
          strokeWidth="3"
          strokeLinejoin="round"
          strokeLinecap="round"
        />
        <circle
          cx={xAt(spikeIdx)}
          cy={yAt(data[spikeIdx])}
          r="6"
          fill={W.primary}
          stroke={W.ink}
          strokeWidth="2.5"
        />
        <text
          x={xAt(spikeIdx) + 12}
          y={yAt(data[spikeIdx]) - 8}
          fontSize="14"
          fontWeight="700"
          fill={W.ink}
        >
          ${data[spikeIdx]}
        </text>
      </svg>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          fontSize: 11,
          color: W.mute,
          marginTop: 6,
        }}
      >
        <span>30 天前</span>
        <span style={{ color: W.body, fontWeight: 600 }}>
          ← 那天你忘了关 Opus
        </span>
        <span>今天</span>
      </div>
    </div>
  );
}

// Month-end projection card mimic. Same three pieces as the live
// ForecastCard: big projected number, daily pace line, vs-last-month
// delta, and the "stick with sub vs switch to PAYG" verdict.
function ForecastPreview() {
  return (
    <div
      style={{
        background: W.canvas,
        border: `1px solid ${W2.panelBorder}`,
        borderRadius: 12,
        padding: "20px 22px",
        width: "100%",
      }}
    >
      <div
        style={{
          fontSize: 10,
          letterSpacing: 1.3,
          color: W.mute,
          fontWeight: 700,
          marginBottom: 14,
        }}
      >
        月底预测
      </div>
      <div
        style={{
          display: "flex",
          alignItems: "flex-end",
          justifyContent: "space-between",
          gap: 16,
        }}
      >
        <div>
          <div
            style={{
              fontSize: 44,
              fontWeight: 800,
              color: W.ink,
              letterSpacing: -1.8,
              lineHeight: 1,
              fontVariantNumeric: "tabular-nums",
            }}
          >
            $5,316.42
          </div>
          <div style={{ fontSize: 12, color: W.body, marginTop: 8 }}>
            按日均 $172.13 推算 · 近 14 天
          </div>
        </div>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 4,
            fontSize: 13,
            fontWeight: 700,
            color: W2.danger,
            whiteSpace: "nowrap",
          }}
        >
          ↗ 上月同期高 38%
        </div>
      </div>
      <div
        style={{
          marginTop: 16,
          padding: "10px 14px",
          background: W2.highlightBg,
          borderRadius: 8,
          fontSize: 13,
          color: W.ink,
        }}
      >
        <span style={{ color: W.positive, fontWeight: 700 }}>
          ✓ 继续吃套餐
        </span>
        <span style={{ marginLeft: 8, color: W.body }}>
          ($220 /mo &nbsp;vs&nbsp; ~$5,316)
        </span>
      </div>
    </div>
  );
}

// Sub vs PAYG side-by-side. Drives home the "套餐之神" moment with a
// 24× multiplier so the comparison can't be missed at a glance.
function SubPaygPreview() {
  return (
    <div
      style={{
        width: "100%",
        display: "flex",
        flexDirection: "column",
        gap: 12,
      }}
    >
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: 12,
        }}
      >
        <div
          style={{
            position: "relative",
            background: W.canvas,
            border: `2px solid ${W.positive}`,
            borderRadius: 12,
            padding: 18,
          }}
        >
          <span
            style={{
              position: "absolute",
              top: -10,
              left: 14,
              background: W.positive,
              color: W.canvas,
              fontSize: 10,
              fontWeight: 700,
              padding: "3px 8px",
              borderRadius: 4,
              letterSpacing: 0.5,
            }}
          >
            当前
          </span>
          <div
            style={{
              fontSize: 10,
              letterSpacing: 1.3,
              color: W.mute,
              fontWeight: 700,
            }}
          >
            套餐月费
          </div>
          <div
            style={{
              fontSize: 32,
              fontWeight: 800,
              color: W.ink,
              marginTop: 8,
              letterSpacing: -1.2,
              fontVariantNumeric: "tabular-nums",
            }}
          >
            $220
          </div>
          <div
            style={{
              fontSize: 12,
              color: W.body,
              marginTop: 6,
              lineHeight: 1.5,
            }}
          >
            Claude Pro $200
            <br />+ Codex Plus $20
          </div>
        </div>
        <div
          style={{
            background: W.canvas,
            border: `1px solid ${W2.panelBorder}`,
            borderRadius: 12,
            padding: 18,
          }}
        >
          <div
            style={{
              fontSize: 10,
              letterSpacing: 1.3,
              color: W.mute,
              fontWeight: 700,
            }}
          >
            按 API 计费
          </div>
          <div
            style={{
              fontSize: 32,
              fontWeight: 800,
              color: W2.danger,
              marginTop: 8,
              letterSpacing: -1.2,
              fontVariantNumeric: "tabular-nums",
            }}
          >
            ~$5,316
          </div>
          <div style={{ fontSize: 12, color: W.body, marginTop: 6 }}>
            按近 14 天日均推算
          </div>
        </div>
      </div>
      <div
        style={{
          background: W2.highlightBg,
          border: `1px solid ${W.primary}`,
          borderRadius: 12,
          padding: "12px 16px",
          fontSize: 14,
          color: W.ink,
          lineHeight: 1.5,
        }}
      >
        <span style={{ fontWeight: 800, color: W.positive }}>
          ✓ 继续吃套餐
        </span>
        <span style={{ marginLeft: 8 }}>
          每月省下 <strong>$5,096</strong>，相当于
          <strong> 24× </strong>套餐价 — 你就是套餐之神
        </span>
      </div>
    </div>
  );
}

// Mini top-5 leaderboard slice. Highlight row reads "你" so visitors
// immediately picture themselves in it. Cost / tier copy comes from
// the live LEADERBOARD_TIERS taxonomy.
function LeaderboardPreview() {
  const rows = [
    {
      rank: "🥇",
      name: "user-2",
      cost: "$4,892.13",
      tier: "🐉 神之化身",
      me: false,
    },
    {
      rank: "🥈",
      name: "yyz73",
      cost: "$1,247.36",
      tier: "👑 卷王",
      me: true,
    },
    {
      rank: "🥉",
      name: "user-9",
      cost: "$890.42",
      tier: "👑 卷王",
      me: false,
    },
    {
      rank: "#4",
      name: "user-3",
      cost: "$312.08",
      tier: "🧱 砖头",
      me: false,
    },
    {
      rank: "#5",
      name: "user-11",
      cost: "$87.55",
      tier: "🐟 摸鱼",
      me: false,
    },
  ];
  return (
    <div
      style={{
        background: W.canvas,
        border: `1px solid ${W2.panelBorder}`,
        borderRadius: 12,
        width: "100%",
        overflow: "hidden",
      }}
    >
      <div
        style={{
          padding: "14px 18px",
          borderBottom: `1px solid ${W2.panelBorder}`,
          fontSize: 14,
          fontWeight: 800,
          color: W.ink,
        }}
      >
        完整排名 · 近 30 天
      </div>
      {rows.map((r, i) => (
        <div
          key={r.name}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 12,
            padding: "13px 18px",
            borderBottom:
              i < rows.length - 1
                ? `1px solid ${W2.panelBorder}`
                : "none",
            background: r.me ? W2.highlightBg : "transparent",
          }}
        >
          <span
            style={{
              width: 32,
              fontSize: 16,
              fontWeight: 700,
              color: W.mute,
              textAlign: "center",
              fontFamily: 'ui-monospace, "SF Mono", Menlo, monospace',
            }}
          >
            {r.rank}
          </span>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div
              style={{
                fontSize: 14,
                fontWeight: 700,
                color: W.ink,
                display: "flex",
                alignItems: "center",
                gap: 8,
                flexWrap: "wrap",
              }}
            >
              <span>{r.name}</span>
              {r.me && (
                <span
                  style={{
                    fontSize: 10,
                    color: W.positive,
                    fontWeight: 800,
                  }}
                >
                  ← 你在这
                </span>
              )}
            </div>
            <div style={{ fontSize: 11, color: W.mute, marginTop: 2 }}>
              {r.tier}
            </div>
          </div>
          <div
            style={{
              fontSize: 15,
              fontWeight: 800,
              color: W.ink,
              fontVariantNumeric: "tabular-nums",
            }}
          >
            {r.cost}
          </div>
        </div>
      ))}
    </div>
  );
}
