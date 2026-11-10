"use client";

import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import type { FetchBaseQueryError } from "@reduxjs/toolkit/query";
import type { SerializedError } from "@reduxjs/toolkit";
import { Field, Input } from "@/components/ui/field";
import { Button } from "@/components/ui/button";
import { FormActions, SettingsSection } from "@/components/ui/page";
import { FormError } from "@/components/ui/feedback";
import { useGroupNames } from "@/hooks/useLookups";
import { GroupPicker } from "./GroupPicker";
import type { Subscriber } from "@/types/resources";

const subscriberSchema = z.object({
  first_name: z.string().optional(),
  last_name: z.string().optional(),
  email_id: z.string().trim().min(1, "Email is required").pipe(z.email("Enter a valid email address")),
  group_ids: z.array(z.string()),
});
export type SubscriberFormValues = z.infer<typeof subscriberSchema>;

interface SubscriberFormProps {
  mode: "create" | "edit";
  initialData?: Subscriber;
  /** Pre-selects this group for a new subscriber. */
  defaultGroupId?: string;
  onSubmit: (values: SubscriberFormValues) => void;
  isSubmitting: boolean;
  error?: FetchBaseQueryError | SerializedError;
  onCancel?: () => void;
  readOnly?: boolean;
}

export function SubscriberForm({ mode, initialData, defaultGroupId, onSubmit, isSubmitting, error, onCancel, readOnly }: SubscriberFormProps) {
  const { groups } = useGroupNames();
  const {
    control,
    register,
    handleSubmit,
    formState: { errors, isDirty },
  } = useForm<SubscriberFormValues>({
    resolver: zodResolver(subscriberSchema),
    defaultValues: {
      first_name: initialData?.first_name ?? "",
      last_name: initialData?.last_name ?? "",
      email_id: initialData?.email_id ?? "",
      group_ids: initialData?.group_ids ?? (defaultGroupId ? [defaultGroupId] : []),
    },
  });

  const submit = (values: SubscriberFormValues) =>
    onSubmit({
      ...values,
      email_id: values.email_id.trim(),
      first_name: values.first_name?.trim() || undefined,
      last_name: values.last_name?.trim() || undefined,
    });

  return (
    <form onSubmit={handleSubmit(submit)} noValidate>
      <fieldset disabled={readOnly} className="contents">
        <SettingsSection title="Person" description="Names fill the subscriber variables. A subscriber missing a name a template uses is skipped at send time.">
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
        <SettingsSection
          title="Groups"
          description={
            <>
              A subscriber can be in any number of groups. A campaign sends to everyone in its groups, each person once.{" "}
              {"{{group_name}}"} lists all of their groups.
            </>
          }
        >
          <Controller
            control={control}
            name="group_ids"
            render={({ field }) => <GroupPicker groups={groups} value={field.value} onChange={field.onChange} disabled={readOnly} />}
          />
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
              {mode === "create" ? "Add subscriber" : "Save changes"}
            </Button>
          </FormActions>
        </div>
      )}
    </form>
  );
}
