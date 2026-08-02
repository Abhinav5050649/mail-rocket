import { Pool } from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import { sql } from "drizzle-orm";
import { config } from "../../config";
import { logger } from "./logger";
import * as schema from "../models";

/**
 * The API now runs as a long-lived process on EC2 rather than per-invocation
 * Lambda, so a pooled TCP client fits better than Neon's HTTP driver (which
 * existed to avoid cold starts opening a fresh connection per invocation).
 * Point DB_URL at Neon's pooled connection string (the "-pooler" host) so
 * this pool sits behind PgBouncer instead of holding direct connections.
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
