"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { zodResolver } from "@hookform/resolvers/zod";
import { Controller, FormProvider, useForm } from "react-hook-form";
import { useAuth } from "@/contexts/AuthContext";
import { GoogleSignInButton } from "@/components/auth/GoogleSignInButton";
import { FormStageActions } from "@/components/forms/FormStageActions";
import { FormStageBlock } from "@/components/forms/FormStageBlock";
import { FormStageField } from "@/components/forms/FormStageField";
import { FormView } from "@/components/forms/core/FormView";
import { postLoginRoute } from "@/core/auth/postLoginRoute";
import { loginSchema, type LoginFormValues } from "@/domains/users/schemas/login.schema";
import { userFacingError } from "@/lib/userMessages";

const DEFAULT_VALUES: LoginFormValues = {
  identifier: "",
  password: "",
  keepLoggedIn: true,
};
const LINK_MOTION_CLASS =
  "transition-[color,transform,opacity] duration-150 ease-out hover:-translate-y-px hover:opacity-100 active:translate-y-0 motion-reduce:transition-none motion-reduce:hover:translate-y-0";

export default function LoginPage() {
  const auth = useAuth();
  const router = useRouter();
  const form = useForm<LoginFormValues>({
    defaultValues: DEFAULT_VALUES,
    resolver: zodResolver(loginSchema),
    mode: "onChange",
  });
  const [error, setError] = useState<string | null>(null);
  const [googleBusy, setGoogleBusy] = useState(false);

  useEffect(() => {
    if (!auth.isHydrated || !auth.isLoggedIn) return;
    router.replace(auth.user ? postLoginRoute(auth.user) : "/");
  }, [auth.isHydrated, auth.isLoggedIn, auth.user, router]);

  const onSubmit = async ({ identifier, password, keepLoggedIn }: LoginFormValues) => {
    setError(null);
    try {
      const session = await auth.login(identifier, password, keepLoggedIn);
      router.push(postLoginRoute(session));
    } catch (err) {
      setError(userFacingError(err));
    }
  };

  const onGoogleCredential = async (credential: string) => {
    setError(null);
    setGoogleBusy(true);
    try {
      const session = await auth.loginWithGoogle(credential, form.getValues("keepLoggedIn"));
      router.push(postLoginRoute(session));
    } catch (err) {
      setError(userFacingError(err));
    } finally {
      setGoogleBusy(false);
    }
  };

  return (
    <div className="mx-auto max-w-xl px-4 py-16">
      <FormProvider {...form}>
        <FormView
          eyebrow="Acesso interno"
          title="Entrar"
          description="Entre com seu nome de usuário ou e-mail e a senha da banda."
          onSubmit={form.handleSubmit(onSubmit)}
          noValidate
          className="sm:p-8"
          formClassName="space-y-4"
        >
          <div>
            <GoogleSignInButton
              text="signin_with"
              onCredential={(credential) => void onGoogleCredential(credential)}
              disabled={googleBusy || form.formState.isSubmitting}
            />
            <div
              className="my-6 flex items-center gap-3 text-xs uppercase tracking-[0.2em] text-[var(--muted)]"
              aria-hidden="true"
            >
              <span className="h-px flex-1 bg-[var(--border)]" />
              ou
              <span className="h-px flex-1 bg-[var(--border)]" />
            </div>
          </div>

          <FormStageBlock title="Credenciais" surface="plain" className="!pb-0">
            <div className="space-y-4">
              <FormStageField<LoginFormValues>
                name="identifier"
                label="Usuário ou e-mail"
                placeholder="nome.sobrenome ou voce@exemplo.com"
                autoComplete="username"
                autoCapitalize="none"
                spellCheck={false}
                infoMessage="Informe seu nome de usuário ou e-mail cadastrado."
                disabled={googleBusy}
                onEdit={() => setError(null)}
              />
              <FormStageField<LoginFormValues>
                name="password"
                label="Senha"
                type="password"
                placeholder="Sua senha"
                autoComplete="current-password"
                infoMessage="Digite a senha da sua conta."
                disabled={googleBusy}
                onEdit={() => setError(null)}
              />
              <Controller
                control={form.control}
                name="keepLoggedIn"
                render={({ field }) => (
                  <label className="flex min-h-11 items-center gap-2 text-sm">
                    <input
                      ref={field.ref}
                      name={field.name}
                      type="checkbox"
                      checked={field.value}
                      onChange={field.onChange}
                      onBlur={field.onBlur}
                      disabled={googleBusy}
                    />
                    Manter conectado
                  </label>
                )}
              />
            </div>
          </FormStageBlock>

          {error ? (
            <p
              className="rounded-md border border-[var(--destructive)]/40 px-3 py-2 text-sm text-[var(--destructive)] starting:translate-y-1 starting:opacity-0 transition-[opacity,transform] duration-200 ease-[cubic-bezier(0.2,0,0,1)] motion-reduce:transition-none motion-reduce:starting:translate-y-0 motion-reduce:starting:opacity-100"
              role="alert"
            >
              {error}
            </p>
          ) : null}

          <FormStageActions
            active={0}
            total={1}
            busy={googleBusy || form.formState.isSubmitting}
            onBack={() => undefined}
            onNext={() => undefined}
            fullWidth
            submitLabel="Entrar"
            pendingLabel="Entrando…"
          />

          <div className="flex flex-wrap justify-between gap-3 text-sm">
            <Link href="/esqueci-senha" className={`inline-flex min-h-11 items-center ${LINK_MOTION_CLASS}`}>
              Esqueci a senha
            </Link>
            <Link href="/cadastro" className={`inline-flex min-h-11 items-center ${LINK_MOTION_CLASS}`}>
              Criar cadastro
            </Link>
          </div>
        </FormView>
      </FormProvider>
    </div>
  );
}
