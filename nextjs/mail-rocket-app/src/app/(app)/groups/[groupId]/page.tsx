"use client";

import { use } from "react";
import { useRouter } from "next/navigation";
import { GroupForm, type GroupFormValues } from "@/components/groups/GroupForm";
import { ConfirmDialog } from "@/components/data/ConfirmDialog";
import { Can } from "@/components/auth/Can";
import { Button } from "@/components/base/buttons/button";
import { LoadingIndicator } from "@/components/application/loading-indicator/loading-indicator";
import { useAppDispatch, useAppSelector } from "@/lib/redux/hooks";
import {
  useGetGroupQuery,
  useUpdateGroupMutation,
  useDeleteGroupMutation,
  selectGroupDialog,
  groupDeleteDialogOpened,
  groupDialogClosed,
} from "@/features/groups";

export default function GroupDetailPage({ params }: { params: Promise<{ groupId: string }> }) {
  const { groupId } = use(params);
  const router = useRouter();
  const dispatch = useAppDispatch();
  const dialog = useAppSelector(selectGroupDialog);

  const { data: group, isLoading } = useGetGroupQuery({ groupId });
  const [updateGroup, { isLoading: isSaving, error: updateError }] = useUpdateGroupMutation();
  const [deleteGroup, { isLoading: isDeleting }] = useDeleteGroupMutation();

  const onSubmit = (values: GroupFormValues) => {
    updateGroup({ groupId, ...values, campaign_id: values.campaign_id || undefined });
  };

  const onDelete = async () => {
    const result = await deleteGroup({ groupId, campaignId: group?.campaign_id ?? undefined });
    if (!("error" in result)) {
      router.push(`/groups`);
    }
  };

  if (isLoading || !group) {
    return (
      <div className="flex justify-center py-16">
        <LoadingIndicator size="sm" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-8">
      <Can I="update" a="Group">
        <GroupForm mode="edit" initialData={group} onSubmit={onSubmit} isSubmitting={isSaving} error={updateError} />
      </Can>

      <Can I="delete" a="Group">
        <div className="flex flex-col gap-3 border-t border-secondary pt-6">
          <h2 className="text-sm font-semibold text-error-primary">Danger zone</h2>
          <Button type="button" color="secondary-destructive" className="w-max" onClick={() => dispatch(groupDeleteDialogOpened(groupId))}>
            Delete group
          </Button>
        </div>
      </Can>

      <ConfirmDialog
        isOpen={dialog?.type === "delete"}
        onOpenChange={(open) => !open && dispatch(groupDialogClosed())}
        title="Delete this group?"
        description="Recipients in this group will no longer be associated with it. This can't be undone."
        isLoading={isDeleting}
        onConfirm={onDelete}
      />
    </div>
  );
}
