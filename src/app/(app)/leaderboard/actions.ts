"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { readCurrentUser } from "@/lib/auth";
import { setShowOnLeaderboard } from "@/lib/leaderboard";

export async function toggleLeaderboardVisibility(formData: FormData): Promise<void> {
  const user = await readCurrentUser();
  if (!user) redirect("/login");
  const show = formData.get("show") === "1";
  await setShowOnLeaderboard(user.id, show);
  revalidatePath("/leaderboard");
}

// Bump the flavor rotation cookie. Triggered by a client component
// once the leaderboard has rendered — the *next* visit reads the new
// value and produces a different taunt/praise. The pool sizes (90/62)
// and the step (17 in pickFlavor) are coprime, so 5 consecutive
// rotations are guaranteed to pick 5 distinct lines for any given row.
export async function bumpFlavorRotation(): Promise<void> {
  const store = await cookies();
  const current = Number.parseInt(store.get("lb-rot")?.value ?? "0", 10);
  const next = (Number.isFinite(current) ? current + 1 : 1) % 10_000;
  store.set("lb-rot", String(next), {
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 30, // 30 days
    path: "/",
  });
}
