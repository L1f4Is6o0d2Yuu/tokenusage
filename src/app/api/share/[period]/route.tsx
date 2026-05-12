import { ImageResponse } from "next/og";
import { readFileSync } from "fs";
import path from "path";
import { readCurrentUser } from "@/lib/auth";
import { loadRecords } from "@/lib/adapters";
import {
  aggregate,
  filterByPeriod,
  periodWindow,
  pickGranularity,
} from "@/lib/aggregate";
import { listUserSubscriptions, PLAN_CATALOG } from "@/lib/subscriptions";
import { computeRoi, periodDays } from "@/lib/roi-client";
import { totalActiveHours } from "@/lib/activity";
import { SharePoster, computeSharePosterData } from "@/components/share-poster";
import type { Period } from "@/lib/types";

export const runtime = "nodejs";

const VALID: Period[] = ["today", "24h", "7d", "30d", "month", "year", "all"];

// Bundled Noto Sans SC font for CJK glyph reliability (Satori has no
// built-in CJK; Alpine container has no system CJK fonts). Same WOFFs
// are also served from /fonts/ for the client-side share render path.
const FONT_DIR = path.join(process.cwd(), "public", "fonts");
let cjkFontData: Buffer | null = null;
let latinFontData: Buffer | null = null;
function getCjkFont(): Buffer {
  if (!cjkFontData) {
    cjkFontData = readFileSync(path.join(FONT_DIR, "NotoSansSC-500.woff"));
  }
  return cjkFontData;
}
function getLatinFont(): Buffer {
  if (!latinFontData) {
    latinFontData = readFileSync(
      path.join(FONT_DIR, "NotoSansSC-Latin-500.woff")
    );
  }
  return latinFontData;
}

// Server-side render of the same SharePoster used client-side by the
// dashboard's Share button. Kept available because (a) Open Graph
// crawlers can't run our client renderer and (b) future public share
// URLs will plug into this route. ShareButton itself no longer hits
// this endpoint — it renders the poster locally and downloads.
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ period: string }> }
) {
  const user = await readCurrentUser();
  if (!user) return new Response("not signed in", { status: 401 });

  const { period: rawPeriod } = await params;
  const period: Period = (VALID as string[]).includes(rawPeriod)
    ? (rawPeriod as Period)
    : "today";

  const { records } = await loadRecords();
  const window = periodWindow(period);
  const scoped = filterByPeriod(records, period);
  const granularity = pickGranularity(scoped, period);
  const agg = aggregate(scoped, granularity, window);

  const activePlanIds = listUserSubscriptions(user.id);
  const activePlans = activePlanIds
    .map((id) => PLAN_CATALOG.find((p) => p.id === id))
    .filter((p): p is (typeof PLAN_CATALOG)[number] => p != null)
    .map((p) => ({ id: p.id, vendor: p.vendor, name: p.name, monthlyUsd: p.monthlyUsd }));

  const days = periodDays(period);
  const roi = computeRoi(agg.totals.costUsd, activePlans, days);
  const codingHours = totalActiveHours(scoped, window);

  const data = computeSharePosterData({
    username: user.username,
    period,
    agg,
    roi,
    activePlans,
    days,
    codingHours,
    userKey: `${user.id}:${Date.now()}`,
  });

  return new ImageResponse(<SharePoster data={data} />, {
    width: 1080,
    height: 1920,
    fonts: [
      {
        name: "Noto Sans SC",
        data: getLatinFont(),
        style: "normal",
        weight: 500,
      },
      {
        name: "Noto Sans SC",
        data: getCjkFont(),
        style: "normal",
        weight: 500,
      },
    ],
  });
}
