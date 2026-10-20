"use client";

import { use } from "react";
import { PageHeader, Tabs } from "@/components/ui/page";
import { CampaignStatusPill } from "@/components/ui/pill";
import { ErrorNotice, Skeleton } from "@/components/ui/feedback";
import { useGetCampaignQuery } from "@/features/campaigns";
import { useIdentityNames } from "@/hooks/useLookups";
import { formatDate, formatRelative, formatTime, formatWeekday } from "@/lib/format";
import type { Campaign } from "@/types/resources";

/** One sentence on where the send stands, built from the campaign's status and schedule. */
function scheduleLine(campaign: Campaign, sender: string | null) {
  const from = sender ? ` from ${sender}` : "";
  const when = campaign.start_time;
  switch (campaign.status) {
    case "draft":
      return when
        ? `Draft. Start time ${formatWeekday(when)} at ${formatTime(when)} is set but not scheduled.`
        : "Draft. Set a start time and a verified sender to schedule it.";
    case "scheduled":
      return when ? `Sends ${formatWeekday(when)} at ${formatTime(when)}, ${formatRelative(when)}${from}.` : `Scheduled${from}.`;
    case "sending":
      return `Sending now${from}.`;
    case "sent":
      return when ? `Sent ${formatDate(when)}${from}.` : `Sent${from}.`;
    case "failed":
      return when ? `Send failed, ${formatRelative(when)}.` : "Send failed.";
  }
}

export default function CampaignLayout({ children, params }: { children: React.ReactNode; params: Promise<{ campaignId: string }> }) {
  const { campaignId } = use(params);
  const base = `/campaigns/${campaignId}`;
  const { data: campaign, isLoading, error, refetch } = useGetCampaignQuery({ campaignId });
  const { identityName } = useIdentityNames();

  return (
    <div className="flex flex-col gap-6">
      {error ? (
        <>
          <PageHeader back={{ href: "/campaigns", label: "Campaigns" }} title="Campaign" />
          <ErrorNotice error={error} what="this campaign" onRetry={refetch} />
        </>
      ) : (
        <>
          <PageHeader
            back={{ href: "/campaigns", label: "Campaigns" }}
            title={isLoading || !campaign ? <Skeleton className="h-7 w-64" /> : campaign.name || "Untitled campaign"}
            status={campaign && <CampaignStatusPill status={campaign.status} />}
            description={campaign ? scheduleLine(campaign, identityName(campaign.identity_id)) : <Skeleton className="mt-1 h-4 w-80" />}
          />
          <Tabs
            label="Campaign sections"
            items={[
              { label: "Overview", href: base, exact: true },
              { label: "Templates", href: `${base}/templates` },
              { label: "Groups", href: `${base}/groups` },
              { label: "Recipients", href: `${base}/recipients` },
            ]}
          />
          {children}
        </>
      )}
    </div>
  );
}
