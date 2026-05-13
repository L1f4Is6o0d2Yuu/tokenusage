import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { cookies } from "next/headers";
import "./globals.css";
import { getDictionary, readLocale } from "@/i18n";
import { isTheme, THEME_COOKIE, type Theme } from "@/lib/theme";
import { isSkin, SKIN_COOKIE, type Skin } from "@/lib/skin";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export async function generateMetadata(): Promise<Metadata> {
  const t = await getDictionary();
  return { title: t.meta.title, description: t.meta.description };
}

// Runs before React hydration so we can paint with the correct theme on the
// first frame. Reads the cookie ourselves rather than relying on a global to
// keep this script self-contained.
const NO_FLASH_SCRIPT = `(function(){try{
  var m = document.cookie.match(/tokenusage-theme=([^;]+)/);
  var t = m ? decodeURIComponent(m[1]) : 'system';
  var dark = t === 'dark' || (t === 'system' && window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches);
  if (dark) document.documentElement.classList.add('dark');
  var ms = document.cookie.match(/tokenusage-skin=([^;]+)/);
  var s = ms ? decodeURIComponent(ms[1]) : 'linear';
  if (s === 'wise') document.documentElement.setAttribute('data-skin', 'wise');
}catch(e){}})();`;

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const locale = await readLocale();
  const c = await cookies();
  const themeRaw = c.get(THEME_COOKIE)?.value;
  const theme: Theme = isTheme(themeRaw) ? themeRaw : "system";
  const skinRaw = c.get(SKIN_COOKIE)?.value;
  const skin: Skin = isSkin(skinRaw) ? skinRaw : "linear";
  // Server-side: only "dark" gets the class on initial HTML. "system" is
  // resolved by the inline script using prefers-color-scheme; "light" is
  // the default unstyled state.
  const initialClass = theme === "dark" ? "dark" : "";

  return (
    <html
      lang={locale}
      data-skin={skin}
      className={`${initialClass} ${geistSans.variable} ${geistMono.variable} h-full antialiased`.trim()}
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: NO_FLASH_SCRIPT }} />
      </head>
      <body className="min-h-dvh bg-bg-app text-foreground">{children}</body>
    </html>
  );
}
