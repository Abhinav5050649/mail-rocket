import { useMemo } from "react";
import { useGetMeQuery } from "@/features/session";
import { defineAbility, type AppAbility } from "@/lib/auth/abilities";

export interface CurrentAbility {
  /** CASL ability built from the signed-in key's claims; denies everything until `/me` has loaded. */
  ability: AppAbility;
  isLoading: boolean;
}

/**
 * The signed-in API key's CASL ability, built from the cached `GET /me`
 * result. Mirrors what bun/api's `requireAbility` will allow, so UI gating
 * stays consistent with the server - but it's UX only; the server is the
 * authority.
 */
export function useAbility(): CurrentAbility {
  const { data: me, isLoading } = useGetMeQuery();
  const ability = useMemo(() => defineAbility(me?.claims ?? []), [me?.claims]);
  return { ability, isLoading };
}
