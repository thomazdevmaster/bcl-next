"use client";

import { useState } from "react";
import Link from "next/link";
import { zodResolver } from "@hookform/resolvers/zod";
import { FormProvider, useForm } from "react-hook-form";
import { FormStageActions } from "@/components/forms/FormStageActions";
import { FormStageBlock } from "@/components/forms/FormStageBlock";
import { FormStageField } from "@/components/forms/FormStageField";
import { FormView } from "@/components/forms/core/FormView";
import type { ForgotPasswordFormValues } from "@/domains/users/schemas/forgot-password.schema";
import { forgotPasswordSchema } from "@/domains/users/schemas/forgot-password.schema";
import { apiFetch } from "@/lib/api";
import { userFacingError } from "@/lib/userMessages";

const DEFAULT_VALUES: ForgotPasswordFormValues = { identifier: "" };
const DEFAULT_RESPONSE = "Se o usuário estiver cadastrado e aprovado, a equipe libera uma senha nova no painel.";

export default function EsqueciSenhaPage() {
  const form = useForm<ForgotPasswordFormValues>({
    defaultValues: DEFAULT_VALUES,
    resolver: zodResolver(forgotPasswordSchema),
    mode: "onChange",
  });
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const onSubmit = async ({ identifier }: ForgotPasswordFormValues) => {
    setError(null);
    try {
      const response = await apiFetch<{ message?: string }>("/auth/forgot-password", {
        method: "POST",
        body: JSON.stringify({ username: identifier }),
      });
      setMessage(response?.message?.trim() || DEFAULT_RESPONSE);
    } catch (caught) {
      setError(userFacingError(caught));
    }
  };

  if (message) {
    return (
      <div className="mx-auto max-w-md px-4 py-10">
        <section className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-6 shadow-[var(--shadow-soft)] sm:p-8">
          <p className="text-xs uppercase tracking-[0.2em] text-[var(--muted)]">Acesso interno</p>
          <h1 className="mt-2 text-3xl font-semibold">Pedido recebido</h1>
          <p className="mt-8 text-sm" role="status">{message}</p>
          <Link
            href="/login"
            className="btn-primary mt-4 inline-flex min-h-11 items-center px-4 hover:text-[var(--primary-foreground)] hover:opacity-100 hover:no-underline"
          >
            Voltar ao login
          </Link>
        </section>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-md px-4 py-10">
      <FormProvider {...form}>
        <FormView
          eyebrow="Acesso interno"
          title="Esqueci a senha"
          description="Informe usuário ou e-mail. Quem autoriza cadastros vê o pedido no painel, gera uma senha nova e te envia."
          onSubmit={form.handleSubmit(onSubmit)}
          noValidate
          formClassName="mt-8 space-y-4"
        >
          <FormStageBlock title="Identificação" surface="plain" className="!pb-0">
            <FormStageField<ForgotPasswordFormValues>
              name="identifier"
              label="Usuário ou e-mail"
              type="text"
              autoComplete="username"
              autoCapitalize="none"
              spellCheck={false}
              infoMessage="Informe o usuário ou e-mail associado à conta."
              onEdit={() => setError(null)}
            />
          </FormStageBlock>
          {error ? (
            <p className="rounded-md border border-[var(--destructive)]/40 px-3 py-2 text-sm text-[var(--destructive)]" role="alert">
              {error}
            </p>
          ) : null}
          <FormStageActions
            active={0}
            total={1}
            busy={form.formState.isSubmitting}
            onBack={() => undefined}
            onNext={() => undefined}
            centered
            submitLabel="Pedir nova senha"
            pendingLabel="Enviando…"
          />
          <div className="flex justify-center">
            <Link href="/login" className="inline-flex min-h-11 items-center justify-center text-sm">
              Voltar ao login
            </Link>
          </div>
        </FormView>
      </FormProvider>
    </div>
  );
}
