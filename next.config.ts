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
  // fs.readFileSync(process.cwd() + "/public/fonts/..."). public/ is
  // already copied by the Dockerfile, but spell it out so the
  // standalone trace knows the route depends on these files.
  outputFileTracingIncludes: {
    "/api/share/[period]": ["./public/fonts/**/*.woff"],
  },
};

export default nextConfig;
