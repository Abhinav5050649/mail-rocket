"use client";

import { use } from "react";
import { useRouter } from "next/navigation";
import { Plus } from "@untitledui/icons";
import { ResourceTable } from "@/components/data/ResourceTable";
import { Can } from "@/components/auth/Can";
import { Button } from "@/components/base/buttons/button";
import { useGetCampaignRecipientsQuery } from "@/features/recipients";

export default function CampaignRecipientsPage({ params }: { params: Promise<{ campaignId: string }> }) {
  const { campaignId } = use(params);
  const router = useRouter();
  const { data: recipients, isLoading, error } = useGetCampaignRecipientsQuery({ campaignId, limit: 50 });

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-primary">Recipients</h2>
        <Can I="create" a="Recipient">
          <Button href={`/recipients/new?campaignId=${campaignId}`} iconLeading={Plus} size="sm">
            Add recipient
          </Button>
        </Can>
      </div>

      <ResourceTable
        rows={recipients}
        loading={isLoading}
        error={error}
        onRowClick={(row) => router.push(`/recipients/${row.id}`)}
        columns={[
          { header: "Name", render: (r) => `${r.first_name ?? ""} ${r.last_name ?? ""}`.trim() || "—" },
          { header: "Email", render: (r) => r.email_id },
        ]}
        emptyMessage="No recipients linked to this campaign yet."
      />
    </div>
  );
}
