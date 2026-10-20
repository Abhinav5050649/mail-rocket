import { describe, it, expect } from "bun:test";
import { claimsForPreset, claimsSchema, defineAbility, presetForClaims, SUBJECTS } from "../../src/libs";

describe("claimsSchema", () => {
    it("rejects duplicate claims", () => {
        const result = claimsSchema.safeParse([{ action: "read", subject: "Campaign" }, { action: "read", subject: "Campaign" }]);
        expect(result.success).toBe(false);
    });

    it("rejects CASL wildcards and unknown subjects", () => {
        expect(claimsSchema.safeParse([{ action: "manage", subject: "Campaign" }]).success).toBe(false);
        expect(claimsSchema.safeParse([{ action: "read", subject: "all" }]).success).toBe(false);
    });

    it("rejects inverted rules and conditions", () => {
        expect(claimsSchema.safeParse([{ action: "read", subject: "Campaign", inverted: true }]).success).toBe(false);
    });
});

describe("presets", () => {
    it("viewer can read everything and write nothing", () => {
        const ability = defineAbility(claimsForPreset.viewer);
        for (const subject of SUBJECTS) expect(ability.can("read", subject)).toBe(true);
        expect(ability.can("create", "Campaign")).toBe(false);
    });

    it("editor writes campaign content but only reads identities, and can't touch the organization profile or keys", () => {
        const ability = defineAbility(claimsForPreset.editor);
        expect(ability.can("delete", "Recipient")).toBe(true);
        expect(ability.can("read", "Identity")).toBe(true);
        expect(ability.can("create", "Identity")).toBe(false);
        expect(ability.can("update", "Identity")).toBe(false);
        expect(ability.can("delete", "Identity")).toBe(false);
        expect(ability.can("update", "Organization")).toBe(false);
        expect(ability.can("create", "Address")).toBe(false);
        expect(ability.can("create", "Key")).toBe(false);
    });

    it("admin manages the organization profile and keys, but can never create or delete the organization", () => {
        const ability = defineAbility(claimsForPreset.admin);
        expect(ability.can("update", "Organization")).toBe(true);
        expect(ability.can("delete", "Key")).toBe(true);
        expect(ability.can("create", "Identity")).toBe(true);
        expect(ability.can("delete", "Identity")).toBe(true);
        expect(ability.can("create", "Organization")).toBe(false);
        expect(ability.can("delete", "Organization")).toBe(false);
    });

    it("every preset's claim list passes validation", () => {
        for (const claims of Object.values(claimsForPreset)) expect(claimsSchema.safeParse(claims).success).toBe(true);
    });

    it("names the preset a claim list matches, regardless of order", () => {
        expect(presetForClaims([...claimsForPreset.editor].reverse())).toBe("editor");
        expect(presetForClaims([{ action: "read", subject: "Campaign" }])).toBeNull();
    });
});
