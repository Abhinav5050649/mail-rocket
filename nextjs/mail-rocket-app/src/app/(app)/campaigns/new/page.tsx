"use client";

import { useRouter } from "next/navigation";
import { CampaignForm } from "@/components/campaigns/CampaignForm";
import type { CampaignFormValues } from "@/lib/validation/campaignSchema";
import { useCreateCampaignMutation } from "@/features/campaigns";

export default function NewCampaignPage() {
  const router = useRouter();
  const [createCampaign, { isLoading, error }] = useCreateCampaignMutation();

  const onSubmit = async (values: CampaignFormValues) => {
    const result = await createCampaign({ ...values, identity_id: values.identity_id || undefined });
    if (result.data) {
      router.push(`/campaigns/${result.data.id}`);
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-xl font-semibold text-primary">New campaign</h1>
      <CampaignForm
        mode="create"
       
        onSubmit={onSubmit}
        isSubmitting={isLoading}
        error={error}
        onCancel={() => router.push(`/campaigns`)}
      />
    </div>
  );
}
