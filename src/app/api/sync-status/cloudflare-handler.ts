import { readCurrentUserD1 } from "@/lib/cloudflare-auth";
import { getUserSyncStateD1 } from "@/lib/cloudflare-sync-state";

export async function GET(): Promise<Response> {
  const user = await readCurrentUserD1();
  if (!user) {
    return new Response(JSON.stringify({ ok: false, message: "not signed in" }), {
      status: 401,
      headers: { "content-type": "application/json" },
    });
  }
  const state = await getUserSyncStateD1(user.id);
  return Response.json({
    ok: true,
    syncRequestedAt: state.syncRequestedAt,
    lastUploadedAt: state.lastUploadedAt,
    paused: state.paused,
    agentSeenAt: state.agentSeenAt,
    agentLive: state.agentLive,
    agentVersion: state.agentVersion,
    uploadStartedAt: state.uploadStartedAt,
    uploadTotalBytes: state.uploadTotalBytes,
  });
}
