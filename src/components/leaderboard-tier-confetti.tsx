"use client";

import { useEffect } from "react";

// Fires a tiny canvas-free confetti burst the first time a user lands
// on /leaderboard at a higher tier than localStorage remembers. No new
// dependency: we render 30 absolutely-positioned divs, animate them
// outward via Web Animations API, then GC. The component itself is
// invisible — it just runs the effect.

const COLORS = [
  "#ef4444",
  "#f59e0b",
  "#eab308",
  "#10b981",
  "#3b82f6",
  "#8b5cf6",
  "#ec4899",
];

const STORAGE_KEY = "tu-last-leaderboard-tier";

export function LeaderboardTierConfetti({
  currentTierIdx,
}: {
  currentTierIdx: number;
}) {
  useEffect(() => {
    try {
      const prevRaw = localStorage.getItem(STORAGE_KEY);
      const prev = prevRaw == null ? null : Number(prevRaw);
      if (prev != null && currentTierIdx > prev) {
        fire();
      }
      localStorage.setItem(STORAGE_KEY, String(currentTierIdx));
    } catch {
      // localStorage can throw in private modes — silently no-op.
    }
  }, [currentTierIdx]);

  return null;
}

function fire() {
  if (typeof document === "undefined") return;
  const container = document.createElement("div");
  container.setAttribute("aria-hidden", "true");
  container.style.cssText =
    "position:fixed;inset:0;pointer-events:none;z-index:9999;overflow:hidden;";
  document.body.appendChild(container);

  const N = 36;
  for (let i = 0; i < N; i++) {
    const p = document.createElement("div");
    const color = COLORS[i % COLORS.length];
    const angle = (i / N) * Math.PI * 2;
    const dist = 240 + Math.random() * 120;
    const tx = Math.cos(angle) * dist;
    const ty = Math.sin(angle) * dist - 80; // bias upward
    p.style.cssText = `
      position:absolute;
      left:50%;top:50%;
      width:8px;height:8px;
      background:${color};
      border-radius:1px;
      transform:translate(-50%,-50%);
    `;
    container.appendChild(p);
    p.animate(
      [
        {
          transform: `translate(-50%,-50%) rotate(0deg)`,
          opacity: 1,
        },
        {
          transform: `translate(calc(-50% + ${tx}px), calc(-50% + ${ty}px + 200px)) rotate(${360 + Math.random() * 360}deg)`,
          opacity: 0,
        },
      ],
      { duration: 1100 + Math.random() * 400, easing: "cubic-bezier(.2,.7,.3,1)" }
    );
  }
  setTimeout(() => container.remove(), 1800);
}
