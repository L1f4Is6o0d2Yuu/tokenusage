"use client";

import { useEffect } from "react";

// Per-segment error boundary. When a server component inside (app)/
// throws (bad cookie payload, transient DB lock, recharts choking on
// nan), Next swaps the page body with this without unmounting the
// sidebar — the user can navigate away without a full reload.
export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    try {
      // eslint-disable-next-line no-console
      console.error("tokenusage (app) error:", error.message, error.digest);
    } catch {
      /* noop */
    }
  }, [error]);

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-col items-center justify-center gap-5 px-6 py-20 text-center">
      <div className="text-5xl" aria-hidden>
        🧯
      </div>
      <h1 className="text-2xl font-semibold tracking-tight text-fg-strong">
        这页出错了
      </h1>
      <p className="max-w-md text-sm text-fg-muted">
        渲染过程中抛了个异常 — 不一定是你的问题，但也可能是你的姿势奇特。
        再试一下或者回看板看看别的。
      </p>
      {error?.digest && (
        <p className="font-mono text-xs text-fg-faint">
          digest: {error.digest}
        </p>
      )}
      <div className="flex flex-wrap items-center justify-center gap-2">
        <button
          type="button"
          onClick={() => reset()}
          className="rounded-md bg-accent px-4 py-2 text-sm font-medium text-accent-fg transition-opacity hover:opacity-90"
        >
          再试一次
        </button>
        <a
          href="/dashboard"
          className="rounded-md border border-border-subtle px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-bg-panel-2"
        >
          回看板
        </a>
      </div>
    </main>
  );
}
