"use client";

import { useRouter } from "next/navigation";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { AtSign, Globe01 } from "@untitledui/icons";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/field";
import { FormActions, PageHeader, SettingsSection } from "@/components/ui/page";
import { FormError } from "@/components/ui/feedback";
import { useCreateIdentityMutation } from "@/features/identities";
import { cx } from "@/utils/cx";

const identitySchema = z
  .object({ type: z.enum(["domain", "email"]), identity: z.string().trim().min(1, "Required") })
  .superRefine((values, ctx) => {
    if (values.type === "email" && !z.email().safeParse(values.identity).success) {
      ctx.addIssue({ code: "custom", path: ["identity"], message: "Enter a full email address, like news@yourdomain.com" });
    }
    if (values.type === "domain" && (values.identity.includes("@") || !values.identity.includes("."))) {
      ctx.addIssue({ code: "custom", path: ["identity"], message: "Enter a domain, like yourdomain.com" });
    }
  });
type IdentityFormValues = z.infer<typeof identitySchema>;

const TYPES = [
  { value: "domain", label: "Domain", icon: Globe01, description: "Send from any address on it. You add DNS records to verify it." },
  { value: "email", label: "Email address", icon: AtSign, description: "Send from this one address. SES emails it a confirmation link." },
] as const;

export default function NewIdentityPage() {
  const router = useRouter();
  const [createIdentity, { isLoading, error }] = useCreateIdentityMutation();
  const {
    control,
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<IdentityFormValues>({ resolver: zodResolver(identitySchema), defaultValues: { type: "domain", identity: "" } });
  const type = useWatch({ control, name: "type" });

  return (
    <div className="flex flex-col gap-6">
      <PageHeader back={{ href: "/identities", label: "Identities" }} title="Add identity" description="Registers it with SES and starts verification." />
      <form
        noValidate
        onSubmit={handleSubmit(async (values) => {
          const result = await createIdentity({ type: values.type, identity: values.identity.trim().toLowerCase() });
          if (result.data) router.push(`/identities/${result.data.id}`);
        })}
      >
        <SettingsSection title="What to send from" description="A domain is the usual choice: one verification covers every address on it.">
          <div className="flex flex-col gap-5">
            <fieldset className="grid gap-2 sm:grid-cols-2">
              <legend className="sr-only">Identity type</legend>
              {TYPES.map((option) => (
                <label
                  key={option.value}
                  className={cx(
                    "flex cursor-pointer gap-3 rounded-card border p-3.5 transition-colors has-focus-visible:outline-2 has-focus-visible:outline-focus",
                    type === option.value ? "border-text bg-raised" : "border-control hover:bg-raised",
                  )}
                >
                  <input type="radio" value={option.value} {...register("type")} className="sr-only" />
                  <option.icon className="mt-0.5 size-4 shrink-0 text-muted" />
                  <span className="flex flex-col gap-0.5">
                    <span className="text-sm font-medium text-text">{option.label}</span>
                    <span className="text-xs text-muted">{option.description}</span>
                  </span>
                </label>
              ))}
            </fieldset>
            <Field label={type === "domain" ? "Domain" : "Email address"} error={errors.identity?.message}>
              {(props) => (
                <Input
                  {...props}
                  {...register("identity")}
                  type={type === "email" ? "email" : "text"}
                  autoComplete="off"
                  spellCheck={false}
                  placeholder={type === "domain" ? "yourdomain.com" : "news@yourdomain.com"}
                  className="max-w-md"
                />
              )}
            </Field>
          </div>
        </SettingsSection>

        <SettingsSection title="What happens next">
          <ol className="flex list-decimal flex-col gap-1.5 pl-5 text-sm text-text marker:text-muted">
            {type === "domain" ? (
              <>
                <li>SES returns a TXT record and three DKIM CNAME records.</li>
                <li>Add them at your DNS provider. They&apos;re listed on the next screen, ready to copy.</li>
                <li>Mail Rocket checks with SES every 5 minutes and marks the domain verified once DNS has propagated.</li>
              </>
            ) : (
              <>
                <li>SES sends a confirmation email to the address.</li>
                <li>Open it and click the link.</li>
                <li>Mail Rocket checks with SES every 5 minutes and marks the address verified.</li>
              </>
            )}
          </ol>
        </SettingsSection>

        <div className="flex flex-col gap-3 border-t border-border pt-5 lg:pl-[360px]">
          <FormError error={error} />
          <FormActions>
            <Button variant="ghost" onClick={() => router.push("/identities")}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" isLoading={isLoading}>
              Add {type === "domain" ? "domain" : "email address"}
            </Button>
          </FormActions>
        </div>
      </form>
    </div>
  );
}
