import path from "node:path";
import fs from "node:fs/promises";

// Serves the agent script as a downloadable file. Lets new users grab it
// without cloning the whole repo:
//
//   curl -O https://your-server/api/agent
//
// The file is read at request time so dev server picks up edits without a
// rebuild. In the Docker image, agent/index.mjs lives at /app/agent/.

export async function GET(): Promise<Response> {
  const filePath = path.join(process.cwd(), "agent", "index.mjs");
  try {
    const body = await fs.readFile(filePath, "utf8");
    return new Response(body, {
      headers: {
        "content-type": "application/javascript; charset=utf-8",
        "content-disposition": 'attachment; filename="tokenusage-agent.mjs"',
        "cache-control": "no-store",
      },
    });
  } catch {
    return new Response(JSON.stringify({ ok: false, message: "agent script not found" }), {
      status: 500,
      headers: { "content-type": "application/json" },
    });
  }
}
