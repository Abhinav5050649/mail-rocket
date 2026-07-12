import { and, eq } from "drizzle-orm";
import { db, logger } from "../libs";
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
 * adds structured logging around every operation: an `info` log when the
 * operation starts, `info`/`warn` on completion depending on whether a
 * row was found, and `error` (with the full stack via the pino `err`
 * serializer) if the underlying query throws.
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
        try {
            logger.info({ data }, `${this.constructor.name}.${this.create.name}: Creating address`);

            const [address] = await db.insert(addressTable).values(data).returning();

            logger.info({ addressId: address!.id }, `${this.constructor.name}.${this.create.name}: Address created`);

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
        try {
            logger.info({ addressId }, `${this.constructor.name}.${this.getById.name}: Fetching address`);

            const [address] = await db.select().from(addressTable).where(eq(addressTable.id, addressId));

            if (!address) {
                logger.warn({ addressId }, `${this.constructor.name}.${this.getById.name}: Address not found`);
                return null;
            }

            logger.info({ addressId }, `${this.constructor.name}.${this.getById.name}: Address fetched`);

            return address;
        } catch (error) {
            logger.error({ err: error, addressId }, `Exception in ${this.constructor.name}.${this.getById.name}: Failed to get address`);
            throw error;
        }
    }

    /**
     * Lists every address belonging to a given user.
     *
     * @param userId - id of the user.
     * @returns Array of matching address rows (empty if none exist).
     * @throws Re-throws any error from the underlying query, after logging it.
     */
    async getByUser(userId: string) {
        try {
            logger.info({ userId }, `${this.constructor.name}.${this.getByUser.name}: Fetching addresses for user`);

            const addresses = await db.select().from(addressTable).where(eq(addressTable.user_id, userId));

            logger.info({ userId, count: addresses.length }, `${this.constructor.name}.${this.getByUser.name}: Fetched addresses for user`);

            return addresses;
        } catch (error) {
            logger.error({ err: error, userId }, `Exception in ${this.constructor.name}.${this.getByUser.name}: Failed to get addresses for user`);
            throw error;
        }
    }

    /**
     * Lists every address belonging to a given organization.
     *
     * @param organizationId - id of the organization.
     * @param isPrimary - optional filter on the `is_primary` flag.
     * @returns Array of matching address rows (empty if none exist).
     * @throws Re-throws any error from the underlying query, after logging it.
     */
    async getByOrganization(organizationId: string, isPrimary?: boolean) {
        try {
            logger.info({ organizationId, isPrimary }, `${this.constructor.name}.${this.getByOrganization.name}: Fetching addresses for organization`);

            const conditions = [eq(addressTable.organization_id, organizationId)];
            if (isPrimary !== undefined) {
                conditions.push(eq(addressTable.is_primary, isPrimary));
            }

            const addresses = await db.select().from(addressTable).where(and(...conditions));

            logger.info({ organizationId, isPrimary, count: addresses.length }, `${this.constructor.name}.${this.getByOrganization.name}: Fetched addresses for organization`);

            return addresses;
        } catch (error) {
            logger.error({ err: error, organizationId, isPrimary }, `Exception in ${this.constructor.name}.${this.getByOrganization.name}: Failed to get addresses for organization`);
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
        try {
            logger.info({ addressId, data }, `${this.constructor.name}.${this.update.name}: Updating address`);

            const [address] = await db.update(addressTable).set(data).where(eq(addressTable.id, addressId)).returning();

            if (!address) {
                logger.warn({ addressId }, `${this.constructor.name}.${this.update.name}: Address not found`);
                return null;
            }

            logger.info({ addressId }, `${this.constructor.name}.${this.update.name}: Address updated`);

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
        try {
            logger.info({ addressId }, `${this.constructor.name}.${this.delete.name}: Deleting address`);

            const [address] = await db.delete(addressTable).where(eq(addressTable.id, addressId)).returning();

            if (!address) {
                logger.warn({ addressId }, `${this.constructor.name}.${this.delete.name}: Address not found`);
                return null;
            }

            logger.info({ addressId }, `${this.constructor.name}.${this.delete.name}: Address deleted`);

            return address;
        } catch (error) {
            logger.error({ err: error, addressId }, `Exception in ${this.constructor.name}.${this.delete.name}: Failed to delete address`);
            throw error;
        }
    }
}
