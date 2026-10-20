"use client";

import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Input } from "@/components/base/input/input";
import { TextArea } from "@/components/base/textarea/textarea";
import { NativeSelect } from "@/components/base/select/select-native";
import { Button } from "@/components/base/buttons/button";
import { campaignSchema, type CampaignFormValues } from "@/lib/validation/campaignSchema";
import { useGetIdentitiesQuery } from "@/features/identities";
import { getApiErrorMessage } from "@/lib/redux/api/errors";
import type { Campaign } from "@/types/resources";
import type { FetchBaseQueryError } from "@reduxjs/toolkit/query";
import type { SerializedError } from "@reduxjs/toolkit";

interface CampaignFormProps {
  mode: "create" | "edit";
  initialData?: Campaign;
  onSubmit: (values: CampaignFormValues) => void;
  isSubmitting: boolean;
  error?: FetchBaseQueryError | SerializedError;
  onCancel?: () => void;
}

/** Local "branch store": react-hook-form state only, committed to the global RTK Query cache on submit. */
export function CampaignForm({ mode, initialData, onSubmit, isSubmitting, error, onCancel }: CampaignFormProps) {
  const { data: identities } = useGetIdentitiesQuery({ status: "active", limit: 100 });

  const {
    control,
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<CampaignFormValues>({
    resolver: zodResolver(campaignSchema),
    defaultValues: {
      name: initialData?.name ?? "",
      subject: initialData?.subject ?? "",
      start_time: initialData?.start_time?.slice(0, 16) ?? "",
      identity_id: initialData?.identity_id ?? "",
      description: initialData?.description ?? "",
    },
  });

  const identityOptions = [
    { label: "None", value: "" },
    ...(identities?.map((identity) => ({ label: identity.identity, value: identity.id })) ?? []),
  ];

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="flex max-w-xl flex-col gap-5">
      {error && <p className="rounded-lg bg-error-primary px-3 py-2 text-sm text-error-primary ring-1 ring-error_subtle">{getApiErrorMessage(error)}</p>}
      <Controller
        control={control}
        name="name"
        render={({ field }) => <Input {...field} label="Campaign name" isInvalid={!!errors.name} hint={errors.name?.message} />}
      />
      <Controller control={control} name="subject" render={({ field }) => <Input {...field} label="Email subject" />} />
      <NativeSelect label="Send from" options={identityOptions} {...register("identity_id")} />
      <Controller
        control={control}
        name="start_time"
        render={({ field }) => <Input {...field} label="Start time" type="datetime-local" />}
      />
      <Controller control={control} name="description" render={({ field }) => <TextArea {...field} label="Description" rows={3} />} />
      <div className="flex gap-3">
        <Button type="submit" isLoading={isSubmitting}>
          {mode === "create" ? "Create campaign" : "Save changes"}
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
