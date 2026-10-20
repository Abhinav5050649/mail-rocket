"use client";

import { use } from "react";
import { Plus } from "@untitledui/icons";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/ui/data-table";
import { EmptyState } from "@/components/ui/feedback";
import { Dash } from "@/components/ui/page";
import { SubsectionHeader } from "@/components/resources/SubsectionHeader";
import { Can } from "@/components/auth/Can";
import { useGetCampaignTemplatesQuery } from "@/features/templates";
import { formatDateTime } from "@/lib/format";
import type { Template } from "@/types/resources";

export default function CampaignTemplatesPage({ params }: { params: Promise<{ campaignId: string }> }) {
  const { campaignId } = use(params);
  const { data: templates, isLoading, error, refetch } = useGetCampaignTemplatesQuery({ campaignId, limit: 50 });

  const action = (
    <Can I="create" a="Template">
      <Button href={`/templates/new?campaignId=${campaignId}`} icon={Plus} size="sm">
        New template
      </Button>
    </Can>
  );

  return (
    <div className="flex flex-col gap-4">
      <SubsectionHeader title="Templates" note="The HTML body this campaign sends." action={action} />
      <DataTable<Template>
        noun="templates"
        rows={templates}
        isLoading={isLoading}
        error={error}
        onRetry={refetch}
        href={(template) => `/templates/${template.id}`}
        columns={[
          { header: "Template", cell: (template) => template.name || "Untitled template" },
          { header: "Size", cell: (template) => (template.html_body ? `${template.html_body.length.toLocaleString("en-GB")} chars` : <Dash />), align: "right", className: "w-32 text-muted" },
          { header: "Updated", cell: (template) => <span className="tabular">{formatDateTime(template.updated_at ?? template.created_at)}</span>, align: "right", className: "w-48" },
        ]}
        mobile={{ title: (template) => template.name || "Untitled template", subtitle: (template) => `Updated ${formatDateTime(template.updated_at ?? template.created_at)}` }}
        empty={<EmptyState title="No template linked yet" action={action}>Write the email this campaign sends. Variables like {"{{recipient_first_name}}"} are filled per recipient.</EmptyState>}
      />
    </div>
  );
}
