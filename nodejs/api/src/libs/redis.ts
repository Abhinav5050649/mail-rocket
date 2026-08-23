import IORedis from "ioredis";
import { config } from "../../config";

/**
 * Shared Redis connection backing BullMQ (campaign scheduling/send queues).
 * `maxRetriesPerRequest: null` is required by BullMQ - it manages its own
 * retry/backoff behavior around blocking commands, so ioredis must not time
 * requests out on its own.
 */
export const redisConnection = new IORedis(config.redisUrl, { maxRetriesPerRequest: null });
