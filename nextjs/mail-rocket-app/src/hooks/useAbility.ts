import { useMemo } from "react";
import { useGetMeQuery } from "@/features/session";
import { defineAbility, type AppAbility } from "@/lib/auth/abilities";
import { useHydrated } from "./useHydrated";

export interface CurrentAbility {
  /** CASL ability built from the signed-in key's claims; denies everything until `/me` has loaded. */
  ability: AppAbility;
  isLoading: boolean;
}

/** Denies everything; used before the key's claims are known. */
const NO_CLAIMS = defineAbility([]);

/**
 * The signed-in API key's CASL ability, built from the cached `GET /me`
 * result. Mirrors what bun/api's `requireAbility` will allow, so UI gating
 * stays consistent with the server - but it's UX only; the server is the
 * authority. Reports loading until hydration finishes so the first client
 * render matches the server's.
 */
export function useAbility(): CurrentAbility {
  const hydrated = useHydrated();
  const { data: me, isLoading } = useGetMeQuery();
  const ability = useMemo(() => (me ? defineAbility(me.claims) : NO_CLAIMS), [me]);
  return hydrated ? { ability, isLoading } : { ability: NO_CLAIMS, isLoading: true };
}
