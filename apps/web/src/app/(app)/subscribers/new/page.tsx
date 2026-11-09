"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { SubscriberForm } from "@/components/subscribers/SubscriberForm";
import { PageHeader } from "@/components/ui/page";
import { useCreateSubscriberMutation } from "@/features/subscribers";

export default function NewSubscriberPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const campaignId = searchParams.get("campaignId") ?? undefined;
  const groupId = searchParams.get("groupId") ?? undefined;
  const [createSubscriber, { isLoading, error }] = useCreateSubscriberMutation();
  const back =
    campaignId && groupId
      ? `/campaigns/${campaignId}/groups/${groupId}/subscribers`
      : campaignId
        ? `/campaigns/${campaignId}/subscribers`
        : groupId
          ? `/groups/${groupId}`
          : "/subscribers";

  return (
    <div className="flex flex-col gap-6">
      <PageHeader back={{ href: back, label: campaignId ? "Campaign" : groupId ? "Group" : "Subscribers" }} title="Add subscriber" />
      <SubscriberForm
        mode="create"
        defaultCampaignId={campaignId}
        defaultGroupId={groupId}
        isSubmitting={isLoading}
        error={error}
        onCancel={() => router.push(back)}
        onSubmit={async (values) => {
          const result = await createSubscriber({ ...values, campaign_id: values.campaign_id || undefined });
          if (result.data) router.push(`/subscribers/${result.data.id}`);
        }}
      />
    </div>
  );
}
