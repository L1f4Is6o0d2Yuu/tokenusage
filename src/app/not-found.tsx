import Link from "next/link";

// Public-facing 404 — matches the Wise-styled landing palette so a
// stranger who hits a dead /s/<slug> or mistyped path doesn't see the
// bare Next.js default.

const W = {
  primary: "#9fe870",
  ink: "#0e0f0c",
  body: "#454745",
  mute: "#868685",
  canvasSoft: "#e8ebe6",
  positive: "#2ead4b",
};

export default function NotFound() {
  return (
    <div
      style={{
        minHeight: "100vh",
        background: W.canvasSoft,
        color: W.ink,
        fontFamily:
          '-apple-system, BlinkMacSystemFont, "Segoe UI", Inter, system-ui, "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", sans-serif',
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "40px 24px",
      }}
    >
      <div
        style={{
          maxWidth: 480,
          width: "100%",
          textAlign: "center",
          display: "flex",
          flexDirection: "column",
          gap: 18,
        }}
      >
        <Link
          href="/"
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 10,
            fontSize: 18,
            fontWeight: 700,
            color: W.ink,
            textDecoration: "none",
            alignSelf: "center",
          }}
        >
          <svg width="28" height="21" viewBox="0 0 64 48" fill="none" stroke="#163300">
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
        </Link>

        <h1
          style={{
            fontSize: 112,
            fontWeight: 900,
            lineHeight: 1,
            margin: "8px 0 0",
            letterSpacing: -6,
            color: W.ink,
          }}
        >
          404
        </h1>
        <p style={{ fontSize: 20, color: W.body, margin: 0, lineHeight: 1.5 }}>
          这里啥也没有。
        </p>
        <p style={{ fontSize: 14, color: W.mute, margin: 0, lineHeight: 1.5 }}>
          可能是分享链接被撤销了，或者链接拼错了一个字符。
        </p>

        <div
          style={{
            display: "flex",
            gap: 10,
            justifyContent: "center",
            marginTop: 12,
            flexWrap: "wrap",
          }}
        >
          <Link
            href="/"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              padding: "12px 22px",
              borderRadius: 24,
              background: W.primary,
              color: W.ink,
              fontSize: 15,
              fontWeight: 700,
              textDecoration: "none",
            }}
          >
            回首页 →
          </Link>
          <Link
            href="/login"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              padding: "12px 22px",
              borderRadius: 24,
              background: "#ffffff",
              color: W.ink,
              border: `1px solid ${W.ink}`,
              fontSize: 15,
              fontWeight: 700,
              textDecoration: "none",
            }}
          >
            登录
          </Link>
        </div>
      </div>
    </div>
  );
}
