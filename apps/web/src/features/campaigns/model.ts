export type { Campaign, CampaignStatus } from "@/types/resources";
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
  description?: string;
}

export interface CampaignFilters {
  status?: CampaignStatus;
}
