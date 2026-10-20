"use client";

import { useRouter } from "next/navigation";
import { Plus } from "@untitledui/icons";
import { ResourceTable } from "@/components/data/ResourceTable";
import { LimitOffsetPagination } from "@/components/data/LimitOffsetPagination";
import { Can } from "@/components/auth/Can";
import { Button } from "@/components/base/buttons/button";
import { Badge } from "@/components/base/badges/badges";
import { usePaginationParams } from "@/hooks/usePaginationParams";
import { useGetAddressesQuery } from "@/features/addresses";

export default function AddressesPage() {
  const router = useRouter();
  const { limit, offset, setLimit, setOffset } = usePaginationParams();
  const { data: addresses, isLoading, error } = useGetAddressesQuery({ limit, offset });

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-primary">Addresses</h1>
        <Can I="create" a="Address">
          <Button href={`/addresses/new`} iconLeading={Plus}>
            Add address
          </Button>
        </Can>
      </div>

      <ResourceTable
        rows={addresses}
        loading={isLoading}
        error={error}
        onRowClick={(row) => router.push(`/addresses/${row.id}`)}
        columns={[
          { header: "Street", render: (a) => a.street || "—" },
          { header: "City", render: (a) => a.city || "—" },
          { header: "Country", render: (a) => a.country || "—" },
          { header: "Primary", render: (a) => (a.is_primary ? <Badge size="sm" color="brand">Primary</Badge> : "—") },
        ]}
      />

      <LimitOffsetPagination limit={limit} offset={offset} rowCount={addresses?.length ?? 0} onLimitChange={setLimit} onOffsetChange={setOffset} />
    </div>
  );
}
