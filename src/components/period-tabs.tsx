import Link from "next/link";
import type { CustomRange, Period } from "@/lib/types";
import type { Dictionary } from "@/i18n/types";
import { cn } from "@/lib/utils";

const ORDER: Period[] = ["today", "24h", "7d", "30d", "month", "year", "all", "custom"];

export function PeriodTabs({
  active,
  custom,
  t,
}: {
  active: Period;
  custom?: CustomRange;
  t: Dictionary["period"];
}) {
  return (
    <div className="flex flex-col items-end gap-2">
      <nav className="inline-flex rounded-md border bg-card p-1 text-sm">
        {ORDER.map((p) => {
          const isActive = p === active;
          const href =
            p === "custom" && custom
              ? `/?period=custom&from=${custom.from}&to=${custom.to}`
              : `/?period=${p}`;
          return (
            <Link
              key={p}
              href={href}
              scroll={false}
              className={cn(
                "rounded px-3 py-1.5 transition-colors",
                isActive
                  ? "bg-foreground text-background"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              {t[p]}
            </Link>
          );
        })}
      </nav>
      {active === "custom" && (
        <form
          action="/"
          method="GET"
          className="flex items-center gap-2 text-xs text-muted-foreground"
        >
          <input type="hidden" name="period" value="custom" />
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
