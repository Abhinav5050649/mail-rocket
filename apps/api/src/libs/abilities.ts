import { createMongoAbility, type MongoAbility } from "@casl/ability";
import { z } from "zod";

/**
 * Authorization model: an API key carries an explicit list of CASL
 * `{ action, subject }` claims, and every route asks the key's ability
 * before acting. Both fields are closed unions - CASL's `manage`/`all`
 * wildcards, conditions, field grants and inverted rules are never
 * accepted, so a stored claim list is always a plain, reviewable grant set.
 *
 * The Next.js app keeps a mirror of `ACTIONS`/`SUBJECTS`/`PRESETS` in
 * `src/lib/auth/abilities.ts` to hide controls the server would refuse -
 * keep the two in sync. The server remains the only authority.
 */

/** Concrete operations only: CASL's `manage` wildcard is never persisted. */
export const ACTIONS = ["read", "create", "update", "delete"] as const;
/** TS union of every action a claim may grant. */
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
/** TS union of every subject a claim may target. */
export type Subject = (typeof SUBJECTS)[number];

/** One grant. `.strict()` rejects conditions, fields, `inverted` and any other CASL extras. */
export const claimSchema = z.object({ action: z.enum(ACTIONS), subject: z.enum(SUBJECTS) }).strict();
/** TS type of a single claim. */
export type Claim = z.infer<typeof claimSchema>;

/** A key's full claim list. Duplicates are rejected so a stored list is canonical. */
export const claimsSchema = z.array(claimSchema).superRefine((claims, ctx) => {
    // Tracks every `action:subject` pair already seen in this list.
    const seen = new Set<string>();
    for (const [index, claim] of claims.entries()) {
        const key = `${claim.action}:${claim.subject}`;
        if (seen.has(key)) ctx.addIssue({ code: "custom", path: [index], message: "duplicate claim" });
        seen.add(key);
    }
});

/** The CASL ability type built from a key's claims. */
export type AppAbility = MongoAbility<[Action, Subject]>;

/**
 * Builds the CASL ability for a claim list. Called once per request by
 * `authenticate`, after the key is looked up.
 *
 * @param claims - The authenticated key's validated claims.
 * @returns An ability answering `can(action, subject)`.
 */
export function defineAbility(claims: readonly Claim[]): AppAbility {
    return createMongoAbility<AppAbility>([...claims]);
}

/** Named shortcuts for common claim lists. Keys persist the expanded list, never the preset name. */
export const PRESETS = ["viewer", "editor", "admin"] as const;
/** TS union of preset names. */
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
 * Names the preset a claim list matches exactly, so responses can label a
 * key "admin" instead of listing every claim.
 *
 * @returns The matching preset, or null for a custom claim list.
 */
export function presetForClaims(claims: readonly Claim[]): KeyPreset | null {
    return PRESETS.find((preset) => claimsEqual(claims, claimsForPreset[preset])) ?? null;
}
