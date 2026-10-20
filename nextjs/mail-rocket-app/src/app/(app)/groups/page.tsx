"use client";

import { Plus } from "@untitledui/icons";
import { Button } from "@/components/ui/button";
import { DataTable, Pagination } from "@/components/ui/data-table";
import { Dash, PageHeader } from "@/components/ui/page";
import { EmptyState } from "@/components/ui/feedback";
import { Can } from "@/components/auth/Can";
import { usePaginationParams } from "@/hooks/usePaginationParams";
import { useCampaignNames } from "@/hooks/useLookups";
import { useGetGroupsQuery } from "@/features/groups";
import { formatDate } from "@/lib/format";
import type { Group } from "@/types/resources";

export default function GroupsPage() {
  const { limit, offset, setOffset } = usePaginationParams();
  const { data: groups, isLoading, error, refetch } = useGetGroupsQuery({ limit, offset });
  const { campaignName } = useCampaignNames();

  const action = (
    <Can I="create" a="Group">
      <Button href="/groups/new" variant="primary" icon={Plus}>
        New group
      </Button>
    </Can>
  );

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Groups" description="Lists of recipients a campaign sends to together." actions={action} />
      <div>
        <DataTable<Group>
          noun="groups"
          rows={groups}
          isLoading={isLoading}
          error={error}
          onRetry={refetch}
          href={(group) => `/groups/${group.id}`}
          columns={[
            { header: "Group", cell: (group) => group.name || "Untitled group", className: "w-[40%]" },
            { header: "Campaign", cell: (group) => campaignName(group.campaign_id) ?? <Dash />, className: "text-muted" },
            { header: "Created", cell: (group) => <span className="tabular">{formatDate(group.created_at)}</span>, align: "right", className: "w-36" },
          ]}
          mobile={{ title: (group) => group.name || "Untitled group", subtitle: (group) => campaignName(group.campaign_id) ?? "Not linked to a campaign" }}
          empty={<EmptyState title="No groups yet" action={action}>Group recipients so a campaign can send to all of them at once.</EmptyState>}
        />
        <Pagination noun="groups" limit={limit} offset={offset} rowCount={groups?.length ?? 0} onOffsetChange={setOffset} />
      </div>
    </div>
  );
}
