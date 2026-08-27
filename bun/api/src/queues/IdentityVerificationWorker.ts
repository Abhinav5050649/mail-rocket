import { Worker, type Job } from "bullmq";
import { GetIdentityVerificationAttributesCommand } from "@aws-sdk/client-ses";
import { logger, redisConnection, sesClient } from "../libs";
import { IdentityService } from "../services";
import { QUEUE_NAMES } from "./constants";
import { scheduleIdentityVerificationCheck } from "./IdentityVerificationScheduler";

const identityService = new IdentityService();

/**
 * Processes one verification-check job: asks SES whether the identity is
 * verified yet, flips `status` to `active` if so, otherwise reschedules
 * another check for later. Runs indefinitely (no attempt cap) until SES
 * confirms the identity or the identity row is deleted - a domain owner may
 * take arbitrarily long to add the required DNS records.
 */
const processVerificationCheck = async (job: Job<{ identityId: string }>) => {
    const { identityId } = job.data;
    logger.info(`Start method: IdentityVerificationWorker.processVerificationCheck (identity ${identityId})`);

    const identity = await identityService.getById(identityId);
    if (!identity) {
        logger.warn({ identityId }, "IdentityVerificationWorker.processVerificationCheck: Identity not found, stopping poll");
        return;
    }

    if (identity.status === "active") {
        logger.info(`IdentityVerificationWorker.processVerificationCheck: Identity ${identityId} already active, stopping poll`);
        return;
    }

    const { VerificationAttributes } = await sesClient.send(new GetIdentityVerificationAttributesCommand({
        Identities: [identity.identity],
    }));

    const verificationStatus = VerificationAttributes?.[identity.identity]?.VerificationStatus;

    if (verificationStatus === "Success") {
        await identityService.update(identityId, { status: "active" });
        logger.info(`IdentityVerificationWorker.processVerificationCheck: Identity ${identityId} verified, marked active`);
        return;
    }

    logger.debug({ identityId, verificationStatus }, "IdentityVerificationWorker.processVerificationCheck: Not verified yet, rescheduling check");
    await scheduleIdentityVerificationCheck(identityId);

    logger.info(`End method: IdentityVerificationWorker.processVerificationCheck (identity ${identityId})`);
};

/** Starts the in-process worker for the identity-verification poll queue. Call once at boot. */
export const startIdentityVerificationWorker = (): void => {
    new Worker(QUEUE_NAMES.IDENTITY_VERIFY, processVerificationCheck, { connection: redisConnection });

    logger.info("IdentityVerificationWorker: identity-verify worker started");
};
