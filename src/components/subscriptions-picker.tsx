"use client";

import { useMemo, useState } from "react";
import type { PlanDef } from "@/lib/subscriptions";

// Card-grid plan picker with a vendor filter on top and a team-vs-
// solo split. Sort within each section is monthly price ascending so
// the cheapest tier the user might pay for sits closest to the top.
//
// The form action this picker submits to is the existing
// `saveSubscriptionsAction` — we just hand it a different layout.

export function SubscriptionsPicker({
  plans,
  active,
  vendorLabel,
  teamLabel,
  soloLabel,
  allVendors,
  payAsYouGoNote,
}: {
  plans: PlanDef[];
  active: Set<string>;
  vendorLabel: string;
  teamLabel: string;
  soloLabel: string;
  allVendors: string;
  payAsYouGoNote: string;
}) {
  // Distinct vendor list in catalog order.
  const vendors = useMemo(() => {
    const seen = new Set<string>();
    const out: string[] = [];
    for (const p of plans) {
      if (!seen.has(p.vendor)) {
        seen.add(p.vendor);
        out.push(p.vendor);
      }
    }
    return out;
  }, [plans]);

  const [filter, setFilter] = useState<string>("__all__");

  const filtered = useMemo(() => {
    if (filter === "__all__") return plans;
    return plans.filter((p) => p.vendor === filter);
  }, [plans, filter]);

  const teamPlans = useMemo(
    () => filtered.filter(isTeamPlan).sort(byPrice),
    [filtered]
  );
  const soloPlans = useMemo(
    () => filtered.filter((p) => !isTeamPlan(p)).sort(byPrice),
    [filtered]
  );

  return (
    <div className="space-y-5">
      {/* Vendor filter chips. Sticky-ish so it stays visible while the
          user scrolls a long list. */}
      <div className="flex flex-wrap items-center gap-1.5">
        <span className="mr-1 text-[11px] uppercase tracking-wider text-fg-muted">
          {vendorLabel}
        </span>
        <FilterChip
          label={allVendors}
          selected={filter === "__all__"}
          onClick={() => setFilter("__all__")}
        />
        {vendors.map((v) => (
          <FilterChip
            key={v}
            label={v}
            selected={filter === v}
            onClick={() => setFilter(v)}
          />
        ))}
      </div>

      {soloPlans.length > 0 && (
        <PlanSection
          title={soloLabel}
          plans={soloPlans}
          active={active}
          payAsYouGoNote={payAsYouGoNote}
        />
      )}
      {teamPlans.length > 0 && (
        <PlanSection
          title={teamLabel}
          plans={teamPlans}
          active={active}
          payAsYouGoNote={payAsYouGoNote}
        />
      )}
    </div>
  );
}

// Detect "team / per-seat / business / enterprise" tiers by name —
// avoids adding a dedicated boolean to the catalog.
function isTeamPlan(p: PlanDef): boolean {
  const name = p.name.toLowerCase();
  return (
    p.id.includes("team") ||
    p.id.includes("business") ||
    p.id.includes("enterprise") ||
    p.id.includes("ms365") ||
    name.includes("seat")
  );
}

// PAYG / 按量付费 plans we keep in the catalog for completeness but
// flag with a tiny "billed by usage" caption — the user can still
// check them, the monthly figure is then a placeholder estimate.
function isPayAsYouGo(p: PlanDef): boolean {
  return p.id === "deepseek-pro";
}

function byPrice(a: PlanDef, b: PlanDef): number {
  return a.monthlyUsd - b.monthlyUsd;
}

function FilterChip({
  label,
  selected,
  onClick,
}: {
  label: string;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={
        "rounded-full border px-2.5 py-1 text-xs font-medium transition-colors " +
        (selected
          ? "border-accent bg-accent/15 text-accent"
          : "border-border-subtle bg-bg-panel text-fg-muted hover:border-border-strong hover:text-fg-default")
      }
    >
      {label}
    </button>
  );
}

function PlanSection({
  title,
  plans,
  active,
  payAsYouGoNote,
}: {
  title: string;
  plans: PlanDef[];
  active: Set<string>;
  payAsYouGoNote: string;
}) {
  return (
    <section>
      <h3 className="mb-2 text-[11px] font-medium uppercase tracking-wider text-fg-muted">
        {title}
      </h3>
      <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {plans.map((p) => (
          <PlanCard
            key={p.id}
            plan={p}
            checked={active.has(p.id)}
            payg={isPayAsYouGo(p)}
            paygNote={payAsYouGoNote}
          />
        ))}
      </div>
    </section>
  );
}

// Click-anywhere checkbox card. The native input is hidden but kept
// in the form payload so the existing server action picks it up
// without changes.
function PlanCard({
  plan,
  checked,
  payg,
  paygNote,
}: {
  plan: PlanDef;
  checked: boolean;
  payg: boolean;
  paygNote: string;
}) {
  const [on, setOn] = useState(checked);
  return (
    <label
      className={
        "group/p relative flex cursor-pointer flex-col gap-1.5 overflow-hidden rounded-lg border p-3 transition-all " +
        (on
          ? "border-accent bg-accent/8 ring-1 ring-accent/30"
          : "border-border-subtle bg-bg-panel hover:border-border-strong hover:bg-bg-panel-2")
      }
    >
      <input
        type="checkbox"
        name="plan"
        value={plan.id}
        defaultChecked={checked}
        onChange={(e) => setOn(e.currentTarget.checked)}
        className="sr-only"
      />
      {/* Vendor accent stripe */}
      <div
        className={
          "pointer-events-none absolute inset-x-0 top-0 h-0.5 " +
          vendorStripe(plan.vendor)
        }
      />
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-medium uppercase tracking-wider text-fg-faint">
          {plan.vendor}
        </span>
        <span
          className={
            "flex h-4 w-4 shrink-0 items-center justify-center rounded-full border " +
            (on
              ? "border-accent bg-accent text-accent-fg"
              : "border-border-strong bg-transparent")
          }
        >
          {on && (
            <svg
              width="10"
              height="10"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="3"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <polyline points="20 6 9 17 4 12" />
            </svg>
          )}
        </span>
      </div>
      <div className="text-sm font-medium text-fg-strong">{plan.name}</div>
      <div className="flex items-baseline justify-between">
        <span className="font-mono text-xs tabular-nums text-fg-default">
          ${plan.monthlyUsd}
          <span className="text-fg-muted">/mo</span>
        </span>
        {payg && (
          <span className="text-[10px] text-warning">{paygNote}</span>
        )}
      </div>
    </label>
  );
}

function vendorStripe(vendor: string): string {
  const map: Record<string, string> = {
    Anthropic: "bg-gradient-to-r from-orange-500/60 to-orange-500/0",
    OpenAI: "bg-gradient-to-r from-emerald-500/60 to-emerald-500/0",
    Google: "bg-gradient-to-r from-sky-500/60 to-sky-500/0",
    Cursor: "bg-gradient-to-r from-indigo-500/60 to-indigo-500/0",
    GitHub: "bg-gradient-to-r from-fuchsia-500/60 to-fuchsia-500/0",
    Xiaomi: "bg-gradient-to-r from-amber-500/60 to-amber-500/0",
    Alibaba: "bg-gradient-to-r from-rose-500/60 to-rose-500/0",
    Moonshot: "bg-gradient-to-r from-violet-500/60 to-violet-500/0",
    DeepSeek: "bg-gradient-to-r from-blue-500/60 to-blue-500/0",
    Perplexity: "bg-gradient-to-r from-teal-500/60 to-teal-500/0",
    Codeium: "bg-gradient-to-r from-green-500/60 to-green-500/0",
    Replit: "bg-gradient-to-r from-orange-400/60 to-orange-400/0",
    Microsoft: "bg-gradient-to-r from-cyan-500/60 to-cyan-500/0",
  };
  return map[vendor] ?? "bg-gradient-to-r from-accent/60 to-accent/0";
}
