"use client";

import { useRouter } from "next/navigation";
import { AddressForm } from "@/components/addresses/AddressForm";
import { PageHeader } from "@/components/ui/page";
import { useCreateAddressMutation } from "@/features/addresses";

export default function NewAddressPage() {
  const router = useRouter();
  const [createAddress, { isLoading, error }] = useCreateAddressMutation();

  return (
    <div className="flex flex-col gap-6">
      <PageHeader back={{ href: "/addresses", label: "Addresses" }} title="Add address" />
      <AddressForm
        mode="create"
        isSubmitting={isLoading}
        error={error}
        onCancel={() => router.push("/addresses")}
        onSubmit={async (values) => {
          const result = await createAddress(values);
          if (result.data) router.push(`/addresses/${result.data.id}`);
        }}
      />
    </div>
  );
}
