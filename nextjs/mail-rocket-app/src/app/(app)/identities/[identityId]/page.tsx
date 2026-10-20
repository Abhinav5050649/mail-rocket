"use client";

import { use, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { DeleteSection } from "@/components/resources/DeleteSection";
import { CopyButton } from "@/components/ui/copy-button";
import { FactList, PageHeader, SettingsSection } from "@/components/ui/page";
import { IdentityStatusPill } from "@/components/ui/pill";
import { ErrorNotice, Notice, Skeleton } from "@/components/ui/feedback";
import { useAbility } from "@/hooks/useAbility";
import { useAppDispatch, useAppSelector } from "@/lib/redux/hooks";
import { formatDateTime } from "@/lib/format";
import {
  useGetIdentityQuery,
  useDeleteIdentityMutation,
  selectIdentityDialog,
  identityDeleteDialogOpened,
  identityDialogClosed,
} from "@/features/identities";
import type { IdentityVerificationRecord } from "@/types/resources";

/** One DNS record as three copyable cells. Values wrap rather than truncate, so nothing is hidden. */
function RecordRow({ record }: { record: IdentityVerificationRecord }) {
  return (
    <li className="grid gap-x-4 gap-y-1 border-b border-rule py-3 last:border-b-0 md:grid-cols-[64px_minmax(0,1fr)_minmax(0,1.2fr)] md:items-start">
      <span className="text-xs font-medium text-muted md:pt-1.5 md:text-sm md:text-text">{record.type}</span>
      {[
        { label: "Name", value: record.name },
        { label: "Value", value: record.value },
      ].map((cell) => (
        <span key={cell.label} className="flex min-w-0 items-start gap-1">
          <span className="w-12 shrink-0 pt-1.5 text-xs text-muted md:hidden">{cell.label}</span>
          <code className="min-w-0 flex-1 rounded-control bg-raised px-2 py-1 text-[13px] leading-5 break-all text-text">{cell.value}</code>
          <CopyButton value={cell.value} label={`Copy ${cell.label.toLowerCase()}`} />
        </span>
      ))}
    </li>
  );
}

export default function IdentityDetailPage({ params }: { params: Promise<{ identityId: string }> }) {
  const { identityId } = use(params);
  const router = useRouter();
  const dispatch = useAppDispatch();
  const dialog = useAppSelector(selectIdentityDialog);
  const { ability } = useAbility();

  // Poll once a minute while SES is still verifying, so the page flips to verified on its own.
  const [pollingInterval, setPollingInterval] = useState(60_000);
  const { data: identity, isLoading, error, refetch } = useGetIdentityQuery({ identityId }, { pollingInterval, skipPollingIfUnfocused: true });
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (identity?.status === "active") setPollingInterval(0);
  }, [identity?.status]);
  const [deleteIdentity, { isLoading: isDeleting, error: deleteError }] = useDeleteIdentityMutation();

  const records = identity?.verification_records ?? [];
  const isDomain = identity?.type === "domain";

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        back={{ href: "/identities", label: "Identities" }}
        title={identity ? identity.identity : isLoading ? <Skeleton className="h-7 w-64" /> : "Identity"}
        status={identity && <IdentityStatusPill status={identity.status} />}
        description={identity && (isDomain ? "Domain: campaigns can send from any address on it." : "Email address: campaigns send from this address.")}
      />

      {error ? (
        <ErrorNotice error={error} what="this identity" onRetry={refetch} />
      ) : !identity ? (
        <Skeleton className="h-64 w-full" />
      ) : (
        <div className="flex flex-col">
          {identity.status !== "active" && (
            <Notice className="mb-6" title={isDomain ? "Add these DNS records to verify the domain" : "Confirm the email SES sent to this address"}>
              {isDomain
                ? "DNS changes can take up to 72 hours to propagate. Mail Rocket checks with SES every 5 minutes; this page refreshes itself."
                : "Open the message from Amazon Web Services and click its link. Mail Rocket checks with SES every 5 minutes."}
            </Notice>
          )}

          {isDomain && (
            <SettingsSection
              wide
              title="DNS records"
              description={
                <>
                  One TXT record proves you own the domain; three CNAME records sign outgoing mail with DKIM.
                  {identity.status === "active" && " Keep them in place: removing them stops verification."}
                </>
              }
            >
              {records.length > 0 ? (
                <ul className="flex flex-col">
                  <li className="hidden grid-cols-[64px_minmax(0,1fr)_minmax(0,1.2fr)] gap-x-4 pb-2 text-xs text-muted md:grid" aria-hidden>
                    <span>Type</span>
                    <span>Name</span>
                    <span>Value</span>
                  </li>
                  {records.map((record) => (
                    <RecordRow key={`${record.type}-${record.name}`} record={record} />
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-muted">SES returned no records for this domain.</p>
              )}
            </SettingsSection>
          )}

          <SettingsSection title="Details">
            <FactList
              items={[
                { label: "Type", value: isDomain ? "Domain" : "Email address" },
                { label: "Added", value: <span className="tabular">{formatDateTime(identity.created_at)}</span> },
                { label: "Last change", value: <span className="tabular">{formatDateTime(identity.updated_at ?? identity.created_at)}</span> },
                {
                  label: "ID",
                  value: (
                    <span className="inline-flex items-center gap-1">
                      <code className="text-xs text-muted">{identity.id.slice(0, 8)}…</code>
                      <CopyButton value={identity.id} label="Copy identity ID" />
                    </span>
                  ),
                },
              ]}
            />
          </SettingsSection>

          {ability.can("delete", "Identity") && (
            <DeleteSection
              noun="identity"
              name={identity.identity}
              consequence="Campaigns that send from it will need another sender before they can go out."
              isOpen={dialog?.type === "delete"}
              onOpenChange={(open) => dispatch(open ? identityDeleteDialogOpened(identityId) : identityDialogClosed())}
              isDeleting={isDeleting}
              error={deleteError}
              onConfirm={async () => {
                const result = await deleteIdentity({ identityId });
                if (!("error" in result)) {
                  dispatch(identityDialogClosed());
                  router.push("/identities");
                }
              }}
            />
          )}
        </div>
      )}
    </div>
  );
}
