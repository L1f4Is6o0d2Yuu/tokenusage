"use client";

import { useEffect, useState, useTransition } from "react";
import { cn } from "@/lib/utils";
import { interp } from "@/i18n/interp";
import type { Dictionary } from "@/i18n/types";
import { SyncControl } from "@/components/sync-control";

const AGENT_LIVE_THRESHOLD_MS = 90 * 1000;

function ago(target: number, now: number): string {
  const sec = Math.max(0, Math.floor((now - target) / 1000));
  if (sec < 60) return `${sec}s`;
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min}m`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h`;
  return `${Math.floor(hr / 24)}d`;
}

export function AgentStatusBar({
  lastSyncedAt,
  agentSeenAt,
  intervalSeconds,
  paused,
  t,
}: {
  lastSyncedAt: number | null;
  agentSeenAt: number | null;
  intervalSeconds: number;
  paused: boolean;
  t: Dictionary["agent"];
}) {
  const [now, setNow] = useState<number | null>(null);
  const [pending, startTransition] = useTransition();
  const [toggling, setToggling] = useState(false);

  useEffect(() => {
    setNow(Date.now());
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  const agentLive =
    agentSeenAt != null && now != null && now - agentSeenAt < AGENT_LIVE_THRESHOLD_MS;
  const everSynced = lastSyncedAt != null;
  const installed = everSynced || agentSeenAt != null;

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
      window.location.reload();
    });
  }

  let leftPill: React.ReactNode;
  if (!installed) {
    leftPill = (
      <Pill color="gray" dot>
        {t.statusNotInstalled}
      </Pill>
    );
  } else if (paused) {
    leftPill = (
      <Pill color="gray" dot>
        {t.statusPaused}
        {agentSeenAt != null && agentLive && (
          <span className="ml-1 text-muted-foreground">· {t.onlineSuffix}</span>
        )}
      </Pill>
    );
  } else if (agentLive) {
    leftPill = (
      <Pill color="emerald" dot>
        {t.statusLive}
        {agentSeenAt != null && now != null && (
          <span className="ml-1 text-muted-foreground">
            · {interp(t.seenAgo, { when: ago(agentSeenAt, now) })}
          </span>
        )}
      </Pill>
    );
  } else {
    leftPill = (
      <Pill color="amber" dot>
        {t.statusOffline}
        {agentSeenAt != null && now != null && (
          <span className="ml-1 text-muted-foreground">
            · {interp(t.lastSeenAgo, { when: ago(agentSeenAt, now) })}
          </span>
        )}
      </Pill>
    );
  }

  const lastSyncedLabel =
    everSynced && now != null ? ago(lastSyncedAt as number, now) : t.never;
  const intervalLabel =
    intervalSeconds >= 86400
      ? t.manualOnly
      : intervalSeconds >= 3600
        ? `${intervalSeconds / 3600}h`
        : intervalSeconds >= 60
          ? `${intervalSeconds / 60}m`
          : `${intervalSeconds}s`;

  return (
    <div className="mt-4 flex flex-col gap-3 rounded-md border bg-card px-4 py-2 text-xs sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
        {leftPill}
        <span className="text-muted-foreground">
          {t.lastSyncedLabel} <span className="text-foreground">{lastSyncedLabel}</span>
        </span>
        <span className="text-muted-foreground">
          {t.heartbeatLabel} <span className="text-foreground">{intervalLabel}</span>
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
                ? t.resuming
                : t.pausing
              : paused
                ? t.resumeTracking
                : t.pauseTracking}
          </button>
        )}
        <SyncControl
          lastSyncedAt={lastSyncedAt}
          paused={paused}
          installed={installed}
          label={t.syncNow}
          syncingLabel={t.syncing}
          doneLabel={t.syncing}
        />
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
