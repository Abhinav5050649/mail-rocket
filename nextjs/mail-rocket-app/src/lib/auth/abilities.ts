import { createMongoAbility, type MongoAbility } from "@casl/ability";

/**
 * Client mirror of bun/api's `src/libs/abilities.ts` - keep `ACTIONS`,
 * `SUBJECTS` and `PRESETS` in sync with it. The UI only uses these to hide
 * or disable controls the server would refuse; bun/api re-checks every
 * request, so a stale mirror can at worst show a button that 403s.
 */
export const ACTIONS = ["read", "create", "update", "delete"] as const;
export type Action = (typeof ACTIONS)[number];

export const SUBJECTS = [
  "Organization",
  "Address",
  "ContactDetails",
  "Identity",
  "Campaign",
  "Template",
  "Group",
  "Recipient",
  "Key",
] as const;
export type Subject = (typeof SUBJECTS)[number];

export interface Claim {
  action: Action;
  subject: Subject;
}

export type AppAbility = MongoAbility<[Action, Subject]>;

/** Builds the same capability-only CASL ability the server builds from a key's claims. */
export function defineAbility(claims: readonly Claim[]): AppAbility {
  return createMongoAbility<AppAbility>([...claims]);
}

/** Named claim lists the server expands when minting or editing a key. */
export const PRESETS = ["viewer", "editor", "admin"] as const;
export type KeyPreset = (typeof PRESETS)[number];

/** One-line summaries for the Keys page; the server's `claimsForPreset` is the authority. */
export const PRESET_DESCRIPTIONS: Record<KeyPreset, string> = {
  viewer: "Read everything.",
  editor: "Viewer, plus create/edit/delete campaigns, templates, groups and recipients. Sending identities are read-only.",
  admin: "Editor, plus sending identities, the organization profile, addresses, contact details and API keys.",
};
