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

function currentTimeMs(): number {
  return Date.now();
}

function formatAgo(ms: number | null, now: number): string {
  if (ms == null) return "—";
  const sec = Math.max(0, Math.floor((now - ms) / 1000));
  if (sec < 60) return `${sec}s ago`;
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min}m ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h ago`;
  return `${Math.floor(hr / 24)}d ago`;
}

const AGENT_LIVE_THRESHOLD_MS = 90 * 1000;
const UPLOAD_STALE_MS = 24 * 60 * 60 * 1000;

export default async function UsersPage({
  searchParams,
}: {
  searchParams: Promise<{ new?: string }>;
}) {
  if (!isMultiUserMode()) redirect("/dashboard");

  const user = await readCurrentUser();
  if (!user) redirect("/login");
  if (!user.isAdmin) redirect("/dashboard");

  const [{ new: newInvite }, origin, locale] = await Promise.all([
    searchParams,
    getPublicUrl(),
    readLocale(),
  ]);
  const [dict, users, invites] = await Promise.all([
    getDictionary(locale),
    Promise.resolve(listUsers()),
    Promise.resolve(listInvites()),
  ]);
  const t = dict.usersPage;
  const now = currentTimeMs();
  const liveAgents = users.filter(
    (u) => u.agentSeenAt != null && now - u.agentSeenAt <= AGENT_LIVE_THRESHOLD_MS
  ).length;
  const openInvites = invites.filter(
    (inv) => inv.usedAt == null && inv.expiresAt >= now
  ).length;
  const pendingUsers = users.filter((u) => u.activatedAt == null).length;

  return (
    <main className="tu-rise mx-auto w-full max-w-6xl px-6 py-10">
      <Link
        href="/dashboard"
        className="mb-6 inline-flex text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        {dict.session.back}
      </Link>
      <header className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{t.title}</h1>
          <p className="mt-1 text-sm text-muted-foreground">{t.description}</p>
        </div>
        <div className="grid grid-cols-3 gap-2 text-right text-xs sm:min-w-96">
          <div className="rounded-lg border border-border-subtle bg-bg-panel px-3 py-2">
            <div className="font-mono text-lg font-semibold text-fg-strong">{users.length}</div>
            <div className="text-fg-muted">members</div>
          </div>
          <div className="rounded-lg border border-border-subtle bg-bg-panel px-3 py-2">
            <div className="font-mono text-lg font-semibold text-emerald-500">{liveAgents}</div>
            <div className="text-fg-muted">live agents</div>
          </div>
          <div className="rounded-lg border border-border-subtle bg-bg-panel px-3 py-2">
            <div className="font-mono text-lg font-semibold text-accent">{openInvites}</div>
            <div className="text-fg-muted">open invites</div>
          </div>
        </div>
      </header>

      {newInvite && (
        <Card className="tu-pop-in mb-6 border-emerald-500/40 bg-emerald-500/5">
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

      <Card className="panel-hover">
        <CardHeader className="border-b border-border-subtle pb-4">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <CardTitle>Access console</CardTitle>
              <CardDescription>
                Members, invite links, activation and agent health in one place.
              </CardDescription>
            </div>
            <div className="flex flex-wrap gap-2 text-xs">
              <a className="chip-hover rounded-full border border-border-subtle px-3 py-1 text-fg-muted" href="#invites">
                {t.invitesTitle} · {invites.length}
              </a>
              <a className="chip-hover rounded-full border border-border-subtle px-3 py-1 text-fg-muted" href="#members">
                {t.membersTitle} · {users.length}
              </a>
              {pendingUsers > 0 && (
                <a className="chip-hover rounded-full border border-warning/40 px-3 py-1 text-warning" href="#members">
                  Pending · {pendingUsers}
                </a>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-8 py-5">
          <section id="invites" className="scroll-mt-6">
            <div className="mb-4 grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(320px,420px)] lg:items-start">
              <div>
                <h2 className="text-base font-medium text-fg-strong">{t.invitesTitle}</h2>
                <p className="mt-1 text-sm text-muted-foreground">{t.generateInviteDescription}</p>
              </div>
              <form
                action={createInviteAction}
                className="rounded-xl border border-border-subtle bg-bg-panel-2/50 p-3"
              >
                <label htmlFor="note" className="text-xs text-muted-foreground">
                  {t.note}
                </label>
                <div className="mt-1 flex flex-col gap-2 sm:flex-row">
                  <input
                    id="note"
                    name="note"
                    placeholder={t.notePlaceholder}
                    className="min-w-0 flex-1 rounded border bg-background px-3 py-2 text-sm"
                  />
                  <SubmitButton pendingText={t.creating}>{t.createInvite}</SubmitButton>
                </div>
              </form>
            </div>

            {invites.length === 0 ? (
              <p className="rounded-lg border border-dashed border-border-subtle px-4 py-6 text-sm text-muted-foreground">
                {t.noInvites}
              </p>
            ) : (
              <div className="overflow-x-auto rounded-lg border border-border-subtle">
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
                      const expired = !used && inv.expiresAt < now;
                      return (
                        <TableRow key={inv.id} className="row-hover">
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
          </section>

          <section id="members" className="scroll-mt-6 border-t border-border-subtle pt-6">
            <div className="mb-4">
              <h2 className="text-base font-medium text-fg-strong">{t.membersTitle}</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Activation, reset actions and agent freshness without leaving the access console.
              </p>
            </div>
            <div className="overflow-x-auto rounded-lg border border-border-subtle">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t.columnUsername}</TableHead>
                    <TableHead>{t.columnEmail}</TableHead>
                    <TableHead>{t.columnIp}</TableHead>
                    <TableHead>Agent</TableHead>
                    <TableHead>{t.columnJoined}</TableHead>
                    <TableHead>{dict.adminReset.columnReset}</TableHead>
                    <TableHead />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users.map((u) => {
                    const agentLive = u.agentSeenAt != null && now - u.agentSeenAt <= AGENT_LIVE_THRESHOLD_MS;
                    const uploadStale =
                      u.lastUploadedAt == null || now - u.lastUploadedAt > UPLOAD_STALE_MS;
                    return (
                      <TableRow key={u.id} className="row-hover">
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
                          <div className="space-y-1">
                            <div className="flex items-center gap-1.5">
                              <Badge variant="outline" className={agentLive ? "text-emerald-500" : "text-amber-500"}>
                                {agentLive ? "live" : "offline"}
                              </Badge>
                              {u.agentVersion && (
                                <span className="font-mono text-[10px] text-fg-faint">v{u.agentVersion}</span>
                              )}
                            </div>
                            <div className="font-mono tabular-nums text-fg-faint">
                              seen {formatAgo(u.agentSeenAt, now)}
                            </div>
                            <div className={uploadStale ? "font-mono tabular-nums text-amber-500" : "font-mono tabular-nums text-fg-faint"}>
                              uploaded {formatAgo(u.lastUploadedAt, now)}
                            </div>
                          </div>
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
                          <Link
                            href={`/users/${u.id}/log`}
                            className="text-xs text-accent hover:underline"
                          >
                            Logs
                          </Link>
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
          </section>
        </CardContent>
      </Card>
    </main>
  );
}
