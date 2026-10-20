"use client";

import { use } from "react";
import { useRouter } from "next/navigation";
import { RecipientForm } from "@/components/recipients/RecipientForm";
import { DeleteSection } from "@/components/resources/DeleteSection";
import { PageHeader } from "@/components/ui/page";
import { ErrorNotice, Skeleton } from "@/components/ui/feedback";
import { useAbility } from "@/hooks/useAbility";
import { useAppDispatch, useAppSelector } from "@/lib/redux/hooks";
import { fullName } from "@/lib/format";
import {
  useGetRecipientQuery,
  useUpdateRecipientMutation,
  useDeleteRecipientMutation,
  selectRecipientDialog,
  recipientDeleteDialogOpened,
  recipientDialogClosed,
} from "@/features/recipients";

export default function RecipientDetailPage({ params }: { params: Promise<{ recipientId: string }> }) {
  const { recipientId } = use(params);
  const router = useRouter();
  const dispatch = useAppDispatch();
  const dialog = useAppSelector(selectRecipientDialog);
  const { ability } = useAbility();

  const { data: recipient, isLoading, error, refetch } = useGetRecipientQuery({ recipientId });
  const [updateRecipient, { isLoading: isSaving, error: updateError }] = useUpdateRecipientMutation();
  const [deleteRecipient, { isLoading: isDeleting, error: deleteError }] = useDeleteRecipientMutation();

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        back={{ href: "/recipients", label: "Recipients" }}
        title={recipient ? recipient.email_id : isLoading ? <Skeleton className="h-7 w-64" /> : "Recipient"}
        description={recipient && (fullName(recipient) ?? "No name on record.")}
      />
      {error ? (
        <ErrorNotice error={error} what="this recipient" onRetry={refetch} />
      ) : !recipient ? (
        <Skeleton className="h-64 w-full" />
      ) : (
        <div className="flex flex-col">
          <RecipientForm
            key={recipient.updated_at ?? recipient.created_at}
            mode="edit"
            initialData={recipient}
            readOnly={!ability.can("update", "Recipient")}
            isSubmitting={isSaving}
            error={updateError}
            onSubmit={(values) => updateRecipient({ recipientId, ...values, campaign_id: values.campaign_id || undefined, group_id: values.group_id || undefined })}
          />
          {ability.can("delete", "Recipient") && (
            <div className="mt-8 border-t border-border">
              <DeleteSection
                noun="recipient"
                name={recipient.email_id ?? "this recipient"}
                consequence="Permanently removes this person from every campaign and group."
                isOpen={dialog?.type === "delete"}
                onOpenChange={(open) => dispatch(open ? recipientDeleteDialogOpened(recipientId) : recipientDialogClosed())}
                isDeleting={isDeleting}
                error={deleteError}
                onConfirm={async () => {
                  const result = await deleteRecipient({ recipientId, campaignId: recipient.campaign_id ?? undefined, groupId: recipient.group_id ?? undefined });
                  if (!("error" in result)) {
                    dispatch(recipientDialogClosed());
                    router.push("/recipients");
                  }
                }}
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
