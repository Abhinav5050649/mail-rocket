"use client";

import { use } from "react";
import { Plus } from "@untitledui/icons";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/ui/data-table";
import { EmptyState } from "@/components/ui/feedback";
import { SubsectionHeader } from "@/components/resources/SubsectionHeader";
import { Can } from "@/components/auth/Can";
import { useGetCampaignGroupsQuery } from "@/features/groups";
import { formatDate } from "@/lib/format";
import type { Group } from "@/types/resources";

export default function CampaignGroupsPage({ params }: { params: Promise<{ campaignId: string }> }) {
  const { campaignId } = use(params);
  const { data: groups, isLoading, error, refetch } = useGetCampaignGroupsQuery({ campaignId, limit: 50 });

  const action = (
    <Can I="create" a="Group">
      <Button href={`/groups/new?campaignId=${campaignId}`} icon={Plus} size="sm">
        New group
      </Button>
    </Can>
  );

  return (
    <div className="flex flex-col gap-4">
      <SubsectionHeader title="Groups" note="Recipient lists this campaign sends to. Open one to see its recipients." action={action} />
      <DataTable<Group>
        noun="groups"
        rows={groups}
        isLoading={isLoading}
        error={error}
        onRetry={refetch}
        href={(group) => `/campaigns/${campaignId}/groups/${group.id}/recipients`}
        columns={[
          { header: "Group", cell: (group) => group.name || "Untitled group" },
          { header: "Created", cell: (group) => <span className="tabular">{formatDate(group.created_at)}</span>, align: "right", className: "w-40" },
        ]}
        mobile={{ title: (group) => group.name || "Untitled group", subtitle: (group) => `Created ${formatDate(group.created_at)}` }}
        empty={<EmptyState title="No groups linked yet" action={action}>Groups collect recipients so the campaign can send to all of them, and fill {"{{group_name}}"}.</EmptyState>}
      />
    </div>
  );
}
