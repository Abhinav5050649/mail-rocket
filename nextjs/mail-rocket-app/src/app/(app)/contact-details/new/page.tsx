"use client";

import { useRouter } from "next/navigation";
import { ContactDetailsForm, type ContactDetailsFormValues } from "@/components/contactDetails/ContactDetailsForm";
import { useCreateContactDetailsMutation } from "@/features/contactDetails";

export default function NewContactDetailsPage() {
  const router = useRouter();
  const [createContactDetails, { isLoading, error }] = useCreateContactDetailsMutation();

  const onSubmit = async (values: ContactDetailsFormValues) => {
    const result = await createContactDetails({ ...values });
    if (result.data) {
      router.push(`/contact-details/${result.data.id}`);
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-xl font-semibold text-primary">Add contact details</h1>
      <ContactDetailsForm
        mode="create"
        onSubmit={onSubmit}
        isSubmitting={isLoading}
        error={error}
        onCancel={() => router.push(`/contact-details`)}
      />
    </div>
  );
}
