"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { GroupForm } from "@/components/groups/GroupForm";
import { PageHeader } from "@/components/ui/page";
import { useCreateGroupMutation } from "@/features/groups";

export default function NewGroupPage() {
  const router = useRouter();
  const campaignId = useSearchParams().get("campaignId") ?? undefined;
  const [createGroup, { isLoading, error }] = useCreateGroupMutation();
  const back = campaignId ? `/campaigns/${campaignId}/groups` : "/groups";

  return (
    <div className="flex flex-col gap-6">
      <PageHeader back={{ href: back, label: campaignId ? "Campaign" : "Groups" }} title="New group" />
      <GroupForm
        mode="create"
        defaultCampaignId={campaignId}
        isSubmitting={isLoading}
        error={error}
        onCancel={() => router.push(back)}
        onSubmit={async (values) => {
          const result = await createGroup({ ...values, campaign_id: values.campaign_id || undefined });
          if (result.data) router.push(`/groups/${result.data.id}`);
        }}
      />
    </div>
  );
}
