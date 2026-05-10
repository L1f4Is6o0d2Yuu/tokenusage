import Link from "next/link";
import { requireUser } from "@/lib/auth-guard";
import { listTokens } from "@/lib/auth";
import { getPublicUrl } from "@/lib/public-url";
import { createTokenAction, revokeTokenAction, setSyncIntervalAction } from "./actions";
import { SubmitButton } from "@/components/submit-button";
import { AgentInstallSnippet } from "@/components/agent-install-snippet";
import { InstallAgentButton } from "@/components/install-agent-button";
import { getUserSyncState } from "@/lib/sync-state";
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

function formatDate(ms: number | null): string {
  if (ms == null) return "—";
  return new Date(ms).toLocaleString();
}

const INTERVAL_OPTIONS = [
  { value: 60, label: "1 minute" },
  { value: 300, label: "5 minutes (default)" },
  { value: 600, label: "10 minutes" },
  { value: 1800, label: "30 minutes" },
  { value: 3600, label: "1 hour" },
  { value: 86400, label: "Manual only (24h heartbeat)" },
];

export default async function TokensPage({
  searchParams,
}: {
  searchParams: Promise<{ new?: string; settings?: string }>;
}) {
  const user = await requireUser();
  if (!user) {
    return (
      <main className="mx-auto w-full max-w-3xl px-6 py-10">
        <p className="text-sm text-muted-foreground">
          API tokens are only available in multi-user (server) mode.
        </p>
      </main>
    );
  }
  const { new: newToken, settings } = await searchParams;
  const tokens = listTokens(user.id);
  const publicUrl = await getPublicUrl();
  const syncState = getUserSyncState(user.id);

  return (
    <main className="mx-auto w-full max-w-3xl px-6 py-10">
      <Link
        href="/"
        className="mb-6 inline-flex text-sm text-muted-foreground hover:text-foreground"
      >
        ← Back to dashboard
      </Link>
      <header className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight">API tokens</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Each token authenticates one agent (e.g. one machine reporting Hermes /
          Codex / Claude Code usage to this server). Tokens are scoped to{" "}
          <span className="font-mono">{user.username}</span>.
        </p>
      </header>

      {newToken && (
        <Card className="mb-6 border-emerald-500/40 bg-emerald-500/5">
          <CardHeader>
            <CardTitle className="text-base">Token created</CardTitle>
            <CardDescription>
              Copy it now — this is the only time it will be displayed.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <code className="block w-full break-all rounded border bg-background px-3 py-2 font-mono text-sm">
              {newToken}
            </code>
            <div>
              <p className="mb-2 text-xs text-muted-foreground">
                On the machine that has your Hermes / Codex / Claude Code data,
                paste this in a terminal — installs the agent as a background
                service (launchd on Mac / systemd on Linux), uploads your
                history immediately, and keeps syncing.
              </p>
              <AgentInstallSnippet publicUrl={publicUrl} token={newToken} />
            </div>
          </CardContent>
        </Card>
      )}

      {settings === "saved" && (
        <div className="mb-6 rounded-md border border-emerald-500/30 bg-emerald-500/10 px-4 py-2 text-sm text-emerald-800 dark:text-emerald-200">
          Sync interval saved.
        </div>
      )}

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Sync settings</CardTitle>
          <CardDescription>
            How often the agent uploads on its own. The dashboard's <em>Sync
            now</em> button always responds within a couple of seconds
            regardless — this only controls the background heartbeat cadence.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form action={setSyncIntervalAction} className="flex items-end gap-3">
            <div className="flex-1">
              <label htmlFor="interval" className="text-xs text-muted-foreground">
                Heartbeat interval
              </label>
              <select
                id="interval"
                name="interval"
                defaultValue={syncState.syncIntervalSeconds}
                className="mt-1 w-full rounded border bg-background px-3 py-2 text-sm"
              >
                {INTERVAL_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
            <SubmitButton pendingText="Saving…">Save</SubmitButton>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Add a machine</CardTitle>
          <CardDescription>
            One token per machine you want to track. Click below to generate
            the install command in one step.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <InstallAgentButton />
          <details className="group">
            <summary className="cursor-pointer text-xs text-muted-foreground hover:text-foreground">
              Advanced — name the token manually
            </summary>
            <form action={createTokenAction} className="mt-3 flex items-end gap-3">
              <div className="flex-1">
                <label htmlFor="name" className="text-xs text-muted-foreground">
                  Name
                </label>
                <input
                  id="name"
                  name="name"
                  placeholder="laptop"
                  className="mt-1 w-full rounded border bg-background px-3 py-2 font-mono text-sm"
                />
              </div>
              <SubmitButton pendingText="Creating…">Create token</SubmitButton>
            </form>
          </details>
        </CardContent>
      </Card>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Existing tokens</CardTitle>
        </CardHeader>
        <CardContent>
          {tokens.length === 0 ? (
            <p className="text-sm text-muted-foreground">No tokens yet.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead>Last used</TableHead>
                  <TableHead className="text-right" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {tokens.map((tk) => (
                  <TableRow key={tk.id}>
                    <TableCell className="font-medium">{tk.name}</TableCell>
                    <TableCell className="text-xs text-muted-foreground tabular-nums">
                      {formatDate(tk.createdAt)}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground tabular-nums">
                      {formatDate(tk.lastUsedAt)}
                    </TableCell>
                    <TableCell className="text-right">
                      <form action={revokeTokenAction}>
                        <input type="hidden" name="id" value={tk.id} />
                        <SubmitButton variant="danger" pendingText="Revoking…">
                          Revoke
                        </SubmitButton>
                      </form>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </main>
  );
}
