import { NextResponse } from "next/server";
import {
  buildAuthorizeUrl,
  callbackPath,
  generatePkcePair,
  generateState,
  googleConfigured,
  OAUTH_FLOW_TTL_SECONDS,
  OAUTH_STATE_COOKIE,
  OAUTH_VERIFIER_COOKIE,
} from "@/lib/oauth-google";
import { getPublicUrl } from "@/lib/public-url";
import { cookieOptions } from "@/lib/cookie-opts";

export const dynamic = "force-dynamic";

export async function GET(): Promise<Response> {
  if (!googleConfigured()) {
    return new Response("google oauth not configured", { status: 503 });
  }

  const state = generateState();
  const { verifier, challenge } = generatePkcePair();
  const origin = await getPublicUrl();
  const redirectUri = `${origin}${callbackPath()}`;

  const url = buildAuthorizeUrl({
    state,
    codeChallenge: challenge,
    redirectUri,
  });

  const res = NextResponse.redirect(url);
  const opts = cookieOptions(OAUTH_FLOW_TTL_SECONDS);
  res.cookies.set(OAUTH_STATE_COOKIE, state, opts);
  res.cookies.set(OAUTH_VERIFIER_COOKIE, verifier, opts);
  return res;
}
