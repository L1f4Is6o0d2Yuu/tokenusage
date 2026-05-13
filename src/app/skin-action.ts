"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { isSkin, SKIN_COOKIE } from "@/lib/skin";
import { clientReadableCookieOptions } from "@/lib/cookie-opts";

// Persist the user's chosen skin in a client-readable cookie so the
// no-flash <head> script can apply data-skin on the html element
// before React hydrates.
export async function setSkinAction(formData: FormData): Promise<void> {
  const raw = formData.get("skin");
  if (typeof raw !== "string" || !isSkin(raw)) return;
  const c = await cookies();
  c.set(SKIN_COOKIE, raw, clientReadableCookieOptions(60 * 60 * 24 * 365));
  revalidatePath("/", "layout");
}
