"use client";

import { useState, useTransition } from "react";
import { cn } from "@/lib/utils";
import type { Dictionary } from "@/i18n/types";

type Commands = { brew: string; curl: string };

export function InstallAgentButton({ t }: { t: Dictionary["install"] }) {
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
          setError(t.failedToGenerate);
          return;
        }
        const json = (await res.json()) as { ok: boolean; commands?: Commands };
        if (!json.ok || !json.commands) {
          setError(t.serverError);
          return;
        }
        setData(json.commands);
      } catch {
        setError(t.networkError);
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
      setError(t.clipboardError);
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
          {pending ? t.generating : t.generateCommand}
        </button>
        {error && (
          <p className="mt-2 text-xs text-red-700 dark:text-red-300">{error}</p>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2 text-xs">
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
          {t.tabBrew}
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
          {t.tabCurl}
        </button>
      </div>
      <pre className="overflow-x-auto rounded border bg-muted px-4 py-3 font-mono text-xs leading-relaxed">
        <code>{data[mode]}</code>
      </pre>
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
        <button
          type="button"
          onClick={copy}
          className={cn(
            "self-start rounded-md border bg-background px-3 py-1.5 text-xs font-medium hover:bg-muted",
            copied && "border-emerald-500 text-emerald-700 dark:text-emerald-300"
          )}
        >
          {copied ? t.copied : t.copyCommand}
        </button>
        <p className="text-xs text-muted-foreground">
          {mode === "brew" ? t.pasteHintBrew : t.pasteHintCurl}
        </p>
      </div>
      {error && (
        <p className="text-xs text-red-700 dark:text-red-300">{error}</p>
      )}
    </div>
  );
}
