"use client";

import { useState, useTransition } from "react";

// "Sync now" button used on the /install page. POSTs to /api/sync-now
// to set the `sync_requested_at` flag — the agent's long-poll picks it
// up on next heartbeat (within seconds), uploads immediately, and the
// dashboard's meta-refresh bounces the user out to "/" as soon as
// sessions appear.
//
// Works even before the agent is online: the flag persists, so when
// the agent first connects it'll see the request waiting and sync
// right away.
export function ForceSyncButton({
  label,
  pendingLabel,
}: {
  label: string;
  pendingLabel: string;
}) {
  const [pending, startTransition] = useTransition();
  const [requested, setRequested] = useState(false);

  function onClick() {
    if (pending || requested) return;
    setRequested(true);
    startTransition(async () => {
      try {
        await fetch("/api/sync-now", { method: "POST" });
      } catch {
        // best-effort; the meta-refresh on the parent page will
        // re-fetch state regardless of network outcome.
      }
      // Brief delay so the user sees the loading state, then reload
      // and let the server-rendered status checklist redraw.
      setTimeout(() => window.location.reload(), 1200);
    });
  }

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={pending || requested}
      className="inline-flex items-center gap-1.5 rounded-md bg-accent px-3 py-1.5 text-xs font-medium text-accent-fg transition-opacity hover:opacity-90 disabled:opacity-60"
    >
      {pending || requested ? pendingLabel : label}
    </button>
  );
}
