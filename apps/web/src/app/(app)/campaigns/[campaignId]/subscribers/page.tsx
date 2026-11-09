"use client";

import { use } from "react";
import { Plus } from "@untitledui/icons";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/ui/data-table";
import { EmptyState } from "@/components/ui/feedback";
import { Dash } from "@/components/ui/page";
import { SubsectionHeader } from "@/components/resources/SubsectionHeader";
import { Can } from "@/components/auth/Can";
import { useGetCampaignSubscribersQuery } from "@/features/subscribers";
import { useGroupNames } from "@/hooks/useLookups";
import { fullName } from "@/lib/format";
import type { Subscriber } from "@/types/resources";

export default function CampaignSubscribersPage({ params }: { params: Promise<{ campaignId: string }> }) {
  const { campaignId } = use(params);
  const { data: subscribers, isLoading, error, refetch } = useGetCampaignSubscribersQuery({ campaignId, limit: 50 });
  const { groupNames } = useGroupNames();

  const action = (
    <Can I="create" a="Subscriber">
      <Button href={`/subscribers/new?campaignId=${campaignId}`} icon={Plus} size="sm">
        Add subscriber
      </Button>
    </Can>
  );

  return (
    <div className="flex flex-col gap-4">
      <SubsectionHeader title="Subscribers" note="Everyone this campaign sends to: people linked to it directly and everyone in its groups, each once. First 50 shown." action={action} />
      <DataTable<Subscriber>
        noun="subscribers"
        rows={subscribers}
        isLoading={isLoading}
        error={error}
        onRetry={refetch}
        href={(subscriber) => `/subscribers/${subscriber.id}`}
        columns={[
          { header: "Email", cell: (subscriber) => subscriber.email_id, className: "w-[40%]" },
          { header: "Name", cell: (subscriber) => fullName(subscriber) ?? <Dash /> },
          { header: "Groups", cell: (subscriber) => groupNames(subscriber.group_ids) ?? <Dash />, className: "text-muted" },
        ]}
        mobile={{ title: (subscriber) => subscriber.email_id, subtitle: (subscriber) => [fullName(subscriber), groupNames(subscriber.group_ids)].filter(Boolean).join(" · ") || "No name" }}
        empty={<EmptyState title="No subscribers linked yet" action={action}>Add people directly, or through a group linked to this campaign.</EmptyState>}
      />
    </div>
  );
}
