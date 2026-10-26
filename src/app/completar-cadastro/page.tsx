"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { FormProvider, useForm } from "react-hook-form";
import { useRouter } from "next/navigation";
import { GoogleProfileAddressFields } from "@/components/auth/GoogleProfileAddressFields";
import { FormStageActions } from "@/components/forms/FormStageActions";
import { FormStageBlock } from "@/components/forms/FormStageBlock";
import { FormStageField } from "@/components/forms/FormStageField";
import { FormView } from "@/components/forms/core/FormView";
import { MusicLoader } from "@/components/MusicLoader";
import { UserAvatar } from "@/components/auth/UserAvatar";
import { useAuth, type SessionUser } from "@/contexts/AuthContext";
import { postLoginRoute } from "@/core/auth/postLoginRoute";
import {
  GOOGLE_COMPLETION_DEFAULTS,
  googleCompletionPayload,
  googleCompletionSchema,
  type GoogleCompletionFormValues,
} from "@/domains/users/schemas/google-completion.schema";
import { apiFetch } from "@/lib/api";
import { formatPhoneNumber } from "@/lib/formatPhone";
import { userFacingError } from "@/lib/userMessages";

export default function CompletarCadastroPage() {
  const auth = useAuth();
  const { logout } = auth;
  const router = useRouter();
  const exitStarted = useRef(false);
  const backTrapInstalled = useRef(false);
  const [error, setError] = useState<string | null>(null);
  const form = useForm<GoogleCompletionFormValues>({
    defaultValues: GOOGLE_COMPLETION_DEFAULTS,
    resolver: zodResolver(googleCompletionSchema),
    mode: "onChange",
  });
  const { reset } = form;

  useEffect(() => {
    if (!auth.isHydrated) return;
    if (!auth.isLoggedIn) {
      router.replace("/login");
      return;
    }
    if (!auth.user?.needsProfileCompletion) {
      router.replace(auth.user ? postLoginRoute(auth.user) : "/login");
      return;
    }
    const phone =
      auth.user.phone && auth.user.phone.replace(/\D/g, "").length >= 10
        ? formatPhoneNumber(auth.user.phone)
        : "";
    reset({
      ...GOOGLE_COMPLETION_DEFAULTS,
      username: auth.user.username ?? "",
      phone,
    });
  }, [auth.isHydrated, auth.isLoggedIn, auth.user, reset, router]);

  const exitToLogin = useCallback(async () => {
    if (exitStarted.current) return;
    exitStarted.current = true;
    await logout();
    router.replace("/login");
  }, [logout, router]);

  useEffect(() => {
    if (
      !auth.isHydrated ||
      !auth.user?.needsProfileCompletion ||
      exitStarted.current
    )
      return;

    if (!backTrapInstalled.current) {
      window.history.pushState(null, "", window.location.href);
      backTrapInstalled.current = true;
    }
    const handleBackNavigation = () => {
      void exitToLogin();
    };
    window.addEventListener("popstate", handleBackNavigation);
    return () => window.removeEventListener("popstate", handleBackNavigation);
  }, [auth.isHydrated, auth.user?.needsProfileCompletion, exitToLogin]);

  const onSubmit = async (values: GoogleCompletionFormValues) => {
    setError(null);
    try {
      const updated = await apiFetch<SessionUser>("/auth/me", {
        method: "PATCH",
        body: JSON.stringify(googleCompletionPayload(values)),
      });
      auth.updateProfile(updated);
      router.replace(postLoginRoute(updated));
    } catch (caught) {
      setError(userFacingError(caught));
    }
  };

  if (
    !auth.isHydrated ||
    !auth.isLoggedIn ||
    !auth.user?.needsProfileCompletion
  )
    return null;

  return (
    <div className="mx-auto max-w-xl px-4 py-8 sm:py-12">
      <FormProvider {...form}>
        <FormView
          eyebrow="Acesso interno"
          title="Complete seu cadastro"
          description={`Você entrou com Google como ${auth.user.name} (${auth.user.email ?? "e-mail não informado"}). Informe data de nascimento, confira telefone e endereço; documento é opcional. Não é preciso criar senha.`}
          onSubmit={form.handleSubmit(onSubmit)}
          noValidate
          className="p-5 sm:p-8"
          formClassName="space-y-5"
        >
          <div className="flex items-center gap-4">
            <UserAvatar
              url={auth.user.pictureUrl}
              name={auth.user.name}
              className="h-14 w-14 shrink-0"
            />
            <p className="text-sm text-[var(--muted)]">
              Nome e foto do Google já foram associados. Depois de enviar, a
              equipe da banda analisa se você é Amigos ou perfil interno
              (aluno/músico).
            </p>
          </div>

          <FormStageBlock
            title="Seus dados"
            surface="plain"
            className="!pb-0"
          >
            <div className="space-y-4">
              <FormStageField<GoogleCompletionFormValues>
                name="birthDate"
                label="Data de nascimento"
                type="date"
                autoComplete="bday"
                max={new Date().toISOString().slice(0, 10)}
                infoMessage="Menores de 18 anos precisam ser cadastrados pela secretaria da banda."
              />
              <FormStageField<GoogleCompletionFormValues>
                name="username"
                label="Nome de usuário"
                autoComplete="username"
                autoCapitalize="none"
                spellCheck={false}
                minLength={3}
                maxLength={60}
                formatValue={(value) => value.toLowerCase()}
                initialValueWarning="Gerado automaticamente. Trocar é opcional; você pode manter este nome de usuário."
                infoMessage="Use de 3 a 60 caracteres: letras minúsculas, números, ponto, hífen ou _."
              />
              <FormStageField<GoogleCompletionFormValues>
                name="phone"
                label="Telefone (WhatsApp)"
                type="tel"
                inputMode="tel"
                autoComplete="tel"
                placeholder="(35) 99999-9999"
                formatValue={formatPhoneNumber}
                infoMessage="Confira se o número está correto — a banda usa para contato."
              />
            </div>
          </FormStageBlock>

          <FormStageBlock
            title="Endereço"
            description="Documento é opcional; endereço e telefone corretos ajudam a banda a falar com você."
            surface="plain"
            className="!pb-0"
          >
            <GoogleProfileAddressFields />
          </FormStageBlock>

          {error ? (
            <p
              className="rounded-xl border border-[var(--destructive)]/40 p-3 text-sm text-[var(--destructive)]"
              role="alert"
            >
              {error}
            </p>
          ) : null}

          <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <button
              type="button"
              className="inline-flex min-h-12 w-full items-center justify-center rounded-xl border border-[var(--border)] px-4 text-sm font-semibold text-[var(--foreground)] hover:bg-[var(--accent)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--ring)] disabled:opacity-50 sm:w-auto"
              onClick={() => void exitToLogin()}
              disabled={form.formState.isSubmitting}
            >
              Cancelar e sair
            </button>
            <FormStageActions
              active={0}
              total={1}
              busy={form.formState.isSubmitting}
              onBack={() => undefined}
              onNext={() => undefined}
              submitLabel="Continuar para o painel"
              pendingContent={<MusicLoader compact label="Salvando…" />}
            />
          </div>
        </FormView>
      </FormProvider>
    </div>
  );
}
