"use client";

import { use } from "react";
import { useRouter } from "next/navigation";
import { IdentityStatusBadge } from "@/components/identities/IdentityStatusBadge";
import { ConfirmDialog } from "@/components/data/ConfirmDialog";
import { Can } from "@/components/auth/Can";
import { Button } from "@/components/base/buttons/button";
import { LoadingIndicator } from "@/components/application/loading-indicator/loading-indicator";
import { useAppDispatch, useAppSelector } from "@/lib/redux/hooks";
import {
  useGetIdentityQuery,
  useDeleteIdentityMutation,
  selectIdentityDialog,
  identityDeleteDialogOpened,
  identityDialogClosed,
} from "@/features/identities";

export default function IdentityDetailPage({ params }: { params: Promise<{ identityId: string }> }) {
  const { identityId } = use(params);
  const router = useRouter();
  const dispatch = useAppDispatch();
  const dialog = useAppSelector(selectIdentityDialog);

  const { data: identity, isLoading } = useGetIdentityQuery({ identityId });
  const [deleteIdentity, { isLoading: isDeleting }] = useDeleteIdentityMutation();

  const onDelete = async () => {
    const result = await deleteIdentity({ identityId });
    if (!("error" in result)) {
      router.push(`/identities`);
    }
  };

  if (isLoading || !identity) {
    return (
      <div className="flex justify-center py-16">
        <LoadingIndicator size="sm" />
      </div>
    );
  }

  return (
    <div className="flex max-w-2xl flex-col gap-8">
      <div className="flex flex-col gap-3">
        <div className="flex items-center gap-3">
          <h1 className="text-xl font-semibold text-primary">{identity.identity}</h1>
          <IdentityStatusBadge status={identity.status} />
        </div>
        <p className="text-sm text-tertiary capitalize">{identity.type} identity</p>
      </div>

      {identity.status !== "active" && (
        <p className="rounded-lg bg-warning-primary px-3 py-2 text-sm text-warning-primary ring-1 ring-warning_subtle">
          Verification is still pending. {identity.type === "domain" ? "Add the DNS records below to verify this domain." : "Check your inbox for the SES verification email."}
        </p>
      )}

      {identity.verification_records && identity.verification_records.length > 0 && (
        <div className="flex flex-col gap-3">
          <h2 className="text-sm font-semibold text-primary">DNS records</h2>
          <div className="overflow-hidden rounded-xl bg-primary ring-1 ring-secondary">
            <table className="w-full text-sm">
              <thead className="bg-secondary">
                <tr>
                  <th className="px-4 py-2 text-left text-xs font-semibold text-quaternary">Type</th>
                  <th className="px-4 py-2 text-left text-xs font-semibold text-quaternary">Name</th>
                  <th className="px-4 py-2 text-left text-xs font-semibold text-quaternary">Value</th>
                </tr>
              </thead>
              <tbody>
                {identity.verification_records.map((record, i) => (
                  <tr key={i} className="border-t border-secondary">
                    <td className="px-4 py-2 font-mono text-xs text-tertiary">{record.type}</td>
                    <td className="max-w-48 truncate px-4 py-2 font-mono text-xs text-tertiary">{record.name}</td>
                    <td className="max-w-64 truncate px-4 py-2 font-mono text-xs text-tertiary">{record.value}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <Can I="delete" a="Identity">
        <div className="flex flex-col gap-3 border-t border-secondary pt-6">
          <h2 className="text-sm font-semibold text-error-primary">Danger zone</h2>
          <Button type="button" color="secondary-destructive" className="w-max" onClick={() => dispatch(identityDeleteDialogOpened(identityId))}>
            Delete identity
          </Button>
        </div>
      </Can>

      <ConfirmDialog
        isOpen={dialog?.type === "delete"}
        onOpenChange={(open) => !open && dispatch(identityDialogClosed())}
        title="Delete this identity?"
        description="Campaigns using this identity to send will need a new one selected. This can't be undone."
        isLoading={isDeleting}
        onConfirm={onDelete}
      />
    </div>
  );
}
