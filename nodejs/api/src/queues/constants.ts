/** Max recipients per campaign-send-chunk job. */
export const CHUNK_SIZE = 25;

/** BullMQ queue names for the campaign send pipeline and identity verification polling. */
export const QUEUE_NAMES = {
    DISPATCH: "campaign-dispatch",
    SEND_CHUNK: "campaign-send-chunk",
    FINALIZE: "campaign-finalize",
    IDENTITY_VERIFY: "identity-verify",
} as const;

/** How often the identity-verification poller re-checks a pending identity with SES. */
export const IDENTITY_VERIFY_POLL_INTERVAL_MS = 5 * 60 * 1000;
