import "server-only";
import { cookies } from "next/headers";
import { SESSION_COOKIE_NAME } from "./constants";

export { SESSION_COOKIE_NAME };

/**
 * Reads the signed-in API key from the httpOnly session cookie, or null if
 * absent. The key is opaque here - apps/api is the only thing that can tell
 * whether it's still valid, and does so on every forwarded request.
 */
export async function getSessionKey(): Promise<string | null> {
  const store = await cookies();
  return store.get(SESSION_COOKIE_NAME)?.value ?? null;
}

/**
 * Forgets the session key once apps/api has rejected it (401). Without this
 * a stale cookie loops forever: apiSlice bounces the client to /login, and
 * proxy.ts - which only sees that a cookie is present - bounces it back.
 */
export async function clearSessionKey(): Promise<void> {
  const store = await cookies();
  store.delete(SESSION_COOKIE_NAME);
}
