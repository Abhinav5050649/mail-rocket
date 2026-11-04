import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { SESSION_COOKIE_NAME } from "@/lib/auth/session";

/**
 * Signing out only forgets the key in this browser - it clears the cookie
 * but does not revoke the key, which keeps working anywhere else it's used.
 * Revoke it from Settings -> API keys to stop it working everywhere.
 */
export async function POST() {
  const store = await cookies();
  store.delete(SESSION_COOKIE_NAME);
  return NextResponse.json({ ok: true });
}
