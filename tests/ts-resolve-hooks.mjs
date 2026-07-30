// Resolution hooks so `node --test` can import the app's TypeScript directly.
//
// The app is written for a bundler (`moduleResolution: "bundler"` in
// tsconfig.json), so its relative imports are extensionless — `./runtime`, not
// `./runtime.ts` — and JSON is imported plainly. Node's ESM resolver requires
// the opposite on both counts: a full specifier, and an explicit
// `with { type: "json" }` attribute.
//
// That mismatch is why tests/hermes-pricing.test.mjs failed with
// ERR_MODULE_NOT_FOUND on `src/lib/runtime` while tests importing modules with
// only *type* imports passed — type imports are erased, so nothing had to
// resolve at runtime.
//
// The fix belongs here rather than in src/. Rewriting app imports to carry
// `.ts` extensions (or JSON import attributes) to satisfy a test runner would
// mean changing production source — and the Next/OpenNext builds — for the
// benefit of the harness. This keeps the accommodation in the harness.
import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const CANDIDATE_EXTENSIONS = [".ts", ".tsx", ".mts", ".js", ".mjs"];

function firstExisting(base) {
  for (const ext of CANDIDATE_EXTENSIONS) {
    if (existsSync(base + ext)) return base + ext;
  }
  for (const ext of CANDIDATE_EXTENSIONS) {
    const indexFile = path.join(base, `index${ext}`);
    if (existsSync(indexFile)) return indexFile;
  }
  return null;
}

export async function resolve(specifier, context, nextResolve) {
  // JSON needs an explicit import attribute under Node ESM. The app imports it
  // plainly because bundlers don't require one.
  if (specifier.endsWith(".json") && specifier.startsWith(".")) {
    const parentPath = context.parentURL
      ? path.dirname(fileURLToPath(context.parentURL))
      : process.cwd();
    const resolved = path.resolve(parentPath, specifier);
    if (existsSync(resolved)) {
      return {
        url: pathToFileURL(resolved).href,
        format: "json",
        importAttributes: { type: "json" },
        shortCircuit: true,
      };
    }
  }

  if (specifier.startsWith(".") && path.extname(specifier) === "") {
    const parentPath = context.parentURL
      ? path.dirname(fileURLToPath(context.parentURL))
      : process.cwd();
    const found = firstExisting(path.resolve(parentPath, specifier));
    if (found) {
      return nextResolve(pathToFileURL(found).href, context);
    }
  }

  return nextResolve(specifier, context);
}
