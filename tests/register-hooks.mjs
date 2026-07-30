// Entry point for `node --import`. Sets up the two things the app's
// bundler-targeted TypeScript expects but raw Node ESM does not provide.
// See ts-resolve-hooks.mjs for the resolution half.
import { register, createRequire } from "node:module";

register("./ts-resolve-hooks.mjs", import.meta.url);

// src/lib/pricing.ts deliberately reaches for `node:fs` through a dynamic
// `require()` so the static analyzer keeps fs out of the Cloudflare Worker
// bundle (see readNodeOverride there). Bundlers supply `require`; ESM does not,
// so the call throws "require is not defined" under `node --test`.
//
// Providing it here rather than rewriting pricing.ts keeps a deliberate
// production tree-shaking pattern intact — the comment on that code explains
// why it has to stay a dynamic require — and confines the shim to the test
// process. Only `node:` builtins are loaded this way, so the resolution base
// does not matter.
if (typeof globalThis.require === "undefined") {
  globalThis.require = createRequire(import.meta.url);
}
