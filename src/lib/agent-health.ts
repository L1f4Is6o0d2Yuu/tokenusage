export const AGENT_LIVE_THRESHOLD_MS = 90 * 1000;

export function isAgentLiveAt(agentSeenAt: number | null, now: number): boolean {
  return agentSeenAt != null && now - agentSeenAt <= AGENT_LIVE_THRESHOLD_MS;
}