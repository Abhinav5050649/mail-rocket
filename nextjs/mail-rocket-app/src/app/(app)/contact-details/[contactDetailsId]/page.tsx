"use client";

import { use } from "react";
import { useRouter } from "next/navigation";
import { ContactDetailsForm, phoneLine } from "@/components/contactDetails/ContactDetailsForm";
import { DeleteSection } from "@/components/resources/DeleteSection";
import { PageHeader } from "@/components/ui/page";
import { ErrorNotice, Skeleton } from "@/components/ui/feedback";
import { useAbility } from "@/hooks/useAbility";
import { useAppDispatch, useAppSelector } from "@/lib/redux/hooks";
import {
  useGetContactDetailsQuery,
  useUpdateContactDetailsMutation,
  useDeleteContactDetailsMutation,
  selectContactDetailsDialog,
  contactDetailsDeleteDialogOpened,
  contactDetailsDialogClosed,
} from "@/features/contactDetails";

export default function ContactDetailsDetailPage({ params }: { params: Promise<{ contactDetailsId: string }> }) {
  const { contactDetailsId } = use(params);
  const router = useRouter();
  const dispatch = useAppDispatch();
  const dialog = useAppSelector(selectContactDetailsDialog);
  const { ability } = useAbility();

  const { data: contact, isLoading, error, refetch } = useGetContactDetailsQuery({ contactDetailsId });
  const [updateContactDetails, { isLoading: isSaving, error: updateError }] = useUpdateContactDetailsMutation();
  const [deleteContactDetails, { isLoading: isDeleting, error: deleteError }] = useDeleteContactDetailsMutation();
  const title = contact ? contact.email_id || phoneLine(contact) || "Contact details" : "Contact details";

  return (
    <div className="flex flex-col gap-6">
      <PageHeader back={{ href: "/contact-details", label: "Contact details" }} title={isLoading ? <Skeleton className="h-7 w-56" /> : title} />
      {error ? (
        <ErrorNotice error={error} what="these contact details" onRetry={refetch} />
      ) : !contact ? (
        <Skeleton className="h-48 w-full" />
      ) : (
        <div className="flex flex-col">
          <ContactDetailsForm
            key={contact.updated_at ?? contact.created_at}
            mode="edit"
            initialData={contact}
            readOnly={!ability.can("update", "ContactDetails")}
            isSubmitting={isSaving}
            error={updateError}
            onSubmit={(values) => updateContactDetails({ contactDetailsId, ...values })}
          />
          {ability.can("delete", "ContactDetails") && (
            <DeleteSection
              noun="contact details"
              name={title}
              consequence="Permanently removes these contact details."
              isOpen={dialog?.type === "delete"}
              onOpenChange={(open) => dispatch(open ? contactDetailsDeleteDialogOpened(contactDetailsId) : contactDetailsDialogClosed())}
              isDeleting={isDeleting}
              error={deleteError}
              onConfirm={async () => {
                const result = await deleteContactDetails({ contactDetailsId });
                if (!("error" in result)) {
                  dispatch(contactDetailsDialogClosed());
                  router.push("/contact-details");
                }
              }}
            />
          )}
        </div>
      )}
    </div>
  );
}
