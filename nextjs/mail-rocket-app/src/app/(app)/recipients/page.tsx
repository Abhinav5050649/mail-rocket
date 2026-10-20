"use client";

import { Plus } from "@untitledui/icons";
import { Button } from "@/components/ui/button";
import { DataTable, Pagination } from "@/components/ui/data-table";
import { Dash, PageHeader } from "@/components/ui/page";
import { EmptyState } from "@/components/ui/feedback";
import { Can } from "@/components/auth/Can";
import { usePaginationParams } from "@/hooks/usePaginationParams";
import { useCampaignNames, useGroupNames } from "@/hooks/useLookups";
import { useGetRecipientsQuery } from "@/features/recipients";
import { fullName } from "@/lib/format";
import type { Recipient } from "@/types/resources";

export default function RecipientsPage() {
  const { limit, offset, setOffset } = usePaginationParams();
  const { data: recipients, isLoading, error, refetch } = useGetRecipientsQuery({ limit, offset });
  const { groupNames } = useGroupNames();
  const { campaignName } = useCampaignNames();

  const action = (
    <Can I="create" a="Recipient">
      <Button href="/recipients/new" variant="primary" icon={Plus}>
        Add recipient
      </Button>
    </Can>
  );

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Recipients" description="Everyone a campaign can send to, directly or through a group." actions={action} />
      <div>
        <DataTable<Recipient>
          noun="recipients"
          rows={recipients}
          isLoading={isLoading}
          error={error}
          onRetry={refetch}
          href={(recipient) => `/recipients/${recipient.id}`}
          columns={[
            { header: "Email", cell: (recipient) => recipient.email_id, className: "w-[32%]" },
            { header: "Name", cell: (recipient) => fullName(recipient) ?? <Dash /> },
            { header: "Groups", cell: (recipient) => groupNames(recipient.group_ids) ?? <Dash />, className: "hidden text-muted lg:table-cell" },
            { header: "Campaign", cell: (recipient) => campaignName(recipient.campaign_id) ?? <Dash />, className: "text-muted" },
          ]}
          mobile={{
            title: (recipient) => recipient.email_id,
            subtitle: (recipient) => [fullName(recipient), groupNames(recipient.group_ids)].filter(Boolean).join(" · ") || "No name",
          }}
          empty={<EmptyState title="No recipients yet" action={action}>Add the people a campaign sends to. Put them in a group to send to many at once.</EmptyState>}
        />
        <Pagination noun="recipients" limit={limit} offset={offset} rowCount={recipients?.length ?? 0} onOffsetChange={setOffset} />
      </div>
    </div>
  );
}
