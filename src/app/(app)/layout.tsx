import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { Sidebar } from "@/components/sidebar";
import { readCurrentUser, recordUserIp, readAgentVersion } from "@/lib/auth";
import { isMultiUserMode } from "@/lib/server-db";
import { getDictionary, readLocale } from "@/i18n";
import { isTheme, THEME_COOKIE, type Theme } from "@/lib/theme";
import { isSkin, SKIN_COOKIE, type Skin } from "@/lib/skin";

// Backfill window: if a user's last_ip stamp is older than this (or
// missing), the next dashboard render captures their request IP again.
// Long enough that we're not writing on every nav, short enough that a
// user who left the session running for a week still gets a recent IP
// surfaced to the admin /users page.
const IP_BACKFILL_TTL_MS = 60 * 60 * 1000; // 1 hour

function currentTimeMs(): number {
  return Date.now();
}

// Shared shell for all authenticated dashboard pages.
//
// We deliberately *don't* enforce auth here — individual pages already call
// requireUser()/readCurrentUser() and redirect as needed. Wrapping auth at
// the layout level would either double-redirect or hide layout-less pages
// (login/signup, which live outside this route group).
export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const locale = await readLocale();
  const t = await getDictionary(locale);
  const c = await cookies();
  const themeRaw = c.get(THEME_COOKIE)?.value;
  const theme: Theme = isTheme(themeRaw) ? themeRaw : "system";
  const skinRaw = c.get(SKIN_COOKIE)?.value;
  const skin: Skin = isSkin(skinRaw) ? skinRaw : "linear";

  const user = isMultiUserMode() ? await readCurrentUser() : null;

  // Pending users (created via OAuth before an admin approved them) are
  // never allowed into the dashboard. The /pending page is outside this
  // layout, so the redirect breaks out cleanly.
  if (user && user.activatedAt == null) redirect("/pending");

  // Opportunistic IP backfill. Existing sessions issued before IP tracking
  // landed have a NULL last_ip; without this they'd stay invisible to the
  // admin /users page for up to 30 days. We piggyback on the dashboard
  // render (~once per nav at most, throttled to the TTL above).
  if (
    user &&
    (user.lastIpAt == null || currentTimeMs() - (user.lastIpAt ?? 0) > IP_BACKFILL_TTL_MS)
  ) {
    const h = await headers();
    const ip =
      (h.get("x-forwarded-for")?.split(",")[0] ?? h.get("x-real-ip") ?? "").trim();
    if (ip) recordUserIp(user.id, ip);
  }

  // In multi-user mode, an unauthed visitor at / hits the public
  // landing page (rendered by (app)/page.tsx). The dashboard sidebar
  // makes no sense for that audience and leaks the dashboard nav into
  // marketing — skip the shell entirely when there's no user.
  const showShell = !isMultiUserMode() || user != null;

  if (!showShell) {
    return <>{children}</>;
  }

  return (
    <div className="flex min-h-dvh">
      <Sidebar
        user={user ? { username: user.username, isAdmin: user.isAdmin } : null}
        agentVersion={user ? readAgentVersion(user.id) : null}
        theme={theme}
        skin={skin}
        locale={locale}
        t={t}
      />
      <main className="flex min-w-0 flex-1 flex-col">{children}</main>
    </div>
  );
}
