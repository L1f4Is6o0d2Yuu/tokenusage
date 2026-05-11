import { cookies } from "next/headers";
import { Sidebar } from "@/components/sidebar";
import { readCurrentUser } from "@/lib/auth";
import { isMultiUserMode } from "@/lib/server-db";
import { getDictionary, readLocale } from "@/i18n";
import { isTheme, THEME_COOKIE, type Theme } from "@/lib/theme";

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

  const user = isMultiUserMode() ? await readCurrentUser() : null;

  return (
    <div className="flex min-h-dvh">
      <Sidebar
        user={user ? { username: user.username, isAdmin: user.isAdmin } : null}
        theme={theme}
        locale={locale}
        t={t}
      />
      <main className="flex min-w-0 flex-1 flex-col">{children}</main>
    </div>
  );
}
