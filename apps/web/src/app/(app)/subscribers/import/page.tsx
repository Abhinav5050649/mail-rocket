"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { SubscriberImportForm } from "@/components/subscribers/SubscriberImportForm";
import { PageHeader } from "@/components/ui/page";

export default function ImportSubscribersPage() {
  const router = useRouter();
  // Opened from a group's page, the import starts with that group picked and returns there.
  const groupId = useSearchParams().get("groupId") ?? undefined;
  const back = groupId ? `/groups/${groupId}` : "/subscribers";

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        back={{ href: back, label: groupId ? "Group" : "Subscribers" }}
        title="Import subscribers"
        description="Add many people at once from a CSV file and put them in groups. Emails already on your list aren't duplicated."
      />
      <SubscriberImportForm defaultGroupId={groupId} onDone={() => router.push(back)} onCancel={() => router.push(back)} />
    </div>
  );
}
