"use client";

import { useEffect, useRef, useState } from "react";
import { RefreshCw, Check, AlertCircle } from "lucide-react";

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
//   3. After click, poll /api/sync-status every POLL_MS to learn when
//      the agent has actually finished uploading. The progress bar is
//      bound to real state, not a fixed timer:
//        - 0–40%   grows over the first few seconds (request acked)
//        - 40–90%  smoothly creeps while we wait for the agent
//        - 100%    snaps when lastUploadedAt > syncRequestedAt
//      Times out at TIMEOUT_MS — likely the agent is offline.
//   4. On real completion, soft-reload so the dashboard picks up new
//      sessions. On timeout, show an error state instead of reloading.

const AUTO_STALE_MS = 90 * 1000;     // auto-sync if data is older than this
const COOLDOWN_MS = 20 * 1000;       // re-click guard window
const POLL_MS = 1000;                // how often to check sync-status
const TIMEOUT_MS = 60 * 1000;        // give up if agent never finishes
const CREEP_TARGET_MS = 15 * 1000;   // time over which the bar creeps to 90%

type Phase = "idle" | "syncing" | "done" | "timeout";

function formatBytes(bytes: number): string {
  if (bytes >= 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  if (bytes >= 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${bytes} B`;
}

function formatRate(bytesPerSecond: number): string {
  if (!Number.isFinite(bytesPerSecond) || bytesPerSecond <= 0) return "—/s";
  return `${formatBytes(bytesPerSecond)}/s`;
}

function formatDuration(ms: number): string {
  const sec = Math.max(0, Math.floor(ms / 1000));
  if (sec < 60) return `${sec}s`;
  const min = Math.floor(sec / 60);
  return `${min}m ${String(sec % 60).padStart(2, "0")}s`;
}

export function SyncControl({
  lastSyncedAt,
  paused,
  installed,
  agentLive,
  label,
  syncingLabel,
  doneLabel,
}: {
  lastSyncedAt: number | null;
  paused: boolean;
  installed: boolean;
  agentLive: boolean;
  label: string;       // "立即同步"
  syncingLabel: string; // "同步中"
  doneLabel: string;    // "已请求"
}) {
  const [phase, setPhase] = useState<Phase>("idle");
  const [progress, setProgress] = useState(0); // 0–100
  const [uploadStartedAt, setUploadStartedAt] = useState<number | null>(null);
  const [uploadTotalBytes, setUploadTotalBytes] = useState<number | null>(null);
  const [cooldownEnds, setCooldownEnds] = useState<number | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const autoFired = useRef(false);
  const triggeredAtRef = useRef<number | null>(null);
  const pollTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const reloadTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // 1Hz tick so the cooldown countdown re-renders.
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  // Auto-sync on every dashboard open. The agent is now pull-based —
  // it doesn't push uploads on a schedule anymore — so the dashboard
  // is responsible for waking the agent up. The sessionStorage marker
  // still prevents an infinite reload loop within a single session
  // (sync triggers a page reload, lastSyncedAt won't bump until the
  // agent actually uploads, ~10s), but the cooldown is tight (60s) so
  // a real second visit a minute later does re-sync.
  useEffect(() => {
    if (autoFired.current) return;
    if (!installed || paused || !agentLive) return;
    const stale =
      lastSyncedAt == null || Date.now() - lastSyncedAt > AUTO_STALE_MS;
    if (!stale) return;
    const lastAutoStr = sessionStorage.getItem("tu-auto-synced-at");
    if (lastAutoStr) {
      const lastAuto = Number(lastAutoStr);
      if (Date.now() - lastAuto < 60 * 1000) return;
    }
    autoFired.current = true;
    sessionStorage.setItem("tu-auto-synced-at", String(Date.now()));
    void trigger();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [installed, paused, agentLive, lastSyncedAt]);

  function clearTimers() {
    if (pollTimer.current) {
      clearInterval(pollTimer.current);
      pollTimer.current = null;
    }
    if (reloadTimer.current) {
      clearTimeout(reloadTimer.current);
      reloadTimer.current = null;
    }
  }

  async function trigger() {
    if (!installed || paused || !agentLive || phase === "syncing") return;
    const cooldownLeft = cooldownEnds ? cooldownEnds - Date.now() : 0;
    if (cooldownLeft > 0) return;

    const startedAt = Date.now();
    triggeredAtRef.current = startedAt;
    setPhase("syncing");
    setProgress(5);
    setUploadStartedAt(null);
    setUploadTotalBytes(null);
    setCooldownEnds(startedAt + COOLDOWN_MS);

    try {
      await fetch("/api/sync-now", { method: "POST" });
      // Bump to 40% on POST success — we know the server saw the click.
      setProgress((p) => Math.max(p, 40));
    } catch {
      // best-effort; the polling loop is still authoritative.
    }

    clearTimers();
    pollTimer.current = setInterval(() => void poll(startedAt), POLL_MS);
  }

  async function poll(startedAt: number) {
    // Guard against late polls from a stale trigger.
    if (triggeredAtRef.current !== startedAt) return;

    const elapsed = Date.now() - startedAt;

    // Smooth creep from current → ~90% over CREEP_TARGET_MS while waiting.
    setProgress((p) => {
      if (p >= 90) return p;
      const target = Math.min(90, 40 + (50 * elapsed) / CREEP_TARGET_MS);
      return Math.max(p, target);
    });

    try {
      const res = await fetch("/api/sync-status", { cache: "no-store" });
      if (!res.ok) throw new Error(`status ${res.status}`);
      const data = (await res.json()) as {
        syncRequestedAt: number | null;
        lastUploadedAt: number | null;
        uploadStartedAt: number | null;
        uploadTotalBytes: number | null;
      };
      setUploadStartedAt(data.uploadStartedAt ?? null);
      setUploadTotalBytes(data.uploadTotalBytes ?? null);
      const requested = data.syncRequestedAt ?? 0;
      const uploaded = data.lastUploadedAt ?? 0;
      // Done once the server observes an upload satisfying this server-side
      // sync request. Do not compare against the browser clock here: user
      // machines can be minutes ahead/behind the server, which made the UI
      // sit at 90% even after a successful upload.
      if (uploaded > 0 && uploaded >= requested) {
        clearTimers();
        setProgress(100);
        setPhase("done");
        reloadTimer.current = setTimeout(() => {
          window.location.reload();
        }, 600);
        return;
      }
    } catch {
      // Transient network errors — keep polling, the bar keeps creeping.
    }

    if (elapsed > TIMEOUT_MS) {
      clearTimers();
      setPhase("timeout");
      // Hold the bar where it was so user sees we tried.
    }
  }

  // Reset to idle after timeout — user can click again.
  useEffect(() => {
    if (phase !== "timeout") return;
    const id = setTimeout(() => {
      setPhase("idle");
      setProgress(0);
      setUploadStartedAt(null);
      setUploadTotalBytes(null);
    }, 5000);
    return () => clearTimeout(id);
  }, [phase]);

  useEffect(() => () => clearTimers(), []);

  const cooldownLeftSec = cooldownEnds
    ? Math.max(0, Math.ceil((cooldownEnds - now) / 1000))
    : 0;
  const disabled =
    !installed || paused || !agentLive || phase === "syncing" || cooldownLeftSec > 0;

  let Icon = RefreshCw;
  if (phase === "done") Icon = Check;
  else if (phase === "timeout") Icon = AlertCircle;

  const buttonLabel =
    !agentLive
      ? "agent 离线"
      : phase === "syncing"
      ? syncingLabel
      : phase === "done"
        ? doneLabel
        : phase === "timeout"
          ? "agent 未响应"
          : cooldownLeftSec > 0
            ? `${cooldownLeftSec}s`
            : label;

  const showTelemetry = phase === "syncing" || phase === "done" || phase === "timeout";
  const elapsedMs = triggeredAtRef.current ? Math.max(0, now - triggeredAtRef.current) : 0;
  const uploadElapsedMs = uploadStartedAt ? Math.max(1000, now - uploadStartedAt) : 0;
  const bytesPerSecond = uploadTotalBytes && uploadStartedAt
    ? uploadTotalBytes / Math.max(1, uploadElapsedMs / 1000)
    : 0;
  const telemetryLine = uploadTotalBytes
    ? `${formatBytes(uploadTotalBytes)} · ${formatRate(bytesPerSecond)} · ${formatDuration(uploadElapsedMs)}`
    : `${formatDuration(elapsedMs)} · waiting for agent`;

  return (
    <>
      {/* Top-of-page progress strip — visible while syncing or briefly
          on done/timeout. Width is driven by real `progress` state, not
          a fixed-time CSS animation. */}
      {(phase === "syncing" || phase === "done" || phase === "timeout") && (
        <div
          aria-hidden
          className="pointer-events-none fixed inset-x-0 top-0 z-50 h-1 overflow-hidden"
        >
          <div
            className={`h-full transition-[width] duration-500 ease-out ${
              phase === "timeout" ? "bg-red-500" : "bg-accent"
            }`}
            style={{ width: `${progress}%` }}
          />
        </div>
      )}
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={trigger}
          disabled={disabled}
          title={buttonLabel}
          className="inline-flex items-center gap-1.5 rounded-md border border-border-subtle bg-bg-panel px-3 py-1.5 text-xs font-medium text-fg-default transition-colors hover:border-accent hover:text-accent disabled:cursor-not-allowed disabled:opacity-60"
        >
          <Icon
            className={`h-3.5 w-3.5 ${phase === "syncing" ? "animate-spin" : ""}`}
            strokeWidth={2}
            aria-hidden
          />
          {buttonLabel}
        </button>
        {showTelemetry && (
          <div className="min-w-[220px] rounded-md border border-border-subtle bg-bg-panel-2 px-3 py-2 text-[11px] shadow-sm">
            <div className="mb-1 flex items-center justify-between gap-3">
              <span className="font-medium text-fg-default">Sync progress</span>
              <span className="font-mono tabular-nums text-accent">{Math.round(progress)}%</span>
            </div>
            <div
              role="progressbar"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={Math.round(progress)}
              className="h-2.5 overflow-hidden rounded-full bg-bg-panel"
            >
              <div
                className={`h-full rounded-full transition-[width] duration-500 ease-out ${
                  phase === "timeout" ? "bg-red-500" : "bg-accent"
                }`}
                style={{ width: `${progress}%` }}
              />
            </div>
            <div className="mt-1.5 truncate font-mono tabular-nums text-fg-muted">
              {telemetryLine}
            </div>
          </div>
        )}
      </div>
    </>
  );
}
