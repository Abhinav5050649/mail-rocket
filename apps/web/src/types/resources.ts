/**
 * The API's wire types come from `@mail-rocket/shared`, the same package
 * the API checks its responses against, so they can't drift. Re-exported
 * here so screens keep importing from one place, alongside the web app's own
 * list page size.
 */
export type {
  Organization,
  ApiKey,
  ApiKeySummary,
  ApiKeyCreated,
  Address,
  ContactDetails,
  IdentityType,
  IdentityStatus,
  IdentityVerificationRecord,
  Identity,
  CampaignStatus,
  Campaign,
  Template,
  Group,
  Recipient,
  PageArgs,
} from "@mail-rocket/shared";

/** Rows per list page in the web app. */
export const DEFAULT_PAGE_SIZE = 25;
