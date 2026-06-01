import { readCurrentUser } from "@/lib/auth";
import { requestSync } from "@/lib/sync-state";
import { notifySync } from "@/lib/sync-events";

// User-initiated sync request from the dashboard's "Sync now" button.
// Sets a flag in the DB *and* notifies any held /api/sync-wait connection
// for instant pickup — together they handle the case where the agent is
// reconnecting at the moment the button is clicked.
export async function POST(): Promise<Response> {
  const user = await readCurrentUser();
  if (!user) {
    return new Response(JSON.stringify({ ok: false, message: "not signed in" }), {
      status: 401,
      headers: { "content-type": "application/json" },
    });
  }
  await requestSync(user.id);
  notifySync(user.id);
  return Response.json({ ok: true });
}
