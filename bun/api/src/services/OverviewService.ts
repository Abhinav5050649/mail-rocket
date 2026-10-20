import { and, asc, count, desc, eq, inArray, isNotNull } from "drizzle-orm";
import { db, logger } from "../libs";
import {
    apiKeyTable,
    campaignRecipientTable,
    campaignStatusEnum,
    campaignRecipientSendStatusEnum,
    campaignTable,
    groupTable,
    identityStatusEnum,
    identityTable,
    recipientsTable,
    templateTable,
    type CampaignRecipientSendStatus,
    type CampaignStatus,
    type ICampaign,
    type IdentityStatus,
} from "../models";

/** How many campaigns the upcoming and recent lists each hold. */
const OVERVIEW_LIST_SIZE = 5;

/** Campaign statuses that mean a send has started, so the campaign belongs in "recent sends". */
const SENT_STATUSES: CampaignStatus[] = ["sending", "sent", "failed"];

/** Which sections of the overview to compute - one flag per CASL subject the caller can `read`. */
export interface OverviewSections {
    campaigns: boolean;
    identities: boolean;
    templates: boolean;
    groups: boolean;
    recipients: boolean;
    keys: boolean;
}

/** Per-recipient delivery outcome counts for one campaign's send (or all sends together). */
export type DeliveryCounts = Record<CampaignRecipientSendStatus, number>;

/** A campaign whose send has started, with how its deliveries went. */
export type RecentCampaign = ICampaign & { deliveries: DeliveryCounts };

/** The campaigns section: totals per status, the next scheduled sends, and the latest sends. */
export interface CampaignOverview {
    total: number;
    by_status: Record<CampaignStatus, number>;
    upcoming: ICampaign[];
    recent: RecentCampaign[];
    deliveries: DeliveryCounts;
}

/** The identities section: totals per verification status. */
export interface IdentityOverview {
    total: number;
    by_status: Record<IdentityStatus, number>;
}

/** Whole overview; a section the caller may not read is `null` rather than omitted, so the shape is stable. */
export interface Overview {
    campaigns: CampaignOverview | null;
    identities: IdentityOverview | null;
    templates: { total: number } | null;
    groups: { total: number } | null;
    recipients: { total: number } | null;
    keys: { total: number } | null;
}

/**
 * Turns grouped `{ key, count }` rows into a record with every enum value
 * present, so a status nobody is in reads as 0 rather than missing.
 */
const tally = <Key extends string>(values: readonly Key[], rows: { key: Key | null; count: number }[]): Record<Key, number> => {
    const result = Object.fromEntries(values.map((value) => [value, 0])) as Record<Key, number>;
    for (const row of rows) {
        if (row.key) result[row.key] = Number(row.count);
    }
    return result;
};

/** Sums every value of a tally. */
const sum = (counts: Record<string, number>) => Object.values(counts).reduce((total, value) => total + value, 0);

/**
 * Read-only aggregate queries behind the dashboard's overview: counts of
 * every resource, campaign and identity status breakdowns, the next
 * scheduled sends and the latest sends with their delivery outcomes. Only
 * the sections the caller asks for are queried.
 */
export class OverviewService {

    /**
     * Builds the overview.
     *
     * @param sections - Which sections to compute; the rest come back `null`.
     * @returns The overview.
     * @throws Re-throws any error from the underlying queries, after logging it.
     */
    async get(sections: OverviewSections): Promise<Overview> {
        logger.info(`Start method: ${this.constructor.name}.${this.get.name}`);
        logger.debug({ sections }, `Request:`);

        try {
            const [campaigns, identities, templates, groups, recipients, keys] = await Promise.all([
                sections.campaigns ? this.getCampaigns() : null,
                sections.identities ? this.getIdentities() : null,
                sections.templates ? this.countRows(templateTable) : null,
                sections.groups ? this.countRows(groupTable) : null,
                sections.recipients ? this.countRows(recipientsTable) : null,
                sections.keys ? this.countRows(apiKeyTable) : null,
            ]);

            const overview: Overview = { campaigns, identities, templates, groups, recipients, keys };

            logger.debug({ overview }, `Response:`);
            logger.info(`End method: ${this.constructor.name}.${this.get.name}`);

            return overview;
        } catch (error) {
            logger.error({ err: error, sections }, `Exception in ${this.constructor.name}.${this.get.name}: Failed to build overview`);
            throw error;
        }
    }

    /** Counts every row of a table. */
    private async countRows(table: typeof templateTable | typeof groupTable | typeof recipientsTable | typeof apiKeyTable) {
        const [row] = await db.select({ count: count() }).from(table);
        return { total: Number(row?.count ?? 0) };
    }

    /** Identity totals per verification status. */
    private async getIdentities(): Promise<IdentityOverview> {
        const rows = await db.select({ key: identityTable.status, count: count() }).from(identityTable).groupBy(identityTable.status);
        const by_status = tally(identityStatusEnum.enumValues, rows);
        return { total: sum(by_status), by_status };
    }

    /** Campaign totals per status, the next scheduled sends, the latest sends and overall delivery outcomes. */
    private async getCampaigns(): Promise<CampaignOverview> {
        const [statusRows, upcoming, recentRows, deliveryRows] = await Promise.all([
            db.select({ key: campaignTable.status, count: count() }).from(campaignTable).groupBy(campaignTable.status),
            // Soonest first: what goes out next.
            db.select().from(campaignTable)
                .where(and(eq(campaignTable.status, "scheduled"), isNotNull(campaignTable.start_time)))
                .orderBy(asc(campaignTable.start_time))
                .limit(OVERVIEW_LIST_SIZE),
            // Latest first: what went out most recently.
            db.select().from(campaignTable)
                .where(inArray(campaignTable.status, SENT_STATUSES))
                .orderBy(desc(campaignTable.start_time))
                .limit(OVERVIEW_LIST_SIZE),
            db.select({ key: campaignRecipientTable.send_status, count: count() })
                .from(campaignRecipientTable)
                .groupBy(campaignRecipientTable.send_status),
        ]);

        const by_status = tally(campaignStatusEnum.enumValues, statusRows);

        return {
            total: sum(by_status),
            by_status,
            upcoming,
            recent: await this.withDeliveries(recentRows),
            deliveries: tally(campaignRecipientSendStatusEnum.enumValues, deliveryRows),
        };
    }

    /** Attaches each campaign's per-recipient delivery outcome counts, in one grouped query. */
    private async withDeliveries(campaigns: ICampaign[]): Promise<RecentCampaign[]> {
        if (campaigns.length === 0) return [];

        const rows = await db
            .select({ campaign_id: campaignRecipientTable.campaign_id, key: campaignRecipientTable.send_status, count: count() })
            .from(campaignRecipientTable)
            .where(inArray(campaignRecipientTable.campaign_id, campaigns.map((campaign) => campaign.id)))
            .groupBy(campaignRecipientTable.campaign_id, campaignRecipientTable.send_status);

        return campaigns.map((campaign) => ({
            ...campaign,
            deliveries: tally(campaignRecipientSendStatusEnum.enumValues, rows.filter((row) => row.campaign_id === campaign.id)),
        }));
    }
}
