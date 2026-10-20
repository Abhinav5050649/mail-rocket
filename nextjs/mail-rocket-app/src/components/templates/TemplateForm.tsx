"use client";

import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Input } from "@/components/base/input/input";
import { NativeSelect } from "@/components/base/select/select-native";
import { Button } from "@/components/base/buttons/button";
import { TemplateEditor } from "./TemplateEditor";
import { getApiErrorMessage } from "@/lib/redux/api/errors";
import { useGetCampaignsQuery } from "@/features/campaigns";
import type { Template } from "@/types/resources";
import type { FetchBaseQueryError } from "@reduxjs/toolkit/query";
import type { SerializedError } from "@reduxjs/toolkit";

const templateSchema = z.object({
  name: z.string().min(1, "Name is required"),
  campaign_id: z.string().optional(),
  html_body: z.string().optional(),
});
export type TemplateFormValues = z.infer<typeof templateSchema>;

interface TemplateFormProps {
  mode: "create" | "edit";
  initialData?: Template;
  defaultCampaignId?: string;
  onSubmit: (values: TemplateFormValues) => void;
  isSubmitting: boolean;
  error?: FetchBaseQueryError | SerializedError;
  onCancel?: () => void;
}

export function TemplateForm({ mode, initialData, defaultCampaignId, onSubmit, isSubmitting, error, onCancel }: TemplateFormProps) {
  const { data: campaigns } = useGetCampaignsQuery({ limit: 100 });

  const {
    control,
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<TemplateFormValues>({
    resolver: zodResolver(templateSchema),
    defaultValues: {
      name: initialData?.name ?? "",
      campaign_id: initialData?.campaign_id ?? defaultCampaignId ?? "",
      html_body: initialData?.html_body ?? "",
    },
  });

  const campaignOptions = [{ label: "None", value: "" }, ...(campaigns?.map((c) => ({ label: c.name ?? "", value: c.id })) ?? [])];

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="flex max-w-2xl flex-col gap-5">
      {error && <p className="rounded-lg bg-error-primary px-3 py-2 text-sm text-error-primary ring-1 ring-error_subtle">{getApiErrorMessage(error)}</p>}
      <Controller
        control={control}
        name="name"
        render={({ field }) => <Input {...field} label="Template name" isInvalid={!!errors.name} hint={errors.name?.message} />}
      />
      <NativeSelect label="Linked campaign" options={campaignOptions} {...register("campaign_id")} />
      <Controller control={control} name="html_body" render={({ field }) => <TemplateEditor value={field.value ?? ""} onChange={field.onChange} />} />
      <div className="flex gap-3">
        <Button type="submit" isLoading={isSubmitting}>
          {mode === "create" ? "Create template" : "Save changes"}
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
