import { InstallAgentButton } from "./install-agent-button";
import { interp } from "@/i18n/interp";
import type { Dictionary } from "@/i18n/types";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export function OnboardingCard({
  username,
  t,
  installT,
}: {
  username: string;
  t: Dictionary["onboarding"];
  installT: Dictionary["install"];
}) {
  return (
    <Card className="mt-6 border-emerald-500/40 bg-emerald-500/5">
      <CardHeader>
        <CardTitle>{interp(t.welcome, { name: username })}</CardTitle>
        <CardDescription>{t.description}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-5 text-sm">
        <Step n={1} title={t.step1Title}>
          <InstallAgentButton t={installT} />
        </Step>
        <Step n={2} title={t.step2Title}>
          <span className="text-muted-foreground">{t.step2Body}</span>
        </Step>
      </CardContent>
    </Card>
  );
}

function Step({
  n,
  title,
  children,
}: {
  n: number;
  title: string;
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
      <div className="mt-2">{children}</div>
    </div>
  );
}
