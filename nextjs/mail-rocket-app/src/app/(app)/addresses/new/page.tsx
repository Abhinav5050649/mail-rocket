"use client";

import { useRouter } from "next/navigation";
import { AddressForm, type AddressFormValues } from "@/components/addresses/AddressForm";
import { useCreateAddressMutation } from "@/features/addresses";

export default function NewAddressPage() {
  const router = useRouter();
  const [createAddress, { isLoading, error }] = useCreateAddressMutation();

  const onSubmit = async (values: AddressFormValues) => {
    const result = await createAddress({ ...values });
    if (result.data) {
      router.push(`/addresses/${result.data.id}`);
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-xl font-semibold text-primary">Add address</h1>
      <AddressForm mode="create" onSubmit={onSubmit} isSubmitting={isLoading} error={error} onCancel={() => router.push(`/addresses`)} />
    </div>
  );
}
