import { readCurrentUser } from "@/lib/auth";
import { getUserSyncState } from "@/lib/sync-state";

// Browser-polled by the SyncControl progress bar to know when the agent
// has actually finished uploading. Compares syncRequestedAt vs.
// lastUploadedAt to determine real state — replaces the old 6s pure-CSS
// fake progress animation.
//
// Phase derivation in the client:
//   idle      — syncRequestedAt is null
//   pending   — syncRequestedAt > lastUploadedAt (or lastUploadedAt null)
//   done      — lastUploadedAt >= syncRequestedAt
export async function GET(): Promise<Response> {
  const user = await readCurrentUser();
  if (!user) {
    return new Response(JSON.stringify({ ok: false, message: "not signed in" }), {
      status: 401,
      headers: { "content-type": "application/json" },
    });
  }
  const state = getUserSyncState(user.id);
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
