"use client";

import { Plus } from "@untitledui/icons";
import { Button } from "@/components/ui/button";
import { DataTable, Pagination } from "@/components/ui/data-table";
import { Dash, PageHeader } from "@/components/ui/page";
import { EmptyState } from "@/components/ui/feedback";
import { Pill } from "@/components/ui/pill";
import { Can } from "@/components/auth/Can";
import { usePaginationParams } from "@/hooks/usePaginationParams";
import { useCampaignNames, useGroupNames } from "@/hooks/useLookups";
import { useGetSubscribersQuery } from "@/features/subscribers";
import { fullName } from "@/lib/format";
import type { Subscriber } from "@/types/resources";

export default function SubscribersPage() {
  const { limit, offset, setOffset } = usePaginationParams();
  const { data: subscribers, isLoading, error, refetch } = useGetSubscribersQuery({ limit, offset });
  const { groupNames } = useGroupNames();
  const { campaignName } = useCampaignNames();

  const action = (
    <Can I="create" a="Subscriber">
      <Button href="/subscribers/new" variant="primary" icon={Plus}>
        Add subscriber
      </Button>
    </Can>
  );

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Subscribers" description="Everyone a campaign can send to, directly or through a group." actions={action} />
      <div>
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
              className: "w-[32%]",
            },
            { header: "Name", cell: (subscriber) => fullName(subscriber) ?? <Dash /> },
            { header: "Groups", cell: (subscriber) => groupNames(subscriber.group_ids) ?? <Dash />, className: "hidden text-muted lg:table-cell" },
            { header: "Campaign", cell: (subscriber) => campaignName(subscriber.campaign_id) ?? <Dash />, className: "text-muted" },
          ]}
          mobile={{
            title: (subscriber) => subscriber.email_id,
            subtitle: (subscriber) =>
              [subscriber.unsubscribed_at && "Unsubscribed", fullName(subscriber), groupNames(subscriber.group_ids)].filter(Boolean).join(" · ") || "No name",
          }}
          empty={<EmptyState title="No subscribers yet" action={action}>Add the people a campaign sends to. Put them in a group to send to many at once.</EmptyState>}
        />
        <Pagination noun="subscribers" limit={limit} offset={offset} rowCount={subscribers?.length ?? 0} onOffsetChange={setOffset} />
      </div>
    </div>
  );
}
