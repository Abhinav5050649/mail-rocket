"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { CopyButton } from "@/components/ui/copy-button";
import { Field, Input } from "@/components/ui/field";
import { FormActions, PageHeader, SettingsSection } from "@/components/ui/page";
import { FormError, Notice } from "@/components/ui/feedback";
import { PRESETS, PRESET_DESCRIPTIONS } from "@mail-rocket/shared";
import { keyCreateSchema, type KeyCreateFormValues } from "@/lib/validation/authSchema";
import { capitalize, fromDateTimeLocal, getDisplayTimeZone } from "@/lib/format";
import { useCreateKeyMutation, type ApiKeyCreated } from "@/features/keys";
import { cx } from "@/utils/cx";

export default function NewKeyPage() {
  const router = useRouter();
  const [createKey, { isLoading, error }] = useCreateKeyMutation();
  // Held only in component state: the secret is shown once and gone on navigation.
  const [created, setCreated] = useState<ApiKeyCreated | null>(null);

  const {
    control,
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<KeyCreateFormValues>({ resolver: zodResolver(keyCreateSchema), defaultValues: { name: "", preset: "viewer", expires_on: "" } });
  const preset = useWatch({ control, name: "preset" });

  if (created) {
    return (
      <div className="flex flex-col gap-6">
        <PageHeader back={{ href: "/settings/keys", label: "API keys" }} title={`Key “${created.name}” created`} />
        <Notice title="Copy the key now. It won’t be shown again.">If it’s lost, revoke it and create another.</Notice>
        <div className="flex max-w-2xl items-center gap-2 rounded-card border border-border bg-raised py-2 pr-2 pl-4">
          <code className="min-w-0 flex-1 text-sm break-all text-text">{created.secret}</code>
          <CopyButton value={created.secret} label="Copy key" className="size-8" />
        </div>
        <p className="max-w-2xl text-sm text-muted">
          Sign in with it here, send it as <code className="text-text">Authorization: Bearer …</code> to the API, or add it to an MCP client.
        </p>
        <div>
          <Button variant="primary" onClick={() => router.push("/settings/keys")}>
            Done
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader back={{ href: "/settings/keys", label: "API keys" }} title="New API key" />
      <form
        noValidate
        onSubmit={handleSubmit(async (values) => {
          const result = await createKey({
            name: values.name,
            preset: values.preset,
            // A date input yields `YYYY-MM-DD`; the key expires at the end of that day in the organization's time zone.
            expires_at: values.expires_on ? new Date(new Date(fromDateTimeLocal(`${values.expires_on}T23:59`)!).getTime() + 59_999).toISOString() : null,
          });
          if (result.data) setCreated(result.data);
        })}
      >
        <SettingsSection title="Key" description="The name is only for telling keys apart.">
          <div className="flex flex-col gap-4">
            <Field label="Name" error={errors.name?.message}>
              {(props) => <Input {...props} {...register("name")} placeholder="e.g. ops laptop, ci, claude" />}
            </Field>
            <Field label="Expires on" optional hint={`Expires at the end of that day, ${getDisplayTimeZone()} time. Leave empty for a key that never expires.`}>
              {(props) => <Input {...props} {...register("expires_on")} type="date" className="tabular max-w-52" />}
            </Field>
          </div>
        </SettingsSection>
        <SettingsSection title="Access" description="Presets expand to a fixed set of claims. A key can't later change its own.">
          <fieldset className="flex flex-col gap-2">
            <legend className="sr-only">Preset</legend>
            {PRESETS.map((option) => (
              <label
                key={option}
                className={cx(
                  "flex cursor-pointer gap-3 rounded-card border p-3.5 transition-colors has-focus-visible:outline-2 has-focus-visible:outline-focus",
                  preset === option ? "border-text bg-raised" : "border-control hover:bg-raised",
                )}
              >
                <input type="radio" value={option} {...register("preset")} className="mt-1 accent-(--accent)" />
                <span className="flex flex-col gap-0.5">
                  <span className="text-sm font-medium text-text">{capitalize(option)}</span>
                  <span className="text-sm text-muted">{PRESET_DESCRIPTIONS[option]}</span>
                </span>
              </label>
            ))}
          </fieldset>
        </SettingsSection>
        <div className="flex flex-col gap-3 border-t border-border pt-5 lg:pl-[360px]">
          <FormError error={error} />
          <FormActions>
            <Button variant="ghost" onClick={() => router.push("/settings/keys")}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" isLoading={isLoading}>
              Create key
            </Button>
          </FormActions>
        </div>
      </form>
    </div>
  );
}
