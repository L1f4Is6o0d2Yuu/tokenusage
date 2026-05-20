"use client";

import { useState } from "react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

type Labels = {
  copyCode: string;
  copyLink: string;
  copied: string;
  copyError: string;
};

// Renders the short TU code prominently and offers two copy buttons:
// "Copy code" for "TU1234" alone (good when handing the code off via
// chat) and "Copy link" for the full /signup?invite=TU1234 URL (good
// when sending a clickable share). Both are async-clipboard with a
// brief confirmed state.
export function CopyInviteLink({
  code,
  url,
  t,
}: {
  code: string;
  url: string;
  t: Labels;
}) {
  const [done, setDone] = useState<"" | "code" | "url">("");
  const [error, setError] = useState<string | null>(null);

  async function copy(which: "code" | "url") {
    setError(null);
    try {
      await navigator.clipboard.writeText(which === "code" ? code : url);
      setDone(which);
      toast.success(t.copied);
      setTimeout(() => setDone(""), 2200);
    } catch {
      setError(t.copyError);
      toast.error(t.copyError);
    }
  }

  return (
    <div className="space-y-3">
      {/* Big readable code — easy to read aloud / OCR-friendly */}
      <div className="rounded-md border border-border-subtle bg-bg-panel-2 p-3 text-center">
        <div className="text-[10px] uppercase tracking-wider text-fg-muted">code</div>
        <div className="mt-1 font-mono text-2xl font-semibold tracking-[0.18em] text-fg-strong">
          {code}
        </div>
      </div>

      {/* Full share URL on one line, both copy buttons side-by-side */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-stretch">
        <code className="flex-1 break-all rounded border border-border-subtle bg-bg-input px-3 py-2 font-mono text-xs text-fg-default">
          {url}
        </code>
        <div className="flex shrink-0 gap-2">
          <button
            type="button"
            onClick={() => copy("code")}
            className={cn(
              "rounded-md border border-border-subtle bg-bg-panel px-3 py-2 text-xs font-medium transition-colors hover:bg-bg-panel-2",
              done === "code" && "border-success text-success"
            )}
          >
            {done === "code" ? t.copied : t.copyCode}
          </button>
          <button
            type="button"
            onClick={() => copy("url")}
            className={cn(
              "rounded-md bg-accent px-3 py-2 text-xs font-medium text-accent-fg transition-opacity hover:opacity-90",
              done === "url" && "opacity-80"
            )}
          >
            {done === "url" ? t.copied : t.copyLink}
          </button>
        </div>
      </div>

      {error && <p className="text-xs text-danger">{error}</p>}
    </div>
  );
}
