"use client";

import { use } from "react";
import { useRouter } from "next/navigation";
import { Plus } from "@untitledui/icons";
import { ResourceTable } from "@/components/data/ResourceTable";
import { Can } from "@/components/auth/Can";
import { Button } from "@/components/base/buttons/button";
import { useGetCampaignTemplatesQuery } from "@/features/templates";

export default function CampaignTemplatesPage({ params }: { params: Promise<{ campaignId: string }> }) {
  const { campaignId } = use(params);
  const router = useRouter();
  const { data: templates, isLoading, error } = useGetCampaignTemplatesQuery({ campaignId, limit: 50 });

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-primary">Templates</h2>
        <Can I="create" a="Template">
          <Button href={`/templates/new?campaignId=${campaignId}`} iconLeading={Plus} size="sm">
            New template
          </Button>
        </Can>
      </div>

      <ResourceTable
        rows={templates}
        loading={isLoading}
        error={error}
        onRowClick={(row) => router.push(`/templates/${row.id}`)}
        columns={[{ header: "Name", render: (t) => t.name }]}
        emptyMessage="No templates linked to this campaign yet."
      />
    </div>
  );
}
