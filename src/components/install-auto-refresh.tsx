"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";

// Replaces an in-body <meta http-equiv="refresh"> on /install. The meta
// approach kept reloading /install even after the user soft-navigated
// away — the browser had already scheduled the refresh against the URL
// captured at parse time, so the timer fired against /install even when
// the React tree was already on /dashboard. A React-managed interval
// unmounts cleanly when the route changes.
//
// Each tick is a real RSC request that re-runs the page's server
// components, so the cadence is a traffic decision, not just a UX one. At
// the old 8s idle interval a single forgotten tab was 450 requests an hour,
// indefinitely. Two guards now bound that:
//
//   * pause entirely while the tab is hidden — a backgrounded tab is not
//     watching for the install to complete;
//   * give up after `maxMs`, since the page is waiting for a first sync
//     that either lands in the first few minutes or needs the user to go
//     fix something.
export function InstallAutoRefresh({
  intervalMs,
  maxMs = 15 * 60 * 1000,
}: {
  intervalMs: number;
  maxMs?: number;
}) {
  const router = useRouter();
  // Seeded in the effect, not at render: Date.now() during render is impure
  // and makes the component non-analyzable.
  const startedAt = useRef<number | null>(null);

  useEffect(() => {
    startedAt.current ??= Date.now();
    const expired = () =>
      startedAt.current != null && Date.now() - startedAt.current > maxMs;
    let id: ReturnType<typeof setInterval> | null = null;

    const stop = () => {
      if (id != null) {
        clearInterval(id);
        id = null;
      }
    };
    const tick = () => {
      if (expired()) {
        stop();
        return;
      }
      router.refresh();
    };
    const start = () => {
      if (id == null && !expired()) id = setInterval(tick, intervalMs);
    };
    const onVisibility = () => {
      if (document.hidden) stop();
      else {
        tick();
        start();
      }
    };

    if (!document.hidden) start();
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      document.removeEventListener("visibilitychange", onVisibility);
      stop();
    };
  }, [router, intervalMs, maxMs]);

  return null;
}
