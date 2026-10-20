"use client";

import { useRouter } from "next/navigation";
import { CampaignForm } from "@/components/campaigns/CampaignForm";
import { PageHeader } from "@/components/ui/page";
import { useCreateCampaignMutation } from "@/features/campaigns";

export default function NewCampaignPage() {
  const router = useRouter();
  const [createCampaign, { isLoading, error }] = useCreateCampaignMutation();

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        back={{ href: "/campaigns", label: "Campaigns" }}
        title="New campaign"
        description="Templates, groups and recipients are linked from the campaign once it exists."
      />
      <CampaignForm
        mode="create"
        isSubmitting={isLoading}
        error={error}
        onCancel={() => router.push("/campaigns")}
        onSubmit={async (values) => {
          const result = await createCampaign({ ...values, start_time: values.start_time ?? undefined });
          if (result.data) router.push(`/campaigns/${result.data.id}`);
        }}
      />
    </div>
  );
}
