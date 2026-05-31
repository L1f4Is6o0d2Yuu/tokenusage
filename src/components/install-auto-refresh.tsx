"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

// Replaces an in-body <meta http-equiv="refresh"> on /install. The meta
// approach kept reloading /install even after the user soft-navigated
// away — the browser had already scheduled the refresh against the URL
// captured at parse time, so the timer fired against /install even when
// the React tree was already on /dashboard. A React-managed interval
// unmounts cleanly when the route changes.
export function InstallAutoRefresh({ intervalMs }: { intervalMs: number }) {
  const router = useRouter();
  useEffect(() => {
    const id = setInterval(() => {
      router.refresh();
    }, intervalMs);
    return () => clearInterval(id);
  }, [router, intervalMs]);
  return null;
}
