"use client";

import { use } from "react";
import { useRouter } from "next/navigation";
import { RecipientForm, type RecipientFormValues } from "@/components/recipients/RecipientForm";
import { ConfirmDialog } from "@/components/data/ConfirmDialog";
import { Can } from "@/components/auth/Can";
import { Button } from "@/components/base/buttons/button";
import { LoadingIndicator } from "@/components/application/loading-indicator/loading-indicator";
import { useAppDispatch, useAppSelector } from "@/lib/redux/hooks";
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

  const { data: recipient, isLoading } = useGetRecipientQuery({ recipientId });
  const [updateRecipient, { isLoading: isSaving, error: updateError }] = useUpdateRecipientMutation();
  const [deleteRecipient, { isLoading: isDeleting }] = useDeleteRecipientMutation();

  const onSubmit = (values: RecipientFormValues) => {
    updateRecipient({
      recipientId,
      ...values,
      campaign_id: values.campaign_id || undefined,
      group_id: values.group_id || undefined,
    });
  };

  const onDelete = async () => {
    const result = await deleteRecipient({
      recipientId,
      campaignId: recipient?.campaign_id ?? undefined,
      groupId: recipient?.group_id ?? undefined,
    });
    if (!("error" in result)) {
      router.push(`/recipients`);
    }
  };

  if (isLoading || !recipient) {
    return (
      <div className="flex justify-center py-16">
        <LoadingIndicator size="sm" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-8">
      <Can I="update" a="Recipient">
        <RecipientForm mode="edit" initialData={recipient} onSubmit={onSubmit} isSubmitting={isSaving} error={updateError} />
      </Can>

      <Can I="delete" a="Recipient">
        <div className="flex flex-col gap-3 border-t border-secondary pt-6">
          <h2 className="text-sm font-semibold text-error-primary">Danger zone</h2>
          <Button type="button" color="secondary-destructive" className="w-max" onClick={() => dispatch(recipientDeleteDialogOpened(recipientId))}>
            Delete recipient
          </Button>
        </div>
      </Can>

      <ConfirmDialog
        isOpen={dialog?.type === "delete"}
        onOpenChange={(open) => !open && dispatch(recipientDialogClosed())}
        title="Delete this recipient?"
        description="This can't be undone."
        isLoading={isDeleting}
        onConfirm={onDelete}
      />
    </div>
  );
}
