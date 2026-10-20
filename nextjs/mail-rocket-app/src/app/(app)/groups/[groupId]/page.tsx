"use client";

import { use } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Plus } from "@untitledui/icons";
import { GroupForm } from "@/components/groups/GroupForm";
import { DeleteSection } from "@/components/resources/DeleteSection";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/ui/data-table";
import { Dash, PageHeader, SettingsSection } from "@/components/ui/page";
import { EmptyState, ErrorNotice, Skeleton } from "@/components/ui/feedback";
import { Can } from "@/components/auth/Can";
import { useAbility } from "@/hooks/useAbility";
import { useCampaignNames } from "@/hooks/useLookups";
import { useAppDispatch, useAppSelector } from "@/lib/redux/hooks";
import { fullName } from "@/lib/format";
import { useGetGroupRecipientsQuery } from "@/features/recipients";
import {
  useGetGroupQuery,
  useUpdateGroupMutation,
  useDeleteGroupMutation,
  selectGroupDialog,
  groupDeleteDialogOpened,
  groupDialogClosed,
} from "@/features/groups";
import type { Recipient } from "@/types/resources";

/** The group's recipients. The API lists them only through the group's campaign. */
function GroupRecipients({ groupId, campaignId }: { groupId: string; campaignId: string }) {
  const { data: recipients, isLoading, error, refetch } = useGetGroupRecipientsQuery({ campaignId, groupId, limit: 50 });
  const add = (
    <Can I="create" a="Recipient">
      <Button href={`/recipients/new?campaignId=${campaignId}&groupId=${groupId}`} size="sm" icon={Plus}>
        Add recipient
      </Button>
    </Can>
  );
  return (
    <div className="flex flex-col gap-3">
      <DataTable<Recipient>
        noun="recipients"
        rows={recipients}
        isLoading={isLoading}
        error={error}
        onRetry={refetch}
        skeletonRows={3}
        href={(recipient) => `/recipients/${recipient.id}`}
        columns={[
          { header: "Email", cell: (recipient) => recipient.email_id, className: "w-[55%]" },
          { header: "Name", cell: (recipient) => fullName(recipient) ?? <Dash /> },
        ]}
        mobile={{ title: (recipient) => recipient.email_id, subtitle: (recipient) => fullName(recipient) ?? "No name" }}
        empty={<EmptyState title="No one in this group yet" action={add} />}
      />
      {recipients && recipients.length > 0 && <div>{add}</div>}
    </div>
  );
}

export default function GroupDetailPage({ params }: { params: Promise<{ groupId: string }> }) {
  const { groupId } = use(params);
  const router = useRouter();
  const dispatch = useAppDispatch();
  const dialog = useAppSelector(selectGroupDialog);
  const { ability } = useAbility();
  const { campaignName } = useCampaignNames();

  const { data: group, isLoading, error, refetch } = useGetGroupQuery({ groupId });
  const [updateGroup, { isLoading: isSaving, error: updateError }] = useUpdateGroupMutation();
  const [deleteGroup, { isLoading: isDeleting, error: deleteError }] = useDeleteGroupMutation();
  const campaign = campaignName(group?.campaign_id);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        back={{ href: "/groups", label: "Groups" }}
        title={group ? group.name || "Untitled group" : isLoading ? <Skeleton className="h-7 w-56" /> : "Group"}
        description={
          group &&
          (group.campaign_id ? (
            <>
              Sent to by{" "}
              <Link href={`/campaigns/${group.campaign_id}/groups`} className="text-text hover:underline">
                {campaign ?? "its campaign"}
              </Link>
              .
            </>
          ) : (
            "Not linked to a campaign."
          ))
        }
      />

      {error ? (
        <ErrorNotice error={error} what="this group" onRetry={refetch} />
      ) : !group ? (
        <Skeleton className="h-48 w-full" />
      ) : (
        <div className="flex flex-col">
          <GroupForm
            key={group.updated_at ?? group.created_at}
            mode="edit"
            initialData={group}
            readOnly={!ability.can("update", "Group")}
            isSubmitting={isSaving}
            error={updateError}
            onSubmit={(values) => updateGroup({ groupId, ...values, campaign_id: values.campaign_id || undefined })}
          />
          {ability.can("read", "Recipient") && (
            <SettingsSection title="Recipients" description="First 50 shown.">
              {group.campaign_id ? (
                <GroupRecipients groupId={groupId} campaignId={group.campaign_id} />
              ) : (
                <p className="text-sm text-muted">Link the group to a campaign to list its recipients here.</p>
              )}
            </SettingsSection>
          )}
          {ability.can("delete", "Group") && (
            <DeleteSection
              noun="group"
              name={group.name || "Untitled group"}
              consequence="Permanently removes the group. Move its recipients to another group first."
              isOpen={dialog?.type === "delete"}
              onOpenChange={(open) => dispatch(open ? groupDeleteDialogOpened(groupId) : groupDialogClosed())}
              isDeleting={isDeleting}
              error={deleteError}
              onConfirm={async () => {
                const result = await deleteGroup({ groupId, campaignId: group.campaign_id ?? undefined });
                if (!("error" in result)) {
                  dispatch(groupDialogClosed());
                  router.push("/groups");
                }
              }}
            />
          )}
        </div>
      )}
    </div>
  );
}
