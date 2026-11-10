export type { Subscriber } from "@/types/resources";

export interface SubscriberInput {
  first_name?: string;
  last_name?: string;
  email_id: string;
  /** Groups the subscriber is in; on update, replaces their groups. */
  group_ids?: string[];
}

export type SubscriberFilters = object;
