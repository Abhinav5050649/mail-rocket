import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { bunApiFetch } from "@/lib/auth/bunApi";
import { SESSION_COOKIE_NAME } from "@/lib/auth/session";
import type { ApiKey } from "@/types/resources";

/** Longest a session cookie lives, even for a key that never expires. */
const MAX_SESSION_SECONDS = 60 * 60 * 24 * 30;

/**
 * "Signs in" by checking a pasted API key against bun/api's `GET /me`. A key
 * bun/api accepts is stored in the httpOnly session cookie (so client JS
 * never sees it again) and the key's public shape is returned; a rejected
 * key's 401 is passed straight through.
 */
export async function POST(request: Request) {
  const { key } = (await request.json()) as { key?: string };
  if (!key?.trim()) {
    return NextResponse.json({ error: "API key is required" }, { status: 400 });
  }

  const backendRes = await bunApiFetch("/me", { headers: { Authorization: `Bearer ${key.trim()}` } });
  const data = await backendRes.json();

  if (!backendRes.ok) {
    return NextResponse.json(data, { status: backendRes.status });
  }

  const me = data as ApiKey;
  // The cookie never outlives the key itself.
  const secondsUntilExpiry = me.expires_at ? Math.floor((new Date(me.expires_at).getTime() - Date.now()) / 1000) : Infinity;

  const store = await cookies();
  store.set(SESSION_COOKIE_NAME, key.trim(), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: Math.min(MAX_SESSION_SECONDS, secondsUntilExpiry),
  });

  return NextResponse.json({ key: me }, { status: 200 });
}
