"use client";

import { use } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Plus } from "@untitledui/icons";
import { ResourceTable } from "@/components/data/ResourceTable";
import { Can } from "@/components/auth/Can";
import { Button } from "@/components/base/buttons/button";
import { useGetGroupRecipientsQuery } from "@/features/recipients";
import { useGetGroupQuery } from "@/features/groups";

export default function CampaignGroupRecipientsPage({
  params,
}: {
  params: Promise<{ campaignId: string; groupId: string }>;
}) {
  const { campaignId, groupId } = use(params);
  const router = useRouter();
  const { data: group } = useGetGroupQuery({ groupId });
  const { data: recipients, isLoading, error } = useGetGroupRecipientsQuery({ campaignId, groupId, limit: 50 });

  return (
    <div className="flex flex-col gap-6">
      <Link
        href={`/campaigns/${campaignId}/groups`}
        className="flex w-max items-center gap-1.5 text-sm font-semibold text-tertiary hover:text-secondary"
      >
        <ArrowLeft className="size-4" />
        Back to groups
      </Link>

      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-primary">Recipients in {group?.name ?? "group"}</h2>
        <Can I="create" a="Recipient">
          <Button href={`/recipients/new?campaignId=${campaignId}&groupId=${groupId}`} iconLeading={Plus} size="sm">
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
        emptyMessage="No recipients in this group yet."
      />
    </div>
  );
}
