"use client";

import { useRef, useState } from "react";
import { Share2, Check, AlertCircle, Loader2 } from "lucide-react";
import { computeRoi, periodDays } from "@/lib/roi-client";
import type { PlanLite } from "@/lib/roi-client";
import type { Aggregation, Period } from "@/lib/types";
import {
  SharePoster,
  computeSharePosterData,
  type SharePosterData,
} from "@/components/share-poster";

// Client-side share renderer. Renders SharePoster into a hidden
// off-screen DOM node, screenshots with html-to-image, and triggers a
// PNG download. Zero server cost compared to the old modal flow that
// fired /api/share/[period] every modal open.
//
// The server route is still alive (Open Graph, future public share
// URLs) — it just isn't used by this button.

// Font loader — Noto Sans SC chinese-simplified subset, fetched once
// per browser tab and cached at the FontFace layer. First click pays
// the ~1.5MB download; subsequent shares are instant.
let fontPromise: Promise<void> | null = null;
function ensureCJKFont(): Promise<void> {
  if (typeof document === "undefined") return Promise.resolve();
  if (fontPromise) return fontPromise;
  fontPromise = (async () => {
    if (!("fonts" in document)) return;
    try {
      const font = new FontFace(
        "Noto Sans SC",
        `url(/fonts/NotoSansSC-500.woff) format("woff")`,
        { style: "normal", weight: "500" }
      );
      await font.load();
      document.fonts.add(font);
      await document.fonts.ready;
    } catch (e) {
      // Font load failure isn't fatal — html-to-image falls back to
      // system fonts; the poster will look slightly different but
      // still readable.
      console.warn("[share] CJK font load failed, falling back", e);
    }
  })();
  return fontPromise;
}

export function ShareButton({
  username,
  userId,
  period,
  agg,
  codingHours,
  activePlans,
  labels,
}: {
  username: string;
  userId: number;
  period: Period;
  agg: Aggregation;
  codingHours: number;
  activePlans: PlanLite[];
  labels: { share: string; copied: string };
}) {
  const [status, setStatus] = useState<"idle" | "loading" | "done" | "error">(
    "idle"
  );
  const [posterData, setPosterData] = useState<SharePosterData | null>(null);
  const posterRef = useRef<HTMLDivElement | null>(null);

  async function handleSave() {
    if (status === "loading") return;
    setStatus("loading");
    try {
      const days = periodDays(period);
      const roi = computeRoi(agg.totals.costUsd, activePlans, days);
      const data = computeSharePosterData({
        username,
        period,
        agg,
        roi,
        activePlans,
        days,
        codingHours,
        userKey: `${userId}:${Date.now()}`,
      });

      setPosterData(data);
      await ensureCJKFont();
      // Two RAFs so React has fully committed the SharePoster subtree
      // before we hand the node to html-to-image.
      await new Promise((r) => requestAnimationFrame(r));
      await new Promise((r) => requestAnimationFrame(r));

      const { toPng } = await import("html-to-image");
      if (!posterRef.current) throw new Error("poster node missing");
      const dataUrl = await toPng(posterRef.current, {
        width: 1080,
        height: 1920,
        pixelRatio: 1,
        cacheBust: false,
        // Block external image fetches — we have none, this keeps the
        // capture pipeline synchronous-ish.
        skipFonts: false,
      });

      const a = document.createElement("a");
      a.href = dataUrl;
      a.download = `tokenusage-${period}-${Date.now()}.png`;
      document.body.appendChild(a);
      a.click();
      a.remove();

      setStatus("done");
      setTimeout(() => setStatus("idle"), 1800);
    } catch (e) {
      console.error("[share] render failed", e);
      setStatus("error");
      setTimeout(() => setStatus("idle"), 2400);
    } finally {
      // Hold the hidden node for a moment so the data-URL download
      // doesn't race the unmount, then drop it.
      setTimeout(() => setPosterData(null), 1500);
    }
  }

  const Icon =
    status === "done"
      ? Check
      : status === "error"
        ? AlertCircle
        : status === "loading"
          ? Loader2
          : Share2;

  return (
    <>
      <button
        type="button"
        onClick={handleSave}
        disabled={status === "loading"}
        title={labels.share}
        className="inline-flex items-center gap-1.5 rounded-md border border-border-subtle bg-bg-panel px-3 py-1.5 text-xs font-medium text-fg-default transition-colors hover:border-accent hover:text-accent disabled:cursor-not-allowed disabled:opacity-70"
      >
        <Icon
          className={`h-3.5 w-3.5 ${status === "loading" ? "animate-spin" : ""}`}
          strokeWidth={2}
          aria-hidden
        />
        {status === "done" ? labels.copied : labels.share}
      </button>

      {posterData && (
        <div
          style={{
            position: "fixed",
            left: -99999,
            top: 0,
            width: "1080px",
            height: "1920px",
            pointerEvents: "none",
            zIndex: -1,
            overflow: "hidden",
          }}
          aria-hidden
        >
          <div
            ref={posterRef}
            style={{ width: "1080px", height: "1920px" }}
          >
            <SharePoster data={posterData} />
          </div>
        </div>
      )}
    </>
  );
}
