export type { Group } from "@/types/resources";

export interface GroupInput {
  name: string;
  campaign_id?: string;
}

export type GroupFilters = object;
