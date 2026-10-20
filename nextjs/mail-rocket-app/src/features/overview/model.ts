import type { Campaign, CampaignStatus, IdentityStatus } from "@/types/resources";

/** Per-recipient delivery outcomes of one send, or of every send together. */
export interface DeliveryCounts {
  pending: number;
  sent: number;
  failed: number;
}

/** A campaign whose send has started, with how its deliveries went. */
export type RecentCampaign = Campaign & { deliveries: DeliveryCounts };

/**
 * GET /overview. Mirrors bun/api's `Overview` (src/services/OverviewService.ts):
 * each section is null when the signed-in key can't `read` its subject.
 */
export interface Overview {
  campaigns: {
    total: number;
    by_status: Record<CampaignStatus, number>;
    /** Next scheduled sends, soonest first (max 5). */
    upcoming: Campaign[];
    /** Latest sends, newest first (max 5). */
    recent: RecentCampaign[];
    deliveries: DeliveryCounts;
  } | null;
  identities: { total: number; by_status: Record<IdentityStatus, number> } | null;
  templates: { total: number } | null;
  groups: { total: number } | null;
  recipients: { total: number } | null;
  keys: { total: number } | null;
}
