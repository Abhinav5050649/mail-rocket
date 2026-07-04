import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import { config } from "../../config";
import { logger } from "./logger";
import * as schema from "../models";

const client = postgres(config.databaseUrl);

export const db = drizzle({ client, schema });

export const connectDB = async () => {
    try {
        await client`select 1`;
        logger.info("Connected to PostgreSQL");
    } catch (error) {
        logger.error({ err: error }, "Failed to connect to PostgreSQL");
        throw error;
    }
};
