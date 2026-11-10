import { useMemo } from "react";
import { senderEmail } from "@mail-rocket/shared";
import type { Campaign } from "@/types/resources";
import { useAbility } from "./useAbility";
import { useGetCampaignsQuery } from "@/features/campaigns";
import { useGetIdentitiesQuery } from "@/features/identities";
import { useGetGroupsQuery } from "@/features/groups";

/**
 * Id -> display name maps for the resources other rows point at (a
 * template's campaign, a campaign's sender, a subscriber's group). Each list
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
  const identityName = useNameMap(data, (row) => row.identity);
  /**
   * Who a campaign sends from, as inboxes will show it: "Mail Rocket
   * <notifications@example.com>", or just the address without a name. Falls
   * back to the identity's name while a domain campaign has no address yet,
   * and to null when the campaign has no (known) identity.
   */
  const senderLabel = (campaign: Pick<Campaign, "identity_id" | "from_local_part" | "from_name">) => {
    const identity = data?.find((row) => row.id === campaign.identity_id);
    if (!identity) return null;
    const email = senderEmail(identity, campaign.from_local_part) ?? identity.identity;
    return campaign.from_name ? `${campaign.from_name} <${email}>` : email;
  };
  return { identities: data, identityName, senderLabel };
}

export function useGroupNames() {
  const { ability } = useAbility();
  const { data } = useGetGroupsQuery({ limit: 100 }, { skip: !ability.can("read", "Group") });
  const groupName = useNameMap(data, (row) => row.name);
  /** "Newsletter, VIP" for a subscriber's `group_ids`, alphabetical; null when in none. */
  const groupNames = (ids: string[]) =>
    ids
      .map((id) => groupName(id))
      .filter((name): name is string => !!name)
      .sort((a, b) => a.localeCompare(b))
      .join(", ") || null;
  return { groups: data, groupName, groupNames };
}
