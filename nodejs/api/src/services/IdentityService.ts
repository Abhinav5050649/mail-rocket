import { and, asc, eq } from "drizzle-orm";
import { VerifyEmailIdentityCommand, VerifyDomainIdentityCommand, VerifyDomainDkimCommand } from "@aws-sdk/client-ses";
import { db, logger, sesClient, ValidationError, DEFAULT_PAGE_SIZE, type PaginationOptions } from "../libs";
import { identityTable, type IdentityType, type IdentityStatus, type IdentityVerificationRecord } from "../models";
import { scheduleIdentityVerificationCheck } from "../queues/IdentityVerificationScheduler";

/** Fields accepted when creating a new identity row. */
export interface CreateIdentityInput {
    type: IdentityType;
    identity: string;
    organization_id?: string;
    status?: IdentityStatus;
    description?: string;
}

/** Fields accepted when partially updating an existing identity row. */
export interface UpdateIdentityInput {
    type?: IdentityType;
    identity?: string;
    status?: IdentityStatus;
    description?: string;
}

/**
 * Data-access layer for `identity` rows (domains/email addresses an
 * organization sends from). Wraps `identityTable` (Drizzle) and adds
 * structured logging around every operation: `info` logs marking method
 * start/end, `debug` logs of the request params and response payload,
 * `warn` if no matching row is found, and `error` (with the full stack via
 * the pino `err` serializer) if the underlying query throws.
 */
export class IdentityService {

    /**
     * Registers an identity with SES so verification begins:
     * - `email`: sends SES's verification email; there's nothing to hand back.
     * - `domain`: starts domain + DKIM verification and returns the DNS
     *   records (1 TXT ownership record + 3 CNAME DKIM records) the caller
     *   must add to their DNS for SES to confirm the domain.
     *
     * @param type - Kind of identity being registered.
     * @param identity - The email address or domain name.
     * @returns The DNS records to hand back for a `domain` identity, or
     * `undefined` for an `email` identity (nothing to add to DNS).
     * @throws {ValidationError} If `type` isn't `email` or `domain`.
     * @throws Re-throws any error the SES SDK call throws.
     */
    private async verifyWithSes(type: IdentityType, identity: string): Promise<IdentityVerificationRecord[] | undefined> {
        if (type === "email") {
            await sesClient.send(new VerifyEmailIdentityCommand({ EmailAddress: identity }));
            return undefined;
        }

        if (type === "domain") {
            const [domainResult, dkimResult] = await Promise.all([
                sesClient.send(new VerifyDomainIdentityCommand({ Domain: identity })),
                sesClient.send(new VerifyDomainDkimCommand({ Domain: identity })),
            ]);

            return [
                { type: "TXT", name: `_amazonses.${identity}`, value: domainResult.VerificationToken! },
                ...(dkimResult.DkimTokens ?? []).map((token) => ({
                    type: "CNAME" as const,
                    name: `${token}._domainkey.${identity}`,
                    value: `${token}.dkim.amazonses.com`,
                })),
            ];
        }

        throw new ValidationError(`Unsupported identity type: ${type}`);
    }

    /**
     * Creates a new identity row. Registers the email/domain with SES first
     * so a failed SES call never leaves behind an orphaned row, then
     * schedules a background check (see `IdentityVerificationWorker`) that
     * flips `status` to `active` once SES confirms verification.
     *
     * @param data - Fields for the new identity.
     * @returns The created identity row.
     * @throws Re-throws any error from the SES call or the underlying query, after logging it.
     */
    async create(data: CreateIdentityInput) {
        logger.info(`Start method: ${this.constructor.name}.${this.create.name}`);
        logger.debug({ data }, `Request:`);

        try {
            const verification_records = await this.verifyWithSes(data.type, data.identity);

            const [identity] = await db.insert(identityTable)
                .values({ ...data, status: data.status ?? "pending", verification_records })
                .returning();

            await scheduleIdentityVerificationCheck(identity!.id);

            logger.debug({ identityId: identity!.id }, `Response:`);
            logger.info(`End method: ${this.constructor.name}.${this.create.name}`);

            return identity!;
        } catch (error) {
            logger.error({ err: error, data }, `Exception in ${this.constructor.name}.${this.create.name}: Failed to create identity`);
            throw error;
        }
    }

    /**
     * Fetches a single identity by id.
     *
     * @param identityId - id of the identity.
     * @returns The identity row, or `null` if no match exists.
     * @throws Re-throws any error from the underlying query, after logging it.
     */
    async getById(identityId: string) {
        logger.info(`Start method: ${this.constructor.name}.${this.getById.name}`);
        logger.debug({ identityId }, `Request:`);

        try {
            const [identity] = await db.select().from(identityTable).where(eq(identityTable.id, identityId));

            if (!identity) {
                logger.warn({ identityId }, `${this.constructor.name}.${this.getById.name}: Identity not found`);
                return null;
            }

            logger.debug({ identityId }, `Response:`);
            logger.info(`End method: ${this.constructor.name}.${this.getById.name}`);

            return identity;
        } catch (error) {
            logger.error({ err: error, identityId }, `Exception in ${this.constructor.name}.${this.getById.name}: Failed to get identity`);
            throw error;
        }
    }

    /**
     * Lists every identity belonging to a given organization, ordered by `id` ascending.
     *
     * @param organizationId - id of the organization.
     * @param options.type - optional filter on the `type` column.
     * @param options.status - optional filter on the `status` column.
     * @param options.limit - max number of rows to return.
     * @param options.offset - number of rows to skip before returning results.
     * @returns Array of matching identity rows (empty if none exist).
     * @throws Re-throws any error from the underlying query, after logging it.
     */
    async getByOrganization(organizationId: string, options?: PaginationOptions & { type?: IdentityType; status?: IdentityStatus }) {
        logger.info(`Start method: ${this.constructor.name}.${this.getByOrganization.name}`);
        logger.debug({ organizationId, options }, `Request:`);

        try {
            const conditions = [eq(identityTable.organization_id, organizationId)];
            if (options?.type !== undefined) conditions.push(eq(identityTable.type, options.type));
            if (options?.status !== undefined) conditions.push(eq(identityTable.status, options.status));

            const identities = await db.select().from(identityTable).where(and(...conditions)).orderBy(asc(identityTable.id))
                .limit(options?.limit ?? DEFAULT_PAGE_SIZE)
                .offset(options?.offset ?? 0);

            logger.debug({ organizationId, count: identities.length }, `Response:`);
            logger.info(`End method: ${this.constructor.name}.${this.getByOrganization.name}`);

            return identities;
        } catch (error) {
            logger.error({ err: error, organizationId, options }, `Exception in ${this.constructor.name}.${this.getByOrganization.name}: Failed to get identities for organization`);
            throw error;
        }
    }

    /**
     * Partially updates an identity row.
     *
     * @param identityId - id of the identity to update.
     * @param data - Fields to update.
     * @returns The updated identity row, or `null` if no match exists.
     * @throws Re-throws any error from the underlying query, after logging it.
     */
    async update(identityId: string, data: UpdateIdentityInput) {
        logger.info(`Start method: ${this.constructor.name}.${this.update.name}`);
        logger.debug({ identityId, data }, `Request:`);

        try {
            const [identity] = await db.update(identityTable).set(data).where(eq(identityTable.id, identityId)).returning();

            if (!identity) {
                logger.warn({ identityId }, `${this.constructor.name}.${this.update.name}: Identity not found`);
                return null;
            }

            logger.debug({ identityId }, `Response:`);
            logger.info(`End method: ${this.constructor.name}.${this.update.name}`);

            return identity;
        } catch (error) {
            logger.error({ err: error, identityId, data }, `Exception in ${this.constructor.name}.${this.update.name}: Failed to update identity`);
            throw error;
        }
    }

    /**
     * Deletes an identity row.
     *
     * @param identityId - id of the identity to delete.
     * @returns The deleted identity row, or `null` if no match exists.
     * @throws Re-throws any error from the underlying query, after logging it.
     */
    async delete(identityId: string) {
        logger.info(`Start method: ${this.constructor.name}.${this.delete.name}`);
        logger.debug({ identityId }, `Request:`);

        try {
            const [identity] = await db.delete(identityTable).where(eq(identityTable.id, identityId)).returning();

            if (!identity) {
                logger.warn({ identityId }, `${this.constructor.name}.${this.delete.name}: Identity not found`);
                return null;
            }

            logger.debug({ identityId }, `Response:`);
            logger.info(`End method: ${this.constructor.name}.${this.delete.name}`);

            return identity;
        } catch (error) {
            logger.error({ err: error, identityId }, `Exception in ${this.constructor.name}.${this.delete.name}: Failed to delete identity`);
            throw error;
        }
    }
}
