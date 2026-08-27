import IORedis from "ioredis";
import { config } from "../../config";

/**
 * Shared Redis connection backing BullMQ (campaign scheduling/send queues).
 * `maxRetriesPerRequest: null` is required by BullMQ - it manages its own
 * retry/backoff behavior around blocking commands, so ioredis must not time
 * requests out on its own.
 *
 * Bun ships a native `Bun.RedisClient`, and bullmq's own adapter layer has
 * code to support it - but bullmq 6.3.1's `isRedisInstance()` gate checks for
 * a `disconnect()` method that `Bun.RedisClient` doesn't have (it exposes
 * `close()` instead), so passing it directly throws and falls back to
 * requiring ioredis anyway. Revisit once that's fixed upstream.
 */
export const redisConnection = new IORedis(config.redisUrl, { maxRetriesPerRequest: null });
