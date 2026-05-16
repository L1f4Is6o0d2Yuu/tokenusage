import "server-only";
import crypto from "node:crypto";

// Google Sign-In via OAuth 2.0 authorization code flow with PKCE.
// We use the OpenID Connect (OIDC) scope so the token response includes
// an id_token JWT that carries the user's verified email — no separate
// userinfo round-trip needed.
//
// Setup: create a Web Application OAuth client at
// https://console.cloud.google.com/apis/credentials, then set
// GOOGLE_OAUTH_CLIENT_ID + GOOGLE_OAUTH_CLIENT_SECRET in .env. List both
// prod and dev callback URLs as "Authorized redirect URIs" on the same
// client:
//   https://tokenusage.online/auth/oauth/google/callback
//   https://dev.tokenusage.online/auth/oauth/google/callback

const AUTHORIZE_URL = "https://accounts.google.com/o/oauth2/v2/auth";
const TOKEN_URL = "https://oauth2.googleapis.com/token";
const SCOPES = "openid email profile";

export function googleConfigured(): boolean {
  return !!(
    process.env.GOOGLE_OAUTH_CLIENT_ID && process.env.GOOGLE_OAUTH_CLIENT_SECRET
  );
}

function b64url(buf: Buffer): string {
  return buf.toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export function generatePkcePair(): { verifier: string; challenge: string } {
  const verifier = b64url(crypto.randomBytes(32));
  const challenge = b64url(crypto.createHash("sha256").update(verifier).digest());
  return { verifier, challenge };
}

export function generateState(): string {
  return b64url(crypto.randomBytes(24));
}

export function buildAuthorizeUrl(opts: {
  state: string;
  codeChallenge: string;
  redirectUri: string;
}): string {
  const params = new URLSearchParams({
    client_id: process.env.GOOGLE_OAUTH_CLIENT_ID!,
    redirect_uri: opts.redirectUri,
    response_type: "code",
    scope: SCOPES,
    state: opts.state,
    code_challenge: opts.codeChallenge,
    code_challenge_method: "S256",
    // Don't keep us logged into the Google account silently — show the
    // account picker every time so the user is conscious of which Google
    // identity they're signing in with.
    prompt: "select_account",
  });
  return `${AUTHORIZE_URL}?${params.toString()}`;
}

export type GoogleIdentity = {
  sub: string;
  email: string;
  emailVerified: boolean;
  name: string | null;
};

export async function exchangeCodeForIdentity(opts: {
  code: string;
  codeVerifier: string;
  redirectUri: string;
}): Promise<GoogleIdentity> {
  const body = new URLSearchParams({
    code: opts.code,
    client_id: process.env.GOOGLE_OAUTH_CLIENT_ID!,
    client_secret: process.env.GOOGLE_OAUTH_CLIENT_SECRET!,
    redirect_uri: opts.redirectUri,
    grant_type: "authorization_code",
    code_verifier: opts.codeVerifier,
  });

  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body,
  });
  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new Error(`google token exchange failed: ${res.status} ${detail.slice(0, 200)}`);
  }
  const json = (await res.json()) as { id_token?: string };
  if (!json.id_token) throw new Error("google token response missing id_token");

  // The id_token JWT is delivered over the TLS-authenticated server-to-server
  // channel, so per Google's OIDC guidance signature verification is optional
  // here. We decode the payload directly.
  const parts = json.id_token.split(".");
  if (parts.length !== 3) throw new Error("malformed id_token");
  const payload = JSON.parse(
    Buffer.from(parts[1].replace(/-/g, "+").replace(/_/g, "/"), "base64").toString("utf8")
  ) as { sub?: string; email?: string; email_verified?: boolean; name?: string };

  if (!payload.sub || !payload.email) {
    throw new Error("id_token missing sub or email");
  }
  return {
    sub: payload.sub,
    email: payload.email,
    emailVerified: !!payload.email_verified,
    name: payload.name ?? null,
  };
}

export function callbackPath(): string {
  return "/auth/oauth/google/callback";
}

// Short-lived HTTP-only cookies that carry the OAuth flow's CSRF state and
// PKCE verifier from the /start redirect to the /callback handler.
export const OAUTH_STATE_COOKIE = "tokenusage-oauth-state";
export const OAUTH_VERIFIER_COOKIE = "tokenusage-oauth-verifier";
export const OAUTH_FLOW_TTL_SECONDS = 10 * 60;
