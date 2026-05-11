"use client";

import type { CustomRange, Period } from "@/lib/types";
import type { Dictionary } from "@/i18n/types";
import { cn } from "@/lib/utils";

const ORDER: Period[] = ["today", "24h", "7d", "30d", "month", "year", "all", "custom"];

// Controlled tab bar: parent owns the period state, this just renders
// buttons and calls back. We deliberately don't push to the URL here —
// that's the parent's job via window.history.pushState, so the parent
// can choose whether a given click should be sharable or ephemeral.
export function PeriodTabs({
  active,
  custom,
  onChange,
  onCustomChange,
  t,
}: {
  active: Period;
  custom?: CustomRange;
  onChange: (next: Period) => void;
  onCustomChange?: (range: CustomRange) => void;
  t: Dictionary["period"];
}) {
  return (
    <div className="flex w-full max-w-full flex-col items-stretch gap-2 sm:items-end">
      <nav className="flex flex-nowrap overflow-x-auto rounded-md border bg-card p-1 text-sm scrollbar-none">
        {ORDER.map((p) => {
          const isActive = p === active;
          return (
            <button
              key={p}
              type="button"
              onClick={() => onChange(p)}
              className={cn(
                "shrink-0 rounded px-3 py-1.5 transition-colors",
                isActive
                  ? "bg-foreground text-background"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              {t[p]}
            </button>
          );
        })}
      </nav>
      {active === "custom" && (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            const fd = new FormData(e.currentTarget);
            const from = String(fd.get("from") ?? "");
            const to = String(fd.get("to") ?? "");
            onCustomChange?.({ from, to });
          }}
          className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground"
        >
          <label className="flex items-center gap-1">
            {t.from}
            <input
              type="date"
              name="from"
              defaultValue={custom?.from ?? defaultFrom()}
              className="rounded border bg-background px-2 py-1 font-mono text-foreground"
            />
          </label>
          <label className="flex items-center gap-1">
            {t.to}
            <input
              type="date"
              name="to"
              defaultValue={custom?.to ?? defaultTo()}
              className="rounded border bg-background px-2 py-1 font-mono text-foreground"
            />
          </label>
          <button
            type="submit"
            className="rounded-md border bg-background px-3 py-1 text-xs font-medium text-foreground hover:bg-muted"
          >
            {t.apply}
          </button>
        </form>
      )}
    </div>
  );
}

function defaultTo(): string {
  return new Date().toISOString().slice(0, 10);
}

function defaultFrom(): string {
  const d = new Date();
  d.setDate(d.getDate() - 14);
  return d.toISOString().slice(0, 10);
}
