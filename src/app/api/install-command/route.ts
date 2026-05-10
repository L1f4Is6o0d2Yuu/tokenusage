import { readCurrentUser, createApiToken } from "@/lib/auth";
import { getPublicUrl } from "@/lib/public-url";

// One-click install support: dashboard hits this endpoint, gets back a fresh
// API token + the full install command with the token already baked in. The
// token is named after the current minute so the user can recognise it
// later in /tokens (and revoke if needed).
export async function POST(): Promise<Response> {
  const user = await readCurrentUser();
  if (!user) {
    return new Response(JSON.stringify({ ok: false, message: "not signed in" }), {
      status: 401,
      headers: { "content-type": "application/json" },
    });
  }
  const stamp = new Date().toISOString().slice(0, 16).replace("T", " ");
  const { plaintext } = createApiToken(user.id, `agent ${stamp}`);
  const publicUrl = await getPublicUrl();
  const command = `curl -fsSL "${publicUrl}/install.sh?token=${plaintext}" | sh`;
  return Response.json({ ok: true, token: plaintext, command });
}
