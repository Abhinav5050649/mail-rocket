"use client";

import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import type { FetchBaseQueryError } from "@reduxjs/toolkit/query";
import type { SerializedError } from "@reduxjs/toolkit";
import { Field, Input, Select } from "@/components/ui/field";
import { Button } from "@/components/ui/button";
import { FormActions, SettingsSection } from "@/components/ui/page";
import { FormError } from "@/components/ui/feedback";
import { useCampaignNames, useGroupNames } from "@/hooks/useLookups";
import type { Recipient } from "@/types/resources";

const recipientSchema = z.object({
  first_name: z.string().optional(),
  last_name: z.string().optional(),
  email_id: z.string().trim().min(1, "Email is required").pipe(z.email("Enter a valid email address")),
  campaign_id: z.string().optional(),
  group_id: z.string().optional(),
});
export type RecipientFormValues = z.infer<typeof recipientSchema>;

interface RecipientFormProps {
  mode: "create" | "edit";
  initialData?: Recipient;
  defaultCampaignId?: string;
  defaultGroupId?: string;
  onSubmit: (values: RecipientFormValues) => void;
  isSubmitting: boolean;
  error?: FetchBaseQueryError | SerializedError;
  onCancel?: () => void;
  readOnly?: boolean;
}

export function RecipientForm({ mode, initialData, defaultCampaignId, defaultGroupId, onSubmit, isSubmitting, error, onCancel, readOnly }: RecipientFormProps) {
  const { campaigns } = useCampaignNames();
  const { groups } = useGroupNames();
  const {
    control,
    register,
    handleSubmit,
    formState: { errors, isDirty },
  } = useForm<RecipientFormValues>({
    resolver: zodResolver(recipientSchema),
    defaultValues: {
      first_name: initialData?.first_name ?? "",
      last_name: initialData?.last_name ?? "",
      email_id: initialData?.email_id ?? "",
      campaign_id: initialData?.campaign_id ?? defaultCampaignId ?? "",
      group_id: initialData?.group_id ?? defaultGroupId ?? "",
    },
  });

  const campaignOptions = [{ label: "Not linked", value: "" }, ...(campaigns?.map((campaign) => ({ label: campaign.name ?? "Untitled campaign", value: campaign.id })) ?? [])];
  const groupOptions = [{ label: "No group", value: "" }, ...(groups?.map((group) => ({ label: group.name ?? "Untitled group", value: group.id })) ?? [])];

  const submit = (values: RecipientFormValues) =>
    onSubmit({
      ...values,
      email_id: values.email_id.trim(),
      first_name: values.first_name?.trim() || undefined,
      last_name: values.last_name?.trim() || undefined,
    });

  return (
    <form onSubmit={handleSubmit(submit)} noValidate>
      <fieldset disabled={readOnly} className="contents">
        <SettingsSection title="Person" description="Names fill the recipient variables. A recipient missing a name a template uses is skipped at send time.">
          <div className="flex flex-col gap-4">
            <Field label="Email" error={errors.email_id?.message}>
              {(props) => <Input {...props} {...register("email_id")} type="email" autoComplete="off" placeholder="name@domain.com" />}
            </Field>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="First name" optional>
                {(props) => <Input {...props} {...register("first_name")} />}
              </Field>
              <Field label="Last name" optional>
                {(props) => <Input {...props} {...register("last_name")} />}
              </Field>
            </div>
          </div>
        </SettingsSection>
        <SettingsSection title="Sending" description="Which campaign reaches this person, and through which group.">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Campaign" optional>
              {(props) => (
              // Controlled, so the stored value shows once its options arrive.
              <Controller control={control} name="campaign_id" render={({ field }) => <Select {...props} {...field} value={field.value ?? ""} options={campaignOptions} />} />
            )}
            </Field>
            <Field label="Group" optional>
              {(props) => (
              // Controlled, so the stored value shows once its options arrive.
              <Controller control={control} name="group_id" render={({ field }) => <Select {...props} {...field} value={field.value ?? ""} options={groupOptions} />} />
            )}
            </Field>
          </div>
        </SettingsSection>
      </fieldset>
      {!readOnly && (
        <div className="flex flex-col gap-3 border-t border-border pt-5 lg:pl-[360px]">
          <FormError error={error} />
          <FormActions>
            {onCancel && (
              <Button variant="ghost" onClick={onCancel}>
                Cancel
              </Button>
            )}
            <Button type="submit" variant="primary" isLoading={isSubmitting} disabled={mode === "edit" && !isDirty}>
              {mode === "create" ? "Add recipient" : "Save changes"}
            </Button>
          </FormActions>
        </div>
      )}
    </form>
  );
}
