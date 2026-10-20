"use client";

import { useRouter } from "next/navigation";
import { Plus } from "@untitledui/icons";
import { ResourceTable } from "@/components/data/ResourceTable";
import { LimitOffsetPagination } from "@/components/data/LimitOffsetPagination";
import { Can } from "@/components/auth/Can";
import { Button } from "@/components/base/buttons/button";
import { usePaginationParams } from "@/hooks/usePaginationParams";
import { useGetRecipientsQuery } from "@/features/recipients";

export default function RecipientsPage() {
  const router = useRouter();
  const { limit, offset, setLimit, setOffset } = usePaginationParams();
  const { data: recipients, isLoading, error } = useGetRecipientsQuery({ limit, offset });

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-primary">Recipients</h1>
        <Can I="create" a="Recipient">
          <Button href={`/recipients/new`} iconLeading={Plus}>
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
      />

      <LimitOffsetPagination limit={limit} offset={offset} rowCount={recipients?.length ?? 0} onLimitChange={setLimit} onOffsetChange={setOffset} />
    </div>
  );
}
