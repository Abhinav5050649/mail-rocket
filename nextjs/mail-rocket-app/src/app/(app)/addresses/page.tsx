"use client";

import { Plus } from "@untitledui/icons";
import { Button } from "@/components/ui/button";
import { DataTable, Pagination } from "@/components/ui/data-table";
import { Dash, PageHeader } from "@/components/ui/page";
import { Pill } from "@/components/ui/pill";
import { EmptyState } from "@/components/ui/feedback";
import { Can } from "@/components/auth/Can";
import { addressLine } from "@/components/addresses/AddressForm";
import { usePaginationParams } from "@/hooks/usePaginationParams";
import { useGetAddressesQuery } from "@/features/addresses";
import type { Address } from "@/types/resources";

export default function AddressesPage() {
  const { limit, offset, setOffset } = usePaginationParams();
  const { data: addresses, isLoading, error, refetch } = useGetAddressesQuery({ limit, offset });

  const action = (
    <Can I="create" a="Address">
      <Button href="/addresses/new" variant="primary" icon={Plus}>
        Add address
      </Button>
    </Can>
  );

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Addresses" description="The organization's postal addresses." actions={action} />
      <div>
        <DataTable<Address>
          noun="addresses"
          rows={addresses}
          isLoading={isLoading}
          error={error}
          onRetry={refetch}
          href={(address) => `/addresses/${address.id}`}
          columns={[
            { header: "Street", cell: (address) => address.street || "No street", className: "w-[34%]" },
            { header: "City", cell: (address) => address.city || <Dash /> },
            { header: "Country", cell: (address) => address.country || <Dash />, className: "text-muted" },
            { header: "", cell: (address) => address.is_primary && <Pill tone="accent">Primary</Pill>, align: "right", className: "w-28" },
          ]}
          mobile={{
            title: (address) => address.street || address.city || "Address",
            subtitle: (address) => addressLine(address) || "No details",
            trailing: (address) => address.is_primary && <Pill tone="accent">Primary</Pill>,
          }}
          empty={<EmptyState title="No addresses yet" action={action}>Add the organization&apos;s postal address, for example for email footers.</EmptyState>}
        />
        <Pagination noun="addresses" limit={limit} offset={offset} rowCount={addresses?.length ?? 0} onOffsetChange={setOffset} />
      </div>
    </div>
  );
}
