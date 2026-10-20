"use client";

import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Input } from "@/components/base/input/input";
import { TextArea } from "@/components/base/textarea/textarea";
import { Button } from "@/components/base/buttons/button";
import type { Organization } from "@/types/resources";
import type { FetchBaseQueryError } from "@reduxjs/toolkit/query";
import type { SerializedError } from "@reduxjs/toolkit";
import { getApiErrorMessage } from "@/lib/redux/api/errors";

const organizationSchema = z.object({
  name: z.string().min(1, "Name is required"),
  description: z.string().optional(),
});
export type OrganizationFormValues = z.infer<typeof organizationSchema>;

interface OrganizationFormProps {
  initialData?: Organization;
  onSubmit: (values: OrganizationFormValues) => void;
  isSubmitting: boolean;
  error?: FetchBaseQueryError | SerializedError;
  onCancel?: () => void;
}

export function OrganizationForm({ initialData, onSubmit, isSubmitting, error, onCancel }: OrganizationFormProps) {
  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<OrganizationFormValues>({
    resolver: zodResolver(organizationSchema),
    defaultValues: {
      name: initialData?.name ?? "",
      description: initialData?.description ?? "",
    },
  });

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="flex max-w-lg flex-col gap-5">
      {error && <p className="rounded-lg bg-error-primary px-3 py-2 text-sm text-error-primary ring-1 ring-error_subtle">{getApiErrorMessage(error)}</p>}
      <Controller
        control={control}
        name="name"
        render={({ field }) => <Input {...field} label="Organization name" isInvalid={!!errors.name} hint={errors.name?.message} />}
      />
      <Controller control={control} name="description" render={({ field }) => <TextArea {...field} label="Description" rows={3} />} />
      <div className="flex gap-3">
        <Button type="submit" isLoading={isSubmitting}>
          Save changes
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
