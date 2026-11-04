import { describe, it, expect, mock, beforeEach } from "bun:test";
import { OverviewController } from "../../src/controllers";
import type { OverviewService } from "../../src/services";
import { claimsForPreset, defineAbility } from "../../src/libs";
import { createMockContext } from "../helpers/mockContext";

describe("OverviewController", () => {
    let overviewService: OverviewService;
    let controller: OverviewController;

    const overview = { campaigns: null, identities: null, templates: { total: 3 }, groups: null, recipients: null, keys: null };

    /** A context whose authenticated key holds `claims`. */
    const contextWith = (claims: Parameters<typeof defineAbility>[0]) =>
        createMockContext({ variables: { principal: { keyId: "key-1", name: "test", claims, ability: defineAbility(claims) } } });

    beforeEach(() => {
        overviewService = {
            get: mock(async () => overview),
        } as unknown as OverviewService;

        controller = new OverviewController(overviewService);
    });

    it("asks for every section a viewer key can read", async () => {
        const result: any = await controller.get(contextWith(claimsForPreset.viewer));
        expect(overviewService.get).toHaveBeenCalledWith({
            campaigns: true, identities: true, templates: true, groups: true, recipients: true, keys: true,
        });
        expect(result.body).toEqual(overview);
    });

    it("leaves out the sections a key can't read", async () => {
        await controller.get(contextWith([{ action: "read", subject: "Template" }]));
        expect(overviewService.get).toHaveBeenCalledWith({
            campaigns: false, identities: false, templates: true, groups: false, recipients: false, keys: false,
        });
    });
});
