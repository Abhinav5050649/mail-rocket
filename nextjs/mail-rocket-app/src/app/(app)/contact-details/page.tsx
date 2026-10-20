"use client";

import { useRouter } from "next/navigation";
import { Plus } from "@untitledui/icons";
import { ResourceTable } from "@/components/data/ResourceTable";
import { LimitOffsetPagination } from "@/components/data/LimitOffsetPagination";
import { Can } from "@/components/auth/Can";
import { Button } from "@/components/base/buttons/button";
import { usePaginationParams } from "@/hooks/usePaginationParams";
import { useGetContactDetailsListQuery } from "@/features/contactDetails";

export default function ContactDetailsPage() {
  const router = useRouter();
  const { limit, offset, setLimit, setOffset } = usePaginationParams();
  const { data: contactDetailsList, isLoading, error } = useGetContactDetailsListQuery({ limit, offset });

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-primary">Contact details</h1>
        <Can I="create" a="ContactDetails">
          <Button href={`/contact-details/new`} iconLeading={Plus}>
            Add contact details
          </Button>
        </Can>
      </div>

      <ResourceTable
        rows={contactDetailsList}
        loading={isLoading}
        error={error}
        onRowClick={(row) => router.push(`/contact-details/${row.id}`)}
        columns={[
          { header: "Email", render: (c) => c.email_id || "—" },
          { header: "Phone", render: (c) => (c.phone_number ? `${c.country_code ?? ""} ${c.phone_number}` : "—") },
        ]}
      />

      <LimitOffsetPagination
        limit={limit}
        offset={offset}
        rowCount={contactDetailsList?.length ?? 0}
        onLimitChange={setLimit}
        onOffsetChange={setOffset}
      />
    </div>
  );
}
