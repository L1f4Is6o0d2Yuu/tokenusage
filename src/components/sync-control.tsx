"use client";

import { useEffect, useRef, useState } from "react";
import { RefreshCw, Check, AlertCircle } from "lucide-react";

// Header-mounted sync control. Replaces the prominent "立即同步" button
// that used to live in the AgentStatusBar at the top of the dashboard
// body — now an icon-sized affordance next to the Share button.
//
// Behavior under the push model (v0.28):
//   1. No auto-fire on mount. The agent pushes within ~30s of any local
//      change, so an open dashboard is already current and the old
//      "auto-sync if data is ≥90s stale" only ever generated traffic to
//      re-confirm that. It fired on every dashboard open, and each one
//      dragged a 1Hz status poll behind it.
//   2. Manual click queues a request. The agent is not polling any more,
//      so this is picked up on its next check-in rather than instantly —
//      the button reports "queued", not "syncing", when the agent has
//      nothing else scheduled. `tokenusage sync` on the machine itself is
//      the instant path.
//   3. While a sync is outstanding, poll /api/sync-status at POLL_MS to
//      drive the progress bar off real state:
//        - 0–40%   grows over the first few seconds (request acked)
//        - 40–90%  smoothly creeps while we wait for the agent
//        - 100%    snaps when lastUploadedAt > syncRequestedAt
//      Polling only runs while the tab is visible and stops at the
//      timeouts below, so a forgotten tab can't poll forever.
//   4. On real completion, soft-reload so the dashboard picks up new
//      sessions. On timeout, show an error state instead of reloading.

const COOLDOWN_MS = 20 * 1000;       // re-click guard window
// 3s rather than 1s: this only exists to animate a progress bar, and at 1Hz
// a single stuck sync cost 60 requests a minute.
const POLL_MS = 3000;                // how often to check sync-status
const WAIT_TIMEOUT_MS = 60 * 1000;   // no agent response after request
const UPLOAD_STALL_TIMEOUT_MS = 10 * 60 * 1000; // upload started but stopped reporting
const CREEP_TARGET_MS = 15 * 1000;   // time over which the bar creeps to 90%

type Phase = "idle" | "syncing" | "done" | "timeout";
// "queued" is not a failure: the agent no longer polls, so a request it
// hasn't picked up yet is the normal case, not a broken one.
type SyncBlockReason = "offline" | "paused" | "stalled" | "queued" | null;

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
  paused,
  installed,
  agentLive,
  label,
  syncingLabel,
  doneLabel,
}: {
  // `lastSyncedAt` used to drive the auto-fire-if-stale check on mount.
  // That's gone with the push model, and with it the only reason this
  // component needed to know when the last sync landed.
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
  const [blockReason, setBlockReason] = useState<SyncBlockReason>(null);
  const [cooldownEnds, setCooldownEnds] = useState<number | null>(null);
  // Initialize to 0 (not Date.now()) so the SSR and client first paint
  // produce identical HTML — Date.now() on the server vs the client are
  // unavoidably different and trigger React hydration error #418. The
  // useEffect interval below bumps `now` after mount; until then any
  // `now`-derived UI is gated on other state (cooldownEnds /
  // triggeredAtRef / uploadStartedAt) which is null at first paint.
  const [now, setNow] = useState(0);
  // Mirrors triggeredAtRef for render. The ref stays the source of truth for
  // the async poll loop's staleness check; this is what the UI reads.
  const [triggeredAt, setTriggeredAt] = useState<number | null>(null);
  const triggeredAtRef = useRef<number | null>(null);
  const uploadStartedAtRef = useRef<number | null>(null);
  const uploadTotalBytesRef = useRef<number | null>(null);
  const pollTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const reloadTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // 1Hz tick so the cooldown countdown re-renders. Purely local — no network —
  // and it stops while the tab is hidden so a backgrounded dashboard isn't
  // re-rendering once a second all day.
  //
  // No synchronous seed here on purpose: `now` stays 0 until the first tick,
  // and every value derived from it (cooldownLeftSec, elapsedMs,
  // uploadElapsedMs) is already gated on state that is null before the user
  // triggers anything, so nothing renders wrong in that first second. Seeding
  // it would be a setState synchronously inside an effect — an extra render
  // pass for no visible difference.
  useEffect(() => {
    let id: ReturnType<typeof setInterval> | null = null;
    const start = () => {
      if (id == null) id = setInterval(() => setNow(Date.now()), 1000);
    };
    const stop = () => {
      if (id != null) {
        clearInterval(id);
        id = null;
      }
    };
    const onVisibility = () => {
      if (document.hidden) stop();
      else {
        setNow(Date.now());
        start();
      }
    };
    if (!document.hidden) start();
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      document.removeEventListener("visibilitychange", onVisibility);
      stop();
    };
  }, []);

  // Deliberately no auto-sync on mount.
  //
  // This used to fire /api/sync-now on every dashboard open whose data was
  // ≥90s old, then poll /api/sync-status once a second until the agent
  // answered. Under the push model the agent uploads within ~30s of any
  // local change, so the dashboard is already current on arrival and all
  // that traffic bought nothing. Opening the dashboard is now a read.

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

  // `trigger` only ever runs from the button's onClick and from `dismissTimeout`
  // — never during render — so reading the clock here is safe. react-hooks/purity
  // can't see that: it analyses any function declared in the component body as
  // potentially render-phase. The obvious silencer, wrapping this in
  // useCallback, buys nothing real, because `trigger` closes over `poll`, which
  // is redeclared every render and would have to become a dependency.
  // Suppressing the false positive is honest; restructuring the sync path to
  // satisfy the analyser is not worth the regression risk.
  async function trigger() {
    if (!installed || paused || !agentLive || phase === "syncing") return;
    // eslint-disable-next-line react-hooks/purity -- event handler, not render
    const cooldownLeft = cooldownEnds ? cooldownEnds - Date.now() : 0;
    if (cooldownLeft > 0) return;

    // eslint-disable-next-line react-hooks/purity -- event handler, not render
    const startedAt = Date.now();
    triggeredAtRef.current = startedAt;
    setTriggeredAt(startedAt);
    setPhase("syncing");
    setProgress(5);
    setUploadStartedAt(null);
    setUploadTotalBytes(null);
    setBlockReason(null);
    uploadStartedAtRef.current = null;
    uploadTotalBytesRef.current = null;
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
        paused: boolean;
        agentSeenAt: number | null;
        agentLive: boolean;
        agentVersion: string | null;
        uploadStartedAt: number | null;
        uploadTotalBytes: number | null;
      };
      if (data.paused || data.agentLive === false) {
        clearTimers();
        setBlockReason(data.paused ? "paused" : "offline");
        setPhase("timeout");
        return;
      }
      const nextUploadStartedAt = data.uploadStartedAt ?? null;
      const nextUploadTotalBytes = data.uploadTotalBytes ?? null;
      setUploadStartedAt(nextUploadStartedAt);
      setUploadTotalBytes(nextUploadTotalBytes);
      uploadStartedAtRef.current = nextUploadStartedAt;
      uploadTotalBytesRef.current = nextUploadTotalBytes;
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

    const latestUploadStartedAt = uploadStartedAtRef.current;
    const latestUploadTotalBytes = uploadTotalBytesRef.current;
    const requestIsWaiting = latestUploadStartedAt == null && latestUploadTotalBytes == null;
    const uploadIsStalled =
      latestUploadStartedAt != null && Date.now() - latestUploadStartedAt > UPLOAD_STALL_TIMEOUT_MS;
    if ((requestIsWaiting && elapsed > WAIT_TIMEOUT_MS) || uploadIsStalled) {
      clearTimers();
      // Nothing has started uploading yet. Under the push model that means
      // the agent simply hasn't reached its next check-in — the request is
      // parked server-side and will be honoured then. Report it as queued,
      // and stop polling rather than sitting at 1 request per POLL_MS
      // waiting for something that may be a day out.
      setBlockReason(uploadIsStalled ? "stalled" : "queued");
      setPhase("timeout");
    }
  }

  function dismissTimeout() {
    if (phase !== "timeout") return;
    setPhase("idle");
    setProgress(0);
    setUploadStartedAt(null);
    setUploadTotalBytes(null);
    setBlockReason(null);
    uploadStartedAtRef.current = null;
    uploadTotalBytesRef.current = null;
  }

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
    paused
      ? "agent 已暂停"
      : !agentLive
      ? "agent 无近期活动"
      : phase === "syncing"
      ? syncingLabel
      : phase === "done"
        ? doneLabel
        : phase === "timeout"
          ? blockReason === "stalled"
            ? "上传卡住"
            : blockReason === "paused"
              ? "agent 已暂停"
              : blockReason === "offline"
                ? "agent 无近期活动"
                : "已排队"
          : cooldownLeftSec > 0
            ? `${cooldownLeftSec}s`
            : label;

  const showTelemetry = phase === "syncing" || phase === "done" || phase === "timeout";
  // Read from state, not triggeredAtRef: the ref exists so the async poll
  // loop can detect stale triggers, and reading a ref during render is
  // exactly the kind of tearing React can't track.
  const elapsedMs = triggeredAt ? Math.max(0, now - triggeredAt) : 0;
  const uploadElapsedMs = uploadStartedAt ? Math.max(1000, now - uploadStartedAt) : 0;
  const bytesPerSecond = uploadTotalBytes && uploadStartedAt
    ? uploadTotalBytes / Math.max(1, uploadElapsedMs / 1000)
    : 0;
  const telemetryLine = uploadTotalBytes
    ? `${formatBytes(uploadTotalBytes)} · ${formatRate(bytesPerSecond)} · ${formatDuration(uploadElapsedMs)}`
    : `${formatDuration(elapsedMs)} · waiting for agent`;
  const timeoutDetail =
    blockReason === "paused"
      ? "Agent 已暂停，恢复后再同步。"
      : blockReason === "offline"
        ? "Agent 超过 26 小时没有活动，先运行修复流程。"
        : blockReason === "stalled"
          ? "上传已开始但长时间没有完成。"
          : "已排队：agent 检测到新数据或下次签到时会上传。想立刻同步，在本机运行 tokenusage sync。";

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
              phase !== "timeout"
                ? "bg-accent"
                : blockReason === "queued"
                  ? "bg-amber-500"
                  : "bg-red-500"
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
                  phase !== "timeout"
                ? "bg-accent"
                : blockReason === "queued"
                  ? "bg-amber-500"
                  : "bg-red-500"
                }`}
                style={{ width: `${progress}%` }}
              />
            </div>
            <div className="mt-1.5 flex items-center justify-between gap-2 font-mono tabular-nums text-fg-muted">
              <span className="truncate">{telemetryLine}</span>
              {phase === "timeout" && (
                <div className="flex shrink-0 items-center gap-2">
                  {(blockReason === "offline" || blockReason === "stalled") && (
                    <a
                      href="/install#troubleshoot"
                      className="text-[10px] font-medium text-amber-400 hover:text-amber-300"
                    >
                      repair
                    </a>
                  )}
                  <button
                    type="button"
                    onClick={dismissTimeout}
                    className="text-[10px] font-medium text-red-400 hover:text-red-300"
                  >
                    dismiss
                  </button>
                </div>
              )}
            </div>
            {phase === "timeout" && (
              <p className="mt-1 text-[10px] text-fg-muted">{timeoutDetail}</p>
            )}
          </div>
        )}
      </div>
    </>
  );
}
