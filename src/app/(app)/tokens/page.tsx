import Link from "next/link";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth-guard";
import { isMultiUserMode } from "@/lib/server-db";
import { listTokens } from "@/lib/auth";
import { getPublicUrl } from "@/lib/public-url";
import { createTokenAction, revokeTokenAction, setSyncIntervalAction } from "./actions";
import { SubmitButton } from "@/components/submit-button";
import { AgentInstallSnippet } from "@/components/agent-install-snippet";
import { InstallAgentButton } from "@/components/install-agent-button";
import { getUserSyncState } from "@/lib/sync-state";
import { getDictionary, readLocale } from "@/i18n";
import { interp } from "@/i18n/interp";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { Dictionary } from "@/i18n/types";

function formatDate(ms: number | null, locale: string): string {
  if (ms == null) return "—";
  return new Date(ms).toLocaleString(locale);
}

function intervalOptions(t: Dictionary["tokensPage"]["intervalOptions"]) {
  return [
    { value: 60, label: t.m1 },
    { value: 300, label: t.m5 },
    { value: 600, label: t.m10 },
    { value: 1800, label: t.m30 },
    { value: 3600, label: t.h1 },
    { value: 86400, label: t.manual },
  ];
}

export default async function TokensPage({
  searchParams,
}: {
  searchParams: Promise<{ new?: string; settings?: string }>;
}) {
  const user = await requireUser();
  // Token management is admin-only in multi-user mode. Regular users
  // install once via the onboarding card on the dashboard and never
  // need to see the raw token table. Admin-self-install on a new
  // machine still works through this page.
  if (isMultiUserMode() && user && !user.isAdmin) redirect("/dashboard");
  const locale = await readLocale();
  const t = (await getDictionary(locale)).tokensPage;
  const installT = (await getDictionary(locale)).install;
  if (!user) {
    return (
      <main className="mx-auto w-full max-w-3xl px-6 py-10">
        <p className="text-sm text-muted-foreground">{t.title}</p>
      </main>
    );
  }
  const { new: newToken, settings } = await searchParams;
  const tokens = await listTokens(user.id);
  const publicUrl = await getPublicUrl();
  const syncState = await getUserSyncState(user.id);
  const options = intervalOptions(t.intervalOptions);

  return (
    <main className="mx-auto w-full max-w-3xl px-6 py-10">
      <Link
        href="/dashboard"
        className="mb-6 inline-flex text-sm text-muted-foreground hover:text-foreground"
      >
        {(await getDictionary(locale)).session.back}
      </Link>
      <header className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight">{t.title}</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {interp(t.description, { user: user.username })}
        </p>
      </header>

      {newToken && (
        <Card className="mb-6 border-emerald-500/40 bg-emerald-500/5">
          <CardHeader>
            <CardTitle className="text-base">{t.tokenCreatedTitle}</CardTitle>
            <CardDescription>{t.tokenCreatedDescription}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <code className="block w-full break-all rounded border bg-background px-3 py-2 font-mono text-sm">
              {newToken}
            </code>
            <div>
              <p className="mb-2 text-xs text-muted-foreground">
                {t.tokenCreatedHint}
              </p>
              <AgentInstallSnippet publicUrl={publicUrl} token={newToken} />
            </div>
          </CardContent>
        </Card>
      )}

      {settings === "saved" && (
        <div className="mb-6 rounded-md border border-emerald-500/30 bg-emerald-500/10 px-4 py-2 text-sm text-emerald-800 dark:text-emerald-200">
          {t.settingsSavedToast}
        </div>
      )}

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>{t.syncSettingsTitle}</CardTitle>
          <CardDescription>{t.syncSettingsDescription}</CardDescription>
        </CardHeader>
        <CardContent>
          <form
            action={setSyncIntervalAction}
            className="flex flex-col gap-3 sm:flex-row sm:items-end"
          >
            <div className="flex-1">
              <label htmlFor="interval" className="text-xs text-muted-foreground">
                {t.heartbeatInterval}
              </label>
              <select
                id="interval"
                name="interval"
                defaultValue={syncState.syncIntervalSeconds}
                className="mt-1 w-full rounded border bg-background px-3 py-2 text-sm"
              >
                {options.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
            <SubmitButton pendingText={t.saving}>{t.save}</SubmitButton>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t.addMachineTitle}</CardTitle>
          <CardDescription>{t.addMachineDescription}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <InstallAgentButton t={installT} />
          <details className="group">
            <summary className="cursor-pointer text-xs text-muted-foreground hover:text-foreground">
              {t.advancedToggle}
            </summary>
            <form
              action={createTokenAction}
              className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-end"
            >
              <div className="flex-1">
                <label htmlFor="name" className="text-xs text-muted-foreground">
                  {t.name}
                </label>
                <input
                  id="name"
                  name="name"
                  placeholder="laptop"
                  className="mt-1 w-full rounded border bg-background px-3 py-2 font-mono text-sm"
                />
              </div>
              <SubmitButton pendingText={t.creating}>{t.createToken}</SubmitButton>
            </form>
          </details>
        </CardContent>
      </Card>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle>{t.existingTokens}</CardTitle>
        </CardHeader>
        <CardContent>
          {tokens.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t.noTokens}</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t.columnName}</TableHead>
                    <TableHead>{t.columnCreated}</TableHead>
                    <TableHead>{t.columnLastUsed}</TableHead>
                    <TableHead className="text-right" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {tokens.map((tk) => (
                    <TableRow key={tk.id}>
                      <TableCell className="font-medium">{tk.name}</TableCell>
                      <TableCell className="text-xs text-muted-foreground tabular-nums">
                        {formatDate(tk.createdAt, locale)}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground tabular-nums">
                        {formatDate(tk.lastUsedAt, locale)}
                      </TableCell>
                      <TableCell className="text-right">
                        <form action={revokeTokenAction}>
                          <input type="hidden" name="id" value={tk.id} />
                          <SubmitButton variant="danger" pendingText={t.revoking}>
                            {t.revoke}
                          </SubmitButton>
                        </form>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </main>
  );
}
