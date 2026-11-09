"use client";

import { use } from "react";
import { Plus } from "@untitledui/icons";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/ui/data-table";
import { EmptyState, Skeleton } from "@/components/ui/feedback";
import { CardLink, Dash } from "@/components/ui/page";
import { SubsectionHeader } from "@/components/resources/SubsectionHeader";
import { Can } from "@/components/auth/Can";
import { useGetGroupSubscribersQuery } from "@/features/subscribers";
import { useGetGroupQuery } from "@/features/groups";
import { fullName } from "@/lib/format";
import type { Subscriber } from "@/types/resources";

export default function CampaignGroupSubscribersPage({ params }: { params: Promise<{ campaignId: string; groupId: string }> }) {
  const { campaignId, groupId } = use(params);
  const { data: group } = useGetGroupQuery({ groupId });
  const { data: subscribers, isLoading, error, refetch } = useGetGroupSubscribersQuery({ groupId, limit: 50 });

  const action = (
    <div className="flex items-center gap-3">
      <CardLink href={`/groups/${groupId}`}>Edit group</CardLink>
      <Can I="create" a="Subscriber">
        <Button href={`/subscribers/new?campaignId=${campaignId}&groupId=${groupId}`} icon={Plus} size="sm">
          Add subscriber
        </Button>
      </Can>
    </div>
  );

  return (
    <div className="flex flex-col gap-4">
      <CardLink href={`/campaigns/${campaignId}/groups`}>← All groups</CardLink>
      <SubsectionHeader title={group ? (group.name ?? "Untitled group") : "Group"} note={group ? "Subscribers in this group. First 50 shown." : <Skeleton className="h-4 w-48" />} action={action} />
      <DataTable<Subscriber>
        noun="subscribers"
        rows={subscribers}
        isLoading={isLoading}
        error={error}
        onRetry={refetch}
        href={(subscriber) => `/subscribers/${subscriber.id}`}
        columns={[
          { header: "Email", cell: (subscriber) => subscriber.email_id, className: "w-[50%]" },
          { header: "Name", cell: (subscriber) => fullName(subscriber) ?? <Dash /> },
        ]}
        mobile={{ title: (subscriber) => subscriber.email_id, subtitle: (subscriber) => fullName(subscriber) ?? "No name" }}
        empty={<EmptyState title="No one in this group yet" action={action} />}
      />
    </div>
  );
}
