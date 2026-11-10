import { describe, it, expect } from "bun:test";
import { senderEmail, senderProblem } from "@mail-rocket/shared";
import { formatFromAddress } from "../../src/libs";

/** The sender rules shared with the web app, and the From header the API builds from them. */
describe("senderProblem", () => {
    it("accepts an email identity with no local part, with or without a name", () => {
        expect(senderProblem("email", null, null)).toBeNull();
        expect(senderProblem("email", null, "Mail Rocket")).toBeNull();
    });

    it("rejects an email identity that also sets a local part", () => {
        expect(senderProblem("email", "notifications", null)).toContain("can't set its own From address");
    });

    it("requires a local part for a domain identity", () => {
        expect(senderProblem("domain", null, null)).toContain("needs a From address");
        expect(senderProblem("domain", "", null)).toContain("needs a From address");
    });

    it("accepts common local parts for a domain identity", () => {
        for (const localPart of ["notifications", "no-reply", "first.last", "news+fall_2026"]) {
            expect(senderProblem("domain", localPart, null)).toBeNull();
        }
    });

    it("rejects local parts with spaces, an @, or misplaced dots", () => {
        for (const localPart of ["no reply", "news@example.com", ".news", "news.", "news..letter"]) {
            expect(senderProblem("domain", localPart, null)).toContain("can only use");
        }
    });

    it("rejects a local part longer than 64 characters", () => {
        expect(senderProblem("domain", "a".repeat(65), null)).toContain("at most 64");
    });

    it("rejects a name with a line break or longer than 64 characters", () => {
        expect(senderProblem("email", null, "Mail\r\nBcc: someone@example.com")).toContain("line breaks");
        expect(senderProblem("email", null, "n".repeat(65))).toContain("at most 64");
    });
});

describe("senderEmail", () => {
    it("is the identity itself for an email identity", () => {
        expect(senderEmail({ type: "email", identity: "news@example.com" }, null)).toBe("news@example.com");
    });

    it("joins the local part to the domain for a domain identity", () => {
        expect(senderEmail({ type: "domain", identity: "example.com" }, "notifications")).toBe("notifications@example.com");
    });

    it("is null for a domain identity without a local part", () => {
        expect(senderEmail({ type: "domain", identity: "example.com" }, null)).toBeNull();
    });
});

describe("formatFromAddress", () => {
    it("is the bare address when there's no name", () => {
        expect(formatFromAddress("news@example.com", null)).toBe("news@example.com");
        expect(formatFromAddress("news@example.com", "")).toBe("news@example.com");
    });

    it("quotes an ASCII name, escaping quotes and backslashes", () => {
        expect(formatFromAddress("news@example.com", "Mail Rocket")).toBe(`"Mail Rocket" <news@example.com>`);
        expect(formatFromAddress("news@example.com", `Acme, "the" \\ best`)).toBe(`"Acme, \\"the\\" \\\\ best" <news@example.com>`);
    });

    it("MIME-encodes a name with non-ASCII characters", () => {
        const value = formatFromAddress("news@example.com", "Café Rocket");
        expect(value).toBe(`=?UTF-8?B?${Buffer.from("Café Rocket").toString("base64")}?= <news@example.com>`);
    });
});
