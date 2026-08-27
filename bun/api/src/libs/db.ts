import { Pool } from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import { sql } from "drizzle-orm";
import { config } from "../../config";
import { logger } from "./logger";
import * as schema from "../models";

/**
 * The API runs as a long-lived process (not per-invocation Lambda), so a
 * pooled TCP client that's created once and reused across requests is the
 * natural fit. Postgres itself is self-hosted (local for dev, a container
 * alongside the api in production) - see docker-compose.yml.
 */
const pool = new Pool({ connectionString: config.databaseUrl });

export const db = drizzle({ client: pool, schema });

export const connectDB = async () => {
    try {
        await db.execute(sql`select 1`);
        logger.info("Connected to PostgreSQL");
    } catch (error) {
        logger.error({ err: error }, "Failed to connect to PostgreSQL");
        throw error;
    }
};
