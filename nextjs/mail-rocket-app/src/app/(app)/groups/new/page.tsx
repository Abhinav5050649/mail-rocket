"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { GroupForm, type GroupFormValues } from "@/components/groups/GroupForm";
import { useCreateGroupMutation } from "@/features/groups";

export default function NewGroupPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const campaignId = searchParams.get("campaignId") ?? undefined;
  const [createGroup, { isLoading, error }] = useCreateGroupMutation();

  const onSubmit = async (values: GroupFormValues) => {
    const result = await createGroup({ ...values, campaign_id: values.campaign_id || undefined });
    if (result.data) {
      router.push(`/groups/${result.data.id}`);
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-xl font-semibold text-primary">New group</h1>
      <GroupForm
        mode="create"
       
        defaultCampaignId={campaignId}
        onSubmit={onSubmit}
        isSubmitting={isLoading}
        error={error}
        onCancel={() => router.push(`/groups`)}
      />
    </div>
  );
}
