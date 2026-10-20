"use client";

import { use } from "react";
import { Plus } from "@untitledui/icons";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/ui/data-table";
import { EmptyState, Skeleton } from "@/components/ui/feedback";
import { CardLink, Dash } from "@/components/ui/page";
import { SubsectionHeader } from "@/components/resources/SubsectionHeader";
import { Can } from "@/components/auth/Can";
import { useGetGroupRecipientsQuery } from "@/features/recipients";
import { useGetGroupQuery } from "@/features/groups";
import { fullName } from "@/lib/format";
import type { Recipient } from "@/types/resources";

export default function CampaignGroupRecipientsPage({ params }: { params: Promise<{ campaignId: string; groupId: string }> }) {
  const { campaignId, groupId } = use(params);
  const { data: group } = useGetGroupQuery({ groupId });
  const { data: recipients, isLoading, error, refetch } = useGetGroupRecipientsQuery({ groupId, limit: 50 });

  const action = (
    <div className="flex items-center gap-3">
      <CardLink href={`/groups/${groupId}`}>Edit group</CardLink>
      <Can I="create" a="Recipient">
        <Button href={`/recipients/new?campaignId=${campaignId}&groupId=${groupId}`} icon={Plus} size="sm">
          Add recipient
        </Button>
      </Can>
    </div>
  );

  return (
    <div className="flex flex-col gap-4">
      <CardLink href={`/campaigns/${campaignId}/groups`}>← All groups</CardLink>
      <SubsectionHeader title={group ? (group.name ?? "Untitled group") : "Group"} note={group ? "Recipients in this group. First 50 shown." : <Skeleton className="h-4 w-48" />} action={action} />
      <DataTable<Recipient>
        noun="recipients"
        rows={recipients}
        isLoading={isLoading}
        error={error}
        onRetry={refetch}
        href={(recipient) => `/recipients/${recipient.id}`}
        columns={[
          { header: "Email", cell: (recipient) => recipient.email_id, className: "w-[50%]" },
          { header: "Name", cell: (recipient) => fullName(recipient) ?? <Dash /> },
        ]}
        mobile={{ title: (recipient) => recipient.email_id, subtitle: (recipient) => fullName(recipient) ?? "No name" }}
        empty={<EmptyState title="No one in this group yet" action={action} />}
      />
    </div>
  );
}
