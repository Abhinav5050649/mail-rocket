"use client";

import { use } from "react";
import { useRouter } from "next/navigation";
import { SubscriberForm } from "@/components/subscribers/SubscriberForm";
import { DeleteSection } from "@/components/resources/DeleteSection";
import { PageHeader } from "@/components/ui/page";
import { ErrorNotice, Skeleton } from "@/components/ui/feedback";
import { useAbility } from "@/hooks/useAbility";
import { useGroupNames } from "@/hooks/useLookups";
import { useAppDispatch, useAppSelector } from "@/lib/redux/hooks";
import { fullName } from "@/lib/format";
import {
  useGetSubscriberQuery,
  useUpdateSubscriberMutation,
  useDeleteSubscriberMutation,
  selectSubscriberDialog,
  subscriberDeleteDialogOpened,
  subscriberDialogClosed,
} from "@/features/subscribers";

export default function SubscriberDetailPage({ params }: { params: Promise<{ subscriberId: string }> }) {
  const { subscriberId } = use(params);
  const router = useRouter();
  const dispatch = useAppDispatch();
  const dialog = useAppSelector(selectSubscriberDialog);
  const { ability } = useAbility();
  const { groupNames } = useGroupNames();

  const { data: subscriber, isLoading, error, refetch } = useGetSubscriberQuery({ subscriberId });
  const [updateSubscriber, { isLoading: isSaving, error: updateError }] = useUpdateSubscriberMutation();
  const [deleteSubscriber, { isLoading: isDeleting, error: deleteError }] = useDeleteSubscriberMutation();

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        back={{ href: "/subscribers", label: "Subscribers" }}
        title={subscriber ? subscriber.email_id : isLoading ? <Skeleton className="h-7 w-64" /> : "Subscriber"}
        description={
          subscriber && (
            <>
              {[
                fullName(subscriber) ?? "No name on record",
                subscriber.group_ids.length > 0 ? `in ${groupNames(subscriber.group_ids) ?? `${subscriber.group_ids.length} groups`}` : "in no groups",
              ].join(" · ")}
            </>
          )
        }
      />
      {error ? (
        <ErrorNotice error={error} what="this subscriber" onRetry={refetch} />
      ) : !subscriber ? (
        <Skeleton className="h-64 w-full" />
      ) : (
        <div className="flex flex-col">
          <SubscriberForm
            key={subscriber.updated_at ?? subscriber.created_at}
            mode="edit"
            initialData={subscriber}
            readOnly={!ability.can("update", "Subscriber")}
            isSubmitting={isSaving}
            error={updateError}
            onSubmit={(values) => updateSubscriber({ subscriberId, ...values, campaign_id: values.campaign_id || undefined })}
          />
          {ability.can("delete", "Subscriber") && (
            <div className="mt-8 border-t border-border">
              <DeleteSection
                noun="subscriber"
                name={subscriber.email_id ?? "this subscriber"}
                consequence="Permanently removes this person and their group memberships."
                isOpen={dialog?.type === "delete"}
                onOpenChange={(open) => dispatch(open ? subscriberDeleteDialogOpened(subscriberId) : subscriberDialogClosed())}
                isDeleting={isDeleting}
                error={deleteError}
                onConfirm={async () => {
                  const result = await deleteSubscriber({ subscriberId });
                  if (!("error" in result)) {
                    dispatch(subscriberDialogClosed());
                    router.push("/subscribers");
                  }
                }}
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
