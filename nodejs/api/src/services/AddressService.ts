import { and, asc, eq } from "drizzle-orm";
import { db, logger, DEFAULT_PAGE_SIZE, type PaginationOptions } from "../libs";
import { addressTable } from "../models";

/** Fields accepted when creating a new address row. */
export interface CreateAddressInput {
    street?: string;
    area?: string;
    city?: string;
    state?: string;
    country?: string;
    postal_code?: string;
    is_primary?: boolean;
    organization_id?: string;
    user_id?: string;
    description?: string;
}

/** Fields accepted when partially updating an existing address row. */
export interface UpdateAddressInput {
    street?: string;
    area?: string;
    city?: string;
    state?: string;
    country?: string;
    postal_code?: string;
    is_primary?: boolean;
    description?: string;
}

/**
 * Data-access layer for `address` rows. Wraps `addressTable` (Drizzle) and
 * adds structured logging around every operation: `info` logs marking
 * method start/end, `debug` logs of the request params and response
 * payload, `warn` if no matching row is found, and `error` (with the full
 * stack via the pino `err` serializer) if the underlying query throws.
 */
export class AddressService {

    /**
     * Creates a new address row.
     *
     * @param data - Fields for the new address.
     * @returns The created address row.
     * @throws Re-throws any error from the underlying query, after logging it.
     */
    async create(data: CreateAddressInput) {
        logger.info(`Start method: ${this.constructor.name}.${this.create.name}`);
        logger.debug({ data }, `Request:`);

        try {
            const [address] = await db.insert(addressTable).values(data).returning();

            logger.debug({ addressId: address!.id }, `Response:`);
            logger.info(`End method: ${this.constructor.name}.${this.create.name}`);

            return address!;
        } catch (error) {
            logger.error({ err: error, data }, `Exception in ${this.constructor.name}.${this.create.name}: Failed to create address`);
            throw error;
        }
    }

    /**
     * Fetches a single address by id.
     *
     * @param addressId - id of the address.
     * @returns The address row, or `null` if no match exists.
     * @throws Re-throws any error from the underlying query, after logging it.
     */
    async getById(addressId: string) {
        logger.info(`Start method: ${this.constructor.name}.${this.getById.name}`);
        logger.debug({ addressId }, `Request:`);

        try {
            const [address] = await db.select().from(addressTable).where(eq(addressTable.id, addressId));

            if (!address) {
                logger.warn({ addressId }, `${this.constructor.name}.${this.getById.name}: Address not found`);
                return null;
            }

            logger.debug({ addressId }, `Response:`);
            logger.info(`End method: ${this.constructor.name}.${this.getById.name}`);

            return address;
        } catch (error) {
            logger.error({ err: error, addressId }, `Exception in ${this.constructor.name}.${this.getById.name}: Failed to get address`);
            throw error;
        }
    }

    /**
     * Lists every address belonging to a given user, ordered by `id` ascending.
     *
     * @param userId - id of the user.
     * @param options.limit - max number of rows to return.
     * @param options.offset - number of rows to skip before returning results.
     * @returns Array of matching address rows (empty if none exist).
     * @throws Re-throws any error from the underlying query, after logging it.
     */
    async getByUser(userId: string, options?: PaginationOptions) {
        logger.info(`Start method: ${this.constructor.name}.${this.getByUser.name}`);
        logger.debug({ userId, options }, `Request:`);

        try {
            const addresses = await db.select().from(addressTable).where(eq(addressTable.user_id, userId)).orderBy(asc(addressTable.id))
                .limit(options?.limit ?? DEFAULT_PAGE_SIZE)
                .offset(options?.offset ?? 0);

            logger.debug({ userId, count: addresses.length }, `Response:`);
            logger.info(`End method: ${this.constructor.name}.${this.getByUser.name}`);

            return addresses;
        } catch (error) {
            logger.error({ err: error, userId, options }, `Exception in ${this.constructor.name}.${this.getByUser.name}: Failed to get addresses for user`);
            throw error;
        }
    }

    /**
     * Lists every address belonging to a given organization, ordered by `id` ascending.
     *
     * @param organizationId - id of the organization.
     * @param options.isPrimary - optional filter on the `is_primary` flag.
     * @param options.limit - max number of rows to return.
     * @param options.offset - number of rows to skip before returning results.
     * @returns Array of matching address rows (empty if none exist).
     * @throws Re-throws any error from the underlying query, after logging it.
     */
    async getByOrganization(organizationId: string, options?: PaginationOptions & { isPrimary?: boolean }) {
        logger.info(`Start method: ${this.constructor.name}.${this.getByOrganization.name}`);
        logger.debug({ organizationId, options }, `Request:`);

        try {
            const conditions = [eq(addressTable.organization_id, organizationId)];
            if (options?.isPrimary !== undefined) conditions.push(eq(addressTable.is_primary, options.isPrimary));

            const addresses = await db.select().from(addressTable).where(and(...conditions)).orderBy(asc(addressTable.id))
                .limit(options?.limit ?? DEFAULT_PAGE_SIZE)
                .offset(options?.offset ?? 0);

            logger.debug({ organizationId, count: addresses.length }, `Response:`);
            logger.info(`End method: ${this.constructor.name}.${this.getByOrganization.name}`);

            return addresses;
        } catch (error) {
            logger.error({ err: error, organizationId, options }, `Exception in ${this.constructor.name}.${this.getByOrganization.name}: Failed to get addresses for organization`);
            throw error;
        }
    }

    /**
     * Partially updates an address row.
     *
     * @param addressId - id of the address to update.
     * @param data - Fields to update.
     * @returns The updated address row, or `null` if no match exists.
     * @throws Re-throws any error from the underlying query, after logging it.
     */
    async update(addressId: string, data: UpdateAddressInput) {
        logger.info(`Start method: ${this.constructor.name}.${this.update.name}`);
        logger.debug({ addressId, data }, `Request:`);

        try {
            const [address] = await db.update(addressTable).set(data).where(eq(addressTable.id, addressId)).returning();

            if (!address) {
                logger.warn({ addressId }, `${this.constructor.name}.${this.update.name}: Address not found`);
                return null;
            }

            logger.debug({ addressId }, `Response:`);
            logger.info(`End method: ${this.constructor.name}.${this.update.name}`);

            return address;
        } catch (error) {
            logger.error({ err: error, addressId, data }, `Exception in ${this.constructor.name}.${this.update.name}: Failed to update address`);
            throw error;
        }
    }

    /**
     * Deletes an address row.
     *
     * @param addressId - id of the address to delete.
     * @returns The deleted address row, or `null` if no match exists.
     * @throws Re-throws any error from the underlying query, after logging it.
     */
    async delete(addressId: string) {
        logger.info(`Start method: ${this.constructor.name}.${this.delete.name}`);
        logger.debug({ addressId }, `Request:`);

        try {
            const [address] = await db.delete(addressTable).where(eq(addressTable.id, addressId)).returning();

            if (!address) {
                logger.warn({ addressId }, `${this.constructor.name}.${this.delete.name}: Address not found`);
                return null;
            }

            logger.debug({ addressId }, `Response:`);
            logger.info(`End method: ${this.constructor.name}.${this.delete.name}`);

            return address;
        } catch (error) {
            logger.error({ err: error, addressId }, `Exception in ${this.constructor.name}.${this.delete.name}: Failed to delete address`);
            throw error;
        }
    }
}
