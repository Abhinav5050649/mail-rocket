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
  const { campaigns } = useCampaignNames();
  /** "Autumn launch, Newsletter" - the campaigns that send to a group, or null when none do. */
  const usedBy = (groupId: string) =>
    campaigns?.filter((campaign) => campaign.group_ids.includes(groupId)).map((campaign) => campaign.name || "Untitled campaign").join(", ") || null;
  /** "1 subscriber" / "12 subscribers". */
  const members = (group: Group) => `${group.subscriber_count} subscriber${group.subscriber_count === 1 ? "" : "s"}`;

  const action = (
    <Can I="create" a="Group">
      <Button href="/groups/new" variant="primary" icon={Plus}>
        New group
      </Button>
    </Can>
  );

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Groups" description="Reusable lists of subscribers. Any number of campaigns can send to the same group." actions={action} />
      <div>
        <DataTable<Group>
          noun="groups"
          rows={groups}
          isLoading={isLoading}
          error={error}
          onRetry={refetch}
          href={(group) => `/groups/${group.id}`}
          columns={[
            { header: "Group", cell: (group) => group.name || "Untitled group", className: "w-[34%]" },
            { header: "Subscribers", cell: (group) => <span className="tabular">{group.subscriber_count}</span>, align: "right", className: "w-32" },
            { header: "Used by", cell: (group) => usedBy(group.id) ?? <Dash />, className: "hidden text-muted md:table-cell" },
            { header: "Created", cell: (group) => <span className="tabular">{formatDate(group.created_at)}</span>, align: "right", className: "w-36" },
          ]}
          mobile={{ title: (group) => group.name || "Untitled group", subtitle: (group) => [members(group), usedBy(group.id) && `Used by ${usedBy(group.id)}`].filter(Boolean).join(" · ") }}
          empty={<EmptyState title="No groups yet" action={action}>Group subscribers so a campaign can send to all of them at once.</EmptyState>}
        />
        <Pagination noun="groups" limit={limit} offset={offset} rowCount={groups?.length ?? 0} onOffsetChange={setOffset} />
      </div>
    </div>
  );
}
