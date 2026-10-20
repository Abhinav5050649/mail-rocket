"use client";

import { useRouter } from "next/navigation";
import { Plus } from "@untitledui/icons";
import { ResourceTable } from "@/components/data/ResourceTable";
import { LimitOffsetPagination } from "@/components/data/LimitOffsetPagination";
import { Can } from "@/components/auth/Can";
import { Button } from "@/components/base/buttons/button";
import { usePaginationParams } from "@/hooks/usePaginationParams";
import { useGetGroupsQuery } from "@/features/groups";

export default function GroupsPage() {
  const router = useRouter();
  const { limit, offset, setLimit, setOffset } = usePaginationParams();
  const { data: groups, isLoading, error } = useGetGroupsQuery({ limit, offset });

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-primary">Groups</h1>
        <Can I="create" a="Group">
          <Button href={`/groups/new`} iconLeading={Plus}>
            New group
          </Button>
        </Can>
      </div>

      <ResourceTable
        rows={groups}
        loading={isLoading}
        error={error}
        onRowClick={(row) => router.push(`/groups/${row.id}`)}
        columns={[
          { header: "Name", render: (g) => g.name },
          { header: "Linked campaign", render: (g) => (g.campaign_id ? "Yes" : "—") },
        ]}
      />

      <LimitOffsetPagination limit={limit} offset={offset} rowCount={groups?.length ?? 0} onLimitChange={setLimit} onOffsetChange={setOffset} />
    </div>
  );
}
