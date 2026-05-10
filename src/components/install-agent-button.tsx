"use client";

import { useState, useTransition } from "react";
import { cn } from "@/lib/utils";

// One-click install flow. The button:
//   1. Hits POST /api/install-command which auto-creates an API token and
//      returns the curl install command.
//   2. Reveals the command inline with a [Copy] button so the user goes
//      straight from "I just signed up" to "I have a runnable command in
//      my clipboard" without ever leaving the dashboard.
//
// We intentionally don't auto-create the token on page load — only when
// the user clicks — so dashboards aren't littered with stale tokens for
// people who never actually ran the install.
export function InstallAgentButton() {
  const [pending, startTransition] = useTransition();
  const [data, setData] = useState<{ command: string } | null>(null);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function generate() {
    setError(null);
    startTransition(async () => {
      try {
        const res = await fetch("/api/install-command", { method: "POST" });
        if (!res.ok) {
          setError("Failed to generate install command. Refresh and try again.");
          return;
        }
        const json = (await res.json()) as { ok: boolean; command?: string };
        if (!json.ok || !json.command) {
          setError("Server returned an unexpected response.");
          return;
        }
        setData({ command: json.command });
      } catch {
        setError("Network error.");
      }
    });
  }

  async function copy() {
    if (!data) return;
    try {
      await navigator.clipboard.writeText(data.command);
      setCopied(true);
      setTimeout(() => setCopied(false), 2200);
    } catch {
      setError("Couldn't copy to clipboard. Select the command manually.");
    }
  }

  if (!data) {
    return (
      <div>
        <button
          type="button"
          onClick={generate}
          disabled={pending}
          className={cn(
            "rounded-md bg-foreground px-4 py-2 text-sm font-medium text-background hover:opacity-90",
            "disabled:cursor-not-allowed disabled:opacity-60"
          )}
        >
          {pending ? "Generating…" : "Generate install command"}
        </button>
        {error && (
          <p className="mt-2 text-xs text-red-700 dark:text-red-300">{error}</p>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <pre className="overflow-x-auto rounded border bg-muted px-4 py-3 font-mono text-xs leading-relaxed">
        <code>{data.command}</code>
      </pre>
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={copy}
          className={cn(
            "rounded-md border bg-background px-3 py-1.5 text-xs font-medium hover:bg-muted",
            copied && "border-emerald-500 text-emerald-700 dark:text-emerald-300"
          )}
        >
          {copied ? "Copied ✓" : "Copy command"}
        </button>
        <p className="text-xs text-muted-foreground">
          Paste in a terminal on the machine you want to track. The agent
          installs as a background service and starts uploading immediately.
        </p>
      </div>
      {error && (
        <p className="text-xs text-red-700 dark:text-red-300">{error}</p>
      )}
    </div>
  );
}
