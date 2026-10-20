"use client";

import { useRouter } from "next/navigation";
import { Plus } from "@untitledui/icons";
import { ResourceTable } from "@/components/data/ResourceTable";
import { LimitOffsetPagination } from "@/components/data/LimitOffsetPagination";
import { Can } from "@/components/auth/Can";
import { Button } from "@/components/base/buttons/button";
import { usePaginationParams } from "@/hooks/usePaginationParams";
import { useGetTemplatesQuery } from "@/features/templates";

export default function TemplatesPage() {
  const router = useRouter();
  const { limit, offset, setLimit, setOffset } = usePaginationParams();
  const { data: templates, isLoading, error } = useGetTemplatesQuery({ limit, offset });

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-primary">Templates</h1>
        <Can I="create" a="Template">
          <Button href={`/templates/new`} iconLeading={Plus}>
            New template
          </Button>
        </Can>
      </div>

      <ResourceTable
        rows={templates}
        loading={isLoading}
        error={error}
        onRowClick={(row) => router.push(`/templates/${row.id}`)}
        columns={[
          { header: "Name", render: (t) => t.name },
          { header: "Linked campaign", render: (t) => (t.campaign_id ? "Yes" : "—") },
        ]}
      />

      <LimitOffsetPagination limit={limit} offset={offset} rowCount={templates?.length ?? 0} onLimitChange={setLimit} onOffsetChange={setOffset} />
    </div>
  );
}
