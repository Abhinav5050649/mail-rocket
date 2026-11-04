"use client";

import { use } from "react";
import { useRouter } from "next/navigation";
import { CampaignForm } from "@/components/campaigns/CampaignForm";
import { DeleteSection } from "@/components/resources/DeleteSection";
import { CopyButton } from "@/components/ui/copy-button";
import { Dash, FactList } from "@/components/ui/page";
import { Skeleton } from "@/components/ui/feedback";
import { useAbility } from "@/hooks/useAbility";
import { useIdentityNames } from "@/hooks/useLookups";
import { useAppDispatch, useAppSelector } from "@/lib/redux/hooks";
import { formatDateTime } from "@/lib/format";
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
  const { ability } = useAbility();
  const { identityName } = useIdentityNames();

  const { data: campaign } = useGetCampaignQuery({ campaignId });
  const [updateCampaign, { isLoading: isSaving, error: updateError }] = useUpdateCampaignMutation();
  const [deleteCampaign, { isLoading: isDeleting, error: deleteError }] = useDeleteCampaignMutation();

  if (!campaign) {
    return (
      <div className="flex flex-col gap-3">
        <Skeleton className="h-28 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      {campaign.status === "failed" && (
        <div role="alert" className="mb-4 rounded-card bg-(--pill-negative-bg) px-4 py-3 text-sm text-(--pill-negative-ink)">
          <p className="font-medium">The send failed</p>
          <p>{campaign.failure_reason || "No reason was recorded."}</p>
        </div>
      )}

      <FactList
        className="mb-4 sm:grid sm:grid-cols-2 sm:gap-x-8 lg:grid-cols-3 [&>div]:sm:border-b-0"
        items={[
          { label: "Start time", value: campaign.start_time ? <span className="tabular">{formatDateTime(campaign.start_time)}</span> : <Dash /> },
          { label: "Sender", value: identityName(campaign.identity_id) ?? <Dash /> },
          { label: "Subject", value: campaign.subject || <Dash /> },
          { label: "Created", value: <span className="tabular">{formatDateTime(campaign.created_at)}</span> },
          { label: "Updated", value: campaign.updated_at ? <span className="tabular">{formatDateTime(campaign.updated_at)}</span> : <Dash /> },
          {
            label: "ID",
            value: (
              <span className="inline-flex items-center gap-1">
                <code className="text-xs text-muted">{campaign.id.slice(0, 8)}…</code>
                <CopyButton value={campaign.id} label="Copy campaign ID" />
              </span>
            ),
          },
        ]}
      />

      <CampaignForm
        // Re-mount when the saved campaign changes so the form shows what the server stored.
        key={campaign.updated_at ?? campaign.created_at}
        mode="edit"
        initialData={campaign}
        readOnly={!ability.can("update", "Campaign")}
        isSubmitting={isSaving}
        error={updateError}
        onSubmit={(values) => updateCampaign({ campaignId, ...values })}
      />

      {ability.can("delete", "Campaign") && campaign.status !== "sending" && (
        <DeleteSection
          noun="campaign"
          name={campaign.name || "Untitled campaign"}
          consequence="Permanently removes the campaign and cancels its scheduled send. Its templates, groups and recipients stay, unlinked; its delivery history is removed."
          isOpen={dialog?.type === "delete"}
          onOpenChange={(open) => dispatch(open ? campaignDeleteDialogOpened(campaignId) : campaignDialogClosed())}
          isDeleting={isDeleting}
          error={deleteError}
          onConfirm={async () => {
            const result = await deleteCampaign({ campaignId });
            if (!("error" in result)) {
              dispatch(campaignDialogClosed());
              router.push("/campaigns");
            }
          }}
        />
      )}
    </div>
  );
}
