import type { Context } from "hono";
import { logger, type AppAbility } from "../libs";
import { OverviewService, type OverviewSections } from "../services";

/**
 * Maps a key's ability to the overview sections it may see: one section per
 * subject it can `read`. Shared with the MCP `get_overview` tool so both
 * surfaces hide the same sections.
 *
 * @param ability - The calling key's CASL ability.
 * @returns The sections to compute.
 */
export const overviewSectionsFor = (ability: AppAbility): OverviewSections => ({
    campaigns: ability.can("read", "Campaign"),
    identities: ability.can("read", "Identity"),
    templates: ability.can("read", "Template"),
    groups: ability.can("read", "Group"),
    recipients: ability.can("read", "Recipient"),
    keys: ability.can("read", "Key"),
});

/**
 * HTTP layer for `/overview`: the dashboard's counts and campaign
 * summaries. Any valid key may call it; each section is `null` unless the
 * key can `read` that section's subject, so the endpoint never reveals more
 * than the matching list endpoints would.
 */
export class OverviewController {
    constructor(private overviewService: OverviewService) {
    }

    /**
     * GET /overview
     * Returns resource counts, campaign and identity status breakdowns, the
     * next scheduled sends and the latest sends.
     *
     * @param c - Hono request context; reads the authenticated `principal`.
     * @returns JSON response with the overview.
     */
    get = async (c: Context) => {
        logger.info(`Start method: ${this.constructor.name}.${this.get.name}`);

        const sections = overviewSectionsFor(c.get("principal").ability);

        logger.debug({ sections }, `Request:`);

        const overview = await this.overviewService.get(sections);

        logger.debug({ overview }, `Response:`);
        logger.info(`End method: ${this.constructor.name}.${this.get.name}`);

        return c.json(overview);
    }
}
