import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth-guard";
import {
  PLAN_CATALOG,
  listUserSubscriptions,
} from "@/lib/subscriptions";
import { getDictionary, readLocale } from "@/i18n";
import { saveSubscriptionsAction } from "./actions";
import { SubmitButton } from "@/components/submit-button";
import { SubscriptionsPicker } from "@/components/subscriptions-picker";
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
  searchParams: Promise<{ saved?: string; welcome?: string }>;
}) {
  const user = await requireUser();
  if (!user) redirect("/login");

  const locale = await readLocale();
  const dict = await getDictionary(locale);
  const t = dict.subs;
  const { saved, welcome } = await searchParams;
  const isWelcome = welcome === "1";

  const active = new Set(await listUserSubscriptions(user.id));

  return (
    <>
      <header className="sticky top-0 z-10 flex items-center border-b border-border-subtle bg-bg-app/85 px-6 py-3 backdrop-blur">
        <div>
          <h1 className="text-base font-medium tracking-tight text-fg-strong">
            {isWelcome ? t.welcomeTitle : t.pageTitle}
          </h1>
          <p className="truncate text-[12px] text-fg-muted">
            {isWelcome ? t.welcomeSubtitle : t.pageDescription}
          </p>
        </div>
      </header>

      <div className="flex-1 px-6 py-5">
        {isWelcome && (
          <div className="mb-4 rounded-md border border-accent/30 bg-accent/5 px-4 py-3 text-sm">
            <p className="font-medium text-fg-strong">{t.welcomeBannerTitle}</p>
            <p className="mt-1 text-fg-muted">{t.welcomeBannerBody}</p>
          </div>
        )}
        <Card>
          <CardHeader>
            <CardTitle>{t.title}</CardTitle>
            <CardDescription>{t.pageDescription}</CardDescription>
          </CardHeader>
          <CardContent>
            <form action={saveSubscriptionsAction} className="space-y-4">
              {isWelcome && <input type="hidden" name="welcome" value="1" />}
              <SubscriptionsPicker
                plans={PLAN_CATALOG.map((p) => ({
                  id: p.id,
                  vendor: p.vendor,
                  name: p.name,
                  monthlyUsd: p.monthlyUsd,
                }))}
                active={active}
                vendorLabel={t.filterByVendor}
                teamLabel={t.sectionTeam}
                soloLabel={t.sectionSolo}
                allVendors={t.filterAll}
                payAsYouGoNote={t.paygNote}
              />
              <div className="flex items-center justify-between gap-3 border-t border-border-subtle pt-4">
                {saved ? (
                  <span className="text-xs text-success">{t.saved}</span>
                ) : (
                  <span />
                )}
                <SubmitButton pendingText={t.saving}>
                  {isWelcome ? t.welcomeSave : t.save}
                </SubmitButton>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
