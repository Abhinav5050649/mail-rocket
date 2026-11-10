"use client";

import { Plus } from "@untitledui/icons";
import { Button } from "@/components/ui/button";
import { DataTable, Pagination } from "@/components/ui/data-table";
import { Dash, PageHeader } from "@/components/ui/page";
import { EmptyState } from "@/components/ui/feedback";
import { Can } from "@/components/auth/Can";
import { usePaginationParams } from "@/hooks/usePaginationParams";
import { useCampaignNames } from "@/hooks/useLookups";
import { useGetTemplatesQuery } from "@/features/templates";
import { unknownVariables } from "@/components/templates/TemplateEditor";
import { formatDateTime } from "@/lib/format";
import type { Template } from "@/types/resources";

/** How many `{{variables}}` a body uses. */
const variableCount = (html: string | null) => new Set(html?.match(/\{\{\s*[a-z_]+\s*\}\}/g) ?? []).size;

export default function TemplatesPage() {
  const { limit, offset, setOffset } = usePaginationParams();
  const { data: templates, isLoading, error, refetch } = useGetTemplatesQuery({ limit, offset });
  const { campaigns } = useCampaignNames();
  /** "Autumn launch, Newsletter" - the campaigns that send a template, or null when none do. */
  const usedBy = (templateId: string) =>
    campaigns?.filter((campaign) => campaign.template_id === templateId).map((campaign) => campaign.name || "Untitled campaign").join(", ") || null;

  const action = (
    <Can I="create" a="Template">
      <Button href="/templates/new" variant="primary" icon={Plus}>
        New template
      </Button>
    </Can>
  );

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Templates" description="A library of HTML email bodies. Each campaign picks one; variables are filled per subscriber when it sends." actions={action} />
      <div>
        <DataTable<Template>
          noun="templates"
          rows={templates}
          isLoading={isLoading}
          error={error}
          onRetry={refetch}
          href={(template) => `/templates/${template.id}`}
          columns={[
            { header: "Template", cell: (template) => template.name || "Untitled template", className: "w-[34%]" },
            { header: "Used by", cell: (template) => usedBy(template.id) ?? <Dash />, className: "text-muted" },
            {
              header: "Variables",
              cell: (template) => {
                const unknown = unknownVariables(template.html_body ?? "").length;
                return unknown ? <span className="text-warning">{unknown} unknown</span> : <span className="tabular">{variableCount(template.html_body)}</span>;
              },
              align: "right",
              className: "hidden w-28 md:table-cell",
            },
            { header: "Updated", cell: (template) => <span className="tabular">{formatDateTime(template.updated_at ?? template.created_at)}</span>, align: "right", className: "w-48" },
          ]}
          mobile={{
            title: (template) => template.name || "Untitled template",
            subtitle: (template) => (usedBy(template.id) ? `Used by ${usedBy(template.id)}` : "Not used by any campaign yet"),
          }}
          empty={
            <EmptyState title="No templates yet" action={action}>
              A template is the HTML a campaign sends. Use variables like {"{{subscriber_first_name}}"} to personalise it.
            </EmptyState>
          }
        />
        <Pagination noun="templates" limit={limit} offset={offset} rowCount={templates?.length ?? 0} onOffsetChange={setOffset} />
      </div>
    </div>
  );
}
