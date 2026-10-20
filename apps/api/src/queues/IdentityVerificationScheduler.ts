import { logger } from "../libs";
import { identityVerifyQueue } from "./IdentityVerificationQueues";
import { IDENTITY_VERIFY_POLL_INTERVAL_MS } from "./constants";

/**
 * Schedules (or reschedules) a check of an identity's SES verification
 * status. Uses the identity's own id as the BullMQ job id; the worker only
 * ever re-schedules after the previous job has already completed and been
 * removed (`removeOnComplete`/`removeOnFail`), so reusing the id here never
 * collides with a still-pending job.
 *
 * @param identityId - id of the identity to check.
 * @param delay - milliseconds to wait before the check runs. Defaults to the
 * standard poll interval; a caller could pass a shorter delay for the very
 * first check if that's ever wanted, but isn't required here.
 */
export const scheduleIdentityVerificationCheck = async (identityId: string, delay = IDENTITY_VERIFY_POLL_INTERVAL_MS): Promise<void> => {
    logger.info("Start method: IdentityVerificationScheduler.scheduleIdentityVerificationCheck");
    logger.debug({ identityId, delay }, "Request:");

    await identityVerifyQueue.add("verify", { identityId }, {
        jobId: identityId,
        delay,
        removeOnComplete: true,
        removeOnFail: true,
    });

    logger.info("End method: IdentityVerificationScheduler.scheduleIdentityVerificationCheck");
};
