"use client";

import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import type { FetchBaseQueryError } from "@reduxjs/toolkit/query";
import type { SerializedError } from "@reduxjs/toolkit";
import { Field, Input } from "@/components/ui/field";
import { Button } from "@/components/ui/button";
import { FormActions } from "@/components/ui/page";
import { FormError } from "@/components/ui/feedback";
import { TemplateEditor } from "./TemplateEditor";
import { useAbility } from "@/hooks/useAbility";
import { useGetOrganizationQuery } from "@/features/organizations";
import type { Template } from "@/types/resources";

const templateSchema = z.object({
  name: z.string().trim().min(1, "Give the template a name"),
  html_body: z.string().optional(),
});
export type TemplateFormValues = z.infer<typeof templateSchema>;

interface TemplateFormProps {
  mode: "create" | "edit";
  initialData?: Template;
  onSubmit: (values: TemplateFormValues) => void;
  isSubmitting: boolean;
  error?: FetchBaseQueryError | SerializedError;
  onCancel?: () => void;
  readOnly?: boolean;
}

/** The name, then the editor and its live preview. Campaigns pick a template themselves, so any number can share it. */
export function TemplateForm({ mode, initialData, onSubmit, isSubmitting, error, onCancel, readOnly }: TemplateFormProps) {
  const { ability } = useAbility();
  const { data: organization } = useGetOrganizationQuery(undefined, { skip: !ability.can("read", "Organization") });

  const {
    control,
    register,
    handleSubmit,
    formState: { errors, isDirty },
  } = useForm<TemplateFormValues>({
    resolver: zodResolver(templateSchema),
    defaultValues: {
      name: initialData?.name ?? "",
      html_body: initialData?.html_body ?? "",
    },
  });

  return (
    <form onSubmit={handleSubmit((values) => onSubmit({ ...values, name: values.name.trim() }))} noValidate className="flex flex-col gap-5">
      <fieldset disabled={readOnly} className="grid gap-4 sm:max-w-md">
        <Field label="Template name" error={errors.name?.message}>
          {(props) => <Input {...props} {...register("name")} placeholder="Autumn update email" />}
        </Field>
      </fieldset>

      <Controller
        control={control}
        name="html_body"
        render={({ field }) => <TemplateEditor value={field.value ?? ""} onChange={field.onChange} organizationName={organization?.name} readOnly={readOnly} />}
      />

      {!readOnly && (
        <div className="flex flex-col gap-3">
          <FormError error={error} />
          <FormActions>
            {onCancel && (
              <Button variant="ghost" onClick={onCancel}>
                Cancel
              </Button>
            )}
            <Button type="submit" variant="primary" isLoading={isSubmitting} disabled={mode === "edit" && !isDirty}>
              {mode === "create" ? "Create template" : "Save changes"}
            </Button>
          </FormActions>
        </div>
      )}
    </form>
  );
}
