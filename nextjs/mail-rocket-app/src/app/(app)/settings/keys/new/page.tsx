"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm, useWatch, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Check, Copy01 } from "@untitledui/icons";
import { Input } from "@/components/base/input/input";
import { NativeSelect } from "@/components/base/select/select-native";
import { Button } from "@/components/base/buttons/button";
import { getApiErrorMessage } from "@/lib/redux/api/errors";
import { useClipboard } from "@/hooks/use-clipboard";
import { PRESETS, PRESET_DESCRIPTIONS } from "@/lib/auth/abilities";
import { keyCreateSchema, type KeyCreateFormValues } from "@/lib/validation/authSchema";
import { useCreateKeyMutation, type ApiKeyCreated } from "@/features/keys";

const PRESET_OPTIONS = PRESETS.map((preset) => ({ label: preset[0]!.toUpperCase() + preset.slice(1), value: preset }));

export default function NewKeyPage() {
  const router = useRouter();
  const [createKey, { isLoading, error }] = useCreateKeyMutation();
  // Held only in component state: the secret is shown once and gone on navigation.
  const [created, setCreated] = useState<ApiKeyCreated | null>(null);
  const { copied, copy } = useClipboard();

  const {
    control,
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<KeyCreateFormValues>({ resolver: zodResolver(keyCreateSchema), defaultValues: { name: "", preset: "viewer", expires_on: "" } });
  const preset = useWatch({ control, name: "preset" });

  const onSubmit = async (values: KeyCreateFormValues) => {
    const result = await createKey({
      name: values.name,
      preset: values.preset,
      // A date input yields `YYYY-MM-DD`; the key expires at the end of that day, local time.
      expires_at: values.expires_on ? new Date(`${values.expires_on}T23:59:59`).toISOString() : null,
    });
    if (result.data) setCreated(result.data);
  };

  if (created) {
    return (
      <div className="flex max-w-lg flex-col gap-6">
        <div className="flex flex-col gap-1">
          <h1 className="text-xl font-semibold text-primary">Key created</h1>
          <p className="text-sm text-tertiary">
            Copy <strong>{created.name}</strong> now. It won&apos;t be shown again; if it&apos;s lost, revoke it and create another.
          </p>
        </div>
        <div className="flex items-center gap-2 rounded-lg bg-secondary px-3 py-2 ring-1 ring-secondary">
          <code className="flex-1 font-mono text-sm break-all text-primary">{created.secret}</code>
          <Button type="button" color="secondary" size="sm" iconLeading={copied ? Check : Copy01} onClick={() => copy(created.secret)}>
            {copied ? "Copied" : "Copy"}
          </Button>
        </div>
        <Button type="button" className="w-max" onClick={() => router.push("/settings/keys")}>
          Done
        </Button>
      </div>
    );
  }

  return (
    <div className="flex max-w-lg flex-col gap-6">
      <h1 className="text-xl font-semibold text-primary">New API key</h1>
      <form onSubmit={handleSubmit(onSubmit)} noValidate className="flex flex-col gap-5">
        {error && <p className="rounded-lg bg-error-primary px-3 py-2 text-sm text-error-primary ring-1 ring-error_subtle">{getApiErrorMessage(error)}</p>}
        <Controller
          control={control}
          name="name"
          render={({ field }) => (
            <Input {...field} label="Name" placeholder="e.g. ops, ci, jane" isInvalid={!!errors.name} hint={errors.name?.message ?? "Only for telling keys apart."} />
          )}
        />
        <div className="flex flex-col gap-1.5">
          <NativeSelect label="Preset" options={PRESET_OPTIONS} {...register("preset")} />
          <p className="text-sm text-tertiary">{PRESET_DESCRIPTIONS[preset]}</p>
        </div>
        <Controller
          control={control}
          name="expires_on"
          render={({ field }) => <Input {...field} label="Expires on" type="date" hint="Leave empty for a key that never expires." />}
        />
        <div className="flex gap-3">
          <Button type="submit" isLoading={isLoading}>
            Create key
          </Button>
          <Button type="button" color="link-gray" onClick={() => router.push("/settings/keys")}>
            Cancel
          </Button>
        </div>
      </form>
    </div>
  );
}
