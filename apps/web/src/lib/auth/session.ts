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
