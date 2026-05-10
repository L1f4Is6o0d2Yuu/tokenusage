import { readCurrentUser } from "@/lib/auth";
import { setAgentPaused } from "@/lib/sync-state";
import { notifySync } from "@/lib/sync-events";

// POST flips the agent_paused flag on. notifySync releases any held
// /api/sync-wait connection so the agent learns about the pause without
// waiting up to 5 minutes for the next reconnect.
export async function POST(): Promise<Response> {
  const user = await readCurrentUser();
  if (!user) {
    return new Response(JSON.stringify({ ok: false, message: "not signed in" }), {
      status: 401,
      headers: { "content-type": "application/json" },
    });
  }
  setAgentPaused(user.id, true);
  notifySync(user.id);
  return Response.json({ ok: true, paused: true });
}
