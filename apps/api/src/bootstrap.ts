import { claimsForPreset, logger } from "./libs";
import { ApiKeyService, OrganizationService } from "./services";

// Wired up once per process, same as the singleton services in each *Route.ts file.
const apiKeyService = new ApiKeyService();
const organizationService = new OrganizationService();

/**
 * First-boot setup, run from `index.ts` after `connectDB()`. Each step is a
 * no-op once its table has a row, so restarting never mints a second key or
 * overwrites the organization's profile.
 */
export async function bootstrap(): Promise<void> {
    logger.info(`Start method: bootstrap`);

    await organizationService.ensureExists();
    await bootstrapKey();

    logger.info(`End method: bootstrap`);
}

/**
 * Mints an admin key while the instance has none, and prints it once.
 *
 * The guard is "no keys", not "first ever boot", so an instance whose last
 * key was revoked mints itself a way back in on the next restart instead of
 * becoming unreachable. `bun run key:create` is the way in that doesn't need
 * a restart. Note that this makes "can restart the process" equivalent to
 * "can get an admin key" - on a self-hosted instance that's the operator.
 */
async function bootstrapKey(): Promise<void> {
    if (await apiKeyService.hasAny()) return;

    const { apiKey, secret } = await apiKeyService.create({ name: "Bootstrap Key", claims: claimsForPreset.admin });

    // Deliberately `console.log`, not the logger: a plaintext admin key in a
    // rotating log file on a mounted volume outlives one terminal line by a
    // long way. This is the only place the codebase writes to stdout directly.
    console.log(`
  mail-rocket admin API key: ${secret}
  Store it now; it is not recoverable.
  Create more with: bun run key:create --name <name> --preset <viewer|editor|admin>
`);
    // The log records only that a key was minted, never the key itself.
    logger.warn({ apiKeyId: apiKey.id }, "bootstrap: admin key minted, printed to stdout");
}
