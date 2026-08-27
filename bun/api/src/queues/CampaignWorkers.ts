import { Worker, type Job } from "bullmq";
import { chunkArray, logger, redisConnection } from "../libs";
import { config } from "../../config";
import { SendCampaignService, CampaignService } from "../services";
import { CHUNK_SIZE, QUEUE_NAMES } from "./constants";
import { campaignFlowProducer, SEND_CHUNK_JOB_OPTIONS, FINALIZE_JOB_OPTIONS } from "./CampaignQueues";

const sendCampaignService = new SendCampaignService();
const campaignService = new CampaignService();

/**
 * Processes a dispatch job when a campaign's `start_time` arrives: builds
 * the recipient manifest, chunks it, and fans it out via a `FlowProducer`
 * flow (one `campaign-finalize` parent job with one `campaign-send-chunk`
 * child per chunk - the parent only runs once every child has settled).
 * Queue-orchestration logic lives here rather than in `SendCampaignService`,
 * which stays queue-agnostic; this processor calls into it only for the
 * DB reads/writes it needs.
 */
const processDispatch = async (job: Job<{ campaignId: string }>) => {
    const { campaignId } = job.data;
    logger.info(`Start method: CampaignWorkers.processDispatch (campaign ${campaignId})`);

    const campaign = await campaignService.getById(campaignId);
    if (!campaign) {
        logger.warn({ campaignId }, "CampaignWorkers.processDispatch: Campaign not found, skipping");
        return;
    }

    const recipientIds = await sendCampaignService.getRecipientIdsForCampaign(campaignId);
    if (recipientIds.length === 0) {
        await sendCampaignService.markCampaignSendFailed(campaignId, "No recipients found for campaign");
        return;
    }

    const template = await sendCampaignService.getCurrentTemplateForCampaign(campaignId);
    if (!template) {
        await sendCampaignService.markCampaignSendFailed(campaignId, "No template found for campaign");
        return;
    }

    const manifestIds = await sendCampaignService.createCampaignRecipientManifest(campaignId, campaign.organization_id, recipientIds);
    await sendCampaignService.beginSending(campaignId);

    const chunks = chunkArray(manifestIds, CHUNK_SIZE);
    await campaignFlowProducer.add({
        name: "finalize",
        queueName: QUEUE_NAMES.FINALIZE,
        data: { campaignId },
        opts: FINALIZE_JOB_OPTIONS,
        children: chunks.map(chunk => ({
            name: "send-chunk",
            queueName: QUEUE_NAMES.SEND_CHUNK,
            data: { campaignId, campaignRecipientIds: chunk },
            opts: SEND_CHUNK_JOB_OPTIONS,
        })),
    });

    logger.info(`End method: CampaignWorkers.processDispatch (campaign ${campaignId}, ${chunks.length} chunk(s))`);
};

/** Starts the in-process workers for the campaign send pipeline. Call once at boot. */
export const startCampaignWorkers = (): void => {
    new Worker(QUEUE_NAMES.DISPATCH, processDispatch, { connection: redisConnection });

    new Worker(QUEUE_NAMES.SEND_CHUNK, async (job: Job<{ campaignId: string; campaignRecipientIds: string[] }>) => {
        await sendCampaignService.sendChunk(job.data.campaignId, job.data.campaignRecipientIds);
    }, {
        connection: redisConnection,
        limiter: { max: config.sesSendRatePerSecond, duration: 1000 },
    });

    new Worker(QUEUE_NAMES.FINALIZE, async (job: Job<{ campaignId: string }>) => {
        await sendCampaignService.finalizeCampaign(job.data.campaignId);
    }, { connection: redisConnection });

    logger.info("CampaignWorkers: dispatch/send-chunk/finalize workers started");
};
