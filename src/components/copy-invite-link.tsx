"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";

type Labels = {
  copyLink: string;
  copied: string;
  copyError: string;
};

export function CopyInviteLink({ url, t }: { url: string; t: Labels }) {
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function copy() {
    setError(null);
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2200);
    } catch {
      setError(t.copyError);
    }
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-stretch">
        <code className="flex-1 break-all rounded border bg-background px-3 py-2 font-mono text-sm">
          {url}
        </code>
        <button
          type="button"
          onClick={copy}
          className={cn(
            "shrink-0 rounded-md border bg-background px-3 py-2 text-xs font-medium hover:bg-muted",
            copied && "border-emerald-500 text-emerald-700 dark:text-emerald-300"
          )}
        >
          {copied ? t.copied : t.copyLink}
        </button>
      </div>
      {error && (
        <p className="text-xs text-red-700 dark:text-red-300">{error}</p>
      )}
    </div>
  );
}
