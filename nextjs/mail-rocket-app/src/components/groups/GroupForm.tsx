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
import { useCampaignNames } from "@/hooks/useLookups";
import type { Group } from "@/types/resources";

const groupSchema = z.object({
  name: z.string().trim().min(1, "Give the group a name"),
  campaign_id: z.string().optional(),
});
export type GroupFormValues = z.infer<typeof groupSchema>;

interface GroupFormProps {
  mode: "create" | "edit";
  initialData?: Group;
  defaultCampaignId?: string;
  onSubmit: (values: GroupFormValues) => void;
  isSubmitting: boolean;
  error?: FetchBaseQueryError | SerializedError;
  onCancel?: () => void;
  readOnly?: boolean;
}

export function GroupForm({ mode, initialData, defaultCampaignId, onSubmit, isSubmitting, error, onCancel, readOnly }: GroupFormProps) {
  const { campaigns } = useCampaignNames();
  const {
    control,
    register,
    handleSubmit,
    formState: { errors, isDirty },
  } = useForm<GroupFormValues>({
    resolver: zodResolver(groupSchema),
    defaultValues: { name: initialData?.name ?? "", campaign_id: initialData?.campaign_id ?? defaultCampaignId ?? "" },
  });

  const campaignOptions = [{ label: "Not linked", value: "" }, ...(campaigns?.map((campaign) => ({ label: campaign.name ?? "Untitled campaign", value: campaign.id })) ?? [])];

  return (
    <form onSubmit={handleSubmit((values) => onSubmit({ ...values, name: values.name.trim() }))} noValidate>
      <SettingsSection title="Group" description={<>The name fills {"{{group_name}}"} in templates for everyone in the group.</>}>
        <fieldset disabled={readOnly} className="flex flex-col gap-4">
          <Field label="Group name" error={errors.name?.message}>
            {(props) => <Input {...props} {...register("name")} placeholder="Newsletter subscribers" />}
          </Field>
          <Field label="Campaign" optional hint="The campaign that sends to this group.">
            {(props) => (
              // Controlled, so the stored value shows once its options arrive.
              <Controller control={control} name="campaign_id" render={({ field }) => <Select {...props} {...field} value={field.value ?? ""} options={campaignOptions} />} />
            )}
          </Field>
          {!readOnly && (
            <>
              <FormError error={error} />
              <FormActions>
                {onCancel && (
                  <Button variant="ghost" onClick={onCancel}>
                    Cancel
                  </Button>
                )}
                <Button type="submit" variant="primary" isLoading={isSubmitting} disabled={mode === "edit" && !isDirty}>
                  {mode === "create" ? "Create group" : "Save changes"}
                </Button>
              </FormActions>
            </>
          )}
        </fieldset>
      </SettingsSection>
    </form>
  );
}
