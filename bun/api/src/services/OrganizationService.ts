import { eq } from "drizzle-orm";
import { db, logger } from "../libs";
import { organizationTable } from "../models";

/** Fields accepted when updating the organization's profile. */
export interface UpdateOrganizationInput {
    name?: string;
    normalized_name?: string;
    description?: string;
}

/**
 * Data-access layer for the single `organization` row - the profile of the
 * organization running this self-hosted instance. It is seeded by
 * `bootstrap()` (via `ensureExists`) and afterwards only read and updated;
 * there is no create/delete endpoint. Follows the same logging conventions
 * as every other service.
 */
export class OrganizationService {

    /**
     * Fetches the organization.
     *
     * @returns The organization row, or `null` if it hasn't been seeded yet.
     * @throws Re-throws any error from the underlying query, after logging it.
     */
    async get() {
        logger.info(`Start method: ${this.constructor.name}.${this.get.name}`);

        try {
            const [organization] = await db.select().from(organizationTable).limit(1);

            if (!organization) {
                logger.warn(`${this.constructor.name}.${this.get.name}: Organization not found`);
                return null;
            }

            logger.debug({ organizationId: organization.id }, `Response:`);
            logger.info(`End method: ${this.constructor.name}.${this.get.name}`);

            return organization;
        } catch (error) {
            logger.error({ err: error }, `Exception in ${this.constructor.name}.${this.get.name}: Failed to get organization`);
            throw error;
        }
    }

    /**
     * Returns the organization, inserting an empty one first if none exists.
     * Called once at boot so every other code path can assume the row is there.
     *
     * @returns The (possibly just created) organization row.
     * @throws Re-throws any error from the underlying query, after logging it.
     */
    async ensureExists() {
        logger.info(`Start method: ${this.constructor.name}.${this.ensureExists.name}`);

        try {
            const existing = await this.get();
            if (existing) {
                logger.info(`End method: ${this.constructor.name}.${this.ensureExists.name}`);
                return existing;
            }

            const [organization] = await db.insert(organizationTable).values({}).returning();

            logger.debug({ organizationId: organization!.id }, `Response:`);
            logger.info(`End method: ${this.constructor.name}.${this.ensureExists.name}`);

            return organization!;
        } catch (error) {
            logger.error({ err: error }, `Exception in ${this.constructor.name}.${this.ensureExists.name}: Failed to seed organization`);
            throw error;
        }
    }

    /**
     * Partially updates the organization's profile.
     *
     * @param data - Fields to update.
     * @returns The updated organization row, or `null` if it hasn't been seeded yet.
     * @throws Re-throws any error from the underlying query, after logging it.
     */
    async update(data: UpdateOrganizationInput) {
        logger.info(`Start method: ${this.constructor.name}.${this.update.name}`);
        logger.debug({ data }, `Request:`);

        try {
            const existing = await this.get();
            if (!existing) return null;

            const [organization] = await db.update(organizationTable).set(data).where(eq(organizationTable.id, existing.id)).returning();

            logger.debug({ organizationId: organization!.id }, `Response:`);
            logger.info(`End method: ${this.constructor.name}.${this.update.name}`);

            return organization!;
        } catch (error) {
            logger.error({ err: error, data }, `Exception in ${this.constructor.name}.${this.update.name}: Failed to update organization`);
            throw error;
        }
    }
}
