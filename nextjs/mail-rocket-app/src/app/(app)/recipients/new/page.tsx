"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { RecipientForm } from "@/components/recipients/RecipientForm";
import { PageHeader } from "@/components/ui/page";
import { useCreateRecipientMutation } from "@/features/recipients";

export default function NewRecipientPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const campaignId = searchParams.get("campaignId") ?? undefined;
  const groupId = searchParams.get("groupId") ?? undefined;
  const [createRecipient, { isLoading, error }] = useCreateRecipientMutation();
  const back =
    campaignId && groupId
      ? `/campaigns/${campaignId}/groups/${groupId}/recipients`
      : campaignId
        ? `/campaigns/${campaignId}/recipients`
        : groupId
          ? `/groups/${groupId}`
          : "/recipients";

  return (
    <div className="flex flex-col gap-6">
      <PageHeader back={{ href: back, label: campaignId ? "Campaign" : groupId ? "Group" : "Recipients" }} title="Add recipient" />
      <RecipientForm
        mode="create"
        defaultCampaignId={campaignId}
        defaultGroupId={groupId}
        isSubmitting={isLoading}
        error={error}
        onCancel={() => router.push(back)}
        onSubmit={async (values) => {
          const result = await createRecipient({ ...values, campaign_id: values.campaign_id || undefined });
          if (result.data) router.push(`/recipients/${result.data.id}`);
        }}
      />
    </div>
  );
}
