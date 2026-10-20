"use client";

import * as React from "react";
import { Controller, useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Field, Input, Select, Textarea } from "@/components/ui/field";
import { FormActions, PageHeader, SettingsSection } from "@/components/ui/page";
import { ErrorNotice, FormError, Skeleton } from "@/components/ui/feedback";
import { useAbility } from "@/hooks/useAbility";
import { useHydrated } from "@/hooks/useHydrated";
import { useNow } from "@/hooks/useNow";
import { browserTimeZone, listTimeZones, offsetLabel } from "@/lib/timezone";
import { useGetOrganizationQuery, useUpdateOrganizationMutation } from "@/features/organizations";
import type { Organization } from "@/types/resources";

const organizationSchema = z.object({
  name: z.string().trim().min(1, "Name is required"),
  timezone: z.string().min(1, "Choose a time zone"),
  description: z.string().optional(),
});
type OrganizationFormValues = z.infer<typeof organizationSchema>;

function OrganizationForm({ organization, readOnly }: { organization: Organization; readOnly: boolean }) {
  const [updateOrganization, { isLoading, error, isSuccess, reset }] = useUpdateOrganizationMutation();
  const {
    control,
    register,
    handleSubmit,
    setValue,
    formState: { errors, isDirty },
  } = useForm<OrganizationFormValues>({
    resolver: zodResolver(organizationSchema),
    defaultValues: { name: organization.name ?? "", timezone: organization.timezone, description: organization.description ?? "" },
  });
  const timezone = useWatch({ control, name: "timezone" });
  const now = useNow();
  const localZone = browserTimeZone();
  // The stored zone stays selectable even if this browser lists it under another name.
  const zones = React.useMemo(() => {
    const all = listTimeZones();
    return all.includes(organization.timezone) ? all : [organization.timezone, ...all];
  }, [organization.timezone]);

  return (
    <form
      noValidate
      onChange={() => isSuccess && reset()}
      onSubmit={handleSubmit((values) => updateOrganization({ name: values.name.trim(), timezone: values.timezone, description: values.description || undefined }))}
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
        </fieldset>
      </SettingsSection>

      <SettingsSection
        title="Time zone"
        description={
          <>
            Every date in the app is shown in this zone, start times are entered in it, and{" "}
            <code className="text-text">{"{{campaign_start_date}}"}</code> is written in it. Changing it doesn&apos;t move
            scheduled sends: they keep their exact moment and are shown in the new zone.
          </>
        }
      >
        <fieldset disabled={readOnly} className="flex flex-col gap-4">
          <Field
            label="Time zone"
            error={errors.timezone?.message}
            hint={
              timezone && (
                <>
                  It&apos;s{" "}
                  <span className="tabular text-text">
                    {new Intl.DateTimeFormat("en-GB", { timeZone: timezone, weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).format(now)}
                  </span>{" "}
                  there ({offsetLabel(timezone, new Date(now))}).
                </>
              )
            }
          >
            {(props) => (
              <Controller
                control={control}
                name="timezone"
                render={({ field }) => <Select {...props} {...field} options={zones.map((zone) => ({ label: zone.replaceAll("_", " "), value: zone }))} className="max-w-sm" />}
              />
            )}
          </Field>
          {!readOnly && timezone !== localZone && (
            <button
              type="button"
              onClick={() => setValue("timezone", localZone, { shouldDirty: true })}
              className="w-max text-sm text-muted underline-offset-3 hover:text-text hover:underline"
            >
              Use this computer&apos;s zone ({localZone.replaceAll("_", " ")})
            </button>
          )}
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
      <PageHeader title="Profile" description="The organization's details and time zone, used across the app and in templates." />
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
