import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import { sql } from "drizzle-orm";
import { config } from "../../config";
import { logger } from "./logger";
import * as schema from "../models";

/**
 * Neon's HTTP driver sends each query as a single fetch instead of holding a
 * TCP socket open. Lambda gives every invocation a fresh, short-lived
 * environment, so a pooled TCP client (like `postgres`) would open a new
 * connection per cold start and risk exhausting Postgres's connection limit;
 * the HTTP driver avoids that entirely and needs no pooling setup.
 */
const client = neon(config.databaseUrl);

export const db = drizzle({ client, schema });

export const connectDB = async () => {
    try {
        await db.execute(sql`select 1`);
        logger.info("Connected to PostgreSQL");
    } catch (error) {
        logger.error({ err: error }, "Failed to connect to PostgreSQL");
        throw error;
    }
};
