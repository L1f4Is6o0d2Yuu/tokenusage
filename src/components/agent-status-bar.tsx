"use client";

import { useEffect, useState, useTransition } from "react";
import { cn } from "@/lib/utils";

// A live status pill for the multi-user dashboard. Shows whether the user's
// agent is currently checked in and how recently the data was synced. The
// "Sync now" button hits /api/sync-now which immediately releases the held
// long-poll connection on the agent — fresh data lands on the server in
// 1-2 seconds, and we reload after a short delay to render it.

const AGENT_LIVE_THRESHOLD_MS = 90 * 1000;
const RELOAD_DELAY_MS = 4_000;

function ago(target: number, now: number): string {
  const sec = Math.max(0, Math.floor((now - target) / 1000));
  if (sec < 60) return `${sec}s ago`;
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min}m ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h ago`;
  return `${Math.floor(hr / 24)}d ago`;
}

export function AgentStatusBar({
  lastSyncedAt,
  agentSeenAt,
  intervalSeconds,
  paused,
}: {
  lastSyncedAt: number | null;
  agentSeenAt: number | null;
  intervalSeconds: number;
  paused: boolean;
}) {
  const [now, setNow] = useState<number | null>(null);
  const [pending, startTransition] = useTransition();
  const [requested, setRequested] = useState(false);
  const [toggling, setToggling] = useState(false);

  useEffect(() => {
    setNow(Date.now());
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  const agentLive =
    agentSeenAt != null && now != null && now - agentSeenAt < AGENT_LIVE_THRESHOLD_MS;
  const everSynced = lastSyncedAt != null;
  const installed = everSynced || agentSeenAt != null;

  function handleSync() {
    if (requested || pending || paused) return;
    setRequested(true);
    startTransition(async () => {
      try {
        await fetch("/api/sync-now", { method: "POST" });
      } catch {
        // best-effort
      }
      setTimeout(() => window.location.reload(), RELOAD_DELAY_MS);
    });
  }

  function handleToggle() {
    if (toggling) return;
    setToggling(true);
    const endpoint = paused ? "/api/agent-resume" : "/api/agent-pause";
    startTransition(async () => {
      try {
        await fetch(endpoint, { method: "POST" });
      } catch {
        // best-effort
      }
      // Reload promptly so the new state is reflected. The server already
      // pinged the agent's long-poll connection so it knows too.
      window.location.reload();
    });
  }

  let leftPill: React.ReactNode;
  if (!installed) {
    leftPill = (
      <Pill color="gray" dot>
        Agent not installed
      </Pill>
    );
  } else if (paused) {
    leftPill = (
      <Pill color="gray" dot>
        Tracking paused
        {agentSeenAt != null && agentLive && (
          <span className="ml-1 text-muted-foreground">· agent online</span>
        )}
      </Pill>
    );
  } else if (agentLive) {
    leftPill = (
      <Pill color="emerald" dot>
        Agent live
        {agentSeenAt != null && now != null && (
          <span className="ml-1 text-muted-foreground">· seen {ago(agentSeenAt, now)}</span>
        )}
      </Pill>
    );
  } else {
    leftPill = (
      <Pill color="amber" dot>
        Agent offline
        {agentSeenAt != null && now != null && (
          <span className="ml-1 text-muted-foreground">
            · last seen {ago(agentSeenAt, now)}
          </span>
        )}
      </Pill>
    );
  }

  const lastSyncedLabel =
    everSynced && now != null ? ago(lastSyncedAt as number, now) : "never";
  const intervalLabel =
    intervalSeconds >= 86400
      ? "manual only"
      : intervalSeconds >= 3600
        ? `${intervalSeconds / 3600}h`
        : intervalSeconds >= 60
          ? `${intervalSeconds / 60}m`
          : `${intervalSeconds}s`;

  return (
    <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-md border bg-card px-4 py-2 text-xs">
      <div className="flex flex-wrap items-center gap-3">
        {leftPill}
        <span className="text-muted-foreground">
          Last synced <span className="text-foreground">{lastSyncedLabel}</span>
        </span>
        <span className="text-muted-foreground">
          Heartbeat <span className="text-foreground">{intervalLabel}</span>
        </span>
      </div>
      <div className="flex items-center gap-2">
        {installed && (
          <button
            type="button"
            onClick={handleToggle}
            disabled={toggling || pending}
            className={cn(
              "rounded-md border px-3 py-1.5 text-xs font-medium",
              paused
                ? "border-emerald-600 bg-background text-emerald-700 hover:bg-emerald-50 dark:text-emerald-300"
                : "border-amber-600 bg-background text-amber-700 hover:bg-amber-50 dark:text-amber-300",
              "disabled:cursor-not-allowed disabled:opacity-60"
            )}
          >
            {toggling
              ? paused
                ? "Resuming…"
                : "Pausing…"
              : paused
                ? "Resume tracking"
                : "Pause tracking"}
          </button>
        )}
        <button
          type="button"
          onClick={handleSync}
          disabled={pending || requested || paused || !installed}
          className={cn(
            "rounded-md border bg-background px-3 py-1.5 text-xs font-medium hover:bg-muted",
            "disabled:cursor-not-allowed disabled:opacity-60"
          )}
          title={paused ? "Resume tracking first" : undefined}
        >
          {requested ? "Syncing…" : "Sync now"}
        </button>
      </div>
    </div>
  );
}

function Pill({
  color,
  dot,
  children,
}: {
  color: "emerald" | "amber" | "gray";
  dot?: boolean;
  children: React.ReactNode;
}) {
  const dotClass =
    color === "emerald"
      ? "bg-emerald-500"
      : color === "amber"
        ? "bg-amber-500"
        : "bg-muted-foreground";
  return (
    <span className="inline-flex items-center gap-2">
      {dot && <span className={cn("h-2 w-2 rounded-full", dotClass)} />}
      <span>{children}</span>
    </span>
  );
}
