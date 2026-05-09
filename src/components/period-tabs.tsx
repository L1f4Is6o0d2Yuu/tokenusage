import Link from "next/link";
import { PERIOD_LABELS, type Period } from "@/lib/types";
import { cn } from "@/lib/utils";

const ORDER: Period[] = ["today", "24h", "7d", "30d", "all"];

export function PeriodTabs({ active }: { active: Period }) {
  return (
    <nav className="inline-flex rounded-md border bg-card p-1 text-sm">
      {ORDER.map((p) => {
        const isActive = p === active;
        return (
          <Link
            key={p}
            href={`/?period=${p}`}
            scroll={false}
            className={cn(
              "rounded px-3 py-1.5 transition-colors",
              isActive
                ? "bg-foreground text-background"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            {PERIOD_LABELS[p]}
          </Link>
        );
      })}
    </nav>
  );
}
