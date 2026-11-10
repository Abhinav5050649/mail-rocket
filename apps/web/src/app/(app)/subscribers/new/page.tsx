"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { SubscriberForm } from "@/components/subscribers/SubscriberForm";
import { PageHeader } from "@/components/ui/page";
import { useCreateSubscriberMutation } from "@/features/subscribers";

export default function NewSubscriberPage() {
  const router = useRouter();
  // Opened from a group's page, the new subscriber starts in that group and returns there.
  const groupId = useSearchParams().get("groupId") ?? undefined;
  const [createSubscriber, { isLoading, error }] = useCreateSubscriberMutation();
  const back = groupId ? `/groups/${groupId}` : "/subscribers";

  return (
    <div className="flex flex-col gap-6">
      <PageHeader back={{ href: back, label: groupId ? "Group" : "Subscribers" }} title="Add subscriber" />
      <SubscriberForm
        mode="create"
        defaultGroupId={groupId}
        isSubmitting={isLoading}
        error={error}
        onCancel={() => router.push(back)}
        onSubmit={async (values) => {
          const result = await createSubscriber(values);
          if (result.data) router.push(`/subscribers/${result.data.id}`);
        }}
      />
    </div>
  );
}
