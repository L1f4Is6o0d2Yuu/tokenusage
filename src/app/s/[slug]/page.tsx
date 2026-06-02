import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { headers } from "next/headers";
import { formatUsd } from "@/lib/format";
import { isCloudflareRuntime } from "@/lib/runtime";
import type { SavedShare } from "@/lib/shares";

// Public-by-link share view. WeChat / X / 微博 crawlers will pick up
// the og:image tag and inline-preview the poster — the actual point
// of saving a share link.

const W = {
  primary: "#9fe870",
  primaryPale: "#e2f6d5",
  ink: "#0e0f0c",
  body: "#454745",
  mute: "#868685",
  canvas: "#ffffff",
  canvasSoft: "#e8ebe6",
  positive: "#2ead4b",
};

async function siteOrigin(): Promise<string> {
  // Open Graph requires absolute URLs. Derive the origin from request
  // headers so dev (localhost:3000) and prod (tokenusage.online) both
  // produce correct og:image links.
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "tokenusage.online";
  const proto = h.get("x-forwarded-proto") ?? "https";
  return `${proto}://${host}`;
}

async function readShare(slug: string): Promise<SavedShare | null> {
  if (isCloudflareRuntime()) {
    const { getShareBySlugD1 } = await import("@/lib/cloudflare-shares");
    return getShareBySlugD1(slug);
  }
  const { getShareBySlug } = await import("@/lib/shares");
  return getShareBySlug(slug);
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const share = await readShare(slug);
  if (!share || share.revokedAt != null) {
    return { title: "tokenusage — 分享不存在" };
  }
  const origin = await siteOrigin();
  const imageUrl = `${origin}/api/shares/${slug}`;
  const title = share.apiValueUsd
    ? `${share.multiplier ?? ""} · ${formatUsd(share.apiValueUsd)} · tokenusage`
    : `tokenusage 分享`;
  const description = share.taunt ?? "AI 工具花费汇总 + 一句锐评";
  return {
    title,
    description,
    openGraph: {
      title,
      description,
      images: [{ url: imageUrl, width: 1080, height: 1920 }],
      type: "website",
      siteName: "tokenusage",
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [imageUrl],
    },
  };
}

export default async function SharePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const share = await readShare(slug);
  if (!share || share.revokedAt != null) notFound();

  const imageUrl = `/api/shares/${slug}`;
  return (
    <div
      style={{
        minHeight: "100vh",
        background: W.canvasSoft,
        color: W.ink,
        fontFamily:
          '-apple-system, BlinkMacSystemFont, "Segoe UI", Inter, system-ui, "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", sans-serif',
        padding: "40px 24px",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 28,
      }}
    >
      {/* Brand row */}
      <Link
        href="/"
        style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          fontSize: 20,
          fontWeight: 700,
          color: W.ink,
          textDecoration: "none",
        }}
      >
        <svg width="28" height="21" viewBox="0 0 64 48" fill="none" stroke="#163300">
          <path
            d="M4 38 L 13 22 L 22 31 L 32 13 L 42 24 L 52 8 L 60 16"
            strokeWidth="5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <circle cx="60" cy="16" r="6" fill={W.primary} stroke="none" />
        </svg>
        <span>
          token<span style={{ color: W.positive }}>u</span>sage
        </span>
      </Link>

      {/* Poster — width clamped so the 9:16 shape fits any viewport */}
      <div
        style={{
          width: "100%",
          maxWidth: 540,
          aspectRatio: "9 / 16",
          borderRadius: 24,
          overflow: "hidden",
          background: W.ink,
          boxShadow: "0 30px 80px -40px rgba(14,15,12,0.4)",
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={imageUrl}
          alt="tokenusage share"
          width={1080}
          height={1920}
          style={{
            display: "block",
            width: "100%",
            height: "100%",
            objectFit: "cover",
          }}
        />
      </div>

      <p
        style={{
          fontSize: 14,
          color: W.mute,
          margin: 0,
        }}
      >
        长按 / 右键图片可保存。
      </p>

      {/* CTA — "view your own" */}
      <div
        style={{
          background: W.primaryPale,
          padding: 32,
          borderRadius: 24,
          maxWidth: 540,
          width: "100%",
          display: "flex",
          flexDirection: "column",
          gap: 14,
          textAlign: "center",
        }}
      >
        <h2
          style={{
            fontSize: 28,
            fontWeight: 900,
            margin: 0,
            lineHeight: 1.1,
          }}
        >
          想看自己的？
        </h2>
        <p style={{ fontSize: 15, color: W.body, margin: 0 }}>
          tokenusage 把 Claude Code / Codex / Cursor / Hermes
          的 token 花费聚到一张图上，告诉你套餐回本了没。
        </p>
        <Link
          href="/"
          style={{
            display: "inline-flex",
            justifyContent: "center",
            alignItems: "center",
            padding: "14px 24px",
            borderRadius: 24,
            background: W.ink,
            color: W.primary,
            fontSize: 16,
            fontWeight: 700,
            textDecoration: "none",
            marginTop: 4,
          }}
        >
          去看看
        </Link>
      </div>
    </div>
  );
}
