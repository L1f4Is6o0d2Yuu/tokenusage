import { ImageResponse } from "next/og";
import { readCurrentUser } from "@/lib/auth";
import { loadRecords } from "@/lib/adapters";
import {
  aggregate,
  filterByPeriod,
  periodWindow,
  pickGranularity,
} from "@/lib/aggregate";

export const runtime = "nodejs";

// Generates a 1200x630 OG-card-shaped PNG of the signed-in user's
// today usage. Gate behind session — anyone with the URL gets the
// PNG only if they're already logged in. Public sharable URLs would
// need a signed share token; out of scope for v1.
export async function GET() {
  const user = await readCurrentUser();
  if (!user) {
    return new Response("not signed in", { status: 401 });
  }

  const { records } = await loadRecords();
  const window = periodWindow("today");
  const scoped = filterByPeriod(records, "today");
  const granularity = pickGranularity(scoped, "today");
  const agg = aggregate(scoped, granularity, window);

  const cost = agg.totals.costUsd;
  const tokens = agg.totals.totalTokens;
  const sessions = agg.totals.records;
  const topModel = agg.byModel[0]?.model ?? "—";

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          background: "linear-gradient(135deg, #0f0f1a 0%, #1a1a3a 100%)",
          color: "white",
          padding: "60px 80px",
          fontFamily: "ui-monospace, monospace",
        }}
      >
        {/* Brand row */}
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <svg width="48" height="36" viewBox="0 0 64 48" fill="none" stroke="#7B6FFF">
            <path
              d="M4 38 L 13 22 L 22 31 L 32 13 L 42 24 L 52 8 L 60 16"
              strokeWidth="5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <circle cx="60" cy="16" r="5" fill="#7B6FFF" />
          </svg>
          <div style={{ display: "flex", fontSize: 36, fontWeight: 600 }}>
            <span style={{ color: "white" }}>token</span>
            <span style={{ color: "#7B6FFF" }}>u</span>
            <span style={{ color: "white" }}>sage</span>
          </div>
        </div>

        {/* Headline */}
        <div style={{ display: "flex", flexDirection: "column", marginTop: 40 }}>
          <div style={{ display: "flex", fontSize: 24, color: "#9999bb" }}>
            {user.username} · today
          </div>
          <div style={{ display: "flex", fontSize: 120, fontWeight: 700, marginTop: 10 }}>
            ${cost.toFixed(2)}
          </div>
        </div>

        {/* Stat row */}
        <div
          style={{
            display: "flex",
            marginTop: "auto",
            gap: 60,
            paddingTop: 40,
            borderTop: "1px solid #2a2a4a",
          }}
        >
          <Stat label="tokens" value={formatTokensShort(tokens)} />
          <Stat label="sessions" value={String(sessions)} />
          <Stat label="top model" value={topModel} small />
        </div>
      </div>
    ),
    { width: 1200, height: 630 }
  );
}

function Stat({
  label,
  value,
  small,
}: {
  label: string;
  value: string;
  small?: boolean;
}) {
  return (
    <div style={{ display: "flex", flexDirection: "column" }}>
      <div style={{ display: "flex", fontSize: 14, color: "#9999bb", textTransform: "uppercase", letterSpacing: 2 }}>
        {label}
      </div>
      <div style={{ display: "flex", fontSize: small ? 28 : 48, fontWeight: 600, marginTop: 4 }}>
        {value}
      </div>
    </div>
  );
}

function formatTokensShort(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(Math.round(n));
}
