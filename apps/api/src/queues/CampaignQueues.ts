import { Queue, FlowProducer, type JobsOptions } from "bullmq";
import { redisConnection } from "../libs";
import { QUEUE_NAMES } from "./constants";

/**
 * BullMQ wiring for the campaign send pipeline: pure queue/flow-producer
 * instances, no service imports (kept import-cycle-free so both the
 * scheduling module and the workers module can depend on this file).
 */

export const dispatchQueue = new Queue(QUEUE_NAMES.DISPATCH, {
    connection: redisConnection,
    defaultJobOptions: {
        attempts: 3,
        backoff: { type: "exponential", delay: 5000 },
        removeOnComplete: true,
        removeOnFail: false,
    },
});

/**
 * `sendChunkQueue`/`finalizeQueue` exist so their `Worker`s can attach to
 * them, but jobs for these queues are created via `campaignFlowProducer.add`
 * (to link the chunk children to their finalize parent), which bypasses a
 * `Queue`'s own `defaultJobOptions` entirely - so those options are defined
 * here instead, for the dispatch worker to pass explicitly per flow node.
 */
export const sendChunkQueue = new Queue(QUEUE_NAMES.SEND_CHUNK, { connection: redisConnection });
export const finalizeQueue = new Queue(QUEUE_NAMES.FINALIZE, { connection: redisConnection });

/** Job options for each `campaign-send-chunk` child node in a flow. Generous retry budget to ride out SES throttling/transient errors. */
export const SEND_CHUNK_JOB_OPTIONS: JobsOptions = {
    attempts: 5,
    backoff: { type: "exponential", delay: 10000 },
    removeOnComplete: true,
    removeOnFail: false,
    // A chunk that exhausts its retries must not block or fail finalization.
    ignoreDependencyOnFailure: true,
};

/** Job options for the `campaign-finalize` parent node in a flow. */
export const FINALIZE_JOB_OPTIONS: JobsOptions = {
    attempts: 3,
    backoff: { type: "fixed", delay: 5000 },
    removeOnComplete: true,
    removeOnFail: false,
};

/** Used to fan a dispatch job out into chunk-send children plus a finalize parent. */
export const campaignFlowProducer = new FlowProducer({ connection: redisConnection });
