"use client";

import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Input } from "@/components/base/input/input";
import { NativeSelect } from "@/components/base/select/select-native";
import { Button } from "@/components/base/buttons/button";
import { getApiErrorMessage } from "@/lib/redux/api/errors";
import { useGetCampaignsQuery } from "@/features/campaigns";
import type { Group } from "@/types/resources";
import type { FetchBaseQueryError } from "@reduxjs/toolkit/query";
import type { SerializedError } from "@reduxjs/toolkit";

const groupSchema = z.object({
  name: z.string().min(1, "Name is required"),
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
}

export function GroupForm({ mode, initialData, defaultCampaignId, onSubmit, isSubmitting, error, onCancel }: GroupFormProps) {
  const { data: campaigns } = useGetCampaignsQuery({ limit: 100 });

  const {
    control,
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<GroupFormValues>({
    resolver: zodResolver(groupSchema),
    defaultValues: { name: initialData?.name ?? "", campaign_id: initialData?.campaign_id ?? defaultCampaignId ?? "" },
  });

  const campaignOptions = [{ label: "None", value: "" }, ...(campaigns?.map((c) => ({ label: c.name ?? "", value: c.id })) ?? [])];

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="flex max-w-lg flex-col gap-5">
      {error && <p className="rounded-lg bg-error-primary px-3 py-2 text-sm text-error-primary ring-1 ring-error_subtle">{getApiErrorMessage(error)}</p>}
      <Controller
        control={control}
        name="name"
        render={({ field }) => <Input {...field} label="Group name" isInvalid={!!errors.name} hint={errors.name?.message} />}
      />
      <NativeSelect label="Linked campaign" options={campaignOptions} {...register("campaign_id")} />
      <div className="flex gap-3">
        <Button type="submit" isLoading={isSubmitting}>
          {mode === "create" ? "Create group" : "Save changes"}
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
