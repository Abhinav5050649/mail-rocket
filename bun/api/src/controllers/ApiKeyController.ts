import type { Context } from "hono";
import { HTTPException } from "hono/http-exception";
import type { z } from "zod";
import { claimsSchema, keyCreateSchema, keyPatchSchema, logger, presetForClaims, resolveClaims } from "../libs";
import type { IApiKey } from "../models";
import { ApiKeyService } from "../services";

/**
 * The public shape of a key. Never includes `key_hash`; the plaintext
 * secret only ever appears once, on the `POST /keys` response.
 *
 * @param apiKey - The stored row.
 * @returns The row with its claims re-validated and its matching preset (if any) named.
 */
export const toApiKeyResponse = (apiKey: IApiKey) => {
    const claims = claimsSchema.parse(apiKey.claims);
    return {
        id: apiKey.id,
        name: apiKey.name,
        claims,
        preset: presetForClaims(claims),
        prefix: apiKey.prefix,
        expires_at: apiKey.expires_at,
        description: apiKey.description,
        created_at: apiKey.created_at,
        updated_at: apiKey.updated_at,
    };
};

/**
 * Parses a request body against a zod schema.
 *
 * @throws {HTTPException} 400 with the first validation issue if the body doesn't match.
 */
const parseBody = <T extends z.ZodType>(schema: T, body: unknown): z.infer<T> => {
    const result = schema.safeParse(body);
    if (!result.success) {
        const issue = result.error.issues[0]!;
        // Prefixes the field path when the issue is about a specific field.
        const path = issue.path.length > 0 ? `${issue.path.join(".")}: ` : "";
        throw new HTTPException(400, { message: `${path}${issue.message}` });
    }
    return result.data;
};

/**
 * HTTP layer for API keys - mail-rocket's only principal. Translates Hono
 * `Context` objects into `ApiKeyService` calls. Two self-guards protect the
 * instance from locking itself out of its own API: a key can neither change
 * its own claims nor revoke itself.
 */
export class ApiKeyController {
    constructor(private apiKeyService: ApiKeyService) {
    }

    /**
     * GET /me
     * Returns the key making the request, so a client can learn its own claims.
     *
     * @param c - Hono request context; `principal` is set by `authenticate`.
     * @returns JSON response with the calling key.
     * @throws {HTTPException} 401 if the key was revoked mid-request.
     */
    me = async (c: Context) => {
        logger.info(`Start method: ${this.constructor.name}.${this.me.name}`);

        const keyId = c.get('principal').keyId;

        logger.debug({ keyId }, `Request:`);

        const apiKey = await this.apiKeyService.getById(keyId);

        if (!apiKey) {
            logger.warn({ keyId }, `${this.constructor.name}.${this.me.name}: API key not found`);
            throw new HTTPException(401, { message: "Invalid API key" });
        }

        logger.debug({ keyId }, `Response:`);
        logger.info(`End method: ${this.constructor.name}.${this.me.name}`);

        return c.json(toApiKeyResponse(apiKey));
    }

    /**
     * GET /keys
     * Lists keys. A key that cannot manage keys (no `create Key` claim) only
     * sees each key's id, name, claims and preset - not prefixes or expiry.
     *
     * @param c - Hono request context; accepts optional `limit` and `offset` query params.
     * @returns JSON array of keys.
     */
    getAll = async (c: Context) => {
        logger.info(`Start method: ${this.constructor.name}.${this.getAll.name}`);

        const limitParam = c.req.query('limit');
        const offsetParam = c.req.query('offset');
        const limit = limitParam !== undefined ? Number(limitParam) : undefined;
        const offset = offsetParam !== undefined ? Number(offsetParam) : undefined;

        logger.debug({ limit, offset }, `Request:`);

        const apiKeys = await this.apiKeyService.getAll({ limit, offset });
        const canManage = c.get('principal').ability.can("create", "Key");
        const response = apiKeys.map((apiKey) => {
            const full = toApiKeyResponse(apiKey);
            return canManage ? full : { id: full.id, name: full.name, claims: full.claims, preset: full.preset };
        });

        logger.debug({ count: response.length }, `Response:`);
        logger.info(`End method: ${this.constructor.name}.${this.getAll.name}`);

        return c.json(response);
    }

    /**
     * POST /keys
     * Mints a new key from a `preset` or an explicit `claims` list.
     *
     * @param c - Hono request context; expects a JSON body matching `keyCreateSchema`.
     * @returns JSON response with the created key and its plaintext `secret` - shown this once only.
     * @throws {HTTPException} 400 if the body is invalid.
     */
    post = async (c: Context) => {
        logger.info(`Start method: ${this.constructor.name}.${this.post.name}`);

        const body = parseBody(keyCreateSchema, await c.req.json());

        logger.debug({ name: body.name, preset: body.preset }, `Request:`);

        const { apiKey, secret } = await this.apiKeyService.create({
            name: body.name,
            claims: resolveClaims(body)!,
            expires_at: body.expires_at ? new Date(body.expires_at) : null,
            description: body.description,
        });

        logger.debug({ apiKeyId: apiKey.id }, `Response:`);
        logger.info(`End method: ${this.constructor.name}.${this.post.name}`);

        return c.json({ ...toApiKeyResponse(apiKey), secret }, 201);
    }

    /**
     * GET /keys/:key_id
     * Fetches a single key by id.
     *
     * @param c - Hono request context; expects a `key_id` route param.
     * @returns JSON response with the key.
     * @throws {HTTPException} 400 if the `key_id` param is missing.
     * @throws {HTTPException} 404 if no key matches the given id.
     */
    get = async (c: Context) => {
        logger.info(`Start method: ${this.constructor.name}.${this.get.name}`);

        const keyId = c.req.param('key_id');

        if (!keyId) {
            throw new HTTPException(400, { message: "Missing Parameters: keyId" });
        }

        logger.debug({ keyId }, `Request:`);

        const apiKey = await this.apiKeyService.getById(keyId);

        if (!apiKey) {
            logger.warn({ keyId }, `${this.constructor.name}.${this.get.name}: API key not found`);
            throw new HTTPException(404, { message: "API key not found" });
        }

        logger.debug({ keyId }, `Response:`);
        logger.info(`End method: ${this.constructor.name}.${this.get.name}`);

        return c.json(toApiKeyResponse(apiKey));
    }

    /**
     * PATCH /keys/:key_id
     * Partially updates a key's name, claims (via `preset` or `claims`), expiry or description.
     *
     * @param c - Hono request context; expects a `key_id` route param and a JSON body matching `keyPatchSchema`.
     * @returns JSON response with the updated key.
     * @throws {HTTPException} 400 if the `key_id` param is missing or the body is invalid.
     * @throws {HTTPException} 403 if the caller tries to change its own claims.
     * @throws {HTTPException} 404 if no key matches the given id.
     */
    update = async (c: Context) => {
        logger.info(`Start method: ${this.constructor.name}.${this.update.name}`);

        const keyId = c.req.param('key_id');

        if (!keyId) {
            throw new HTTPException(400, { message: "Missing Parameters: keyId" });
        }

        const body = parseBody(keyPatchSchema, await c.req.json());
        const claims = resolveClaims(body);

        logger.debug({ keyId, body }, `Request:`);

        if (claims !== undefined && keyId === c.get('principal').keyId) {
            throw new HTTPException(403, { message: "You cannot change the claims of the key you are using" });
        }

        const apiKey = await this.apiKeyService.update(keyId, {
            name: body.name,
            claims,
            // `undefined` leaves expiry untouched; `null` clears it.
            expires_at: body.expires_at === undefined ? undefined : body.expires_at ? new Date(body.expires_at) : null,
            description: body.description,
        });

        if (!apiKey) {
            logger.warn({ keyId }, `${this.constructor.name}.${this.update.name}: API key not found`);
            throw new HTTPException(404, { message: "API key not found" });
        }

        logger.debug({ keyId }, `Response:`);
        logger.info(`End method: ${this.constructor.name}.${this.update.name}`);

        return c.json(toApiKeyResponse(apiKey));
    }

    /**
     * DELETE /keys/:key_id
     * Revokes a key. A real delete - it cannot be restored.
     *
     * @param c - Hono request context; expects a `key_id` route param.
     * @returns JSON response with the revoked key.
     * @throws {HTTPException} 400 if the `key_id` param is missing.
     * @throws {HTTPException} 403 if the caller tries to revoke its own key.
     * @throws {HTTPException} 404 if no key matches the given id.
     */
    delete = async (c: Context) => {
        logger.info(`Start method: ${this.constructor.name}.${this.delete.name}`);

        const keyId = c.req.param('key_id');

        if (!keyId) {
            throw new HTTPException(400, { message: "Missing Parameters: keyId" });
        }

        logger.debug({ keyId }, `Request:`);

        if (keyId === c.get('principal').keyId) {
            throw new HTTPException(403, { message: "You cannot revoke the key you are using" });
        }

        const apiKey = await this.apiKeyService.delete(keyId);

        if (!apiKey) {
            logger.warn({ keyId }, `${this.constructor.name}.${this.delete.name}: API key not found`);
            throw new HTTPException(404, { message: "API key not found" });
        }

        logger.debug({ keyId }, `Response:`);
        logger.info(`End method: ${this.constructor.name}.${this.delete.name}`);

        return c.json(toApiKeyResponse(apiKey));
    }
}
