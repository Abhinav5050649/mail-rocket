"use client";

import { useState } from "react";
import { Plus, Trash01, Upload01 } from "@untitledui/icons";
import { Button } from "@/components/ui/button";
import { DataTable, Pagination, SelectionBar } from "@/components/ui/data-table";
import { Dash, PageHeader } from "@/components/ui/page";
import { EmptyState, FormError, Notice } from "@/components/ui/feedback";
import { ConfirmDialog } from "@/components/ui/overlay";
import { Pill } from "@/components/ui/pill";
import { Can } from "@/components/auth/Can";
import { useAbility } from "@/hooks/useAbility";
import { usePaginationParams } from "@/hooks/usePaginationParams";
import { useGroupNames } from "@/hooks/useLookups";
import { useRowSelection } from "@/hooks/useRowSelection";
import { useDeleteSubscribersMutation, useGetSubscribersQuery, type SubscriberBulkDeleteResult } from "@/features/subscribers";
import { fullName } from "@/lib/format";
import type { Subscriber } from "@/types/resources";

/** "1 subscriber" / "3 subscribers". */
const subscribersLabel = (count: number) => `${count} subscriber${count === 1 ? "" : "s"}`;

export default function SubscribersPage() {
  const { limit, offset, setOffset } = usePaginationParams();
  const { data: subscribers, isLoading, error, refetch } = useGetSubscribersQuery({ limit, offset });
  const { groupNames } = useGroupNames();
  const { ability } = useAbility();
  // Ticking rows only makes sense for a key that can delete them.
  const canDelete = ability.can("delete", "Subscriber");
  const selection = useRowSelection(subscribers);
  const [confirming, setConfirming] = useState(false);
  const [deleteSubscribers, { isLoading: isDeleting, error: deleteError, reset: resetDelete }] = useDeleteSubscribersMutation();
  // The last bulk delete's outcome, kept to explain any subscribers it couldn't delete.
  const [lastDelete, setLastDelete] = useState<SubscriberBulkDeleteResult>();

  /** Deletes the ticked subscribers, then clears the selection and closes the dialog. */
  const deleteSelected = async () => {
    const result = await deleteSubscribers({ subscriberIds: [...selection.selected] });
    if (result.data) {
      setLastDelete(result.data);
      selection.clear();
      setConfirming(false);
    }
  };

  const action = (
    <Can I="create" a="Subscriber">
      <div className="flex flex-wrap gap-2">
        <Button href="/subscribers/import" variant="secondary" icon={Upload01}>
          Import CSV
        </Button>
        <Button href="/subscribers/new" variant="primary" icon={Plus}>
          Add subscriber
        </Button>
      </div>
    </Can>
  );

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Subscribers" description="Everyone a campaign can send to, through a group or picked individually." actions={action} />
      {lastDelete && lastDelete.blocked_ids.length > 0 && (
        <Notice
          title={`${subscribersLabel(lastDelete.blocked_ids.length)} not deleted`}
          action={
            <Button size="sm" variant="ghost" onClick={() => setLastDelete(undefined)}>
              Dismiss
            </Button>
          }
        >
          A campaign has already been sent to {lastDelete.blocked_ids.length === 1 ? "them" : "these subscribers"}, and its send history keeps them.{" "}
          {lastDelete.deleted_ids.length > 0 && `${subscribersLabel(lastDelete.deleted_ids.length)} deleted.`}
        </Notice>
      )}
      <div>
        {canDelete && (
          <SelectionBar count={selection.selected.size} visibleCount={selection.visibleCount} onSelectAll={selection.selectAll} onClear={selection.clear}>
            <Button
              size="sm"
              variant="danger"
              icon={Trash01}
              onClick={() => {
                resetDelete();
                setConfirming(true);
              }}
            >
              Delete {subscribersLabel(selection.selected.size)}
            </Button>
          </SelectionBar>
        )}
        <DataTable<Subscriber>
          noun="subscribers"
          rows={subscribers}
          isLoading={isLoading}
          error={error}
          onRetry={refetch}
          href={(subscriber) => `/subscribers/${subscriber.id}`}
          selection={
            canDelete
              ? { selected: selection.selected, onChange: selection.setSelected, rowLabel: (subscriber) => `Select ${subscriber.email_id ?? "subscriber"}` }
              : undefined
          }
          columns={[
            {
              header: "Email",
              cell: (subscriber) => (
                <span className="inline-flex items-center gap-2">
                  {subscriber.email_id}
                  {subscriber.unsubscribed_at && <Pill tone="warning">Unsubscribed</Pill>}
                </span>
              ),
              className: "w-[32%]",
            },
            { header: "Name", cell: (subscriber) => fullName(subscriber) ?? <Dash /> },
            { header: "Groups", cell: (subscriber) => groupNames(subscriber.group_ids) ?? <Dash />, className: "text-muted" },
          ]}
          mobile={{
            title: (subscriber) => subscriber.email_id,
            subtitle: (subscriber) =>
              [subscriber.unsubscribed_at && "Unsubscribed", fullName(subscriber), groupNames(subscriber.group_ids)].filter(Boolean).join(" · ") || "No name",
          }}
          empty={<EmptyState title="No subscribers yet" action={action}>Add the people a campaign sends to. Put them in a group to send to many at once.</EmptyState>}
        />
        <Pagination
          noun="subscribers"
          limit={limit}
          offset={offset}
          rowCount={subscribers?.length ?? 0}
          onOffsetChange={(next) => {
            // The selection belongs to the page being left.
            selection.clear();
            setOffset(next);
          }}
        />
      </div>
      <ConfirmDialog
        isOpen={confirming}
        onOpenChange={setConfirming}
        title={`Delete ${subscribersLabel(selection.selected.size)}?`}
        description={
          <div className="flex flex-col gap-3">
            <p>They&apos;re removed from every group and campaign. Anyone a campaign has already been sent to is kept, along with their send history.</p>
            <FormError error={deleteError} />
          </div>
        }
        confirmLabel={`Delete ${subscribersLabel(selection.selected.size)}`}
        isLoading={isDeleting}
        onConfirm={deleteSelected}
      />
    </div>
  );
}
