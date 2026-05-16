import { type NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import {
  callbackPath,
  exchangeCodeForIdentity,
  googleConfigured,
  OAUTH_STATE_COOKIE,
  OAUTH_VERIFIER_COOKIE,
} from "@/lib/oauth-google";
import { getPublicUrl } from "@/lib/public-url";
import { cookieOptions } from "@/lib/cookie-opts";
import {
  createPendingOauthUser,
  createSession,
  findUserByEmail,
  recordUserIp,
  SESSION_COOKIE,
} from "@/lib/auth";
import { recordAudit } from "@/lib/audit";

const ONE_MONTH = 60 * 60 * 24 * 30;

export const dynamic = "force-dynamic";

async function redirectToLogin(error: string): Promise<NextResponse> {
  const origin = await getPublicUrl();
  const url = new URL("/login", origin);
  url.searchParams.set("error", error);
  const res = NextResponse.redirect(url, { status: 303 });
  // Clear the flow cookies on any failure path.
  res.cookies.set(OAUTH_STATE_COOKIE, "", { path: "/", maxAge: 0 });
  res.cookies.set(OAUTH_VERIFIER_COOKIE, "", { path: "/", maxAge: 0 });
  return res;
}

export async function GET(req: NextRequest): Promise<Response> {
  if (!googleConfigured()) {
    return new Response("google oauth not configured", { status: 503 });
  }

  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const oauthError = url.searchParams.get("error");
  if (oauthError) return await redirectToLogin(oauthError);
  if (!code || !state) return await redirectToLogin("oauth_missing_code");

  const expectedState = req.cookies.get(OAUTH_STATE_COOKIE)?.value;
  const verifier = req.cookies.get(OAUTH_VERIFIER_COOKIE)?.value;
  if (!expectedState || !verifier) return await redirectToLogin("oauth_expired");
  if (state !== expectedState) return await redirectToLogin("oauth_state_mismatch");

  const origin = await getPublicUrl();
  const redirectUri = `${origin}${callbackPath()}`;

  let identity;
  try {
    identity = await exchangeCodeForIdentity({
      code,
      codeVerifier: verifier,
      redirectUri,
    });
  } catch (e) {
    console.error("[oauth-google] token exchange failed:", e);
    return await redirectToLogin("oauth_exchange_failed");
  }

  if (!identity.emailVerified) {
    return await redirectToLogin("oauth_email_unverified");
  }

  let user = findUserByEmail(identity.email);
  const h = await headers();
  const ip = h.get("x-forwarded-for")?.split(",")[0]?.trim() ?? h.get("x-real-ip") ?? null;
  const ua = h.get("user-agent");

  if (!user) {
    // No matching account → create a pending user. The (app) layout will
    // redirect them to /pending until an admin flips them active from
    // /users. We session them in so the admin can see who they are and
    // they can return to /pending without re-doing the Google flow.
    user = createPendingOauthUser({
      email: identity.email,
      preferredUsername: identity.name,
    });
    recordAudit({
      userId: user.id,
      action: "oauth_pending_created",
      ip,
      userAgent: ua,
      meta: { method: "google", email: identity.email, name: identity.name },
    });
  } else {
    recordAudit({
      userId: user.id,
      action: "login",
      ip,
      userAgent: ua,
      meta: { method: "google", activated: user.activatedAt != null },
    });
  }

  recordUserIp(user.id, ip ?? "");

  const sessionToken = createSession(user.id);
  // Pending users land on /pending; activated users land on /.
  const landingPath = user.activatedAt == null ? "/pending" : "/";
  const res = NextResponse.redirect(new URL(landingPath, origin), { status: 303 });
  res.cookies.set(SESSION_COOKIE, sessionToken, cookieOptions(ONE_MONTH));
  // Clear the flow cookies — they served their purpose.
  res.cookies.set(OAUTH_STATE_COOKIE, "", { path: "/", maxAge: 0 });
  res.cookies.set(OAUTH_VERIFIER_COOKIE, "", { path: "/", maxAge: 0 });
  return res;
}
