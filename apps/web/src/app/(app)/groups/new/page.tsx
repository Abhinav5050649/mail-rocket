"use client";

import { useRouter } from "next/navigation";
import { GroupForm } from "@/components/groups/GroupForm";
import { PageHeader } from "@/components/ui/page";
import { useCreateGroupMutation } from "@/features/groups";

/** Adds a group to the library; campaigns then pick it on their own form. */
export default function NewGroupPage() {
  const router = useRouter();
  const [createGroup, { isLoading, error }] = useCreateGroupMutation();

  return (
    <div className="flex flex-col gap-6">
      <PageHeader back={{ href: "/groups", label: "Groups" }} title="New group" />
      <GroupForm
        mode="create"
        isSubmitting={isLoading}
        error={error}
        onCancel={() => router.push("/groups")}
        onSubmit={async (values) => {
          const result = await createGroup(values);
          if (result.data) router.push(`/groups/${result.data.id}`);
        }}
      />
    </div>
  );
}
