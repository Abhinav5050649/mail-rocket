"use client";

import { use } from "react";
import { Edit05 } from "@untitledui/icons";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/ui/data-table";
import { EmptyState } from "@/components/ui/feedback";
import { Dash } from "@/components/ui/page";
import { Pill } from "@/components/ui/pill";
import { SubsectionHeader } from "@/components/resources/SubsectionHeader";
import { Can } from "@/components/auth/Can";
import { useGetCampaignQuery } from "@/features/campaigns";
import { useGetCampaignSubscribersQuery } from "@/features/subscribers";
import { useGroupNames } from "@/hooks/useLookups";
import { fullName } from "@/lib/format";
import type { Subscriber } from "@/types/resources";

/**
 * Everyone the campaign sends to, read-only, with why each person is in it:
 * picked individually, or through which of the campaign's groups. Who's in
 * the audience is changed on the campaign's own form (Overview).
 */
export default function CampaignAudiencePage({ params }: { params: Promise<{ campaignId: string }> }) {
  const { campaignId } = use(params);
  const { data: campaign } = useGetCampaignQuery({ campaignId });
  const { data: subscribers, isLoading, error, refetch } = useGetCampaignSubscribersQuery({ campaignId, limit: 100 });
  const { groupNames } = useGroupNames();

  /** "Picked individually", "Newsletter, VIP" or both - how a person ended up in this audience. */
  const reason = (subscriber: Subscriber) => {
    const viaGroups = groupNames(subscriber.group_ids.filter((id) => campaign?.group_ids.includes(id)));
    const picked = campaign?.subscriber_ids.includes(subscriber.id) ? "Picked individually" : null;
    return [picked, viaGroups].filter(Boolean).join(" · ") || null;
  };

  const action = (
    <Can I="update" a="Campaign">
      <Button href={`/campaigns/${campaignId}`} icon={Edit05} size="sm">
        Edit audience
      </Button>
    </Can>
  );

  return (
    <div className="flex flex-col gap-4">
      <SubsectionHeader
        title="Audience"
        note="Everyone this campaign sends to: members of its groups plus anyone picked individually, each once. People who unsubscribed are skipped. First 100 shown."
        action={action}
      />
      <DataTable<Subscriber>
        noun="subscribers"
        rows={subscribers}
        isLoading={isLoading}
        error={error}
        onRetry={refetch}
        href={(subscriber) => `/subscribers/${subscriber.id}`}
        columns={[
          {
            header: "Email",
            cell: (subscriber) => (
              <span className="inline-flex items-center gap-2">
                {subscriber.email_id}
                {subscriber.unsubscribed_at && <Pill tone="warning">Unsubscribed</Pill>}
              </span>
            ),
            className: "w-[38%]",
          },
          { header: "Name", cell: (subscriber) => fullName(subscriber) ?? <Dash /> },
          { header: "Included through", cell: (subscriber) => reason(subscriber) ?? <Dash />, className: "text-muted" },
        ]}
        mobile={{ title: (subscriber) => subscriber.email_id, subtitle: (subscriber) => [fullName(subscriber), reason(subscriber)].filter(Boolean).join(" · ") || "No name" }}
        empty={<EmptyState title="No one in the audience yet" action={action}>Pick groups or individual subscribers on the campaign&apos;s Overview.</EmptyState>}
      />
    </div>
  );
}
