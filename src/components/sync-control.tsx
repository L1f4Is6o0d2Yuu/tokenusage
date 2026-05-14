"use client";

import { useEffect, useRef, useState } from "react";
import { RefreshCw, Check } from "lucide-react";

// Header-mounted sync control. Replaces the prominent "立即同步" button
// that used to live in the AgentStatusBar at the top of the dashboard
// body — now an icon-sized affordance next to the Share button.
//
// Behavior:
//   1. On mount, auto-fire /api/sync-now once if data is stale (last
//      sync ≥ 90s ago, or never). The agent picks it up on next
//      heartbeat and uploads.
//   2. Manual click does the same, with a 20s cooldown to defang
//      finger-mash mode.
//   3. Render a soft top-of-page progress bar while sync is in flight
//      (6s window — long enough for the agent's next heartbeat tick
//      under typical 5-min intervals because the long-poll wakes
//      immediately when the flag flips).
//   4. After the progress completes, soft-reload so the dashboard
//      picks up any new sessions.

const AUTO_STALE_MS = 90 * 1000;     // auto-sync if data is older than this
const COOLDOWN_MS = 20 * 1000;       // re-click guard window
const PROGRESS_MS = 6 * 1000;        // visible progress duration before reload

export function SyncControl({
  lastSyncedAt,
  paused,
  installed,
  label,
  syncingLabel,
  doneLabel,
}: {
  lastSyncedAt: number | null;
  paused: boolean;
  installed: boolean;
  label: string;       // "立即同步"
  syncingLabel: string; // "同步中"
  doneLabel: string;    // "已请求"
}) {
  const [status, setStatus] = useState<"idle" | "syncing" | "done">("idle");
  const [cooldownEnds, setCooldownEnds] = useState<number | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const autoFired = useRef(false);
  const reloadTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // 1Hz tick so the cooldown countdown re-renders.
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  // Auto-sync once per session if the data we're showing looks stale.
  // The sessionStorage marker prevents an infinite reload loop: the
  // sync triggers a page reload, but `lastSyncedAt` won't bump until
  // the agent actually uploads (could be minutes), so without the
  // marker the next mount would re-fire and re-reload forever.
  useEffect(() => {
    if (autoFired.current) return;
    if (!installed || paused) return;
    const stale =
      lastSyncedAt == null || Date.now() - lastSyncedAt > AUTO_STALE_MS;
    if (!stale) return;
    // Don't re-auto-fire within this browser session (until tab close)
    // unless > 10 minutes pass — that's enough time for the agent's
    // next heartbeat to have responded.
    const lastAutoStr = sessionStorage.getItem("tu-auto-synced-at");
    if (lastAutoStr) {
      const lastAuto = Number(lastAutoStr);
      if (Date.now() - lastAuto < 10 * 60 * 1000) return;
    }
    autoFired.current = true;
    sessionStorage.setItem("tu-auto-synced-at", String(Date.now()));
    void trigger();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [installed, paused, lastSyncedAt]);

  async function trigger() {
    if (status === "syncing") return;
    const cooldownLeft = cooldownEnds ? cooldownEnds - Date.now() : 0;
    if (cooldownLeft > 0) return;
    setStatus("syncing");
    setCooldownEnds(Date.now() + COOLDOWN_MS);
    try {
      await fetch("/api/sync-now", { method: "POST" });
    } catch {
      // best-effort; the progress + reload still runs.
    }
    if (reloadTimer.current) clearTimeout(reloadTimer.current);
    reloadTimer.current = setTimeout(() => {
      setStatus("done");
      // Soft reload — server re-renders the dashboard with any new
      // sessions the agent uploaded in response to the sync flag.
      setTimeout(() => window.location.reload(), 600);
    }, PROGRESS_MS);
  }

  const cooldownLeftSec = cooldownEnds
    ? Math.max(0, Math.ceil((cooldownEnds - now) / 1000))
    : 0;
  const disabled =
    !installed || paused || status === "syncing" || cooldownLeftSec > 0;

  const Icon = status === "done" ? Check : RefreshCw;

  return (
    <>
      {/* Top-of-page progress strip — visible only while syncing.
          Animation pre-renders the bar from 0 → 100% over PROGRESS_MS
          so the user sees actual movement, not a stuck "loading…". */}
      {status === "syncing" && (
        <div
          aria-hidden
          className="pointer-events-none fixed inset-x-0 top-0 z-50 h-1 overflow-hidden"
        >
          <div
            className="h-full bg-accent"
            style={{
              animation: `tu-sync-progress ${PROGRESS_MS}ms cubic-bezier(0.22, 1, 0.36, 1) forwards`,
            }}
          />
          <style>{`
            @keyframes tu-sync-progress {
              0% { width: 0%; }
              60% { width: 70%; }
              100% { width: 100%; }
            }
          `}</style>
        </div>
      )}
      <button
        type="button"
        onClick={trigger}
        disabled={disabled}
        title={
          status === "syncing"
            ? syncingLabel
            : cooldownLeftSec > 0
              ? `${cooldownLeftSec}s`
              : label
        }
        className="inline-flex items-center gap-1.5 rounded-md border border-border-subtle bg-bg-panel px-3 py-1.5 text-xs font-medium text-fg-default transition-colors hover:border-accent hover:text-accent disabled:cursor-not-allowed disabled:opacity-60"
      >
        <Icon
          className={`h-3.5 w-3.5 ${status === "syncing" ? "animate-spin" : ""}`}
          strokeWidth={2}
          aria-hidden
        />
        {status === "syncing"
          ? syncingLabel
          : status === "done"
            ? doneLabel
            : cooldownLeftSec > 0
              ? `${cooldownLeftSec}s`
              : label}
      </button>
    </>
  );
}
