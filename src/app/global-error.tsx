"use client";

import { useEffect } from "react";

// Top-level fallback. Triggered when a *layout* throws — the regular
// error.tsx boundary doesn't catch errors in the root layout itself.
// Keeps the user from staring at a blank page if (say) cookies parse,
// i18n, or the theme bootstrap script throws during a deploy.
//
// Inline styles so we don't depend on the failing globals.css cascade.
// Plain <html>/<body> required by Next 16's global-error contract.
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Best-effort beacon. If our own logging is what blew up, this
    // catch makes sure the fallback itself doesn't crash.
    try {
      // eslint-disable-next-line no-console
      console.error("tokenusage global-error:", error.message, error.digest);
    } catch {
      /* noop */
    }
  }, [error]);

  return (
    <html lang="zh-CN">
      <body
        style={{
          margin: 0,
          minHeight: "100dvh",
          background: "#0e0f0c",
          color: "#e8ebe6",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontFamily:
            '-apple-system, BlinkMacSystemFont, "Segoe UI", Inter, system-ui, "PingFang SC", "Microsoft YaHei", sans-serif',
        }}
      >
        <main
          style={{
            maxWidth: 520,
            padding: 32,
            textAlign: "center",
          }}
        >
          <div
            style={{
              fontSize: 64,
              fontWeight: 900,
              letterSpacing: -2,
              lineHeight: 1,
              color: "#9fe870",
            }}
          >
            💥
          </div>
          <h1
            style={{
              fontSize: 28,
              fontWeight: 800,
              margin: "16px 0 8px",
              letterSpacing: -0.5,
            }}
          >
            出大问题了
          </h1>
          <p
            style={{
              fontSize: 14,
              color: "#868685",
              lineHeight: 1.6,
              margin: "0 0 24px",
            }}
          >
            页面渲染时炸了一下。刷新试试，没好转的话告诉我们一声 —
            或者直接去 GitHub 提个 issue 让我们丢人。
          </p>
          {error?.digest && (
            <p
              style={{
                fontSize: 12,
                color: "#454745",
                fontFamily: "ui-monospace, monospace",
                marginBottom: 24,
                wordBreak: "break-all",
              }}
            >
              错误编号：{error.digest}
            </p>
          )}
          <div
            style={{
              display: "flex",
              gap: 12,
              justifyContent: "center",
              flexWrap: "wrap",
            }}
          >
            <button
              type="button"
              onClick={() => reset()}
              style={{
                background: "#9fe870",
                color: "#0e0f0c",
                border: "none",
                borderRadius: 24,
                padding: "12px 22px",
                fontWeight: 700,
                fontSize: 14,
                cursor: "pointer",
              }}
            >
              再试一次
            </button>
            <a
              href="/"
              style={{
                background: "transparent",
                color: "#e8ebe6",
                border: "1px solid #454745",
                borderRadius: 24,
                padding: "12px 22px",
                fontWeight: 700,
                fontSize: 14,
                textDecoration: "none",
              }}
            >
              回首页
            </a>
            <a
              href="https://github.com/L1f4Is6o0d2Yuu/tokenusage/issues/new"
              target="_blank"
              rel="noreferrer"
              style={{
                background: "transparent",
                color: "#868685",
                border: "1px solid #454745",
                borderRadius: 24,
                padding: "12px 22px",
                fontWeight: 700,
                fontSize: 14,
                textDecoration: "none",
              }}
            >
              开个 issue
            </a>
          </div>
        </main>
      </body>
    </html>
  );
}
