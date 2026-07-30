// Server-side hold for the deprecated /api/sync-wait long-poll.
//
// We sit behind Cloudflare's proxy, which cuts any connection at 100s with
// a hard TCP reset, so the hold has to land under that. 90s leaves margin
// while keeping pre-v0.28 agents — whose only pacing is this hold plus a
// `sleep 1` — down to roughly one request per 91 seconds.
export const LEGACY_HOLD_MS = 90 * 1000;
