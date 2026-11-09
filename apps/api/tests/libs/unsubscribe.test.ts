import { describe, it, expect, afterEach } from "bun:test";
import { config } from "../../config";
import { addUnsubscribeFooter, unsubscribeUrl } from "../../src/libs";

describe("unsubscribe links", () => {
    afterEach(() => {
        config.publicApiUrl = "";
    });

    it("has no link, and leaves the html untouched, while PUBLIC_API_URL is unset", () => {
        expect(unsubscribeUrl("d-1")).toBeNull();
        expect(addUnsubscribeFooter("<body>Hi</body>", "d-1")).toBe("<body>Hi</body>");
    });

    it("puts the footer link before </body>, or at the end when there's no body tag", () => {
        config.publicApiUrl = "https://api.example.com";
        const link = `<a href="https://api.example.com/unsubscribe/d-1"`;

        expect(addUnsubscribeFooter("<html><body>Hi</body></html>", "d-1")).toMatch(/Unsubscribe<\/a><\/p><\/body><\/html>$/);
        expect(addUnsubscribeFooter("<html><body>Hi</body></html>", "d-1")).toContain(link);
        expect(addUnsubscribeFooter("Hi", "d-1")).toStartWith("Hi<p");
    });
});
