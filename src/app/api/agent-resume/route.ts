import { readCurrentUser } from "@/lib/auth";
import { setAgentPaused } from "@/lib/sync-state";
import { notifySync } from "@/lib/sync-events";

// Counterpart to /api/agent-pause. Clears the flag and pings the held
// /api/sync-wait connection so the agent immediately resumes its loop.
export async function POST(): Promise<Response> {
  const user = await readCurrentUser();
  if (!user) {
    return new Response(JSON.stringify({ ok: false, message: "not signed in" }), {
      status: 401,
      headers: { "content-type": "application/json" },
    });
  }
  await setAgentPaused(user.id, false);
  notifySync(user.id);
  return Response.json({ ok: true, paused: false });
}
