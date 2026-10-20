"use client";

import { Plus } from "@untitledui/icons";
import { Button } from "@/components/ui/button";
import { DataTable, Pagination } from "@/components/ui/data-table";
import { Dash, PageHeader, Tabs } from "@/components/ui/page";
import { CampaignStatusPill } from "@/components/ui/pill";
import { EmptyState } from "@/components/ui/feedback";
import { Can } from "@/components/auth/Can";
import { usePaginationParams } from "@/hooks/usePaginationParams";
import { useIdentityNames } from "@/hooks/useLookups";
import { useGetCampaignsQuery } from "@/features/campaigns";
import { useGetOverviewQuery } from "@/features/overview";
import { formatDateTime, formatRelative } from "@/lib/format";
import type { Campaign, CampaignStatus } from "@/types/resources";

const STATUSES: { value: CampaignStatus; label: string }[] = [
  { value: "draft", label: "Draft" },
  { value: "scheduled", label: "Scheduled" },
  { value: "sending", label: "Sending" },
  { value: "sent", label: "Sent" },
  { value: "failed", label: "Failed" },
];

/** When a campaign sends (or sent), with its distance from now; a dash when it has no start time. */
function StartTime({ campaign }: { campaign: Campaign }) {
  if (!campaign.start_time) return <Dash />;
  return (
    <span className="flex flex-col leading-tight">
      <span className="tabular">{formatDateTime(campaign.start_time)}</span>
      <span className="text-xs text-muted">{formatRelative(campaign.start_time)}</span>
    </span>
  );
}

export default function CampaignsPage() {
  const { limit, offset, searchParams, setOffset } = usePaginationParams();
  const status = (searchParams.get("status") as CampaignStatus | null) ?? undefined;

  const { data: campaigns, isLoading, isFetching, error, refetch } = useGetCampaignsQuery({ status, limit, offset });
  const { data: overview } = useGetOverviewQuery();
  const { identityName } = useIdentityNames();
  const counts = overview?.campaigns;

  const statusLabel = STATUSES.find((item) => item.value === status)?.label.toLowerCase();

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Campaigns"
        description="Each campaign sends one template to its recipients, from one identity, at its start time."
        actions={
          <Can I="create" a="Campaign">
            <Button href="/campaigns/new" variant="primary" icon={Plus}>
              New campaign
            </Button>
          </Can>
        }
      />

      <Tabs
        label="Filter by status"
        items={[
          { label: "All", href: "/campaigns", count: counts?.total, active: !status },
          ...STATUSES.map((item) => ({
            label: item.label,
            href: `/campaigns?status=${item.value}`,
            count: counts?.by_status[item.value],
            active: status === item.value,
          })),
        ]}
      />

      <div className={isFetching && !isLoading ? "opacity-70 transition-opacity" : "transition-opacity"}>
        <DataTable<Campaign>
          noun="campaigns"
          rows={campaigns}
          isLoading={isLoading}
          error={error}
          onRetry={refetch}
          href={(campaign) => `/campaigns/${campaign.id}`}
          columns={[
            { header: "Campaign", cell: (campaign) => campaign.name || "Untitled campaign", className: "w-[30%]" },
            { header: "Subject", cell: (campaign) => campaign.subject || <Dash />, className: "hidden w-[26%] text-muted lg:table-cell" },
            { header: "Sender", cell: (campaign) => identityName(campaign.identity_id) ?? <Dash />, className: "hidden text-muted xl:table-cell" },
            { header: "Status", cell: (campaign) => <CampaignStatusPill status={campaign.status} />, className: "w-32" },
            { header: "Start time", cell: (campaign) => <StartTime campaign={campaign} />, align: "right", className: "w-48" },
          ]}
          mobile={{
            title: (campaign) => campaign.name || "Untitled campaign",
            subtitle: (campaign) => (campaign.start_time ? `${formatDateTime(campaign.start_time)} · ${formatRelative(campaign.start_time)}` : "No start time"),
            trailing: (campaign) => <CampaignStatusPill status={campaign.status} />,
          }}
          empty={
            <EmptyState
              title={status ? `No ${statusLabel} campaigns` : "No campaigns yet"}
              action={
                !status && (
                  <Can I="create" a="Campaign">
                    <Button href="/campaigns/new" size="sm" icon={Plus}>
                      New campaign
                    </Button>
                  </Can>
                )
              }
            >
              {status
                ? "Campaigns move between these tabs as their sends are scheduled and go out."
                : "Create a campaign, give it a template, recipients and a verified sender, then set a start time to schedule it."}
            </EmptyState>
          }
        />
        <Pagination noun="campaigns" limit={limit} offset={offset} rowCount={campaigns?.length ?? 0} onOffsetChange={setOffset} />
      </div>
    </div>
  );
}
