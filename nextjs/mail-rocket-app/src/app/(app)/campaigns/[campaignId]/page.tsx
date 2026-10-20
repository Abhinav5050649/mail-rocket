"use client";

import { use } from "react";
import { useRouter } from "next/navigation";
import { CampaignForm } from "@/components/campaigns/CampaignForm";
import { CampaignStatusChip } from "@/components/campaigns/CampaignStatusChip";
import { ConfirmDialog } from "@/components/data/ConfirmDialog";
import { Can } from "@/components/auth/Can";
import { Button } from "@/components/base/buttons/button";
import { LoadingIndicator } from "@/components/application/loading-indicator/loading-indicator";
import type { CampaignFormValues } from "@/lib/validation/campaignSchema";
import { useAppDispatch, useAppSelector } from "@/lib/redux/hooks";
import {
  useGetCampaignQuery,
  useUpdateCampaignMutation,
  useDeleteCampaignMutation,
  selectCampaignDialog,
  campaignDeleteDialogOpened,
  campaignDialogClosed,
} from "@/features/campaigns";

export default function CampaignOverviewPage({ params }: { params: Promise<{ campaignId: string }> }) {
  const { campaignId } = use(params);
  const router = useRouter();
  const dispatch = useAppDispatch();
  const dialog = useAppSelector(selectCampaignDialog);

  const { data: campaign, isLoading } = useGetCampaignQuery({ campaignId });
  const [updateCampaign, { isLoading: isSaving, error: updateError }] = useUpdateCampaignMutation();
  const [deleteCampaign, { isLoading: isDeleting }] = useDeleteCampaignMutation();

  const onSubmit = (values: CampaignFormValues) => {
    updateCampaign({ campaignId, ...values, identity_id: values.identity_id || undefined });
  };

  const onDelete = async () => {
    const result = await deleteCampaign({ campaignId });
    if (!("error" in result)) {
      router.push(`/campaigns`);
    }
  };

  if (isLoading || !campaign) {
    return (
      <div className="flex justify-center py-16">
        <LoadingIndicator size="sm" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-8">
      <div className="flex items-center gap-3">
        <CampaignStatusChip status={campaign.status} />
        {campaign.failure_reason && <span className="text-sm text-error-primary">{campaign.failure_reason}</span>}
      </div>

      <Can I="update" a="Campaign">
        <CampaignForm mode="edit" initialData={campaign} onSubmit={onSubmit} isSubmitting={isSaving} error={updateError} />
      </Can>

      <Can I="delete" a="Campaign">
        <div className="flex flex-col gap-3 border-t border-secondary pt-6">
          <h2 className="text-sm font-semibold text-error-primary">Danger zone</h2>
          <Button type="button" color="secondary-destructive" className="w-max" onClick={() => dispatch(campaignDeleteDialogOpened(campaignId))}>
            Delete campaign
          </Button>
        </div>
      </Can>

      <ConfirmDialog
        isOpen={dialog?.type === "delete"}
        onOpenChange={(open) => !open && dispatch(campaignDialogClosed())}
        title="Delete this campaign?"
        description="This permanently removes the campaign along with its templates, groups, and recipients. This can't be undone."
        isLoading={isDeleting}
        onConfirm={onDelete}
      />
    </div>
  );
}
