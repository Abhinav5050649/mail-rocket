import mongoose from "mongoose";
import { config } from "../../config";
import { logger } from "./logger";

/**
 * Opens the Mongoose connection to MongoDB using `config.databaseUrl`.
 * Called once at startup (see `index.ts`) before the HTTP server begins
 * accepting requests, so no request races an unconnected client.
 *
 * @throws Re-throws any connection error after logging it, so a bad
 *   `DB_URL` fails the process at startup rather than failing silently
 *   on the first query.
 */
export const connectDB = async () => {
    try {
        await mongoose.connect(config.databaseUrl);
        logger.info("Connected to MongoDB");
    } catch (error) {
        logger.error({ err: error }, "Failed to connect to MongoDB");
        throw error;
    }
};
