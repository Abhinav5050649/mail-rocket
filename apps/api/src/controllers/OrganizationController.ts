import type { Context } from "hono";
import { HTTPException } from "hono/http-exception";
import { assertValidTimeZoneField, logger } from "../libs";
import { OrganizationService } from "../services";

/**
 * HTTP layer for the organization's profile - the single `organization`
 * row describing whoever runs this self-hosted instance. There is no list,
 * create or delete: the row is seeded at boot and only read or updated.
 */
export class OrganizationController {
    constructor(private organizationService: OrganizationService) {
    }

    /**
     * GET /organization
     * Fetches the organization's profile.
     *
     * @param c - Hono request context.
     * @returns JSON response with the organization.
     * @throws {HTTPException} 404 if the organization hasn't been seeded (boot didn't complete).
     */
    get = async (c: Context) => {
        logger.info(`Start method: ${this.constructor.name}.${this.get.name}`);

        const organization = await this.organizationService.get();

        if (!organization) {
            logger.warn(`${this.constructor.name}.${this.get.name}: Organization not found`);
            throw new HTTPException(404, { message: "Organization not found" });
        }

        logger.debug({ organization }, `Response:`);
        logger.info(`End method: ${this.constructor.name}.${this.get.name}`);

        return c.json(organization);
    }

    /**
     * PATCH /organization
     * Partially updates the organization's profile.
     *
     * @param c - Hono request context; expects a JSON body with the fields to update.
     * @returns JSON response with the updated organization.
     * @throws {HTTPException} 404 if the organization hasn't been seeded (boot didn't complete).
     * @throws {ValidationError} 400 if `timezone` is not a known IANA time zone.
     */
    update = async (c: Context) => {
        logger.info(`Start method: ${this.constructor.name}.${this.update.name}`);

        const body = await c.req.json();
        // A typo'd zone would silently shift every date shown and rendered, so reject it.
        assertValidTimeZoneField(body);

        logger.debug({ body }, `Request:`);

        const organization = await this.organizationService.update(body);

        if (!organization) {
            logger.warn(`${this.constructor.name}.${this.update.name}: Organization not found`);
            throw new HTTPException(404, { message: "Organization not found" });
        }

        logger.debug({ organization }, `Response:`);
        logger.info(`End method: ${this.constructor.name}.${this.update.name}`);

        return c.json(organization);
    }
}
