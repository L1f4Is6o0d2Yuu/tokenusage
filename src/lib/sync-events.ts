import "server-only";
import { EventEmitter } from "node:events";

// Singleton emitter so that POST /api/sync-now (server action) can release
// any /api/sync-wait connection currently held open by the user's agent.
//
// Lives in module scope so it survives across requests within the same
// Node process. In a multi-process deploy (e.g. Next.js in cluster mode)
// you'd swap this for a Redis pub/sub or PostgreSQL LISTEN/NOTIFY. Our
// single-process Docker image is fine with in-memory.
const emitter = new EventEmitter();
emitter.setMaxListeners(0); // unlimited

function channel(userId: number): string {
  return `sync:${userId}`;
}

export function notifySync(userId: number): void {
  emitter.emit(channel(userId));
}

// Resolves true when /api/sync-now fires for this user, or false on timeout.
export function waitSync(userId: number, timeoutMs: number): Promise<boolean> {
  return new Promise((resolve) => {
    let settled = false;
    const ch = channel(userId);
    const onSync = () => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      emitter.off(ch, onSync);
      resolve(true);
    };
    const timer = setTimeout(() => {
      if (settled) return;
      settled = true;
      emitter.off(ch, onSync);
      resolve(false);
    }, timeoutMs);
    emitter.on(ch, onSync);
  });
}
