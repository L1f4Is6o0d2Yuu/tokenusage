"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { readCurrentUser } from "@/lib/auth";
import {
  PLAN_CATALOG,
  setUserSubscriptions,
  type PlanId,
} from "@/lib/subscriptions";

// User toggles their declared subscriptions. Anyone signed in can edit
// their own — no admin gate (subscriptions are personal to each
// account and don't read other users' data).
export async function saveSubscriptionsAction(formData: FormData): Promise<void> {
  const user = await readCurrentUser();
  if (!user) redirect("/login");

  const validIds = new Set(PLAN_CATALOG.map((p) => p.id as string));
  const picked = formData
    .getAll("plan")
    .filter((v): v is string => typeof v === "string" && validIds.has(v)) as PlanId[];

  setUserSubscriptions(user.id, picked);
  revalidatePath("/");
  revalidatePath("/subscriptions");
  // If the user landed here from the first-time welcome gate, send
  // them on to the dashboard once they're done picking. Otherwise
  // they came in to edit — keep them on the page with a saved badge.
  const fromWelcome = formData.get("welcome") === "1";
  if (fromWelcome) redirect("/");
  redirect("/subscriptions?saved=1");
}
