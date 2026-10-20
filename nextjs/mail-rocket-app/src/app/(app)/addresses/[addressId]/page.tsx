"use client";

import { use } from "react";
import { useRouter } from "next/navigation";
import { AddressForm, addressLine } from "@/components/addresses/AddressForm";
import { DeleteSection } from "@/components/resources/DeleteSection";
import { PageHeader } from "@/components/ui/page";
import { Pill } from "@/components/ui/pill";
import { ErrorNotice, Skeleton } from "@/components/ui/feedback";
import { useAbility } from "@/hooks/useAbility";
import { useAppDispatch, useAppSelector } from "@/lib/redux/hooks";
import {
  useGetAddressQuery,
  useUpdateAddressMutation,
  useDeleteAddressMutation,
  selectAddressDialog,
  addressDeleteDialogOpened,
  addressDialogClosed,
} from "@/features/addresses";

export default function AddressDetailPage({ params }: { params: Promise<{ addressId: string }> }) {
  const { addressId } = use(params);
  const router = useRouter();
  const dispatch = useAppDispatch();
  const dialog = useAppSelector(selectAddressDialog);
  const { ability } = useAbility();

  const { data: address, isLoading, error, refetch } = useGetAddressQuery({ addressId });
  const [updateAddress, { isLoading: isSaving, error: updateError }] = useUpdateAddressMutation();
  const [deleteAddress, { isLoading: isDeleting, error: deleteError }] = useDeleteAddressMutation();

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        back={{ href: "/addresses", label: "Addresses" }}
        title={address ? address.street || address.city || "Address" : isLoading ? <Skeleton className="h-7 w-56" /> : "Address"}
        status={address?.is_primary && <Pill tone="accent">Primary</Pill>}
        description={address && (addressLine(address) || "No details yet.")}
      />
      {error ? (
        <ErrorNotice error={error} what="this address" onRetry={refetch} />
      ) : !address ? (
        <Skeleton className="h-64 w-full" />
      ) : (
        <div className="flex flex-col">
          <AddressForm
            key={address.updated_at ?? address.created_at}
            mode="edit"
            initialData={address}
            readOnly={!ability.can("update", "Address")}
            isSubmitting={isSaving}
            error={updateError}
            onSubmit={(values) => updateAddress({ addressId, ...values })}
          />
          {ability.can("delete", "Address") && (
            <DeleteSection
              noun="address"
              name={address.street || address.city || "this address"}
              consequence="Permanently removes this address."
              isOpen={dialog?.type === "delete"}
              onOpenChange={(open) => dispatch(open ? addressDeleteDialogOpened(addressId) : addressDialogClosed())}
              isDeleting={isDeleting}
              error={deleteError}
              onConfirm={async () => {
                const result = await deleteAddress({ addressId });
                if (!("error" in result)) {
                  dispatch(addressDialogClosed());
                  router.push("/addresses");
                }
              }}
            />
          )}
        </div>
      )}
    </div>
  );
}
