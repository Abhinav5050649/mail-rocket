import { useMemo } from "react";
import { useAbility } from "./useAbility";
import { useGetCampaignsQuery } from "@/features/campaigns";
import { useGetIdentitiesQuery } from "@/features/identities";
import { useGetGroupsQuery } from "@/features/groups";

/**
 * Id -> display name maps for the resources other rows point at (a
 * template's campaign, a campaign's sender, a recipient's group). Each list
 * is fetched once (first 100 rows, the API's practical page) and only when
 * the key can read it; an unknown id resolves to null.
 */
function useNameMap<Row extends { id: string }>(rows: Row[] | undefined, name: (row: Row) => string | null) {
  return useMemo(() => {
    const map = new Map((rows ?? []).map((row) => [row.id, name(row)]));
    return (id: string | null | undefined) => (id ? (map.get(id) ?? null) : null);
    // `name` is a stable inline accessor at each call site.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rows]);
}

export function useCampaignNames() {
  const { ability } = useAbility();
  const { data } = useGetCampaignsQuery({ limit: 100 }, { skip: !ability.can("read", "Campaign") });
  return { campaigns: data, campaignName: useNameMap(data, (row) => row.name) };
}

export function useIdentityNames() {
  const { ability } = useAbility();
  const { data } = useGetIdentitiesQuery({ limit: 100 }, { skip: !ability.can("read", "Identity") });
  return { identities: data, identityName: useNameMap(data, (row) => row.identity) };
}

export function useGroupNames() {
  const { ability } = useAbility();
  const { data } = useGetGroupsQuery({ limit: 100 }, { skip: !ability.can("read", "Group") });
  const groupName = useNameMap(data, (row) => row.name);
  /** "Newsletter, VIP" for a recipient's `group_ids`, alphabetical; null when in none. */
  const groupNames = (ids: string[]) =>
    ids
      .map((id) => groupName(id))
      .filter((name): name is string => !!name)
      .sort((a, b) => a.localeCompare(b))
      .join(", ") || null;
  return { groups: data, groupName, groupNames };
}
