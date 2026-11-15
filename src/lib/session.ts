import type { SessionOptions } from "iron-session";

export function getSessionOptions(): SessionOptions {
  const secret = process.env.SESSION_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error(
      "SESSION_SECRET must be set to a random string of at least 32 characters",
    );
  }
  // Browsers reject Secure cookies on plain http:// (e.g. Docker on localhost).
  // Use SESSION_COOKIE_SECURE=true only when the app is served over HTTPS.
  const secure = process.env.SESSION_COOKIE_SECURE === "true";

  return {
    password: secret,
    cookieName: "qa_session",
    cookieOptions: {
      secure,
      httpOnly: true,
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 14,
      path: "/",
    },
  };
}
