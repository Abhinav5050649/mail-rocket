"use client";

import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Input } from "@/components/base/input/input";
import { NativeSelect } from "@/components/base/select/select-native";
import { Button } from "@/components/base/buttons/button";
import { getApiErrorMessage } from "@/lib/redux/api/errors";
import { useGetCampaignsQuery } from "@/features/campaigns";
import { useGetGroupsQuery } from "@/features/groups";
import type { Recipient } from "@/types/resources";
import type { FetchBaseQueryError } from "@reduxjs/toolkit/query";
import type { SerializedError } from "@reduxjs/toolkit";

const recipientSchema = z.object({
  first_name: z.string().optional(),
  last_name: z.string().optional(),
  email_id: z.string().min(1, "Email is required").email("Enter a valid email"),
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
}

export function RecipientForm({
  mode,
  initialData,
  defaultCampaignId,
  defaultGroupId,
  onSubmit,
  isSubmitting,
  error,
  onCancel,
}: RecipientFormProps) {
  const { data: campaigns } = useGetCampaignsQuery({ limit: 100 });
  const { data: groups } = useGetGroupsQuery({ limit: 100 });

  const {
    control,
    register,
    handleSubmit,
    formState: { errors },
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

  const campaignOptions = [{ label: "None", value: "" }, ...(campaigns?.map((c) => ({ label: c.name ?? "", value: c.id })) ?? [])];
  const groupOptions = [{ label: "None", value: "" }, ...(groups?.map((g) => ({ label: g.name ?? "", value: g.id })) ?? [])];

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="flex max-w-lg flex-col gap-5">
      {error && <p className="rounded-lg bg-error-primary px-3 py-2 text-sm text-error-primary ring-1 ring-error_subtle">{getApiErrorMessage(error)}</p>}
      <div className="flex gap-3">
        <Controller control={control} name="first_name" render={({ field }) => <Input {...field} label="First name" />} />
        <Controller control={control} name="last_name" render={({ field }) => <Input {...field} label="Last name" />} />
      </div>
      <Controller
        control={control}
        name="email_id"
        render={({ field }) => <Input {...field} label="Email" type="email" isInvalid={!!errors.email_id} hint={errors.email_id?.message} />}
      />
      <NativeSelect label="Campaign" options={campaignOptions} {...register("campaign_id")} />
      <NativeSelect label="Group" options={groupOptions} {...register("group_id")} />
      <div className="flex gap-3">
        <Button type="submit" isLoading={isSubmitting}>
          {mode === "create" ? "Add recipient" : "Save changes"}
        </Button>
        {onCancel && (
          <Button type="button" color="link-gray" onClick={onCancel}>
            Cancel
          </Button>
        )}
      </div>
    </form>
  );
}
