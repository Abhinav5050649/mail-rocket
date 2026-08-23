/** Max recipients per campaign-send-chunk job. */
export const CHUNK_SIZE = 25;

/** BullMQ queue names for the campaign send pipeline. */
export const QUEUE_NAMES = {
    DISPATCH: "campaign-dispatch",
    SEND_CHUNK: "campaign-send-chunk",
    FINALIZE: "campaign-finalize",
} as const;
