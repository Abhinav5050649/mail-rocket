"use client";

import * as React from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/field";
import { FormError } from "@/components/ui/feedback";
import { signinSchema, type SigninFormValues } from "@/lib/validation/authSchema";
import { useSigninMutation } from "@/features/auth";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [signin, { isLoading, error }] = useSigninMutation();
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<SigninFormValues>({ resolver: zodResolver(signinSchema), defaultValues: { key: "" } });

  const onSubmit = async (values: SigninFormValues) => {
    const result = await signin(values);
    if (!("error" in result)) router.push(searchParams.get("next") || "/");
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="flex flex-col gap-5">
      <div className="flex flex-col gap-1">
        <h1 className="text-title font-semibold tracking-[-0.01em] text-text">Sign in</h1>
        <p className="text-sm text-muted">Paste an API key issued by this Mail Rocket instance.</p>
      </div>

      <Field label="API key" error={errors.key?.message}>
        {(props) => (
          <Input {...props} {...register("key")} type="password" autoComplete="current-password" autoFocus spellCheck={false} placeholder="mr_…" className="font-mono" />
        )}
      </Field>

      <FormError error={error} />

      <Button type="submit" variant="primary" isLoading={isLoading} className="h-9 w-full">
        Sign in
      </Button>

      <p className="border-t border-rule pt-4 text-sm text-muted">
        No key yet? The API prints an admin key the first time it starts. Or run <code className="text-text">bun run key:create</code> on the server.
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
