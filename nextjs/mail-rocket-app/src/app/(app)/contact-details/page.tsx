"use client";

import { Plus } from "@untitledui/icons";
import { Button } from "@/components/ui/button";
import { DataTable, Pagination } from "@/components/ui/data-table";
import { Dash, PageHeader } from "@/components/ui/page";
import { EmptyState } from "@/components/ui/feedback";
import { Can } from "@/components/auth/Can";
import { phoneLine } from "@/components/contactDetails/ContactDetailsForm";
import { usePaginationParams } from "@/hooks/usePaginationParams";
import { useGetContactDetailsListQuery } from "@/features/contactDetails";
import type { ContactDetails } from "@/types/resources";

export default function ContactDetailsPage() {
  const { limit, offset, setOffset } = usePaginationParams();
  const { data: contacts, isLoading, error, refetch } = useGetContactDetailsListQuery({ limit, offset });

  const action = (
    <Can I="create" a="ContactDetails">
      <Button href="/contact-details/new" variant="primary" icon={Plus}>
        Add contact details
      </Button>
    </Can>
  );

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Contact details" description="Email addresses and phone numbers recipients can reach the organization on." actions={action} />
      <div>
        <DataTable<ContactDetails>
          noun="contact details"
          rows={contacts}
          isLoading={isLoading}
          error={error}
          onRetry={refetch}
          href={(contact) => `/contact-details/${contact.id}`}
          columns={[
            { header: "Email", cell: (contact) => contact.email_id || "No email", className: "w-[50%]" },
            { header: "Phone", cell: (contact) => (phoneLine(contact) ? <span className="tabular">{phoneLine(contact)}</span> : <Dash />) },
          ]}
          mobile={{ title: (contact) => contact.email_id || phoneLine(contact) || "Contact", subtitle: (contact) => phoneLine(contact) ?? "No phone" }}
          empty={<EmptyState title="No contact details yet" action={action}>Add an email or phone number people can use to reach you.</EmptyState>}
        />
        <Pagination noun="contact details" limit={limit} offset={offset} rowCount={contacts?.length ?? 0} onOffsetChange={setOffset} />
      </div>
    </div>
  );
}
