"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import type { FetchBaseQueryError } from "@reduxjs/toolkit/query";
import type { SerializedError } from "@reduxjs/toolkit";
import { Checkbox, Field, Input } from "@/components/ui/field";
import { Button } from "@/components/ui/button";
import { FormActions, SettingsSection } from "@/components/ui/page";
import { FormError } from "@/components/ui/feedback";
import type { Address } from "@/types/resources";

const addressSchema = z.object({
  street: z.string().optional(),
  area: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  country: z.string().optional(),
  postal_code: z.string().optional(),
  is_primary: z.boolean(),
});
export type AddressFormValues = z.infer<typeof addressSchema>;

interface AddressFormProps {
  mode: "create" | "edit";
  initialData?: Address;
  onSubmit: (values: AddressFormValues) => void;
  isSubmitting: boolean;
  error?: FetchBaseQueryError | SerializedError;
  onCancel?: () => void;
  readOnly?: boolean;
}

export function AddressForm({ mode, initialData, onSubmit, isSubmitting, error, onCancel, readOnly }: AddressFormProps) {
  const {
    register,
    handleSubmit,
    formState: { isDirty },
  } = useForm<AddressFormValues>({
    resolver: zodResolver(addressSchema),
    defaultValues: {
      street: initialData?.street ?? "",
      area: initialData?.area ?? "",
      city: initialData?.city ?? "",
      state: initialData?.state ?? "",
      country: initialData?.country ?? "",
      postal_code: initialData?.postal_code ?? "",
      is_primary: initialData?.is_primary ?? false,
    },
  });

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate>
      <SettingsSection title="Address" description="A postal address for the organization, e.g. for an email footer.">
        <fieldset disabled={readOnly} className="flex flex-col gap-4">
          <Field label="Street" optional>
            {(props) => <Input {...props} {...register("street")} autoComplete="street-address" />}
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Area" optional>
              {(props) => <Input {...props} {...register("area")} />}
            </Field>
            <Field label="City" optional>
              {(props) => <Input {...props} {...register("city")} autoComplete="address-level2" />}
            </Field>
            <Field label="State or region" optional>
              {(props) => <Input {...props} {...register("state")} autoComplete="address-level1" />}
            </Field>
            <Field label="Postal code" optional>
              {(props) => <Input {...props} {...register("postal_code")} autoComplete="postal-code" className="tabular" />}
            </Field>
          </div>
          <Field label="Country" optional>
            {(props) => <Input {...props} {...register("country")} autoComplete="country-name" />}
          </Field>
          <Checkbox {...register("is_primary")} label="Primary address" description="The one used when only one address is needed." />
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
                  {mode === "create" ? "Add address" : "Save changes"}
                </Button>
              </FormActions>
            </>
          )}
        </fieldset>
      </SettingsSection>
    </form>
  );
}

/** "12 Rue X, Paris, 75001, France" from whichever parts are set. */
export function addressLine(address: Address) {
  return [address.street, address.area, address.city, address.state, address.postal_code, address.country].filter(Boolean).join(", ");
}
