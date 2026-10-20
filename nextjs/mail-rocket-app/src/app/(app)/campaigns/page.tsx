"use client";

import { useRouter } from "next/navigation";
import { Plus } from "@untitledui/icons";
import { ResourceTable } from "@/components/data/ResourceTable";
import { LimitOffsetPagination } from "@/components/data/LimitOffsetPagination";
import { CampaignStatusChip } from "@/components/campaigns/CampaignStatusChip";
import { Can } from "@/components/auth/Can";
import { Button } from "@/components/base/buttons/button";
import { NativeSelect } from "@/components/base/select/select-native";
import { usePaginationParams } from "@/hooks/usePaginationParams";
import { useAppDispatch, useAppSelector } from "@/lib/redux/hooks";
import { useGetCampaignsQuery, selectCampaignStatusFilter, campaignFiltersChanged } from "@/features/campaigns";
import type { CampaignStatus } from "@/types/resources";

const STATUS_OPTIONS = [
  { label: "All statuses", value: "" },
  { label: "Draft", value: "draft" },
  { label: "Scheduled", value: "scheduled" },
  { label: "Sending", value: "sending" },
  { label: "Sent", value: "sent" },
  { label: "Failed", value: "failed" },
];

export default function CampaignsPage() {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const status = useAppSelector(selectCampaignStatusFilter);
  const { limit, offset, setLimit, setOffset } = usePaginationParams();

  const { data: campaigns, isLoading, error } = useGetCampaignsQuery({ status, limit, offset });

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-primary">Campaigns</h1>
        <Can I="create" a="Campaign">
          <Button href={`/campaigns/new`} iconLeading={Plus}>
            New campaign
          </Button>
        </Can>
      </div>

      <NativeSelect
        className="w-48"
        size="sm"
        options={STATUS_OPTIONS}
        value={status ?? ""}
        onChange={(e) => {
          dispatch(campaignFiltersChanged({ status: (e.target.value || undefined) as CampaignStatus | undefined }));
          setOffset(0);
        }}
      />

      <ResourceTable
        rows={campaigns}
        loading={isLoading}
        error={error}
        onRowClick={(row) => router.push(`/campaigns/${row.id}`)}
        columns={[
          { header: "Name", render: (c) => c.name },
          { header: "Subject", render: (c) => c.subject || "—" },
          { header: "Status", render: (c) => <CampaignStatusChip status={c.status} /> },
          { header: "Start", render: (c) => (c.start_time ? new Date(c.start_time).toLocaleString() : "—") },
        ]}
      />

      <LimitOffsetPagination limit={limit} offset={offset} rowCount={campaigns?.length ?? 0} onLimitChange={setLimit} onOffsetChange={setOffset} />
    </div>
  );
}
