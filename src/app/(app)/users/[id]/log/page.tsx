import Link from "next/link";
import { notFound } from "next/navigation";
import { readRecentAudit } from "@/lib/audit";
import { listUsers } from "@/lib/auth";
import { requireAdmin } from "@/lib/auth-guard";
import { readLocale } from "@/i18n";
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

function formatMeta(meta: string | null): string {
  if (!meta) return "—";
  try {
    return JSON.stringify(JSON.parse(meta), null, 2);
  } catch {
    return meta;
  }
}

function parseUserId(raw: string): number | null {
  if (!/^\d+$/.test(raw)) return null;
  return Number(raw);
}

export default async function UserAuditLogPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireAdmin();

  const { id: rawId } = await params;
  const userId = parseUserId(rawId);
  if (userId == null) notFound();

  const users = listUsers();
  const target = users.find((u) => u.id === userId);
  if (!target) notFound();

  const locale = await readLocale();
  const rows = readRecentAudit(100, target.id);

  return (
    <main className="mx-auto w-full max-w-5xl px-6 py-10">
      <Link
        href="/users"
        className="mb-6 inline-flex text-sm text-muted-foreground hover:text-foreground"
      >
        ← Back to users
      </Link>

      <header className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight">
          Audit log · {target.username}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Recent sync, upload, auth, and admin events for this user.
        </p>
      </header>

      <Card>
        <CardHeader>
          <CardTitle>User summary</CardTitle>
          <CardDescription>
            Agent observability fields from the users and api_tokens tables.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <dl className="grid gap-4 text-sm sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <dt className="text-muted-foreground">Email</dt>
              <dd className="font-mono text-xs">{target.email ?? "—"}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Agent seen</dt>
              <dd className="font-mono text-xs">
                {formatDate(target.agentSeenAt, locale)}
              </dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Last uploaded</dt>
              <dd className="font-mono text-xs">
                {formatDate(target.lastUploadedAt, locale)}
              </dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Agent version</dt>
              <dd>{target.agentVersion ? <Badge variant="outline">v{target.agentVersion}</Badge> : "—"}</dd>
            </div>
          </dl>
        </CardContent>
      </Card>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Recent audit events</CardTitle>
          <CardDescription>
            Showing the latest 100 audit_log rows for user #{target.id}.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {rows.length === 0 ? (
            <p className="text-sm text-muted-foreground">No audit events yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Time</TableHead>
                    <TableHead>Action</TableHead>
                    <TableHead>IP</TableHead>
                    <TableHead>User agent</TableHead>
                    <TableHead>Meta</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((row) => (
                    <TableRow key={row.id}>
                      <TableCell className="whitespace-nowrap font-mono text-xs">
                        {formatDate(row.ts, locale)}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{row.action}</Badge>
                      </TableCell>
                      <TableCell className="font-mono text-xs">
                        {row.ip ?? "—"}
                      </TableCell>
                      <TableCell className="max-w-56 truncate text-xs text-muted-foreground">
                        {row.user_agent ?? "—"}
                      </TableCell>
                      <TableCell>
                        <pre className="max-w-md overflow-x-auto whitespace-pre-wrap rounded bg-muted px-2 py-1 text-xs">
                          {formatMeta(row.meta)}
                        </pre>
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
