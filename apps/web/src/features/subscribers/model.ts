export type { Subscriber } from "@/types/resources";

export interface SubscriberInput {
  first_name?: string;
  last_name?: string;
  email_id: string;
  /** Groups the subscriber is in; on update, replaces their groups. */
  group_ids?: string[];
}

/** POST /subscribers/import: many people at once, all added to `group_ids`. */
export interface SubscriberImportInput {
  subscribers: { email_id: string; first_name?: string; last_name?: string }[];
  group_ids: string[];
}

export type { GroupMembersRemoveResult, SubscriberBulkDeleteResult, SubscriberImportResult, SubscriberImportSkip } from "@mail-rocket/shared";
export { SUBSCRIBER_BULK_MAX_IDS, SUBSCRIBER_IMPORT_MAX_ROWS } from "@mail-rocket/shared";

export type SubscriberFilters = object;
