import { defineConfig } from "drizzle-kit";

/**
 * drizzle-kit reads `DB_URL` straight from the environment (Bun loads `.env`
 * automatically for any `bun`/`bunx` invocation), so this file stays free of
 * the `config.ts` import-time validation that the running app relies on.
 */
export default defineConfig({
    dialect: "postgresql",
    schema: "./src/models/*.ts",
    out: "./drizzle",
    dbCredentials: {
        url: process.env.DB_URL!,
    },
});
