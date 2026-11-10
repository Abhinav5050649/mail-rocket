export type { Campaign, CampaignStats, CampaignStatus } from "@/types/resources";
import type { CampaignStatus, PageArgs } from "@/types/resources";

export interface CampaignListArgs extends PageArgs {
  status?: CampaignStatus;
}

export interface CampaignInput {
  name: string;
  subject?: string;
  /** ISO datetime that schedules the send; null cancels a scheduled send. */
  start_time?: string | null;
  identity_id?: string;
  /** Part before the @ when the sender is a domain identity; null clears it. */
  from_local_part?: string | null;
  /** Display name inboxes show for the sender; null clears it. */
  from_name?: string | null;
  description?: string;
}

export interface CampaignFilters {
  status?: CampaignStatus;
}
