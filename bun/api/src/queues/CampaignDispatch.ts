import { logger, ValidationError } from "../libs";
import type { ICampaign } from "../models";
import { dispatchQueue } from "./CampaignQueues";

/** BullMQ job states in which a dispatch job hasn't fired yet and is safe to remove/replace. */
const PENDING_STATES = ["delayed", "waiting", "prioritized"];

/**
 * Schedules (or reschedules) a campaign's dispatch job to fire at its
 * `start_time`. Uses the campaign's own id as the BullMQ job id, so calling
 * this again for the same campaign finds and replaces its existing job
 * rather than creating a duplicate.
 *
 * @param campaign - The campaign to schedule. Must have `start_time` set.
 * @throws {ValidationError} If the campaign has no `identity_id` - SES needs
 * a verified From address to send from, so a campaign can't be scheduled
 * without one.
 */
export const scheduleCampaignDispatch = async (campaign: ICampaign): Promise<void> => {
    logger.info("Start method: CampaignDispatch.scheduleCampaignDispatch");
    logger.debug({ campaignId: campaign.id, startTime: campaign.start_time }, "Request:");

    if (!campaign.identity_id) {
        throw new ValidationError("Campaign must have an identity_id (sending identity) before it can be scheduled");
    }

    const existingJob = await dispatchQueue.getJob(campaign.id);
    if (existingJob) {
        const state = await existingJob.getState();
        if (PENDING_STATES.includes(state)) {
            await existingJob.remove();
        } else {
            logger.info(`CampaignDispatch.scheduleCampaignDispatch: existing dispatch job for campaign ${campaign.id} is already ${state}, leaving it in place`);
            return;
        }
    }

    const delay = Math.max(0, campaign.start_time!.getTime() - Date.now());
    await dispatchQueue.add("dispatch", { campaignId: campaign.id }, { jobId: campaign.id, delay });

    logger.debug({ campaignId: campaign.id, delay }, "Response:");
    logger.info("End method: CampaignDispatch.scheduleCampaignDispatch");
};

/**
 * Cancels a campaign's dispatch job if it hasn't fired yet. No-op if no job
 * exists or if it's already active/finished.
 *
 * @param campaignId - id of the campaign whose dispatch job to cancel.
 */
export const cancelCampaignDispatch = async (campaignId: string): Promise<void> => {
    logger.info("Start method: CampaignDispatch.cancelCampaignDispatch");
    logger.debug({ campaignId }, "Request:");

    const existingJob = await dispatchQueue.getJob(campaignId);
    if (existingJob) {
        const state = await existingJob.getState();
        if (PENDING_STATES.includes(state)) {
            await existingJob.remove();
        }
    }

    logger.info("End method: CampaignDispatch.cancelCampaignDispatch");
};
