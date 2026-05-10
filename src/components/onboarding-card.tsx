import { InstallAgentButton } from "./install-agent-button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

// Shown on the dashboard when the user has logged in but no usage records
// have been ingested yet. Two-step onboarding: click "Generate install
// command" → paste in a terminal. The browser cannot run the install
// directly (OS sandbox), so the terminal step is unavoidable; everything
// else is a single click.
export function OnboardingCard({ username }: { username: string; publicUrl?: string }) {
  return (
    <Card className="mt-6 border-emerald-500/40 bg-emerald-500/5">
      <CardHeader>
        <CardTitle>Welcome, {username} — let&apos;s get your data flowing</CardTitle>
        <CardDescription>
          tokenusage doesn&apos;t see anything yet. Two steps and you&apos;re done.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-5 text-sm">
        <Step n={1} title="Click below, copy the command, paste it in a terminal">
          <InstallAgentButton />
        </Step>
        <Step n={2} title="That&apos;s it">
          <span className="text-muted-foreground">
            The installer registers a background service (launchd on Mac /
            systemd on Linux) that auto-starts on login and syncs in the
            background. Click <strong>Sync now</strong> on the dashboard any
            time you want fresh data, or <strong>Pause tracking</strong> to
            disable uploads without uninstalling.
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
