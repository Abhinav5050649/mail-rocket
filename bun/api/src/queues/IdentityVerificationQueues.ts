import { Queue } from "bullmq";
import { redisConnection } from "../libs";
import { QUEUE_NAMES } from "./constants";

/**
 * BullMQ queue for polling SES until a `pending` identity becomes verified.
 * Pure queue instance only (no service imports), kept import-cycle-free so
 * both the scheduler and the worker can depend on this file - same pattern
 * as `CampaignQueues.ts`.
 */
export const identityVerifyQueue = new Queue(QUEUE_NAMES.IDENTITY_VERIFY, { connection: redisConnection });
