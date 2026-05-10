"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { readCurrentUser, createApiToken, revokeApiToken } from "@/lib/auth";

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
