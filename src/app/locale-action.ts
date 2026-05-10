"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { LOCALE_COOKIE } from "@/i18n";
import { LOCALES, type Locale } from "@/i18n/types";

export async function setLocaleAction(formData: FormData): Promise<void> {
  const raw = formData.get("locale");
  if (typeof raw !== "string" || !(LOCALES as readonly string[]).includes(raw)) {
    return;
  }
  const locale = raw as Locale;
  const c = await cookies();
  c.set(LOCALE_COOKIE, locale, {
    path: "/",
    httpOnly: false,
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 365,
  });
  revalidatePath("/", "layout");
}
