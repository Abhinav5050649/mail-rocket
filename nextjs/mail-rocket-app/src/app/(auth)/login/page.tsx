"use client";

import * as React from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Key01 } from "@untitledui/icons";
import { Input } from "@/components/base/input/input";
import { Button } from "@/components/base/buttons/button";
import { signinSchema, type SigninFormValues } from "@/lib/validation/authSchema";
import { useSigninMutation } from "@/features/auth";
import { getApiErrorMessage } from "@/lib/redux/api/errors";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [signin, { isLoading, error }] = useSigninMutation();

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<SigninFormValues>({ resolver: zodResolver(signinSchema), defaultValues: { key: "" } });

  const onSubmit = async (values: SigninFormValues) => {
    const result = await signin(values);
    if (!("error" in result)) {
      router.push(searchParams.get("next") || "/");
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="flex flex-col gap-6">
      <div className="flex flex-col gap-1 text-center">
        <h1 className="text-lg font-semibold text-primary">Sign in with an API key</h1>
        <p className="text-sm text-tertiary">Paste a key issued by this Mail Rocket instance.</p>
      </div>

      {error && <p className="rounded-lg bg-error-primary px-3 py-2 text-sm text-error-primary ring-1 ring-error_subtle">{getApiErrorMessage(error)}</p>}

      <Controller
        control={control}
        name="key"
        render={({ field }) => (
          <Input {...field} label="API key" type="password" placeholder="mr_..." icon={Key01} isInvalid={!!errors.key} hint={errors.key?.message} />
        )}
      />

      <Button type="submit" size="lg" isLoading={isLoading}>
        Sign in
      </Button>

      <p className="text-center text-sm text-tertiary">
        No key yet? The server prints an admin key on first boot, or run <code className="font-mono">bun run key:create</code> on it.
      </p>
    </form>
  );
}

export default function LoginPage() {
  return (
    <React.Suspense>
      <LoginForm />
    </React.Suspense>
  );
}
