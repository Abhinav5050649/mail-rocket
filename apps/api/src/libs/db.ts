import { resolve } from "node:path";
import { Pool } from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { sql } from "drizzle-orm";
import { config } from "../../config";
import { logger } from "./logger";
import * as schema from "../models";

/**
 * The API runs as a long-lived process (not per-invocation Lambda), so a
 * pooled TCP client that's created once and reused across requests is the
 * natural fit. Postgres itself is self-hosted (local for dev, a container
 * alongside the api in production) - see the repo-root docker-compose.yml.
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

/**
 * The generated SQL migrations (`drizzle/`). Resolved against the working
 * directory, like `logs/` (see logger.ts): `apps/api` in dev, and
 * `/app/apps/api` in the Docker image, which ships the folder beside the bundle.
 */
const MIGRATIONS_FOLDER = resolve(process.cwd(), "drizzle");

/**
 * Applies any migrations under `drizzle/` that the database hasn't had yet,
 * so a fresh database (or a pulled image with new migrations) is ready
 * without a separate `bun run db:migrate`. It records progress in the same
 * `drizzle.__drizzle_migrations` table as `drizzle-kit migrate`, so either
 * can be used and neither re-applies what the other already ran. Each
 * migration runs in a transaction; a failure stops the boot.
 */
export const runMigrations = async () => {
    try {
        await migrate(db, { migrationsFolder: MIGRATIONS_FOLDER });
        logger.info("Database migrations are up to date");
    } catch (error) {
        logger.error({ err: error }, "Failed to apply database migrations");
        throw error;
    }
};
