"use client";

import { useState } from "react";

// Pulsing red dot + popover that surfaces an "upgrade your agent"
// command for the user to paste into a terminal. Rendered inline in
// the sidebar brand row when the user's last-reported agent version
// is older than LATEST_AGENT_VERSION.
//
// The breathing animation is the entire point — passive notification
// the user can't help noticing on their next dashboard visit.

const UPGRADE_CMD =
  "brew upgrade L1f4Is6o0d2Yuu/tap/tokenusage && tokenusage start";

export function AgentUpdateBadge({
  currentVersion,
  latestVersion,
  labels,
}: {
  currentVersion: string;
  latestVersion: string;
  labels: {
    update: string;
    bodyLine1: string; // "{current} → {latest}"
    bodyLine2: string;
    copyButton: string;
    copied: string;
    later: string;
  };
}) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(UPGRADE_CMD);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      // ignore — terminal-paste flow doesn't strictly need clipboard
    }
  }

  const versionLine = labels.bodyLine1
    .replace("{current}", currentVersion)
    .replace("{latest}", latestVersion);

  return (
    <>
      {/* Trigger: tiny red dot sitting next to the brand. We don't want
          a full chip in the sidebar — the dot alone draws the eye via
          the ping animation. */}
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label={labels.update}
        title={labels.update}
        className="relative ml-1 flex h-2 w-2 shrink-0"
      >
        <span className="motion-safe:animate-ping absolute inline-flex h-full w-full rounded-full bg-danger opacity-70" />
        <span className="relative inline-flex h-2 w-2 rounded-full bg-danger" />
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm"
          onClick={() => setOpen(false)}
        >
          <div
            className="w-full max-w-md rounded-lg border border-border-subtle bg-bg-panel p-5 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-base font-medium tracking-tight text-fg-strong">
              {labels.update}
            </h2>
            <p className="mt-1 text-sm text-fg-muted">{versionLine}</p>
            <p className="mt-3 text-xs text-fg-muted">{labels.bodyLine2}</p>
            <pre className="mt-3 overflow-x-auto rounded-md border border-border-subtle bg-bg-input px-3 py-2.5 font-mono text-[12px] leading-relaxed text-fg-default">
              {UPGRADE_CMD}
            </pre>
            <div className="mt-4 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-md border border-border-subtle bg-bg-panel px-3 py-1.5 text-xs text-fg-default hover:bg-bg-panel-2"
              >
                {labels.later}
              </button>
              <button
                type="button"
                onClick={copy}
                className="rounded-md bg-accent px-3 py-1.5 text-xs font-medium text-accent-fg hover:opacity-90"
              >
                {copied ? labels.copied : labels.copyButton}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
