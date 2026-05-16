import Link from "next/link";
import { redirect } from "next/navigation";
import { readCurrentUser, listUsers, listInvites } from "@/lib/auth";
import { isMultiUserMode } from "@/lib/server-db";
import { getPublicUrl } from "@/lib/public-url";
import { createInviteAction, revokeInviteAction, resetUserPasswordAction, activateUserAction } from "./actions";
import { SubmitButton } from "@/components/submit-button";
import { CopyInviteLink } from "@/components/copy-invite-link";
import { EditableInviteNote } from "@/components/editable-invite-note";
import { InviteRowActions } from "@/components/invite-row-actions";
import { lookupGeo, formatGeo } from "@/lib/geoip";
import { getDictionary, readLocale } from "@/i18n";
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
import { Badge } from "@/components/ui/badge";

function formatDate(ms: number | null, locale: string): string {
  if (ms == null) return "—";
  return new Date(ms).toLocaleString(locale);
}

export default async function UsersPage({
  searchParams,
}: {
  searchParams: Promise<{ new?: string }>;
}) {
  if (!isMultiUserMode()) redirect("/");

  const user = await readCurrentUser();
  if (!user) redirect("/login");
  if (!user.isAdmin) redirect("/");

  const { new: newInvite } = await searchParams;
  const users = listUsers();
  const invites = listInvites();
  const origin = await getPublicUrl();
  const locale = await readLocale();
  const dict = await getDictionary(locale);
  const t = dict.usersPage;

  // Resolve each user's last-known IP to a city/region/country in
  // parallel. The lookup is cached in the ip_lookups table for 30 days,
  // so the hot path is just a SQLite read.
  const geos = await Promise.all(
    users.map((u) =>
      u.lastIp ? lookupGeo(u.lastIp) : Promise.resolve(null)
    )
  );

  return (
    <main className="mx-auto w-full max-w-4xl px-6 py-10">
      <Link
        href="/"
        className="mb-6 inline-flex text-sm text-muted-foreground hover:text-foreground"
      >
        {dict.session.back}
      </Link>
      <header className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight">{t.title}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{t.description}</p>
      </header>

      {newInvite && (
        <Card className="mb-6 border-emerald-500/40 bg-emerald-500/5">
          <CardHeader>
            <CardTitle className="text-base">{t.inviteCreatedTitle}</CardTitle>
            <CardDescription>{t.inviteCreatedDescription}</CardDescription>
          </CardHeader>
          <CardContent>
            <CopyInviteLink
              code={newInvite}
              url={`${origin}/signup?invite=${newInvite}`}
              t={{
                copyCode: t.copyCode,
                copyLink: t.copyLink,
                copied: t.copied,
                copyError: t.copyError,
              }}
            />
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>{t.generateInviteTitle}</CardTitle>
          <CardDescription>{t.generateInviteDescription}</CardDescription>
        </CardHeader>
        <CardContent>
          <form
            action={createInviteAction}
            className="flex flex-col gap-3 sm:flex-row sm:items-end"
          >
            <div className="flex-1">
              <label htmlFor="note" className="text-xs text-muted-foreground">
                {t.note}
              </label>
              <input
                id="note"
                name="note"
                placeholder={t.notePlaceholder}
                className="mt-1 w-full rounded border bg-background px-3 py-2 text-sm"
              />
            </div>
            <SubmitButton pendingText={t.creating}>{t.createInvite}</SubmitButton>
          </form>
        </CardContent>
      </Card>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle>{t.invitesTitle}</CardTitle>
        </CardHeader>
        <CardContent>
          {invites.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t.noInvites}</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t.columnNote}</TableHead>
                    <TableHead>{t.columnCreated}</TableHead>
                    <TableHead>{t.columnExpires}</TableHead>
                    <TableHead>{t.columnStatus}</TableHead>
                    <TableHead className="text-right" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {invites.map((inv) => {
                    const used = inv.usedAt != null;
                    const expired = !used && inv.expiresAt < Date.now();
                    return (
                      <TableRow key={inv.id}>
                        <TableCell>
                          <EditableInviteNote
                            id={inv.id}
                            note={inv.note}
                            placeholder={t.notePlaceholder}
                            editLabel={t.editNote}
                          />
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground tabular-nums">
                          {formatDate(inv.createdAt, locale)}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground tabular-nums">
                          {formatDate(inv.expiresAt, locale)}
                        </TableCell>
                        <TableCell>
                          {used ? (
                            <Badge variant="outline">{t.statusUsed}</Badge>
                          ) : expired ? (
                            <Badge
                              variant="outline"
                              className="text-amber-700 dark:text-amber-300"
                            >
                              {t.statusExpired}
                            </Badge>
                          ) : (
                            <Badge>{t.statusOpen}</Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-2">
                            {!used && !expired && (
                              <InviteRowActions
                                code={inv.code}
                                url={inv.code ? `${origin}/signup?invite=${inv.code}` : null}
                                copyCodeLabel={t.copyCode}
                                copyLinkLabel={t.copyLink}
                                copiedLabel={t.copied}
                              />
                            )}
                            {!used && (
                              <form action={revokeInviteAction}>
                                <input type="hidden" name="id" value={inv.id} />
                                <SubmitButton variant="danger" pendingText={t.revoking}>
                                  {t.revoke}
                                </SubmitButton>
                              </form>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle>{t.membersTitle}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t.columnUsername}</TableHead>
                  <TableHead>{t.columnEmail}</TableHead>
                  <TableHead>{t.columnIp}</TableHead>
                  <TableHead>{t.columnLocation}</TableHead>
                  <TableHead>{t.columnJoined}</TableHead>
                  <TableHead>{dict.adminReset.columnReset}</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((u, i) => {
                  const geo = geos[i];
                  const geoText = geo ? formatGeo(geo) : null;
                  return (
                  <TableRow key={u.id}>
                    <TableCell className="font-medium">{u.username}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {u.email ?? "—"}
                    </TableCell>
                    <TableCell className="text-xs">
                      {u.lastIp ? (
                        <a
                          href={`https://ping0.cc/ip/${encodeURIComponent(u.lastIp)}`}
                          target="_blank"
                          rel="noreferrer"
                          title={t.ipPingTooltip}
                          className="font-mono tabular-nums text-accent hover:underline"
                        >
                          {u.lastIp}
                        </a>
                      ) : (
                        <span className="text-fg-faint">—</span>
                      )}
                    </TableCell>
                    <TableCell className="text-xs text-fg-muted">
                      {geoText ?? <span className="text-fg-faint">—</span>}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground tabular-nums">
                      {formatDate(u.createdAt, locale)}
                    </TableCell>
                    <TableCell>
                      {u.id === user.id ? null : u.passwordResetAt ? (
                        <Badge variant="outline" className="text-warning">
                          {dict.adminReset.pending}
                        </Badge>
                      ) : u.email ? (
                        <form action={resetUserPasswordAction}>
                          <input type="hidden" name="userId" value={u.id} />
                          <SubmitButton variant="outline" pendingText={`${dict.adminReset.button}…`}>
                            {dict.adminReset.button}
                          </SubmitButton>
                        </form>
                      ) : (
                        <span className="text-xs text-fg-faint">—</span>
                      )}
                    </TableCell>
                    <TableCell className="space-x-2">
                      {u.isAdmin && <Badge variant="outline">{t.badgeAdmin}</Badge>}
                      {u.activatedAt == null && (
                        <>
                          <Badge variant="outline" className="text-warning">Pending</Badge>
                          {u.id !== user.id && (
                            <form action={activateUserAction} className="inline-block">
                              <input type="hidden" name="userId" value={u.id} />
                              <SubmitButton pendingText="Activating…">
                                Activate
                              </SubmitButton>
                            </form>
                          )}
                        </>
                      )}
                    </TableCell>
                  </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </main>
  );
}
