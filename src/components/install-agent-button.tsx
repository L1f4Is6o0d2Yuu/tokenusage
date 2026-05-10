"use client";

import { useState, useTransition } from "react";
import { cn } from "@/lib/utils";

// One-click install flow. The button:
//   1. Hits POST /api/install-command which auto-creates an API token and
//      returns ready-to-paste install commands.
//   2. Reveals the recommended (Homebrew) command inline with a [Copy]
//      button, plus a toggle for the alternative (curl|sh) for users
//      without Homebrew.
//
// We intentionally don't auto-create the token on page load — only when
// the user clicks — so dashboards aren't littered with stale tokens for
// people who never actually ran the install.

type Commands = { brew: string; curl: string };

export function InstallAgentButton() {
  const [pending, startTransition] = useTransition();
  const [data, setData] = useState<Commands | null>(null);
  const [mode, setMode] = useState<"brew" | "curl">("brew");
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
        const json = (await res.json()) as { ok: boolean; commands?: Commands };
        if (!json.ok || !json.commands) {
          setError("Server returned an unexpected response.");
          return;
        }
        setData(json.commands);
      } catch {
        setError("Network error.");
      }
    });
  }

  async function copy() {
    if (!data) return;
    try {
      await navigator.clipboard.writeText(data[mode]);
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
      <div className="flex gap-2 text-xs">
        <button
          type="button"
          onClick={() => {
            setMode("brew");
            setCopied(false);
          }}
          className={cn(
            "rounded-md border px-3 py-1.5 font-medium",
            mode === "brew"
              ? "border-foreground bg-foreground text-background"
              : "border-border bg-background text-muted-foreground hover:text-foreground"
          )}
        >
          Homebrew (recommended)
        </button>
        <button
          type="button"
          onClick={() => {
            setMode("curl");
            setCopied(false);
          }}
          className={cn(
            "rounded-md border px-3 py-1.5 font-medium",
            mode === "curl"
              ? "border-foreground bg-foreground text-background"
              : "border-border bg-background text-muted-foreground hover:text-foreground"
          )}
        >
          curl | sh
        </button>
      </div>
      <pre className="overflow-x-auto rounded border bg-muted px-4 py-3 font-mono text-xs leading-relaxed">
        <code>{data[mode]}</code>
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
          {mode === "brew"
            ? "Installs the tokenusage CLI via Homebrew, then registers the agent as a background service."
            : "Bash installer — works on any Mac or Linux without Homebrew."}
        </p>
      </div>
      {error && (
        <p className="text-xs text-red-700 dark:text-red-300">{error}</p>
      )}
    </div>
  );
}
