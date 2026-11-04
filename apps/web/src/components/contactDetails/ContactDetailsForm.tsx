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
import type { ContactDetails } from "@/types/resources";

const contactDetailsSchema = z.object({
  email_id: z.email("Enter a valid email address").optional().or(z.literal("")),
  country_code: z.string().optional(),
  phone_number: z.string().optional(),
});
export type ContactDetailsFormValues = z.infer<typeof contactDetailsSchema>;

interface ContactDetailsFormProps {
  mode: "create" | "edit";
  initialData?: ContactDetails;
  onSubmit: (values: ContactDetailsFormValues) => void;
  isSubmitting: boolean;
  error?: FetchBaseQueryError | SerializedError;
  onCancel?: () => void;
  readOnly?: boolean;
}

export function ContactDetailsForm({ mode, initialData, onSubmit, isSubmitting, error, onCancel, readOnly }: ContactDetailsFormProps) {
  const {
    register,
    handleSubmit,
    formState: { errors, isDirty },
  } = useForm<ContactDetailsFormValues>({
    resolver: zodResolver(contactDetailsSchema),
    defaultValues: {
      email_id: initialData?.email_id ?? "",
      country_code: initialData?.country_code ?? "",
      phone_number: initialData?.phone_number ?? "",
    },
  });

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate>
      <SettingsSection title="Contact" description="How recipients can reach the organization.">
        <fieldset disabled={readOnly} className="flex flex-col gap-4">
          <Field label="Email" optional error={errors.email_id?.message}>
            {(props) => <Input {...props} {...register("email_id")} type="email" placeholder="hello@yourdomain.com" />}
          </Field>
          <div className="grid grid-cols-[96px_minmax(0,1fr)] gap-3">
            <Field label="Code" optional>
              {(props) => <Input {...props} {...register("country_code")} placeholder="+44" inputMode="tel" className="tabular" />}
            </Field>
            <Field label="Phone number" optional>
              {(props) => <Input {...props} {...register("phone_number")} inputMode="tel" autoComplete="tel-national" className="tabular" />}
            </Field>
          </div>
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
                  {mode === "create" ? "Add contact details" : "Save changes"}
                </Button>
              </FormActions>
            </>
          )}
        </fieldset>
      </SettingsSection>
    </form>
  );
}

/** "+44 20 7946 0000", or null when no phone is set. */
export function phoneLine(contact: ContactDetails) {
  return contact.phone_number ? [contact.country_code, contact.phone_number].filter(Boolean).join(" ") : null;
}
