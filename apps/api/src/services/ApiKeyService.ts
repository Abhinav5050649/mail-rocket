import { desc, eq } from "drizzle-orm";
import { db, logger, generateKey, hashKey, keyPrefix, DEFAULT_PAGE_SIZE, type Claim, type PaginationOptions } from "../libs";
import { apiKeyTable } from "../models";

/** Fields accepted when minting a new API key. The secret itself is always generated, never supplied. */
export interface CreateApiKeyInput {
    name: string;
    claims: readonly Claim[];
    expires_at?: Date | null;
    description?: string;
}

/** Fields accepted when partially updating an existing API key. */
export interface UpdateApiKeyInput {
    name?: string;
    claims?: readonly Claim[];
    expires_at?: Date | null;
    description?: string;
}

/**
 * Data-access layer for `api_key` rows - the only principal mail-rocket
 * has. `create` is the single place a key is minted: the `/keys` endpoint,
 * the boot-time bootstrap and the `key:create` CLI all call it, so they can
 * never drift in how they generate, hash or store a secret. Follows the same
 * logging conventions as every other service; the plaintext secret is never
 * logged.
 */
export class ApiKeyService {

    /**
     * Mints a new API key and stores only its hash.
     *
     * @param data - Name, claims and optional expiry for the new key.
     * @returns The stored row and the plaintext `secret` - the only time the secret is available.
     * @throws Re-throws any error from the underlying query, after logging it.
     */
    async create(data: CreateApiKeyInput) {
        logger.info(`Start method: ${this.constructor.name}.${this.create.name}`);
        logger.debug({ name: data.name }, `Request:`);

        try {
            const secret = generateKey();
            const [apiKey] = await db.insert(apiKeyTable).values({
                name: data.name,
                claims: [...data.claims],
                key_hash: hashKey(secret),
                prefix: keyPrefix(secret),
                expires_at: data.expires_at ?? null,
                description: data.description,
            }).returning();

            logger.debug({ apiKeyId: apiKey!.id }, `Response:`);
            logger.info(`End method: ${this.constructor.name}.${this.create.name}`);

            return { apiKey: apiKey!, secret };
        } catch (error) {
            logger.error({ err: error, name: data.name }, `Exception in ${this.constructor.name}.${this.create.name}: Failed to create API key`);
            throw error;
        }
    }

    /**
     * Looks a key up by the hash of its secret - the authentication query.
     *
     * @param keyHash - SHA-256 hex of the presented secret.
     * @returns The key row, or `null` if no key has that hash.
     * @throws Re-throws any error from the underlying query, after logging it.
     */
    async getByHash(keyHash: string) {
        logger.info(`Start method: ${this.constructor.name}.${this.getByHash.name}`);

        try {
            const [apiKey] = await db.select().from(apiKeyTable).where(eq(apiKeyTable.key_hash, keyHash)).limit(1);

            if (!apiKey) {
                logger.warn(`${this.constructor.name}.${this.getByHash.name}: API key not found`);
                return null;
            }

            logger.debug({ apiKeyId: apiKey.id }, `Response:`);
            logger.info(`End method: ${this.constructor.name}.${this.getByHash.name}`);

            return apiKey;
        } catch (error) {
            logger.error({ err: error }, `Exception in ${this.constructor.name}.${this.getByHash.name}: Failed to get API key by hash`);
            throw error;
        }
    }

    /**
     * Fetches a single key by id.
     *
     * @param apiKeyId - id of the key.
     * @returns The key row, or `null` if no match exists.
     * @throws Re-throws any error from the underlying query, after logging it.
     */
    async getById(apiKeyId: string) {
        logger.info(`Start method: ${this.constructor.name}.${this.getById.name}`);
        logger.debug({ apiKeyId }, `Request:`);

        try {
            const [apiKey] = await db.select().from(apiKeyTable).where(eq(apiKeyTable.id, apiKeyId));

            if (!apiKey) {
                logger.warn({ apiKeyId }, `${this.constructor.name}.${this.getById.name}: API key not found`);
                return null;
            }

            logger.debug({ apiKeyId }, `Response:`);
            logger.info(`End method: ${this.constructor.name}.${this.getById.name}`);

            return apiKey;
        } catch (error) {
            logger.error({ err: error, apiKeyId }, `Exception in ${this.constructor.name}.${this.getById.name}: Failed to get API key`);
            throw error;
        }
    }

    /**
     * Lists keys, newest first (then by `id` for a stable order).
     *
     * @param options.limit - max number of rows to return.
     * @param options.offset - number of rows to skip before returning results.
     * @returns Array of key rows (empty if none exist).
     * @throws Re-throws any error from the underlying query, after logging it.
     */
    async getAll(options?: PaginationOptions) {
        logger.info(`Start method: ${this.constructor.name}.${this.getAll.name}`);
        logger.debug({ options }, `Request:`);

        try {
            const apiKeys = await db.select().from(apiKeyTable)
                .orderBy(desc(apiKeyTable.created_at), desc(apiKeyTable.id))
                .limit(options?.limit ?? DEFAULT_PAGE_SIZE)
                .offset(options?.offset ?? 0);

            logger.debug({ count: apiKeys.length }, `Response:`);
            logger.info(`End method: ${this.constructor.name}.${this.getAll.name}`);

            return apiKeys;
        } catch (error) {
            logger.error({ err: error, options }, `Exception in ${this.constructor.name}.${this.getAll.name}: Failed to get API keys`);
            throw error;
        }
    }

    /**
     * Reports whether any key exists at all - the bootstrap guard.
     *
     * @returns true if at least one key row exists.
     * @throws Re-throws any error from the underlying query, after logging it.
     */
    async hasAny() {
        logger.info(`Start method: ${this.constructor.name}.${this.hasAny.name}`);

        try {
            const [apiKey] = await db.select({ id: apiKeyTable.id }).from(apiKeyTable).limit(1);

            logger.info(`End method: ${this.constructor.name}.${this.hasAny.name}`);

            return !!apiKey;
        } catch (error) {
            logger.error({ err: error }, `Exception in ${this.constructor.name}.${this.hasAny.name}: Failed to check for API keys`);
            throw error;
        }
    }

    /**
     * Partially updates a key's name, claims or expiry. The secret can never change - rotate by minting a new key.
     *
     * @param apiKeyId - id of the key to update.
     * @param data - Fields to update.
     * @returns The updated key row, or `null` if no match exists.
     * @throws Re-throws any error from the underlying query, after logging it.
     */
    async update(apiKeyId: string, data: UpdateApiKeyInput) {
        logger.info(`Start method: ${this.constructor.name}.${this.update.name}`);
        logger.debug({ apiKeyId, data }, `Request:`);

        try {
            const { claims, ...rest } = data;
            // Copies `claims` only when supplied, so an omitted field is left untouched.
            const values = claims !== undefined ? { ...rest, claims: [...claims] } : rest;
            const [apiKey] = await db.update(apiKeyTable).set(values).where(eq(apiKeyTable.id, apiKeyId)).returning();

            if (!apiKey) {
                logger.warn({ apiKeyId }, `${this.constructor.name}.${this.update.name}: API key not found`);
                return null;
            }

            logger.debug({ apiKeyId }, `Response:`);
            logger.info(`End method: ${this.constructor.name}.${this.update.name}`);

            return apiKey;
        } catch (error) {
            logger.error({ err: error, apiKeyId, data }, `Exception in ${this.constructor.name}.${this.update.name}: Failed to update API key`);
            throw error;
        }
    }

    /**
     * Revokes a key. A real delete - a revoked key cannot be restored.
     *
     * @param apiKeyId - id of the key to revoke.
     * @returns The deleted key row, or `null` if no match exists.
     * @throws Re-throws any error from the underlying query, after logging it.
     */
    async delete(apiKeyId: string) {
        logger.info(`Start method: ${this.constructor.name}.${this.delete.name}`);
        logger.debug({ apiKeyId }, `Request:`);

        try {
            const [apiKey] = await db.delete(apiKeyTable).where(eq(apiKeyTable.id, apiKeyId)).returning();

            if (!apiKey) {
                logger.warn({ apiKeyId }, `${this.constructor.name}.${this.delete.name}: API key not found`);
                return null;
            }

            logger.debug({ apiKeyId }, `Response:`);
            logger.info(`End method: ${this.constructor.name}.${this.delete.name}`);

            return apiKey;
        } catch (error) {
            logger.error({ err: error, apiKeyId }, `Exception in ${this.constructor.name}.${this.delete.name}: Failed to delete API key`);
            throw error;
        }
    }
}
