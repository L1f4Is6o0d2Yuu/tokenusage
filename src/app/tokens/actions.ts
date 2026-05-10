"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { readCurrentUser, createApiToken, revokeApiToken } from "@/lib/auth";
import { setSyncInterval } from "@/lib/sync-state";
import { notifySync } from "@/lib/sync-events";

export async function createTokenAction(formData: FormData): Promise<void> {
  const user = await readCurrentUser();
  if (!user) redirect("/login");
  const name = String(formData.get("name") ?? "").trim() || "agent";
  const { plaintext } = createApiToken(user.id, name);
  revalidatePath("/tokens");
  redirect(`/tokens?new=${encodeURIComponent(plaintext)}`);
}

export async function revokeTokenAction(formData: FormData): Promise<void> {
  const user = await readCurrentUser();
  if (!user) redirect("/login");
  const id = Number(formData.get("id"));
  if (!Number.isFinite(id)) return;
  revokeApiToken(user.id, id);
  revalidatePath("/tokens");
}

export async function setSyncIntervalAction(formData: FormData): Promise<void> {
  const user = await readCurrentUser();
  if (!user) redirect("/login");
  const seconds = Number(formData.get("interval"));
  try {
    setSyncInterval(user.id, seconds);
  } catch {
    // ignore invalid value silently — server-side validation rejected it.
  }
  // Nudge any held /api/sync-wait connection so the agent picks up the
  // new interval value on its next poll.
  notifySync(user.id);
  revalidatePath("/tokens");
  redirect("/tokens?settings=saved");
}
