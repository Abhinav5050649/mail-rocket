/**
 * Compile-time contract between what this API returns and the wire types the
 * web app reads from `@mail-rocket/shared`. Nothing here runs: it only
 * type-checks, so `bunx tsc --noEmit` (and `bun run typecheck` at the repo
 * root) fails as soon as a response gains or loses a field, or an enum gains
 * or loses a value, without the shared type changing with it.
 *
 * It compares field *names* and enum *values*, not full types: database rows
 * are typed looser than what the API actually returns (columns with no NOT
 * NULL constraint come back as `| null` even when always set).
 */
import type * as Wire from "@mail-rocket/shared";
import type { toApiKeyResponse } from "./controllers/ApiKeyController";
import type {
    IAddress,
    ICampaign,
    IContactDetails,
    IGroup,
    IIdentity,
    IOrganization,
    ITemplate,
    campaignRecipientSendStatusEnum,
    campaignStatusEnum,
    identityStatusEnum,
    identityTypeEnum,
} from "./models";
import type { Overview, RecipientService } from "./services";

/** Passes only for `true`; anything else is a compile error that names the mismatch. */
type Expect<T extends true> = T;

/** True when A and B have exactly the same keys; otherwise the keys that differ, by side. */
type SameKeys<Api, Shared> = [Exclude<keyof Api, keyof Shared>, Exclude<keyof Shared, keyof Api>] extends [never, never]
    ? true
    : { onlyInApi: Exclude<keyof Api, keyof Shared>; onlyInShared: Exclude<keyof Shared, keyof Api> };

/** True when two unions hold exactly the same members. */
type SameUnion<A, B> = [A] extends [B] ? ([B] extends [A] ? true : { missingFromApi: Exclude<B, A> }) : { missingFromShared: Exclude<A, B> };

/** A Drizzle enum's values as a union. */
type EnumValues<E extends { enumValues: readonly string[] }> = E["enumValues"][number];

/** A recipient as the API returns it: the row plus its `group_ids`. */
type ApiRecipient = NonNullable<Awaited<ReturnType<RecipientService["getById"]>>>;

/** Each line fails to compile, naming the fields or values, when the two sides drift. */
export type ContractChecks = [
    Expect<SameKeys<IOrganization, Wire.Organization>>,
    Expect<SameKeys<IAddress, Wire.Address>>,
    Expect<SameKeys<IContactDetails, Wire.ContactDetails>>,
    Expect<SameKeys<IIdentity, Wire.Identity>>,
    Expect<SameKeys<ICampaign, Wire.Campaign>>,
    Expect<SameKeys<ITemplate, Wire.Template>>,
    Expect<SameKeys<IGroup, Wire.Group>>,
    Expect<SameKeys<ApiRecipient, Wire.Recipient>>,
    Expect<SameKeys<ReturnType<typeof toApiKeyResponse>, Wire.ApiKey>>,
    Expect<SameKeys<Overview, Wire.Overview>>,
    Expect<SameKeys<NonNullable<Overview["campaigns"]>, NonNullable<Wire.Overview["campaigns"]>>>,
    Expect<SameKeys<NonNullable<Overview["campaigns"]>["recent"][number], Wire.RecentCampaign>>,
    Expect<SameUnion<EnumValues<typeof campaignStatusEnum>, Wire.CampaignStatus>>,
    Expect<SameUnion<EnumValues<typeof identityStatusEnum>, Wire.IdentityStatus>>,
    Expect<SameUnion<EnumValues<typeof identityTypeEnum>, Wire.IdentityType>>,
    Expect<SameUnion<EnumValues<typeof campaignRecipientSendStatusEnum>, Wire.SendStatus>>,
];
