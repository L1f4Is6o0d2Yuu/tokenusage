"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { isTheme, THEME_COOKIE } from "@/lib/theme";

export async function setThemeAction(formData: FormData): Promise<void> {
  const raw = formData.get("theme");
  if (typeof raw !== "string" || !isTheme(raw)) return;
  const c = await cookies();
  c.set(THEME_COOKIE, raw, {
    path: "/",
    httpOnly: false,
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 365,
  });
  revalidatePath("/", "layout");
}
