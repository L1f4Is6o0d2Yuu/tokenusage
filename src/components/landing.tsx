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
  username: "你",
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
};

export function Landing({
  inviteRequired,
}: {
  inviteRequired: boolean;
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
        @keyframes tu-tilt {
          0%, 100% { transform: rotate(2deg); }
          50% { transform: rotate(-1deg); }
        }
        .tu-poster-frame {
          transition: transform .4s cubic-bezier(.2,.8,.2,1);
          transform: rotate(2deg);
        }
        .tu-poster-frame:hover { transform: rotate(0deg) scale(1.02); }
      `}</style>
      <NavBar />
      <Hero inviteRequired={inviteRequired} />
      <Steps />
      <CTABand inviteRequired={inviteRequired} />
      <Footer />
    </div>
  );
}

function NavBar() {
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
      </nav>
    </header>
  );
}

function Hero({ inviteRequired }: { inviteRequired: boolean }) {
  return (
    <section
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
          style={{
            fontSize: 88,
            lineHeight: 0.95,
            fontWeight: 900,
            letterSpacing: -3,
            margin: 0,
          }}
        >
          你这周烧了<br />
          <span style={{ color: W.positive }}>多少钱</span>，知道吗？
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
          Claude Code、Codex、Cursor、Hermes、Windsurf
          的 token 用量一锅端。告诉你套餐回本几倍，
          顺手把你骂一遍。
        </p>

        <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
          <Link
            href="/signup"
            className="tu-btn tu-btn-primary tu-cta"
            style={{
              ...buttonBase,
              background: W.primary,
              color: W.ink,
              fontSize: 17,
              padding: "16px 26px",
            }}
          >
            {inviteRequired ? "用邀请码进来" : "开撸"}
            <span className="tu-link-arrow" aria-hidden>→</span>
          </Link>
          <a
            href="#how"
            className="tu-btn"
            style={{
              ...buttonBase,
              background: "transparent",
              color: W.ink,
              fontSize: 17,
              padding: "16px 12px",
              textDecoration: "underline",
              textDecorationThickness: 1,
              textUnderlineOffset: 6,
            }}
          >
            先看长啥样
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
            没有 onboarding 引导，没有 30 天免费试用倒计时。注册、装、看。
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
            agent 每 5 分钟扫一次本地记录上报。打开面板，按时段切。看够了点「分享」把战绩甩出去。
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

function CTABand({ inviteRequired }: { inviteRequired: boolean }) {
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
          style={{
            fontSize: 64,
            fontWeight: 900,
            letterSpacing: -2,
            margin: 0,
            lineHeight: 1,
          }}
        >
          来玩一把？
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
          {inviteRequired
            ? "邀请制 — 朋友圈截图就能找到码。也可以去 GitHub 提个 issue。"
            : "免费，不收 token，不要邮箱白嫖。"}
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
            href="/signup"
            className="tu-btn tu-btn-dark tu-cta"
            style={{
              ...buttonBase,
              background: W.ink,
              color: W.primary,
              fontSize: 17,
              padding: "16px 28px",
            }}
          >
            开撸<span className="tu-link-arrow" aria-hidden>→</span>
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
