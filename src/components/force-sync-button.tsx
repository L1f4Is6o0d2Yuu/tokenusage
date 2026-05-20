"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";

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
    const tid = toast.loading("已通知 agent，等数据回来…");
    startTransition(async () => {
      try {
        const res = await fetch("/api/sync-now", { method: "POST" });
        if (!res.ok) {
          throw new Error(`sync-now returned ${res.status}`);
        }
        toast.success("同步请求已发出", { id: tid });
      } catch {
        // Soft-fail — the page reload below will still surface the
        // current state. We dismiss the loading toast either way so
        // the user gets a clear "done waiting on me" signal.
        toast.error("网络不太给力，刷新页面再看一次", { id: tid });
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
