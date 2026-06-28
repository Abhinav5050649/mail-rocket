import { SQL } from "bun";
import { drizzle } from "drizzle-orm/bun-sql";
import { config } from "../../config";
import { logger } from "./logger";
import * as schema from "../models";

const client = new SQL(config.databaseUrl);

/** Drizzle query interface, used by every service instead of talking to `client` directly. */
export const db = drizzle({ client, schema });

/**
 * Verifies the Postgres connection using `config.databaseUrl`. Bun's `SQL`
 * client connects lazily on first query, so this runs a trivial query at
 * startup (see `index.ts`) to fail fast on a bad `DB_URL` instead of failing
 * silently on the first request.
 *
 * @throws Re-throws any connection error after logging it.
 */
export const connectDB = async () => {
    try {
        await client`select 1`;
        logger.info("Connected to PostgreSQL");
    } catch (error) {
        logger.error({ err: error }, "Failed to connect to PostgreSQL");
        throw error;
    }
};
