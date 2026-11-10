"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import type { FetchBaseQueryError } from "@reduxjs/toolkit/query";
import type { SerializedError } from "@reduxjs/toolkit";
import { Field, Input } from "@/components/ui/field";
import { Button } from "@/components/ui/button";
import { FormActions, SettingsSection } from "@/components/ui/page";
import { FormError } from "@/components/ui/feedback";
import type { Group } from "@/types/resources";

const groupSchema = z.object({
  name: z.string().trim().min(1, "Give the group a name"),
});
export type GroupFormValues = z.infer<typeof groupSchema>;

interface GroupFormProps {
  mode: "create" | "edit";
  initialData?: Group;
  onSubmit: (values: GroupFormValues) => void;
  isSubmitting: boolean;
  error?: FetchBaseQueryError | SerializedError;
  onCancel?: () => void;
  readOnly?: boolean;
}

/** A group is just a named list; which campaigns send to it is chosen on each campaign. */
export function GroupForm({ mode, initialData, onSubmit, isSubmitting, error, onCancel, readOnly }: GroupFormProps) {
  const {
    register,
    handleSubmit,
    formState: { errors, isDirty },
  } = useForm<GroupFormValues>({
    resolver: zodResolver(groupSchema),
    defaultValues: { name: initialData?.name ?? "" },
  });

  return (
    <form onSubmit={handleSubmit((values) => onSubmit({ ...values, name: values.name.trim() }))} noValidate>
      <SettingsSection title="Group" description={<>The name fills {"{{group_name}}"} in templates for everyone in the group. Any number of campaigns can send to it.</>}>
        <fieldset disabled={readOnly} className="flex flex-col gap-4">
          <Field label="Group name" error={errors.name?.message}>
            {(props) => <Input {...props} {...register("name")} placeholder="Newsletter subscribers" />}
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
