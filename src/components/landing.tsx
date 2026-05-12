// Public landing page for tokenusage.online — shown to non-signed-in
// visitors at /. Authed users go straight to the dashboard.
//
// Design language pulled from Wise (docs/WISE-DESIGN.md):
//   - lime-green primary #9fe870 with near-black #0e0f0c ink
//   - sage canvas #e8ebe6 for hero/CTA bands, white for cards
//   - heavy display sans (Inter weight 900) at 64-96px for hero
//   - 24px rounded everywhere — buttons, cards, pills
//   - 1200px max-width container, generous 48px section padding

import Link from "next/link";

// Wise palette inlined so the landing is fully self-contained — it
// doesn't share the dashboard's theme variables (the dashboard is
// dark, the landing is light/sage by design choice).
const W = {
  primary: "#9fe870",
  primaryPale: "#e2f6d5",
  primaryActive: "#cdffad",
  ink: "#0e0f0c",
  inkDeep: "#163300",
  body: "#454745",
  mute: "#868685",
  canvas: "#ffffff",
  canvasSoft: "#e8ebe6",
  positive: "#2ead4b",
  negative: "#d03238",
  accentOrange: "#ffc091",
  accentCyan: "#38c8ff",
};

const FONT_STACK =
  '-apple-system, BlinkMacSystemFont, "Segoe UI", Inter, system-ui, "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", sans-serif';

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
      <NavBar />
      <Hero inviteRequired={inviteRequired} />
      <Features />
      <Showcase />
      <InstallBand />
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
          style={{
            ...buttonBase,
            background: W.canvas,
            color: W.ink,
            border: `1px solid ${W.ink}`,
          }}
        >
          登录
        </Link>
        <Link
          href="/signup"
          style={{
            ...buttonBase,
            background: W.primary,
            color: W.ink,
          }}
        >
          注册
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
        padding: "48px 32px 64px",
        display: "flex",
        flexDirection: "column",
        gap: 32,
      }}
    >
      <div
        style={{
          display: "flex",
          gap: 14,
          flexWrap: "wrap",
        }}
      >
        <Pill bg={W.canvas} border>
          <span style={{ color: W.positive }}>●</span> 实时聚合
        </Pill>
        <Pill bg={W.canvas} border>
          Claude Code · Codex · Cursor · Hermes · Windsurf
        </Pill>
      </div>

      <h1
        style={{
          fontSize: 88,
          lineHeight: 0.95,
          fontWeight: 900,
          letterSpacing: -3,
          margin: 0,
          maxWidth: 900,
        }}
      >
        你的 AI <span style={{ color: W.positive }}>烧</span>了多少钱？
      </h1>

      <p
        style={{
          fontSize: 22,
          lineHeight: 1.5,
          color: W.body,
          maxWidth: 720,
          margin: 0,
        }}
      >
        把 Claude Code、Codex CLI、Cursor、Hermes Gateway
        所有工具的 token 花费聚到一张图上。 告诉你
        <strong> 套餐回本了没</strong>、还能薅多少、
        以及一句让你想截图发朋友圈的 AI 锐评。
      </p>

      <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
        <Link
          href="/signup"
          style={{
            ...buttonBase,
            background: W.primary,
            color: W.ink,
            fontSize: 18,
            padding: "16px 28px",
          }}
        >
          {inviteRequired ? "用邀请码注册" : "立即注册"}
        </Link>
        <Link
          href="/login"
          style={{
            ...buttonBase,
            background: W.canvas,
            color: W.ink,
            border: `1px solid ${W.ink}`,
            fontSize: 18,
            padding: "16px 28px",
          }}
        >
          已有账号 · 登录
        </Link>
      </div>

      <p style={{ fontSize: 14, color: W.mute, margin: 0 }}>
        数据存本机 sqlite，agent 只上报 token 数。无遥测。
      </p>
    </section>
  );
}

function Features() {
  const items = [
    {
      title: "多工具一张图",
      body: "Claude Code、Codex CLI、Cursor、Windsurf、Hermes Gateway 的 token 用量聚合到同一张面板，按时段切片。",
      tone: W.canvas,
    },
    {
      title: "套餐 ROI 看得见",
      body: "按 OpenRouter 实时价计算 API 等价花费，告诉你 $20 / 月套餐已经回本几倍。",
      tone: W.primaryPale,
    },
    {
      title: "一张图传出去",
      body: "1080×1920 竖版海报，本地浏览器渲染，零服务器开销。带一句 AI 写的锐评，朋友圈刚需。",
      tone: W.canvas,
    },
  ];
  return (
    <section
      style={{
        maxWidth: 1200,
        margin: "0 auto",
        padding: "0 32px 64px",
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
        gap: 24,
      }}
    >
      {items.map((it) => (
        <article
          key={it.title}
          style={{
            background: it.tone,
            borderRadius: 24,
            padding: 32,
            display: "flex",
            flexDirection: "column",
            gap: 12,
          }}
        >
          <h3
            style={{
              fontSize: 28,
              fontWeight: 900,
              margin: 0,
              lineHeight: 1.1,
              color: W.ink,
            }}
          >
            {it.title}
          </h3>
          <p
            style={{
              fontSize: 16,
              lineHeight: 1.55,
              color: W.body,
              margin: 0,
            }}
          >
            {it.body}
          </p>
        </article>
      ))}
    </section>
  );
}

function Showcase() {
  return (
    <section
      style={{
        background: W.canvas,
        padding: "64px 32px",
      }}
    >
      <div
        style={{
          maxWidth: 1200,
          margin: "0 auto",
          display: "flex",
          flexDirection: "column",
          gap: 24,
        }}
      >
        <h2
          style={{
            fontSize: 56,
            fontWeight: 900,
            letterSpacing: -2,
            margin: 0,
            lineHeight: 1,
          }}
        >
          长什么样？
        </h2>
        <p
          style={{
            fontSize: 18,
            color: W.body,
            margin: 0,
            maxWidth: 720,
          }}
        >
          dashboard 给你看数字，share 海报让你能把数字甩朋友脸上。
        </p>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
            gap: 24,
            marginTop: 16,
          }}
        >
          <PreviewCard
            title="Dashboard"
            tag="本地"
            body="KPI 卡片 / 每日走势 / 模型拆分 / 速率窗口 / 订阅 ROI。所有数据存本机 sqlite。"
            color={W.canvasSoft}
          />
          <PreviewCard
            title="Share 海报"
            tag="1080×1920"
            body="一张竖图把本周花费 + 套餐回本 + 编程时长 + AI 锐评打包，浏览器本地渲染。"
            color={W.primaryPale}
          />
          <PreviewCard
            title="Agent CLI"
            tag="brew · curl"
            body="自动扫 Claude Code / Codex / Cursor / Hermes / Windsurf 的本地记录，每 5 分钟心跳上报。"
            color={W.canvasSoft}
          />
        </div>
      </div>
    </section>
  );
}

function PreviewCard({
  title,
  tag,
  body,
  color,
}: {
  title: string;
  tag: string;
  body: string;
  color: string;
}) {
  return (
    <article
      style={{
        background: color,
        borderRadius: 24,
        padding: 28,
        display: "flex",
        flexDirection: "column",
        gap: 14,
        minHeight: 200,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <h3
          style={{
            fontSize: 28,
            fontWeight: 900,
            margin: 0,
            color: W.ink,
          }}
        >
          {title}
        </h3>
        <Pill bg={W.canvas} small>
          {tag}
        </Pill>
      </div>
      <p
        style={{
          fontSize: 15,
          lineHeight: 1.5,
          color: W.body,
          margin: 0,
        }}
      >
        {body}
      </p>
    </article>
  );
}

function InstallBand() {
  return (
    <section
      style={{
        background: W.ink,
        color: W.canvas,
        padding: "64px 32px",
      }}
    >
      <div
        style={{
          maxWidth: 1200,
          margin: "0 auto",
          display: "flex",
          flexDirection: "column",
          gap: 24,
        }}
      >
        <h2
          style={{
            fontSize: 56,
            fontWeight: 900,
            letterSpacing: -2,
            margin: 0,
            lineHeight: 1,
            color: W.primary,
          }}
        >
          一行命令开始。
        </h2>
        <p style={{ fontSize: 18, color: W.canvasSoft, margin: 0, maxWidth: 720 }}>
          注册账号后会在 tokens 页面拿到自己的安装命令。下面是预览：
        </p>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(360px, 1fr))",
            gap: 16,
            marginTop: 8,
          }}
        >
          <CodeBlock label="Homebrew" code="brew install L1f4Is6o0d2Yuu/tap/tokenusage" />
          <CodeBlock
            label="curl"
            code="curl -fsSL https://tokenusage.online/install.sh | sh"
          />
        </div>
      </div>
    </section>
  );
}

function CodeBlock({ label, code }: { label: string; code: string }) {
  return (
    <div
      style={{
        background: "rgba(255,255,255,0.04)",
        border: `1px solid rgba(255,255,255,0.10)`,
        borderRadius: 16,
        padding: 20,
        display: "flex",
        flexDirection: "column",
        gap: 10,
      }}
    >
      <div
        style={{
          fontSize: 12,
          fontWeight: 700,
          textTransform: "uppercase",
          letterSpacing: 2,
          color: W.primary,
        }}
      >
        {label}
      </div>
      <code
        style={{
          fontFamily: 'ui-monospace, "SF Mono", Menlo, monospace',
          fontSize: 14,
          color: W.canvas,
          wordBreak: "break-all",
        }}
      >
        {code}
      </code>
    </div>
  );
}

function CTABand({ inviteRequired }: { inviteRequired: boolean }) {
  return (
    <section
      style={{
        background: W.primaryPale,
        padding: "64px 32px",
      }}
    >
      <div
        style={{
          maxWidth: 1200,
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
          准备好<span style={{ color: W.positive }}>开撸</span>了？
        </h2>
        <p
          style={{
            fontSize: 18,
            color: W.body,
            margin: 0,
            maxWidth: 600,
            marginLeft: "auto",
            marginRight: "auto",
          }}
        >
          {inviteRequired
            ? "目前邀请制注册。问朋友要个邀请码，或者去 GitHub 提个 issue。"
            : "免费注册，本地优先，不收 token。"}
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
            style={{
              ...buttonBase,
              background: W.ink,
              color: W.primary,
              fontSize: 18,
              padding: "16px 28px",
            }}
          >
            立即注册
          </Link>
          <a
            href="https://github.com/L1f4Is6o0d2Yuu/tokenusage"
            target="_blank"
            rel="noreferrer"
            style={{
              ...buttonBase,
              background: W.canvas,
              color: W.ink,
              border: `1px solid ${W.ink}`,
              fontSize: 18,
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
        padding: "40px 32px",
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
          fontSize: 14,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span>©</span>
          <span>2026 tokenusage</span>
        </div>
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

function Pill({
  children,
  bg,
  border,
  small,
}: {
  children: React.ReactNode;
  bg: string;
  border?: boolean;
  small?: boolean;
}) {
  return (
    <div
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 8,
        padding: small ? "4px 10px" : "8px 14px",
        borderRadius: 9999,
        background: bg,
        border: border ? `1px solid ${W.mute}` : "none",
        fontSize: small ? 12 : 14,
        fontWeight: 600,
        color: W.ink,
      }}
    >
      {children}
    </div>
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
  transition: "transform 0.1s ease",
};
