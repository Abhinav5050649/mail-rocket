"use client";

import { use } from "react";
import { Plus } from "@untitledui/icons";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/ui/data-table";
import { EmptyState } from "@/components/ui/feedback";
import { Dash } from "@/components/ui/page";
import { SubsectionHeader } from "@/components/resources/SubsectionHeader";
import { Can } from "@/components/auth/Can";
import { useGetCampaignRecipientsQuery } from "@/features/recipients";
import { useGroupNames } from "@/hooks/useLookups";
import { fullName } from "@/lib/format";
import type { Recipient } from "@/types/resources";

export default function CampaignRecipientsPage({ params }: { params: Promise<{ campaignId: string }> }) {
  const { campaignId } = use(params);
  const { data: recipients, isLoading, error, refetch } = useGetCampaignRecipientsQuery({ campaignId, limit: 50 });
  const { groupNames } = useGroupNames();

  const action = (
    <Can I="create" a="Recipient">
      <Button href={`/recipients/new?campaignId=${campaignId}`} icon={Plus} size="sm">
        Add recipient
      </Button>
    </Can>
  );

  return (
    <div className="flex flex-col gap-4">
      <SubsectionHeader title="Recipients" note="Everyone this campaign sends to: people linked to it directly and everyone in its groups, each once. First 50 shown." action={action} />
      <DataTable<Recipient>
        noun="recipients"
        rows={recipients}
        isLoading={isLoading}
        error={error}
        onRetry={refetch}
        href={(recipient) => `/recipients/${recipient.id}`}
        columns={[
          { header: "Email", cell: (recipient) => recipient.email_id, className: "w-[40%]" },
          { header: "Name", cell: (recipient) => fullName(recipient) ?? <Dash /> },
          { header: "Groups", cell: (recipient) => groupNames(recipient.group_ids) ?? <Dash />, className: "text-muted" },
        ]}
        mobile={{ title: (recipient) => recipient.email_id, subtitle: (recipient) => [fullName(recipient), groupNames(recipient.group_ids)].filter(Boolean).join(" · ") || "No name" }}
        empty={<EmptyState title="No recipients linked yet" action={action}>Add people directly, or through a group linked to this campaign.</EmptyState>}
      />
    </div>
  );
}
