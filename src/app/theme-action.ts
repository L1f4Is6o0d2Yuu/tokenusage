"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { isTheme, THEME_COOKIE } from "@/lib/theme";
import { clientReadableCookieOptions } from "@/lib/cookie-opts";

export async function setThemeAction(formData: FormData): Promise<void> {
  const raw = formData.get("theme");
  if (typeof raw !== "string" || !isTheme(raw)) return;
  const c = await cookies();
  // Theme cookie is intentionally readable by client JS so the no-flash
  // <head> script can apply the right class before React hydrates.
  c.set(THEME_COOKIE, raw, clientReadableCookieOptions(60 * 60 * 24 * 365));
  revalidatePath("/", "layout");
}
