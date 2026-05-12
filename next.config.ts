import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // 'standalone' bundles a minimal node_modules subtree into .next/standalone,
  // letting the production Docker image stay slim. Set
  // TOKENUSAGE_DISABLE_STANDALONE=1 if you need the classic build for some
  // reason (rare).
  output:
    process.env.TOKENUSAGE_DISABLE_STANDALONE === "1" ? undefined : "standalone",

  // better-sqlite3 is a native Node module; tell the Next bundler to leave it
  // alone in server bundles so the prebuilt binary keeps working.
  serverExternalPackages: ["better-sqlite3"],

  // The share image endpoint reads Noto Sans SC WOFFs at runtime via
  // fs.readFileSync(process.cwd() + "/src/fonts/..."). Without this
  // include, standalone tracing strips src/fonts and the route crashes.
  outputFileTracingIncludes: {
    "/api/share/[period]": ["./src/fonts/**/*.woff"],
  },
};

export default nextConfig;
