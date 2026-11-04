import "dotenv/config";
import { defineConfig } from "drizzle-kit";

/**
 * The drizzle-kit CLI reads `DB_URL` straight from `process.env` and has no
 * built-in `.env` loading of its own, so `dotenv/config` is loaded explicitly
 * here (same as `index.ts` does for the running app). This file stays free
 * of the `config.ts` import-time validation that the running app relies on.
 */
export default defineConfig({
    dialect: "postgresql",
    schema: "./src/models/*.ts",
    out: "./drizzle",
    dbCredentials: {
        url: process.env.DB_URL!,
    },
});
