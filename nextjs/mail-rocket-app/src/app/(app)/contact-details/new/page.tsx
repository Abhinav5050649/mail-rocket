"use client";

import { useRouter } from "next/navigation";
import { ContactDetailsForm } from "@/components/contactDetails/ContactDetailsForm";
import { PageHeader } from "@/components/ui/page";
import { useCreateContactDetailsMutation } from "@/features/contactDetails";

export default function NewContactDetailsPage() {
  const router = useRouter();
  const [createContactDetails, { isLoading, error }] = useCreateContactDetailsMutation();

  return (
    <div className="flex flex-col gap-6">
      <PageHeader back={{ href: "/contact-details", label: "Contact details" }} title="Add contact details" />
      <ContactDetailsForm
        mode="create"
        isSubmitting={isLoading}
        error={error}
        onCancel={() => router.push("/contact-details")}
        onSubmit={async (values) => {
          const result = await createContactDetails(values);
          if (result.data) router.push(`/contact-details/${result.data.id}`);
        }}
      />
    </div>
  );
}
