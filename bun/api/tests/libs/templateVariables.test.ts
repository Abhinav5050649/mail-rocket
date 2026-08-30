import { describe, it, expect } from "bun:test";
import { renderTemplate, type TemplateVariableContext } from "../../src/libs/templateVariables";

/**
 * Unit tests for the `{{variable_name}}` placeholder substitution used by
 * `SendCampaignService.sendChunk`. Pure logic, no DB/Redis/AWS - no mocking
 * needed.
 */

const fullContext: TemplateVariableContext = {
    recipient: { first_name: "Ada", last_name: "Lovelace", email_id: "ada@example.com" },
    group: { name: "VIP Customers" },
    campaign: { name: "Fall Launch", start_time: new Date("2026-03-01T00:00:00Z") },
    organization: { name: "Acme Inc" },
    organizer: { first_name: "Grace", last_name: "Hopper", email: "grace@acme.test" },
    sender: { email: "sender@acme.test" },
};

describe("renderTemplate", () => {
    it("substitutes every known placeholder and reports nothing missing", () => {
        const { rendered, missing } = renderTemplate(
            "Hi {{recipient_first_name}} {{recipient_last_name}}, from {{organization_name}} ({{organizer_full_name}})",
            fullContext,
        );

        expect(rendered).toBe("Hi Ada Lovelace, from Acme Inc (Grace Hopper)");
        expect(missing).toEqual([]);
    });

    it("leaves text without placeholders untouched", () => {
        const { rendered, missing } = renderTemplate("No placeholders here.", fullContext);

        expect(rendered).toBe("No placeholders here.");
        expect(missing).toEqual([]);
    });

    it("reports an unknown variable name as missing and leaves the placeholder in place", () => {
        const { rendered, missing } = renderTemplate("Hi {{not_a_real_variable}}", fullContext);

        expect(rendered).toBe("Hi {{not_a_real_variable}}");
        expect(missing).toEqual(["not_a_real_variable"]);
    });

    it("reports a known variable as missing when its value isn't available for this recipient", () => {
        const contextWithoutFirstName: TemplateVariableContext = {
            ...fullContext,
            recipient: { ...fullContext.recipient, first_name: null },
        };

        const { rendered, missing } = renderTemplate("Hi {{recipient_first_name}}", contextWithoutFirstName);

        expect(rendered).toBe("Hi {{recipient_first_name}}");
        expect(missing).toEqual(["recipient_first_name"]);
    });

    it("falls back gracefully when the recipient has no group", () => {
        const contextWithoutGroup: TemplateVariableContext = { ...fullContext, group: null };

        const { missing } = renderTemplate("{{group_name}}", contextWithoutGroup);

        expect(missing).toEqual(["group_name"]);
    });

    it("falls back gracefully when the campaign has no organizer", () => {
        const contextWithoutOrganizer: TemplateVariableContext = { ...fullContext, organizer: null };

        const { missing } = renderTemplate("{{organizer_email}}", contextWithoutOrganizer);

        expect(missing).toEqual(["organizer_email"]);
    });

    it("builds recipient_full_name from whichever name parts are present", () => {
        const onlyLastName: TemplateVariableContext = {
            ...fullContext,
            recipient: { ...fullContext.recipient, first_name: null },
        };

        expect(renderTemplate("{{recipient_full_name}}", fullContext).rendered).toBe("Ada Lovelace");
        expect(renderTemplate("{{recipient_full_name}}", onlyLastName).rendered).toBe("Lovelace");
    });

    it("deduplicates repeated placeholders in the missing list", () => {
        const contextWithoutFirstName: TemplateVariableContext = {
            ...fullContext,
            recipient: { ...fullContext.recipient, first_name: null },
        };

        const { missing } = renderTemplate("{{recipient_first_name}} ... {{recipient_first_name}}", contextWithoutFirstName);

        expect(missing).toEqual(["recipient_first_name"]);
    });

    it("tolerates extra whitespace inside braces", () => {
        const { rendered } = renderTemplate("Hi {{ recipient_first_name }}", fullContext);

        expect(rendered).toBe("Hi Ada");
    });
});
