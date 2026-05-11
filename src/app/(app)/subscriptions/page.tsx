import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth-guard";
import {
  PLAN_CATALOG,
  listUserSubscriptions,
} from "@/lib/subscriptions";
import { getDictionary, readLocale } from "@/i18n";
import { saveSubscriptionsAction } from "./actions";
import { SubmitButton } from "@/components/submit-button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default async function SubscriptionsPage({
  searchParams,
}: {
  searchParams: Promise<{ saved?: string }>;
}) {
  const user = await requireUser();
  if (!user) redirect("/login");

  const locale = await readLocale();
  const dict = await getDictionary(locale);
  const t = dict.subs;
  const { saved } = await searchParams;

  const active = new Set(listUserSubscriptions(user.id));

  return (
    <>
      <header className="sticky top-0 z-10 flex items-center border-b border-border-subtle bg-bg-app/85 px-6 py-3 backdrop-blur">
        <div>
          <h1 className="text-base font-medium tracking-tight text-fg-strong">
            {t.pageTitle}
          </h1>
          <p className="truncate text-[12px] text-fg-muted">{t.pageDescription}</p>
        </div>
      </header>

      <div className="flex-1 px-6 py-5">
        <Card>
          <CardHeader>
            <CardTitle>{t.title}</CardTitle>
            <CardDescription>{t.pageDescription}</CardDescription>
          </CardHeader>
          <CardContent>
            <form action={saveSubscriptionsAction} className="space-y-4">
              <div className="overflow-hidden rounded-md border border-border-subtle">
                <table className="w-full text-sm">
                  <thead className="bg-bg-panel-2 text-[11px] uppercase tracking-wider text-fg-muted">
                    <tr>
                      <th className="w-12 px-3 py-2 text-left">{t.columnActive}</th>
                      <th className="px-3 py-2 text-left">{t.columnPlan}</th>
                      <th className="px-3 py-2 text-left">{t.columnVendor}</th>
                      <th className="px-3 py-2 text-right">{t.columnPrice}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {PLAN_CATALOG.map((p, i) => (
                      <tr
                        key={p.id}
                        className={
                          i % 2 === 1
                            ? "border-t border-border-subtle bg-bg-panel-2/30"
                            : "border-t border-border-subtle"
                        }
                      >
                        <td className="px-3 py-2.5">
                          <input
                            id={`plan-${p.id}`}
                            type="checkbox"
                            name="plan"
                            value={p.id}
                            defaultChecked={active.has(p.id)}
                            className="h-4 w-4 cursor-pointer accent-accent"
                          />
                        </td>
                        <td className="px-3 py-2.5">
                          <label
                            htmlFor={`plan-${p.id}`}
                            className="cursor-pointer font-medium text-fg-strong"
                          >
                            {p.name}
                          </label>
                        </td>
                        <td className="px-3 py-2.5 text-fg-muted">{p.vendor}</td>
                        <td className="px-3 py-2.5 text-right font-mono tabular-nums">
                          ${p.monthlyUsd}/mo
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="flex items-center justify-between gap-3">
                {saved ? (
                  <span className="text-xs text-success">{t.saved}</span>
                ) : (
                  <span />
                )}
                <SubmitButton pendingText={t.saving}>{t.save}</SubmitButton>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
