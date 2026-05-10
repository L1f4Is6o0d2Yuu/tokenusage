import { headers } from "next/headers";
import Link from "next/link";
import { redirect } from "next/navigation";
import { readCurrentUser, listUsers, listInvites } from "@/lib/auth";
import { isMultiUserMode } from "@/lib/server-db";
import { createInviteAction, revokeInviteAction } from "./actions";
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

function formatDate(ms: number | null): string {
  if (ms == null) return "—";
  return new Date(ms).toLocaleString();
}

async function inferOrigin(): Promise<string> {
  // Best-effort detection of the public URL so the invite link we hand out is
  // pasteable. Honour TOKENUSAGE_PUBLIC_URL when set; otherwise reconstruct
  // from the request headers.
  if (process.env.TOKENUSAGE_PUBLIC_URL) return process.env.TOKENUSAGE_PUBLIC_URL.replace(/\/$/, "");
  const h = await headers();
  const proto = h.get("x-forwarded-proto") ?? "http";
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
  return `${proto}://${host}`;
}

export default async function UsersPage({
  searchParams,
}: {
  searchParams: Promise<{ new?: string }>;
}) {
  // /users only makes sense in multi-user mode. In single-user mode there's
  // no concept of invites — short-circuit straight to the dashboard.
  if (!isMultiUserMode()) redirect("/");

  const user = await readCurrentUser();
  if (!user) redirect("/login");
  if (!user.isAdmin) redirect("/");

  const { new: newInvite } = await searchParams;
  const users = listUsers();
  const invites = listInvites();
  const origin = await inferOrigin();

  return (
    <main className="mx-auto w-full max-w-4xl px-6 py-10">
      <Link
        href="/"
        className="mb-6 inline-flex text-sm text-muted-foreground hover:text-foreground"
      >
        ← Back to dashboard
      </Link>
      <header className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight">Users & invites</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Admin-only. Invites are one-time signup links — share with the person
          you want to add, and they choose their own email and password.
        </p>
      </header>

      {newInvite && (
        <Card className="mb-6 border-emerald-500/40 bg-emerald-500/5">
          <CardHeader>
            <CardTitle className="text-base">Invite link created</CardTitle>
            <CardDescription>
              Send this URL to the invitee. Single-use; expires in 14 days.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <code className="block w-full break-all rounded border bg-background px-3 py-2 font-mono text-sm">
              {`${origin}/signup?invite=${newInvite}`}
            </code>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Generate invite</CardTitle>
          <CardDescription>
            Optional note helps you remember who it's for (e.g. "Bob's laptop").
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form action={createInviteAction} className="flex items-end gap-3">
            <div className="flex-1">
              <label htmlFor="note" className="text-xs text-muted-foreground">
                Note
              </label>
              <input
                id="note"
                name="note"
                placeholder="e.g. Bob"
                className="mt-1 w-full rounded border bg-background px-3 py-2 text-sm"
              />
            </div>
            <button
              type="submit"
              className="rounded-md bg-foreground px-4 py-2 text-sm font-medium text-background hover:opacity-90"
            >
              Create invite
            </button>
          </form>
        </CardContent>
      </Card>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Invites</CardTitle>
        </CardHeader>
        <CardContent>
          {invites.length === 0 ? (
            <p className="text-sm text-muted-foreground">No invites yet.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Note</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead>Expires</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {invites.map((inv) => {
                  const used = inv.usedAt != null;
                  const expired = !used && inv.expiresAt < Date.now();
                  return (
                    <TableRow key={inv.id}>
                      <TableCell className="font-medium">{inv.note ?? "—"}</TableCell>
                      <TableCell className="text-xs text-muted-foreground tabular-nums">
                        {formatDate(inv.createdAt)}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground tabular-nums">
                        {formatDate(inv.expiresAt)}
                      </TableCell>
                      <TableCell>
                        {used ? (
                          <Badge variant="outline">used</Badge>
                        ) : expired ? (
                          <Badge variant="outline" className="text-amber-700 dark:text-amber-300">
                            expired
                          </Badge>
                        ) : (
                          <Badge>open</Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        {!used && (
                          <form action={revokeInviteAction}>
                            <input type="hidden" name="id" value={inv.id} />
                            <button
                              type="submit"
                              className="rounded-md border border-amber-600 bg-background px-3 py-1 text-xs font-medium text-amber-700 hover:bg-amber-50 dark:text-amber-300"
                            >
                              Revoke
                            </button>
                          </form>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Members</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Username</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Joined</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.map((u) => (
                <TableRow key={u.id}>
                  <TableCell className="font-medium">{u.username}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">{u.email ?? "—"}</TableCell>
                  <TableCell className="text-xs text-muted-foreground tabular-nums">
                    {formatDate(u.createdAt)}
                  </TableCell>
                  <TableCell>
                    {u.isAdmin && <Badge variant="outline">admin</Badge>}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </main>
  );
}
