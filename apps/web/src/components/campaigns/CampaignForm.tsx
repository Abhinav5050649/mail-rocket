"use client";

import Link from "next/link";
import { Controller, useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { senderEmail, senderProblem, FROM_NAME_MAX_LENGTH, FROM_LOCAL_PART_MAX_LENGTH } from "@mail-rocket/shared";
import type { FetchBaseQueryError } from "@reduxjs/toolkit/query";
import type { SerializedError } from "@reduxjs/toolkit";
import { Field, Input, Select, Textarea } from "@/components/ui/field";
import { Button } from "@/components/ui/button";
import { FormActions, SettingsSection } from "@/components/ui/page";
import { FormError, Notice } from "@/components/ui/feedback";
import { campaignSchema, type CampaignFormValues } from "@/lib/validation/campaignSchema";
import { useGetIdentitiesQuery } from "@/features/identities";
import { useGetTemplatesQuery } from "@/features/templates";
import { useGetGroupsQuery } from "@/features/groups";
import { useGetSubscribersQuery } from "@/features/subscribers";
import { useGetOrganizationQuery } from "@/features/organizations";
import { useAbility } from "@/hooks/useAbility";
import { useRefetchOnFocus } from "@/hooks/useRefetchOnFocus";
import { GroupPicker } from "@/components/subscribers/GroupPicker";
import { DateTimePicker, todayInZone } from "@/components/ui/date-picker";
import { TemplatePicker } from "./TemplatePicker";
import { SubscriberPicker } from "./SubscriberPicker";
import { formatRelative, formatZoneName, fromDateTimeLocal, getDisplayTimeZone, toDateTimeLocal } from "@/lib/format";
import { browserTimeZone, offsetLabel } from "@/lib/timezone";
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

/** Statuses whose start time, template and audience can still change; once a send starts they're fixed. */
const SCHEDULABLE = new Set(["draft", "scheduled"]);

/**
 * How many subscribers the pickers load. Enough for a self-hosted list; past
 * it the recipient count is shown as an upper bound instead of exact.
 */
const PICKER_LIMIT = 500;

/**
 * The whole campaign on one page, for create and edit alike: the message,
 * its content (a template from the library), its audience (groups plus
 * individually picked subscribers), when and from whom it sends, and notes.
 * Templates, groups and subscribers are picked here from their shared
 * libraries; creating a new one opens in a new tab and shows up here on
 * return. Local react-hook-form state, committed on submit.
 */
export function CampaignForm({ mode, initialData, onSubmit, isSubmitting, error, onCancel, readOnly }: CampaignFormProps) {
  const { ability } = useAbility();
  const { data: identities, isLoading: identitiesLoading } = useGetIdentitiesQuery({ limit: 100 });
  const verified = identities?.filter((identity) => identity.status === "active") ?? [];
  const canReschedule = !initialData || SCHEDULABLE.has(initialData.status);
  // What a campaign sends, and to whom, is fixed once its send starts (the API refuses changes too).
  const contentLocked = !canReschedule;

  // The libraries the pickers choose from, refreshed when the tab regains focus.
  const { data: templates, refetch: refetchTemplates } = useGetTemplatesQuery({ limit: 100 }, { skip: !ability.can("read", "Template") });
  const { data: groups, refetch: refetchGroups } = useGetGroupsQuery({ limit: 100 }, { skip: !ability.can("read", "Group") });
  const { data: subscribers, refetch: refetchSubscribers } = useGetSubscribersQuery({ limit: PICKER_LIMIT }, { skip: !ability.can("read", "Subscriber") });
  useRefetchOnFocus(refetchTemplates);
  useRefetchOnFocus(refetchGroups);
  useRefetchOnFocus(refetchSubscribers);
  // Fills {{organization_name}} in the template preview.
  const { data: organization } = useGetOrganizationQuery(undefined, { skip: !ability.can("read", "Organization") });

  const {
    control,
    register,
    handleSubmit,
    setError,
    formState: { errors, isDirty },
  } = useForm<CampaignFormValues>({
    resolver: zodResolver(campaignSchema),
    defaultValues: {
      name: initialData?.name ?? "",
      subject: initialData?.subject ?? "",
      start_time: toDateTimeLocal(initialData?.start_time),
      identity_id: initialData?.identity_id ?? "",
      from_local_part: initialData?.from_local_part ?? "",
      from_name: initialData?.from_name ?? "",
      template_id: initialData?.template_id ?? "",
      group_ids: initialData?.group_ids ?? [],
      subscriber_ids: initialData?.subscriber_ids ?? [],
      description: initialData?.description ?? "",
    },
  });
  const startTime = useWatch({ control, name: "start_time" });
  const identityId = useWatch({ control, name: "identity_id" });
  const fromLocalPart = useWatch({ control, name: "from_local_part" });
  const fromName = useWatch({ control, name: "from_name" });
  const templateId = useWatch({ control, name: "template_id" });
  const groupIds = useWatch({ control, name: "group_ids" });
  const subscriberIds = useWatch({ control, name: "subscriber_ids" });
  // The chosen sender; a domain one needs the address field, an email one is its own address.
  const selectedIdentity = identities?.find((identity) => identity.id === identityId);
  const isDomain = selectedIdentity?.type === "domain";

  const submit = (values: CampaignFormValues) => {
    // Only a domain sender uses a local part; for an email sender any typed value is ignored.
    const localPart = isDomain ? values.from_local_part?.trim() || null : null;
    const name = values.from_name?.trim() || null;

    // Same rules the API applies, checked here so the error lands on the right field.
    if (selectedIdentity) {
      const addressProblem = senderProblem(selectedIdentity.type, localPart, null);
      if (addressProblem) return setError("from_local_part", { message: addressProblem });
      const nameProblem = senderProblem("email", null, name);
      if (nameProblem) return setError("from_name", { message: nameProblem });
    }

    const startIso = fromDateTimeLocal(values.start_time);
    onSubmit({
      name: values.name.trim(),
      subject: values.subject || undefined,
      identity_id: values.identity_id || undefined,
      // On edit null clears a stored value; on create an unset one is simply omitted.
      from_local_part: localPart ?? (mode === "edit" ? null : undefined),
      from_name: name ?? (mode === "edit" ? null : undefined),
      // Sent only while they can still change; the API refuses them once the send has started.
      ...(contentLocked
        ? {}
        : {
            template_id: values.template_id || (mode === "edit" ? null : undefined),
            group_ids: values.group_ids,
            subscriber_ids: values.subscriber_ids,
          }),
      description: values.description || undefined,
      // On edit an emptied start time cancels the scheduled send; on create it's simply omitted.
      ...(canReschedule ? { start_time: startIso ?? (mode === "edit" ? null : undefined) } : {}),
    });
  };

  // Keep the current sender selectable even if it is no longer verified.
  const current = identities?.find((identity) => identity.id === initialData?.identity_id);
  const senderOptions = [
    { label: "No sender yet", value: "" },
    // A domain is labelled as such: any address on it can send, chosen below.
    ...verified.map((identity) => ({ label: identity.type === "domain" ? `${identity.identity} (domain)` : identity.identity, value: identity.id })),
    ...(current && current.status !== "active" ? [{ label: `${current.identity} (not verified)`, value: current.id }] : []),
  ];
  const scheduling = Boolean(startTime);

  // Who it would send to: everyone in a picked group plus everyone picked
  // individually, each once, minus people who unsubscribed. Exact while every
  // subscriber is loaded; past that, a sum that may count overlaps twice.
  const allLoaded = subscribers !== undefined && subscribers.length < PICKER_LIMIT;
  const pickedGroups = new Set(groupIds);
  const pickedPeople = new Set(subscriberIds);
  const recipients = allLoaded
    ? subscribers.filter((person) => !person.unsubscribed_at && (pickedPeople.has(person.id) || person.group_ids.some((id) => pickedGroups.has(id)))).length
    : (groups ?? []).filter((group) => pickedGroups.has(group.id)).reduce((total, group) => total + group.subscriber_count, 0) + subscriberIds.length;
  const recipientLine = `${allLoaded ? "Sends to" : "Sends to up to"} ${recipients} ${recipients === 1 ? "person" : "people"}${allLoaded ? ", each once" : ""}.`;

  // What scheduling still needs, named so the warning says exactly what's missing.
  const missingForSchedule = [!identityId && "a sender", !templateId && "a template"].filter(Boolean).join(" and ");
  // What inboxes will show as the sender, once there's an address to show.
  const previewEmail = selectedIdentity ? senderEmail(selectedIdentity, isDomain ? fromLocalPart?.trim() || null : null) : null;
  const previewName = fromName?.trim();
  const preview = previewEmail ? (previewName ? `${previewName} <${previewEmail}>` : previewEmail) : null;

  return (
    <form onSubmit={handleSubmit(submit)} noValidate>
      <fieldset disabled={readOnly} className="contents">
        <SettingsSection title="Message" description="The name is for your team; subscribers see the subject line.">
          <div className="flex flex-col gap-4">
            <Field label="Campaign name" error={errors.name?.message}>
              {(props) => <Input {...props} {...register("name")} placeholder="Autumn product update" />}
            </Field>
            <Field label="Subject line" optional hint="Template variables work here too, e.g. {{subscriber_first_name}}.">
              {(props) => <Input {...props} {...register("subject")} placeholder="What's new this autumn" />}
            </Field>
          </div>
        </SettingsSection>

        <SettingsSection
          title="Content"
          description={
            contentLocked
              ? "Fixed once the campaign started sending."
              : "The email body, from your template library. Any number of campaigns can share a template."
          }
        >
          <fieldset disabled={contentLocked} className="contents">
            <Field label="Template" error={errors.template_id?.message}>
              {(props) => (
                <Controller
                  control={control}
                  name="template_id"
                  render={({ field }) => (
                    <TemplatePicker
                      id={props.id}
                      templates={templates}
                      value={field.value ?? ""}
                      onChange={field.onChange}
                      disabled={contentLocked || readOnly}
                      organizationName={organization?.name}
                    />
                  )}
                />
              )}
            </Field>
          </fieldset>
        </SettingsSection>

        <SettingsSection
          title="Audience"
          description={
            contentLocked
              ? "Fixed once the campaign started sending."
              : "Everyone in the groups you pick, plus anyone picked individually. People in several groups get one email; people who unsubscribed get none."
          }
        >
          <fieldset disabled={contentLocked} className="flex flex-col gap-5">
            <Field
              label="Groups"
              hint={
                <a href="/groups/new" target="_blank" rel="noopener" className="underline-offset-3 hover:text-text hover:underline">
                  New group (opens in a new tab)
                </a>
              }
            >
              {(props) => (
                <Controller
                  control={control}
                  name="group_ids"
                  render={({ field }) => (
                    <GroupPicker
                      id={props.id}
                      groups={groups}
                      value={field.value}
                      onChange={field.onChange}
                      disabled={contentLocked || readOnly}
                      summary={(count) => (count === 0 ? "No groups picked." : `${count} group${count === 1 ? "" : "s"} picked.`)}
                    />
                  )}
                />
              )}
            </Field>
            <Field label="Individual subscribers" optional>
              {(props) => (
                <Controller
                  control={control}
                  name="subscriber_ids"
                  render={({ field }) => (
                    <SubscriberPicker id={props.id} subscribers={subscribers} value={field.value} onChange={field.onChange} disabled={contentLocked || readOnly} />
                  )}
                />
              )}
            </Field>
            <p className="tabular rounded-control bg-raised px-3 py-2 text-sm text-text">{recipientLine}</p>
          </fieldset>
        </SettingsSection>

        <SettingsSection
          title="Sending"
          description={
            <>
              Setting a start time schedules the send. Leave it empty to keep the campaign a draft.
              <br />
              Times are in the organization&apos;s time zone, {getDisplayTimeZone()} ({offsetLabel(getDisplayTimeZone())}).
              {browserTimeZone() !== getDisplayTimeZone() && <> Your computer is on {browserTimeZone()}.</>}
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
            {isDomain && (
              <Field
                label="From address"
                error={errors.from_local_part?.message}
                hint="Any address on a verified domain can send. It doesn't need a mailbox, but replies to it go nowhere without one."
              >
                {(props) => (
                  <div className="flex items-center gap-2">
                    <Input {...props} {...register("from_local_part")} placeholder="notifications" maxLength={FROM_LOCAL_PART_MAX_LENGTH} autoComplete="off" className="flex-1" />
                    <span className="shrink-0 text-sm text-muted">@{selectedIdentity.identity}</span>
                  </div>
                )}
              </Field>
            )}
            {identityId && (
              <Field
                label="Sender name"
                optional
                error={errors.from_name?.message}
                hint={preview ? `Inboxes show: ${preview}` : "Shown in inboxes instead of the bare address."}
              >
                {(props) => <Input {...props} {...register("from_name")} placeholder="Mail Rocket" maxLength={FROM_NAME_MAX_LENGTH} />}
              </Field>
            )}
            <Field
              label="Start time"
              optional
              error={errors.start_time?.message}
              hint={
                !canReschedule
                  ? "This campaign has already started sending, so its start time is fixed."
                  : startTime && fromDateTimeLocal(startTime)
                    ? `Sends ${formatRelative(fromDateTimeLocal(startTime)!)} (${formatZoneName(new Date(fromDateTimeLocal(startTime)!))}).`
                    : undefined
              }
            >
              {(props) => (
                <Controller
                  control={control}
                  name="start_time"
                  render={({ field }) => (
                    <DateTimePicker
                      {...props}
                      value={field.value ?? ""}
                      onChange={field.onChange}
                      // A new send can't be scheduled for a day that's already gone.
                      minDate={canReschedule ? todayInZone() : undefined}
                      isDisabled={!canReschedule || readOnly}
                      clearable
                    />
                  )}
                />
              )}
            </Field>
            {scheduling && missingForSchedule && canReschedule && (
              <p className="text-sm text-warning">Choose {missingForSchedule} too, or the campaign can&apos;t be scheduled.</p>
            )}
            {scheduling && canReschedule && recipients === 0 && (
              <p className="text-sm text-warning">No one is in the audience yet, so the send would have nobody to go to.</p>
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
