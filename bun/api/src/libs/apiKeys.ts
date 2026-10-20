import { createHash, randomBytes } from "node:crypto";
import { z } from "zod";
import { claimsForPreset, claimsSchema, PRESETS, type Claim, type KeyPreset } from "./abilities";

/** How many leading characters of a secret are stored as its `prefix`. */
export const KEY_PREFIX_LENGTH = 12;

/**
 * Generates a new API key secret: `mr_` + 32 random bytes, base64url.
 * Shown to the caller exactly once; only its hash is ever stored.
 *
 * @returns The plaintext secret.
 */
export function generateKey(): string {
    return `mr_${randomBytes(32).toString("base64url")}`;
}

/**
 * Hashes a secret for storage/lookup. SHA-256 (not bcrypt) is enough here:
 * the secret is 256 bits of randomness, so it can't be brute-forced, and a
 * deterministic hash lets authentication be a single indexed lookup.
 *
 * @param key - The plaintext secret.
 * @returns SHA-256 hex digest - what `api_key.key_hash` holds.
 */
export function hashKey(key: string): string {
    return createHash("sha256").update(key).digest("hex");
}

/**
 * The recognisable leading part of a secret, stored alongside the hash.
 *
 * @param key - The plaintext secret.
 * @returns Its first `KEY_PREFIX_LENGTH` characters.
 */
export function keyPrefix(key: string): string {
    return key.slice(0, KEY_PREFIX_LENGTH);
}

/** Body of `POST /keys`: exactly one of a named `preset` or an explicit `claims` list. */
export const keyCreateSchema = z.object({
    name: z.string().trim().min(1).max(100),
    preset: z.enum(PRESETS).optional(),
    claims: claimsSchema.optional(),
    expires_at: z.iso.datetime().nullable().optional(),
    description: z.string().optional(),
}).strict().refine(
    (value) => (value.preset === undefined) !== (value.claims === undefined),
    "provide exactly one of preset or claims",
);

/** Body of `PATCH /keys/:key_id`: any subset of fields, but never both `preset` and `claims`. */
export const keyPatchSchema = z.object({
    name: z.string().trim().min(1).max(100),
    preset: z.enum(PRESETS),
    claims: claimsSchema,
    expires_at: z.iso.datetime().nullable(),
    description: z.string(),
}).strict().partial().refine(
    (value) => !(value.preset !== undefined && value.claims !== undefined),
    "provide preset or claims, not both",
);

/**
 * Resolves a create/patch body to the claim list it grants.
 *
 * @returns The preset's expanded claims, the explicit claims, or undefined if the body sets neither.
 */
export function resolveClaims(value: { preset?: KeyPreset; claims?: Claim[] }): Claim[] | undefined {
    return value.preset ? [...claimsForPreset[value.preset]] : value.claims;
}
