// Agent liveness under the push model (v0.28).
//
// The agent no longer holds a long-poll open, so "is it connected right
// now" is not an observable any more. What we can observe is the last
// time it talked to us at all: a data push, or the once-a-day check-in.
//
// That means the window has to be wider than the heartbeat period or a
// perfectly healthy agent reads as dead for 23 of every 24 hours.
// 26h = the 24h heartbeat plus slack for a laptop that was asleep over
// the boundary.
export const AGENT_HEARTBEAT_INTERVAL_MS = 24 * 60 * 60 * 1000;
export const AGENT_LIVE_THRESHOLD_MS = 26 * 60 * 60 * 1000;

// How stale `api_tokens.last_used_at` must be before a bearer request is
// allowed to rewrite it. Every write costs a D1 row-write against a
// 100k/day free-tier budget, and a heartbeat carries no information the
// previous one didn't — so we coalesce them to one per day per token.
// Real work (an upload, a user-initiated sync) passes force and always
// writes.
export const AGENT_SEEN_WRITE_INTERVAL_MS = AGENT_HEARTBEAT_INTERVAL_MS;

// True when the agent has checked in recently enough that we'd expect
// its data to be current. Named "live" for continuity with the callers;
// the UI wording is "last active", not "online".
export function isAgentLiveAt(agentSeenAt: number | null, now: number): boolean {
  return agentSeenAt != null && now - agentSeenAt <= AGENT_LIVE_THRESHOLD_MS;
}

// Whether a bearer hit from `tokenLastUsedAt` should rewrite the column.
export function shouldWriteAgentSeen(
  tokenLastUsedAt: number | null,
  now: number
): boolean {
  return (
    tokenLastUsedAt == null ||
    now - tokenLastUsedAt >= AGENT_SEEN_WRITE_INTERVAL_MS
  );
}
