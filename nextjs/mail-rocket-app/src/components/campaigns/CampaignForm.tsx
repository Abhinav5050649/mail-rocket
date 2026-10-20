"use client";

import Link from "next/link";
import { Controller, useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import type { FetchBaseQueryError } from "@reduxjs/toolkit/query";
import type { SerializedError } from "@reduxjs/toolkit";
import { Field, Input, Select, Textarea } from "@/components/ui/field";
import { Button } from "@/components/ui/button";
import { FormActions, SettingsSection } from "@/components/ui/page";
import { FormError, Notice } from "@/components/ui/feedback";
import { campaignSchema, type CampaignFormValues } from "@/lib/validation/campaignSchema";
import { useGetIdentitiesQuery } from "@/features/identities";
import { formatRelative, fromDateTimeLocal, toDateTimeLocal } from "@/lib/format";
import type { CampaignInput } from "@/features/campaigns";
import type { Campaign } from "@/types/resources";

interface CampaignFormProps {
  mode: "create" | "edit";
  initialData?: Campaign;
  /** Receives the API payload: empty strings dropped, the start time as ISO (null clears a schedule on edit). */
  onSubmit: (values: CampaignInput) => void;
  isSubmitting: boolean;
  error?: FetchBaseQueryError | SerializedError;
  onCancel?: () => void;
  /** Read-only rendering for keys without `update Campaign`. */
  readOnly?: boolean;
}

/** Statuses whose start time can still change; once a send starts the schedule is fixed. */
const SCHEDULABLE = new Set(["draft", "scheduled"]);

/** The viewer's time zone, named so a start time is never ambiguous. */
const timeZone = () => Intl.DateTimeFormat().resolvedOptions().timeZone;

/**
 * Campaign fields in three settings rows: the message, when and from whom
 * it sends, and notes. Local react-hook-form state, committed on submit.
 */
export function CampaignForm({ mode, initialData, onSubmit, isSubmitting, error, onCancel, readOnly }: CampaignFormProps) {
  const { data: identities, isLoading: identitiesLoading } = useGetIdentitiesQuery({ limit: 100 });
  const verified = identities?.filter((identity) => identity.status === "active") ?? [];
  const canReschedule = !initialData || SCHEDULABLE.has(initialData.status);

  const {
    control,
    register,
    handleSubmit,
    formState: { errors, isDirty },
  } = useForm<CampaignFormValues>({
    resolver: zodResolver(campaignSchema),
    defaultValues: {
      name: initialData?.name ?? "",
      subject: initialData?.subject ?? "",
      start_time: toDateTimeLocal(initialData?.start_time),
      identity_id: initialData?.identity_id ?? "",
      description: initialData?.description ?? "",
    },
  });
  const startTime = useWatch({ control, name: "start_time" });
  const identityId = useWatch({ control, name: "identity_id" });

  const submit = (values: CampaignFormValues) => {
    const startIso = fromDateTimeLocal(values.start_time);
    onSubmit({
      name: values.name.trim(),
      subject: values.subject || undefined,
      identity_id: values.identity_id || undefined,
      description: values.description || undefined,
      // On edit an emptied start time cancels the scheduled send; on create it's simply omitted.
      ...(canReschedule ? { start_time: startIso ?? (mode === "edit" ? null : undefined) } : {}),
    });
  };

  // Keep the current sender selectable even if it is no longer verified.
  const current = identities?.find((identity) => identity.id === initialData?.identity_id);
  const senderOptions = [
    { label: "No sender yet", value: "" },
    ...verified.map((identity) => ({ label: identity.identity, value: identity.id })),
    ...(current && current.status !== "active" ? [{ label: `${current.identity} (not verified)`, value: current.id }] : []),
  ];
  const scheduling = Boolean(startTime);

  return (
    <form onSubmit={handleSubmit(submit)} noValidate>
      <fieldset disabled={readOnly} className="contents">
        <SettingsSection title="Message" description="The name is for your team; recipients see the subject line.">
          <div className="flex flex-col gap-4">
            <Field label="Campaign name" error={errors.name?.message}>
              {(props) => <Input {...props} {...register("name")} placeholder="Autumn product update" />}
            </Field>
            <Field label="Subject line" optional hint="Template variables work here too, e.g. {{recipient_first_name}}.">
              {(props) => <Input {...props} {...register("subject")} placeholder="What's new this autumn" />}
            </Field>
          </div>
        </SettingsSection>

        <SettingsSection
          title="Sending"
          description={
            <>
              Setting a start time schedules the send. Leave it empty to keep the campaign a draft.
              <br />
              Times are in {timeZone()}.
            </>
          }
        >
          <div className="flex flex-col gap-4">
            {!identitiesLoading && verified.length === 0 && (
              <Notice
                title="No verified sender yet"
                action={
                  <Link href="/identities" className="text-sm font-medium whitespace-nowrap text-(--pill-warning-ink) underline">
                    Go to identities
                  </Link>
                }
              >
                A campaign can only send from an identity SES has verified.
              </Notice>
            )}
            <Field label="Send from" hint={verified.length > 0 ? "Only verified identities are listed." : undefined}>
              {(props) => (
              // Controlled, so the stored value shows once its options arrive.
              <Controller control={control} name="identity_id" render={({ field }) => <Select {...props} {...field} value={field.value ?? ""} options={senderOptions} />} />
            )}
            </Field>
            <Field
              label="Start time"
              optional
              error={errors.start_time?.message}
              hint={
                !canReschedule
                  ? "This campaign has already started sending, so its start time is fixed."
                  : startTime && fromDateTimeLocal(startTime)
                    ? `Sends ${formatRelative(fromDateTimeLocal(startTime)!)}.`
                    : undefined
              }
            >
              {(props) => <Input {...props} {...register("start_time")} type="datetime-local" disabled={!canReschedule || readOnly} className="tabular max-w-64" />}
            </Field>
            {scheduling && !identityId && canReschedule && (
              <p className="text-sm text-warning">Choose a sender too, or the campaign can&apos;t be scheduled.</p>
            )}
          </div>
        </SettingsSection>

        <SettingsSection title="Notes" description="Internal only. Never sent.">
          <Field label="Description" optional>
            {(props) => <Textarea {...props} {...register("description")} rows={3} />}
          </Field>
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
              {mode === "create" ? (scheduling ? "Create and schedule" : "Create draft") : "Save changes"}
            </Button>
          </FormActions>
        </div>
      )}
    </form>
  );
}
