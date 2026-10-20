"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { TemplateForm } from "@/components/templates/TemplateForm";
import { PageHeader } from "@/components/ui/page";
import { useCreateTemplateMutation } from "@/features/templates";

export default function NewTemplatePage() {
  const router = useRouter();
  const campaignId = useSearchParams().get("campaignId") ?? undefined;
  const [createTemplate, { isLoading, error }] = useCreateTemplateMutation();
  const back = campaignId ? `/campaigns/${campaignId}/templates` : "/templates";

  return (
    <div className="flex flex-col gap-6">
      <PageHeader back={{ href: back, label: campaignId ? "Campaign" : "Templates" }} title="New template" />
      <TemplateForm
        mode="create"
        defaultCampaignId={campaignId}
        isSubmitting={isLoading}
        error={error}
        onCancel={() => router.push(back)}
        onSubmit={async (values) => {
          const result = await createTemplate({ ...values, campaign_id: values.campaign_id || undefined });
          if (result.data) router.push(`/templates/${result.data.id}`);
        }}
      />
    </div>
  );
}
