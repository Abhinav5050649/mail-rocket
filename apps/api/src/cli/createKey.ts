import "dotenv/config";
import { parseArgs } from "node:util";
import { claimsForPreset, PRESETS, type KeyPreset } from "../libs/abilities";
import { ApiKeyService } from "../services/ApiKeyService";

/**
 * `bun run key:create --name <name> [--preset viewer|editor|admin] [--expires <ISO date>]`
 *
 * Mints an API key from the command line - the way in when every key is
 * lost and a restart (which would let `bootstrap()` mint one) isn't wanted.
 * Shares `ApiKeyService.create` with the `/keys` endpoint and the boot-time
 * bootstrap, so all three store keys identically.
 */
const { values } = parseArgs({
    options: {
        name: { type: "string" },
        preset: { type: "string", default: "admin" },
        expires: { type: "string" },
    },
});

const name = values.name?.trim();
if (!name) {
    console.error("usage: bun run key:create --name <name> [--preset <viewer|editor|admin>] [--expires <ISO date>]");
    process.exit(1);
}

const preset = values.preset as KeyPreset;
if (!PRESETS.includes(preset)) {
    console.error(`--preset must be one of: ${PRESETS.join(", ")}`);
    process.exit(1);
}

const expiresAt = values.expires ? new Date(values.expires) : null;
if (expiresAt && Number.isNaN(expiresAt.getTime())) {
    console.error(`--expires is not a date: ${values.expires}`);
    process.exit(1);
}

const { secret } = await new ApiKeyService().create({ name, claims: claimsForPreset[preset], expires_at: expiresAt });

console.log(`\n  mail-rocket ${preset} API key: ${secret}\n  Store it now; it is not recoverable.\n`);

// Importing the services pulls in the shared Redis/Postgres connections, which would otherwise keep the process alive.
process.exit(0);
