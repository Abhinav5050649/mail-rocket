import { NextResponse } from "next/server";
import { getSessionKey } from "@/lib/auth/session";
import { bunApiFetch } from "@/lib/auth/bunApi";

/** Resolves the signed-in API key (with its claims) by calling GET /me on bun/api. */
export async function GET() {
  const key = await getSessionKey();
  if (!key) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const backendRes = await bunApiFetch("/me", { headers: { Authorization: `Bearer ${key}` } });
  const data = await backendRes.json();
  return NextResponse.json(data, { status: backendRes.status });
}
