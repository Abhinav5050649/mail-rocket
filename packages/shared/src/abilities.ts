import { createMongoAbility, type MongoAbility } from "@casl/ability";

/**
 * The authorization model both apps share: an API key carries an explicit
 * list of CASL `{ action, subject }` claims. The API enforces them on every
 * request; the web app reads the same claims only to hide or disable
 * controls the API would refuse. Both fields are closed unions - CASL's
 * `manage`/`all` wildcards, conditions and inverted rules are never used.
 */

/** Concrete operations only: CASL's `manage` wildcard is never persisted. */
export const ACTIONS = ["read", "create", "update", "delete"] as const;
/** An operation a claim may grant. */
export type Action = (typeof ACTIONS)[number];

/** Every resource the API authorizes. CASL's `all` wildcard is never persisted. */
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
/** A resource a claim may target. */
export type Subject = (typeof SUBJECTS)[number];

/** One grant. */
export interface Claim {
    action: Action;
    subject: Subject;
}

/** The CASL ability built from a key's claims. */
export type AppAbility = MongoAbility<[Action, Subject]>;

/**
 * Builds the CASL ability for a claim list. The API builds one per request
 * (in `authenticate`); the web app builds one from `GET /me`.
 *
 * @param claims - The key's claims.
 * @returns An ability answering `can(action, subject)`.
 */
export function defineAbility(claims: readonly Claim[]): AppAbility {
    return createMongoAbility<AppAbility>([...claims]);
}

/** Named shortcuts for common claim lists. Keys persist the expanded list, never the preset name. */
export const PRESETS = ["viewer", "editor", "admin"] as const;
/** A preset name. */
export type KeyPreset = (typeof PRESETS)[number];

/** Viewer: read every resource. */
const viewer: Claim[] = SUBJECTS.map((subject) => ({ action: "read", subject }));

/** Subjects an editor may create, update and delete - the day-to-day campaign work. */
const EDITOR_SUBJECTS: Subject[] = ["Campaign", "Template", "Group", "Recipient"];

/** Editor: viewer, plus full write access to campaign content. Sending identities stay read-only. */
const editor: Claim[] = [
    ...viewer,
    ...EDITOR_SUBJECTS.flatMap((subject) => (["create", "update", "delete"] as const).map((action) => ({ action, subject }))),
];

/**
 * Subjects only an admin may write: SES sending identities (they decide who
 * mail goes out as), the organization's profile, and the keys themselves.
 */
const ADMIN_SUBJECTS: Subject[] = ["Identity", "Address", "ContactDetails", "Key"];

/** Admin: editor, plus sending identities, the organization profile and key management. */
const admin: Claim[] = [
    ...editor,
    // The organization is a single seeded row: it can be updated, never created or deleted.
    { action: "update", subject: "Organization" },
    ...ADMIN_SUBJECTS.flatMap((subject) => (["create", "update", "delete"] as const).map((action) => ({ action, subject }))),
];

/** Expanded claim list for each preset. */
export const claimsForPreset: Record<KeyPreset, readonly Claim[]> = { viewer, editor, admin };

/** One-line summary of each preset, for choosing one. */
export const PRESET_DESCRIPTIONS: Record<KeyPreset, string> = {
    viewer: "Read everything.",
    editor: "Viewer, plus create/edit/delete campaigns, templates, groups and recipients. Sending identities are read-only.",
    admin: "Editor, plus sending identities, the organization profile, addresses, contact details and API keys.",
};

/**
 * Order-insensitive equality of two claim lists.
 *
 * @returns true if both lists grant exactly the same `action:subject` pairs.
 */
export function claimsEqual(left: readonly Claim[], right: readonly Claim[]): boolean {
    return left.length === right.length
        && left.every((claim) => right.some((other) => claim.action === other.action && claim.subject === other.subject));
}

/**
 * Names the preset a claim list matches exactly, so a key can be labelled
 * "admin" instead of listing every claim.
 *
 * @returns The matching preset, or null for a custom claim list.
 */
export function presetForClaims(claims: readonly Claim[]): KeyPreset | null {
    return PRESETS.find((preset) => claimsEqual(claims, claimsForPreset[preset])) ?? null;
}
