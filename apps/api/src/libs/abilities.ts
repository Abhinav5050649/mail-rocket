import { z } from "zod";
import { ACTIONS, SUBJECTS } from "@mail-rocket/shared";

/**
 * Authorization model: an API key carries an explicit list of CASL
 * `{ action, subject }` claims, and every route asks the key's ability
 * before acting. The model itself (actions, subjects, presets,
 * `defineAbility`) lives in `@mail-rocket/shared`, which the web app imports
 * too, so the two can't drift. This module adds what only the server needs:
 * the zod schemas that validate a stored or submitted claim list.
 */
export {
    ACTIONS,
    SUBJECTS,
    PRESETS,
    claimsForPreset,
    claimsEqual,
    presetForClaims,
    defineAbility,
    type Action,
    type Subject,
    type Claim,
    type KeyPreset,
    type AppAbility,
} from "@mail-rocket/shared";

/**
 * One grant. `.strict()` rejects conditions, fields, `inverted` and any
 * other CASL extras, so a stored claim list is always a plain, reviewable
 * grant set.
 */
export const claimSchema = z.object({ action: z.enum(ACTIONS), subject: z.enum(SUBJECTS) }).strict();

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
