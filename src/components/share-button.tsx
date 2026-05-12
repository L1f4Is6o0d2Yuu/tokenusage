"use client";

import { useState } from "react";
import { Share2, X, Download, Copy, Check } from "lucide-react";
import type { Period } from "@/lib/types";

// "Share" button + modal. Opens an `<img>` of the share endpoint
// (1080×1920 vertical card) with copy-URL / download / WeChat-style
// long-press hints. Image regenerates each modal open so a fresh
// taunt rolls into the card.

export function ShareButton({
  period,
  labels,
}: {
  period: Period;
  labels: {
    share: string;
    title: string;
    description: string;
    copyUrl: string;
    download: string;
    copied: string;
    longPress: string;
    close: string;
  };
}) {
  const [open, setOpen] = useState(false);
  const [bust, setBust] = useState(0);
  const [copied, setCopied] = useState(false);

  const url = `/api/share/${period}${bust ? `?v=${bust}` : ""}`;
  const absoluteUrl =
    typeof window !== "undefined"
      ? new URL(url, window.location.origin).toString()
      : url;

  function openModal() {
    setBust(Date.now());
    setOpen(true);
  }
  async function copyUrl() {
    try {
      await navigator.clipboard.writeText(absoluteUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      // best-effort
    }
  }
  function download() {
    const a = document.createElement("a");
    a.href = url;
    a.download = `tokenusage-${period}.png`;
    document.body.appendChild(a);
    a.click();
    a.remove();
  }

  return (
    <>
      <button
        type="button"
        onClick={openModal}
        title={labels.share}
        className="inline-flex items-center gap-1.5 rounded-md border border-border-subtle bg-bg-panel px-3 py-1.5 text-xs font-medium text-fg-default transition-colors hover:border-accent hover:text-accent"
      >
        <Share2 className="h-3.5 w-3.5" strokeWidth={2} aria-hidden />
        {labels.share}
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur"
          onClick={() => setOpen(false)}
        >
          <div
            className="relative flex max-h-[90vh] w-full max-w-md flex-col gap-4 rounded-lg border border-border-subtle bg-bg-panel p-4"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="absolute right-3 top-3 rounded-full p-1 text-fg-muted hover:bg-bg-panel-2"
              aria-label={labels.close}
            >
              <X className="h-4 w-4" />
            </button>
            <div>
              <h2 className="text-base font-medium text-fg-strong">
                {labels.title}
              </h2>
              <p className="mt-1 text-xs text-fg-muted">{labels.description}</p>
            </div>
            {/* Image preview — server returns the PNG, we just <img src> it.
                aspect-[9/16] keeps the modal a phone shape on desktop. */}
            <div className="relative overflow-hidden rounded-md bg-bg-input">
              <img
                key={bust}
                src={url}
                alt="tokenusage share card"
                className="block w-full"
                style={{ aspectRatio: "9 / 16" }}
              />
            </div>
            <p className="text-[11px] italic text-fg-muted">{labels.longPress}</p>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={copyUrl}
                className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-md border border-border-subtle bg-bg-panel px-3 py-2 text-xs font-medium text-fg-default hover:bg-bg-panel-2"
              >
                {copied ? (
                  <Check className="h-3.5 w-3.5 text-success" strokeWidth={2.4} />
                ) : (
                  <Copy className="h-3.5 w-3.5" strokeWidth={1.8} />
                )}
                {copied ? labels.copied : labels.copyUrl}
              </button>
              <button
                type="button"
                onClick={download}
                className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-md bg-accent px-3 py-2 text-xs font-medium text-accent-fg hover:opacity-90"
              >
                <Download className="h-3.5 w-3.5" strokeWidth={2} />
                {labels.download}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
