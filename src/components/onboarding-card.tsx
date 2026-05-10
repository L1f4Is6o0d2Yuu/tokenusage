import Link from "next/link";
import { AgentInstallSnippet } from "./agent-install-snippet";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

// Shown on the dashboard when the user has logged in but no usage records
// have been ingested yet. Walks them through creating an API token and
// running the agent on any machine they want to track.
export function OnboardingCard({
  username,
  publicUrl,
}: {
  username: string;
  publicUrl: string;
}) {
  return (
    <Card className="mt-6 border-emerald-500/40 bg-emerald-500/5">
      <CardHeader>
        <CardTitle>Welcome, {username} — let&apos;s get your data flowing</CardTitle>
        <CardDescription>
          tokenusage doesn&apos;t see anything yet. Push your local Hermes / Codex /
          Claude Code usage here in three steps.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-5 text-sm">
        <Step n={1} title="Create an API token">
          <Link
            href="/tokens"
            className="inline-flex rounded-md border bg-background px-3 py-1.5 text-xs font-medium hover:bg-muted"
          >
            Open /tokens →
          </Link>{" "}
          <span className="text-muted-foreground">
            Name it after the machine you&apos;ll install the agent on (e.g.{" "}
            <span className="font-mono">laptop</span>).
          </span>
        </Step>
        <Step
          n={2}
          title="On that machine, paste this in a terminal"
          subtitle="No Node / npm / Docker needed — just curl and tar (built into Mac and Linux). Replace YOUR_TOKEN_HERE with the token from step 1."
        >
          <AgentInstallSnippet publicUrl={publicUrl} />
        </Step>
        <Step n={3} title="Done — never touch the terminal again">
          <span className="text-muted-foreground">
            The installer registers a background service (launchd on Mac /
            systemd on Linux) that auto-starts on login and syncs in the
            background. Click <strong>Sync now</strong> on the dashboard any
            time you want fresh data.
          </span>
        </Step>
      </CardContent>
    </Card>
  );
}

function Step({
  n,
  title,
  subtitle,
  children,
}: {
  n: number;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div className="font-medium text-foreground">
        <span className="mr-2 inline-flex h-5 w-5 items-center justify-center rounded-full bg-foreground text-xs font-mono text-background">
          {n}
        </span>
        {title}
      </div>
      {subtitle && <p className="mt-1 text-xs text-muted-foreground">{subtitle}</p>}
      <div className="mt-2">{children}</div>
    </div>
  );
}
