"use client";

import { useRouter } from "next/navigation";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Input } from "@/components/base/input/input";
import { NativeSelect } from "@/components/base/select/select-native";
import { Button } from "@/components/base/buttons/button";
import { getApiErrorMessage } from "@/lib/redux/api/errors";
import { useCreateIdentityMutation } from "@/features/identities";

const identitySchema = z.object({
  type: z.enum(["domain", "email"]),
  identity: z.string().min(1, "Required"),
});
type IdentityFormValues = z.infer<typeof identitySchema>;

const TYPE_OPTIONS = [
  { label: "Domain", value: "domain" },
  { label: "Email", value: "email" },
];

export default function NewIdentityPage() {
  const router = useRouter();
  const [createIdentity, { isLoading, error }] = useCreateIdentityMutation();

  const {
    control,
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<IdentityFormValues>({ resolver: zodResolver(identitySchema), defaultValues: { type: "domain", identity: "" } });

  const onSubmit = async (values: IdentityFormValues) => {
    const result = await createIdentity({ ...values });
    if (result.data) {
      router.push(`/identities/${result.data.id}`);
    }
  };

  return (
    <div className="flex max-w-lg flex-col gap-6">
      <h1 className="text-xl font-semibold text-primary">New identity</h1>
      <form onSubmit={handleSubmit(onSubmit)} noValidate className="flex flex-col gap-5">
        {error && <p className="rounded-lg bg-error-primary px-3 py-2 text-sm text-error-primary ring-1 ring-error_subtle">{getApiErrorMessage(error)}</p>}
        <NativeSelect label="Type" options={TYPE_OPTIONS} {...register("type")} />
        <Controller
          control={control}
          name="identity"
          render={({ field }) => (
            <Input {...field} label="Domain or email address" isInvalid={!!errors.identity} hint={errors.identity?.message} />
          )}
        />
        <div className="flex gap-3">
          <Button type="submit" isLoading={isLoading}>
            Create identity
          </Button>
          <Button type="button" color="link-gray" onClick={() => router.push(`/identities`)}>
            Cancel
          </Button>
        </div>
      </form>
    </div>
  );
}
