import Link from "next/link";
import {
  LayoutDashboard,
  KeyRound,
  DollarSign,
  Users,
  Info,
  LogOut,
  Sword,
  Sparkles,
  Trophy,
} from "lucide-react";
import { logoutAction } from "@/app/auth-actions";
import { ThemeSwitcher } from "@/components/theme-switcher";
import { SkinSwitcher } from "@/components/skin-switcher";
import type { Skin } from "@/lib/skin";
import { LocaleSwitcher } from "@/components/locale-switcher";
import { SidebarNavLink } from "@/components/sidebar-nav-link";
import { Logomark, Wordmark } from "@/components/logomark";
import { AgentUpdateBadge } from "@/components/agent-update-badge";
import { isAgentOutdated, LATEST_AGENT_VERSION } from "@/lib/version";
import type { ComponentType, SVGProps } from "react";
import type { Theme } from "@/lib/theme";
import type { Dictionary, Locale } from "@/i18n/types";

export type SidebarUser = {
  username: string;
  isAdmin: boolean;
} | null;

type IconComponent = ComponentType<SVGProps<SVGSVGElement>>;
type Item = { href: string; label: string; icon: IconComponent };

export function Sidebar({
  user,
  agentVersion,
  theme,
  skin,
  locale,
  t,
}: {
  user: SidebarUser;
  agentVersion: string | null;
  theme: Theme;
  skin: Skin;
  locale: Locale;
  t: Dictionary;
}) {
  // API tokens are a power-user / admin concern — the agent install
  // happens once via the onboarding card on the dashboard, and after
  // that regular users never need to look at this surface. Admins keep
  // the link so they can issue / revoke tokens for themselves.
  const primary: Item[] = [
    { href: "/dashboard", label: t.nav.dashboard, icon: LayoutDashboard },
    { href: "/leaderboard", label: t.nav.leaderboard, icon: Trophy },
    { href: "/subscriptions", label: t.nav.subscriptions, icon: Sword },
    { href: "/models", label: t.nav.models, icon: Sparkles },
    { href: "/prices", label: t.nav.prices, icon: DollarSign },
  ];
  if (user?.isAdmin) {
    primary.push({ href: "/tokens", label: t.nav.tokens, icon: KeyRound });
    primary.push({ href: "/users", label: t.nav.users, icon: Users });
  }
  const secondary: Item[] = [
    { href: "/about", label: t.nav.about, icon: Info },
  ];

  return (
    <aside className="tu-slide-in sticky top-0 flex h-dvh w-60 shrink-0 flex-col border-r border-border-subtle bg-bg-sidebar text-sm">
      {/* Brand: sparkline mark (animates on first paint) + word "tokenusage"
          with the central 'u' painted in the accent indigo. */}
      <div className="flex h-14 items-center px-4">
        <Link
          href="/dashboard"
          className="flex items-center gap-2.5 text-accent transition-opacity hover:opacity-90"
          aria-label="tokenusage"
        >
          <Logomark className="h-5 w-7 text-accent" />
          <Wordmark className="text-[15px]" />
        </Link>
        {isAgentOutdated(agentVersion) && agentVersion && (
          <AgentUpdateBadge
            currentVersion={agentVersion}
            latestVersion={LATEST_AGENT_VERSION}
            labels={t.agentUpdate}
          />
        )}
      </div>

      {/* Primary nav — each link fades in on a 40ms stagger after the
          sidebar slides in. The cascade reads as "the nav is settling
          into place" rather than "everything pops at once". */}
      <nav className="flex flex-1 flex-col gap-6 overflow-y-auto px-2 py-2">
        <SidebarSection label={t.nav.workspace}>
          {primary.map((item, i) => (
            <div
              key={item.href}
              className="tu-fade-in"
              style={{ animationDelay: `${180 + i * 40}ms` }}
            >
              <SidebarNavLink href={item.href} label={item.label}>
                <item.icon className="h-4 w-4" strokeWidth={1.8} aria-hidden />
              </SidebarNavLink>
            </div>
          ))}
        </SidebarSection>

        <SidebarSection label={t.nav.account}>
          {secondary.map((item, i) => (
            <div
              key={item.href}
              className="tu-fade-in"
              style={{ animationDelay: `${340 + i * 40}ms` }}
            >
              <SidebarNavLink href={item.href} label={item.label}>
                <item.icon className="h-4 w-4" strokeWidth={1.8} aria-hidden />
              </SidebarNavLink>
            </div>
          ))}
        </SidebarSection>
      </nav>

      {/* Footer */}
      <div className="flex flex-col gap-3 border-t border-border-subtle px-3 py-3">
        {user && (
          <div className="flex items-center justify-between gap-2 rounded-md px-2 py-1.5 text-xs">
            <Link
              href="/tokens"
              className="flex min-w-0 items-center gap-2 text-fg-default hover:text-fg-strong"
              title={user.username}
            >
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-bg-panel-2 font-mono text-[10px] uppercase">
                {user.username.slice(0, 2)}
              </span>
              <span className="truncate font-medium">{user.username}</span>
            </Link>
            <form action={logoutAction}>
              <button
                type="submit"
                className="rounded p-1 text-fg-muted transition-colors hover:bg-bg-panel-2 hover:text-fg-default"
                title={t.navHeader.signOut}
                aria-label={t.navHeader.signOut}
              >
                <LogOut className="h-3.5 w-3.5" strokeWidth={1.8} />
              </button>
            </form>
          </div>
        )}
        <div className="flex flex-col gap-1.5 px-2">
          <SkinSwitcher active={skin} labels={t.skin} />
          <ThemeSwitcher active={theme} labels={t.theme} />
          <LocaleSwitcher active={locale} label={t.language.label} />
        </div>
      </div>
    </aside>
  );
}

function SidebarSection({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-0.5">
      <div className="px-2 pb-1 text-[10.5px] font-medium uppercase tracking-wider text-fg-faint">
        {label}
      </div>
      {children}
    </div>
  );
}
