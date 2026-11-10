"use client";

import { useRouter } from "next/navigation";
import { TemplateForm } from "@/components/templates/TemplateForm";
import { PageHeader } from "@/components/ui/page";
import { useCreateTemplateMutation } from "@/features/templates";

/** Adds a template to the library; campaigns then pick it on their own form. */
export default function NewTemplatePage() {
  const router = useRouter();
  const [createTemplate, { isLoading, error }] = useCreateTemplateMutation();

  return (
    <div className="flex flex-col gap-6">
      <PageHeader back={{ href: "/templates", label: "Templates" }} title="New template" />
      <TemplateForm
        mode="create"
        isSubmitting={isLoading}
        error={error}
        onCancel={() => router.push("/templates")}
        onSubmit={async (values) => {
          const result = await createTemplate(values);
          if (result.data) router.push(`/templates/${result.data.id}`);
        }}
      />
    </div>
  );
}
