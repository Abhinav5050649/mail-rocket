"use client";

import { OrganizationForm, type OrganizationFormValues } from "@/components/organizations/OrganizationForm";
import { Can } from "@/components/auth/Can";
import { LoadingIndicator } from "@/components/application/loading-indicator/loading-indicator";
import { useGetOrganizationQuery, useUpdateOrganizationMutation } from "@/features/organizations";

/**
 * The instance's organization profile. Its name fills the
 * `{{organization_name}}` template variable. There's no delete - the
 * organization is seeded by bun/api and lives as long as the instance.
 */
export default function OrganizationSettingsPage() {
  const { data: organization, isLoading } = useGetOrganizationQuery();
  const [updateOrganization, { isLoading: isSaving, error: updateError }] = useUpdateOrganizationMutation();

  const onSubmit = (values: OrganizationFormValues) => {
    updateOrganization(values);
  };

  if (isLoading || !organization) {
    return (
      <div className="flex justify-center py-16">
        <LoadingIndicator size="sm" />
      </div>
    );
  }

  return (
    <div className="flex max-w-lg flex-col gap-8">
      <div className="flex flex-col gap-1">
        <h1 className="text-xl font-semibold text-primary">Organization settings</h1>
        <p className="text-sm text-tertiary">
          The organization running this instance. Its name is used for <code>{"{{organization_name}}"}</code> in campaigns.
        </p>
      </div>

      <Can I="update" a="Organization" mode="disable">
        <OrganizationForm initialData={organization} onSubmit={onSubmit} isSubmitting={isSaving} error={updateError} />
      </Can>
    </div>
  );
}
