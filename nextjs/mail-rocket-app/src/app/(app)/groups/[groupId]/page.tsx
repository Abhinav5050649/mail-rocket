"use client";

import { use, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Plus } from "@untitledui/icons";
import { GroupForm } from "@/components/groups/GroupForm";
import { DeleteSection } from "@/components/resources/DeleteSection";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/ui/data-table";
import { Dash, PageHeader, SettingsSection } from "@/components/ui/page";
import { EmptyState, ErrorNotice, FormError, Skeleton } from "@/components/ui/feedback";
import { Select } from "@/components/ui/field";
import { Can } from "@/components/auth/Can";
import { useAbility } from "@/hooks/useAbility";
import { useCampaignNames } from "@/hooks/useLookups";
import { useAppDispatch, useAppSelector } from "@/lib/redux/hooks";
import { fullName } from "@/lib/format";
import { useAddRecipientToGroupMutation, useGetGroupRecipientsQuery, useGetRecipientsQuery, useRemoveRecipientFromGroupMutation } from "@/features/recipients";
import {
  useGetGroupQuery,
  useUpdateGroupMutation,
  useDeleteGroupMutation,
  selectGroupDialog,
  groupDeleteDialogOpened,
  groupDialogClosed,
} from "@/features/groups";
import type { Recipient } from "@/types/resources";

/** Picks an existing recipient who isn't in the group yet and adds them. */
function AddExistingRecipient({ groupId, memberIds }: { groupId: string; memberIds: Set<string> }) {
  const [recipientId, setRecipientId] = useState("");
  const { data: recipients } = useGetRecipientsQuery({ limit: 100 });
  const [addRecipient, { isLoading, error }] = useAddRecipientToGroupMutation();
  const candidates = (recipients ?? []).filter((recipient) => !memberIds.has(recipient.id));
  if (recipients && candidates.length === 0) return null;

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <Select
          aria-label="Recipient to add"
          size="sm"
          className="sm:max-w-sm"
          value={recipientId}
          onChange={(event) => setRecipientId(event.target.value)}
          options={[
            { label: recipients ? "Add an existing recipient…" : "Loading recipients…", value: "" },
            ...candidates.map((recipient) => ({ label: [recipient.email_id, fullName(recipient)].filter(Boolean).join(" · "), value: recipient.id })),
          ]}
        />
        <Button
          size="sm"
          icon={Plus}
          disabled={!recipientId}
          isLoading={isLoading}
          onClick={async () => {
            const result = await addRecipient({ groupId, recipientId });
            if (!("error" in result)) setRecipientId("");
          }}
        >
          Add to group
        </Button>
      </div>
      <FormError error={error} />
    </div>
  );
}

/** The group's members, with remove and add controls for keys that can edit the group. */
function GroupRecipients({ groupId }: { groupId: string }) {
  const { ability } = useAbility();
  const canEdit = ability.can("update", "Group");
  const { data: recipients, isLoading, error, refetch } = useGetGroupRecipientsQuery({ groupId, limit: 100 });
  const [removeRecipient, { isLoading: isRemoving, originalArgs }] = useRemoveRecipientFromGroupMutation();
  const memberIds = new Set((recipients ?? []).map((recipient) => recipient.id));

  const create = (
    <Can I="create" a="Recipient">
      <Button href={`/recipients/new?groupId=${groupId}`} size="sm" icon={Plus} variant="ghost">
        New recipient
      </Button>
    </Can>
  );

  return (
    <div className="flex flex-col gap-4">
      {canEdit && <AddExistingRecipient groupId={groupId} memberIds={memberIds} />}
      <DataTable<Recipient>
        noun="members"
        rows={recipients}
        isLoading={isLoading}
        error={error}
        onRetry={refetch}
        skeletonRows={3}
        href={(recipient) => `/recipients/${recipient.id}`}
        columns={[
          { header: "Email", cell: (recipient) => recipient.email_id, className: "w-[45%]" },
          { header: "Name", cell: (recipient) => fullName(recipient) ?? <Dash /> },
          {
            header: "",
            align: "right",
            className: "w-28",
            cell: (recipient) =>
              canEdit && (
                <Button
                  size="sm"
                  variant="ghost"
                  isLoading={isRemoving && originalArgs?.recipientId === recipient.id}
                  onClick={() => removeRecipient({ groupId, recipientId: recipient.id })}
                >
                  Remove
                </Button>
              ),
          },
        ]}
        mobile={{
          title: (recipient) => recipient.email_id,
          subtitle: (recipient) => fullName(recipient) ?? "No name",
          trailing: (recipient) =>
            canEdit && (
              <Button size="sm" variant="ghost" onClick={() => removeRecipient({ groupId, recipientId: recipient.id })}>
                Remove
              </Button>
            ),
        }}
        empty={<EmptyState title="No one in this group yet" action={create}>Add existing recipients above, or create a new one in this group.</EmptyState>}
      />
      {recipients && recipients.length > 0 && <div>{create}</div>}
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
            <SettingsSection
              wide
              title="Members"
              description="Recipients can be in several groups. Removing someone here keeps them and their other groups. First 100 shown."
            >
              <GroupRecipients groupId={groupId} />
            </SettingsSection>
          )}
          {ability.can("delete", "Group") && (
            <DeleteSection
              noun="group"
              name={group.name || "Untitled group"}
              consequence="Permanently removes the group. Its members are kept, just no longer in this group."
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
