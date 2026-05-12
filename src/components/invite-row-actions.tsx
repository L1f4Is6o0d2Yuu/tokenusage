"use client";

import { useState } from "react";
import { Copy, Check, Link as LinkIcon } from "lucide-react";

// Two compact icon buttons for re-copying an existing invite's code
// and link from the invite list. Each button confirms with a check
// icon for ~1.5s. Buttons are disabled when no plaintext code is
// available (i.e. legacy hash-only rows from before v0.17).
export function InviteRowActions({
  code,
  url,
  copyCodeLabel,
  copyLinkLabel,
  copiedLabel,
}: {
  code: string | null;
  url: string | null;
  copyCodeLabel: string;
  copyLinkLabel: string;
  copiedLabel: string;
}) {
  const [done, setDone] = useState<"" | "code" | "url">("");

  async function copy(which: "code" | "url") {
    const value = which === "code" ? code : url;
    if (!value) return;
    try {
      await navigator.clipboard.writeText(value);
      setDone(which);
      setTimeout(() => setDone(""), 1500);
    } catch {
      // best-effort — no toast surface here
    }
  }

  if (!code || !url) return null;

  return (
    <div className="flex items-center gap-1.5">
      <button
        type="button"
        onClick={() => copy("code")}
        title={done === "code" ? copiedLabel : copyCodeLabel}
        aria-label={copyCodeLabel}
        className="inline-flex h-7 items-center gap-1 rounded-md border border-border-subtle bg-bg-panel px-2 text-[11px] text-fg-default transition-colors hover:bg-bg-panel-2"
      >
        {done === "code" ? (
          <Check className="h-3 w-3 text-success" strokeWidth={2.4} />
        ) : (
          <Copy className="h-3 w-3" strokeWidth={1.8} />
        )}
        <span className="font-mono tabular-nums">{code}</span>
      </button>
      <button
        type="button"
        onClick={() => copy("url")}
        title={done === "url" ? copiedLabel : copyLinkLabel}
        aria-label={copyLinkLabel}
        className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-border-subtle bg-bg-panel text-fg-muted transition-colors hover:bg-bg-panel-2 hover:text-fg-default"
      >
        {done === "url" ? (
          <Check className="h-3.5 w-3.5 text-success" strokeWidth={2.4} />
        ) : (
          <LinkIcon className="h-3.5 w-3.5" strokeWidth={1.8} />
        )}
      </button>
    </div>
  );
}
