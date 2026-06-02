// Wrapper Worker entry that the wrangler bundler sees instead of the
// raw OpenNext output. Re-exports the OpenNext fetch handler + Durable
// Object classes verbatim, then bolts on a scheduled handler so the
// Cron Trigger configured in env.staging.triggers.crons has somewhere
// to land. Built from `.open-next/worker.js` after `pnpm cf:build`.
//
// Plain .mjs (no TS) so we can directly import from the generated JS
// without TypeScript whining about missing declarations.

// Re-export the auto-generated Durable Object classes — wrangler
// matches the binding names in wrangler.jsonc against the names
// exported here, so they have to be at the top level of THIS module.
export {
  DOQueueHandler,
  DOShardedTagCache,
  BucketCachePurge,
} from "./.open-next/worker.js";

import openNextWorker from "./.open-next/worker.js";
import { runSharesCleanup } from "./worker-cleanup.mjs";

export default {
  fetch: openNextWorker.fetch,
  async scheduled(event, env, ctx) {
    if (!env.TOKENUSAGE_DB || !env.TOKENUSAGE_SHARES) {
      console.warn(
        "[cleanup] missing TOKENUSAGE_DB or TOKENUSAGE_SHARES binding — skipping"
      );
      return;
    }
    // ctx.waitUntil keeps the isolate alive for the cleanup work even
    // after `scheduled` returns. Without it the cron would race the
    // event loop and we'd see partial completions.
    ctx.waitUntil(runSharesCleanup(env.TOKENUSAGE_DB, env.TOKENUSAGE_SHARES));
  },
};
