// Shared cookie defaults. `secure` is on whenever NODE_ENV=production so the
// browser only sends auth/session cookies over HTTPS in deployed setups; in
// dev it's off so localhost (HTTP) still works.
export function cookieOptions(maxAgeSeconds: number): {
  path: "/";
  httpOnly: boolean;
  sameSite: "lax";
  secure: boolean;
  maxAge: number;
} {
  return {
    path: "/",
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: maxAgeSeconds,
  };
}

// For non-sensitive cookies that the client may want to read (locale, theme).
export function clientReadableCookieOptions(maxAgeSeconds: number) {
  return { ...cookieOptions(maxAgeSeconds), httpOnly: false };
}
