export type { Recipient } from "@/types/resources";

export interface RecipientInput {
  first_name?: string;
  last_name?: string;
  email_id: string;
  /** Groups the recipient is in; on update, replaces their groups. */
  group_ids?: string[];
  campaign_id?: string;
}

export type RecipientFilters = object;
