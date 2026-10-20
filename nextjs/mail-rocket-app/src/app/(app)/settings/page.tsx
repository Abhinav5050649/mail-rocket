"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Field, Input, Textarea } from "@/components/ui/field";
import { FormActions, PageHeader, SettingsSection } from "@/components/ui/page";
import { ErrorNotice, FormError, Skeleton } from "@/components/ui/feedback";
import { useAbility } from "@/hooks/useAbility";
import { useHydrated } from "@/hooks/useHydrated";
import { useGetOrganizationQuery, useUpdateOrganizationMutation } from "@/features/organizations";
import type { Organization } from "@/types/resources";

const organizationSchema = z.object({
  name: z.string().trim().min(1, "Name is required"),
  description: z.string().optional(),
});
type OrganizationFormValues = z.infer<typeof organizationSchema>;

function OrganizationForm({ organization, readOnly }: { organization: Organization; readOnly: boolean }) {
  const [updateOrganization, { isLoading, error, isSuccess, reset }] = useUpdateOrganizationMutation();
  const {
    register,
    handleSubmit,
    formState: { errors, isDirty },
  } = useForm<OrganizationFormValues>({
    resolver: zodResolver(organizationSchema),
    defaultValues: { name: organization.name ?? "", description: organization.description ?? "" },
  });

  return (
    <form
      noValidate
      onChange={() => isSuccess && reset()}
      onSubmit={handleSubmit((values) => updateOrganization({ name: values.name.trim(), description: values.description || undefined }))}
    >
      <SettingsSection
        title="Organization"
        description={
          <>
            Whoever runs this instance. The name fills <code className="text-text">{"{{organization_name}}"}</code> in every template.
          </>
        }
      >
        <fieldset disabled={readOnly} className="flex flex-col gap-4">
          <Field label="Name" error={errors.name?.message}>
            {(props) => <Input {...props} {...register("name")} />}
          </Field>
          <Field label="Description" optional hint="Internal only.">
            {(props) => <Textarea {...props} {...register("description")} rows={3} />}
          </Field>
          {readOnly ? (
            <p className="text-sm text-muted">Your key can view this profile but not change it.</p>
          ) : (
            <>
              <FormError error={error} />
              <FormActions>
                {isSuccess && !isDirty && <span className="text-sm text-positive">Saved</span>}
                <Button type="submit" variant="primary" isLoading={isLoading} disabled={!isDirty}>
                  Save changes
                </Button>
              </FormActions>
            </>
          )}
        </fieldset>
      </SettingsSection>
    </form>
  );
}

/** The instance's single organization profile. Seeded by the API; never created or deleted here. */
export default function OrganizationSettingsPage() {
  const { data: organization, isLoading, error, refetch } = useGetOrganizationQuery();
  const { ability } = useAbility();
  // The shell fetches the organization too; wait for hydration so the first render matches the server.
  const hydrated = useHydrated();

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Profile" description="The organization's details, used in templates." />
      {error ? (
        <ErrorNotice error={error} what="the organization" onRetry={refetch} />
      ) : !hydrated || isLoading || !organization ? (
        <Skeleton className="h-48 w-full" />
      ) : (
        <OrganizationForm key={organization.updated_at ?? organization.created_at} organization={organization} readOnly={!ability.can("update", "Organization")} />
      )}
    </div>
  );
}
