"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { FormProvider, useForm } from "react-hook-form";
import { GoogleSignInButton } from "@/components/auth/GoogleSignInButton";
import { UserAvatar } from "@/components/auth/UserAvatar";
import { MusicLoader } from "@/components/MusicLoader";
import { FormStageBlock } from "@/components/forms/FormStageBlock";
import { FormStageField, type FormStageFieldProps } from "@/components/forms/FormStageField";
import { postLoginRoute } from "@/core/auth/postLoginRoute";
import { useAuth } from "@/contexts/AuthContext";
import type { SignupFormValues } from "@/domains/users/schemas/signup.schema";
import { signupSchema } from "@/domains/users/schemas/signup.schema";
import { apiFetch } from "@/lib/api";
import { sealPassword } from "@/lib/passwordCipher";
import { userFacingError } from "@/lib/userMessages";

type SignupFieldConfig = Omit<FormStageFieldProps<SignupFormValues>, "onEdit">;

type SignupStage = {
  title: string;
  description: string;
  fields: SignupFieldConfig[];
};

const SIGNUP_INITIAL_VALUES: SignupFormValues = {
  firstName: "",
  lastName: "",
  email: "",
  phone: "",
  birthDate: "",
  username: "",
  password: "",
  confirmPassword: "",
};

function formatPhoneNumber(value: string): string {
  const digits = value.replace(/\D/g, "").slice(0, 11);
  if (digits.length <= 2) return digits ? `(${digits}` : "";
  if (digits.length <= 6) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  if (digits.length <= 10) return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
}

function normalizeUsername(value: string): string {
  return value.toLowerCase().replace(/\s+/g, ".");
}

const STAGES: SignupStage[] = [
  {
    title: "Seus dados",
    description: "Comece com seu nome e sobrenome.",
    fields: [
      {
        name: "firstName",
        label: "Nome",
        type: "text",
        placeholder: "Seu primeiro nome",
        autoComplete: "given-name",
        infoMessage: "Digite seu primeiro nome.",
      },
      {
        name: "lastName",
        label: "Sobrenome",
        type: "text",
        placeholder: "Seu sobrenome",
        autoComplete: "family-name",
        infoMessage: "Digite seu sobrenome.",
      },
    ],
  },
  {
    title: "Contato",
    description: "Informe como a banda pode falar com você.",
    fields: [
      {
        name: "email",
        label: "E-mail",
        type: "email",
        placeholder: "voce@exemplo.com",
        autoComplete: "email",
        inputMode: "email",
        autoCapitalize: "none",
        spellCheck: false,
        infoMessage: "Digite um endereço de e-mail válido.",
        className: "sm:col-span-2",
      },
      {
        name: "phone",
        label: "Telefone",
        type: "tel",
        placeholder: "(00) 00000-0000",
        autoComplete: "tel",
        inputMode: "tel",
        formatValue: formatPhoneNumber,
        infoMessage: "Digite seu telefone com DDD.",
      },
      {
        name: "birthDate",
        label: "Data de nascimento",
        type: "date",
        autoComplete: "bday",
        max: new Date().toISOString().slice(0, 10),
        infoMessage: "Escolha sua data de nascimento.",
      },
    ],
  },
  {
    title: "Acesso",
    description: "Nome de usuário opcional e senha com pelo menos 8 caracteres.",
    fields: [
      {
        name: "username",
        label: "Nome de usuário",
        type: "text",
        placeholder: "nome.sobrenome (opcional)",
        autoComplete: "username",
        autoCapitalize: "none",
        spellCheck: false,
        required: false,
        optionalMessage: "Opcional. Se deixar em branco, um nome de usuário é gerado a partir do seu nome.",
        formatValue: normalizeUsername,
        infoMessage: "Digite um nome de usuário ou deixe em branco para gerar um.",
        className: "sm:col-span-2",
      },
      {
        name: "password",
        label: "Senha",
        type: "password",
        placeholder: "Mínimo de 8 caracteres",
        autoComplete: "new-password",
        minLength: 8,
        visibilityLabel: "senha",
        infoMessage: "Digite uma senha com pelo menos 8 caracteres.",
        validateOnChange: "confirmPassword",
      },
      {
        name: "confirmPassword",
        label: "Confirmar senha",
        type: "password",
        placeholder: "Repita a senha",
        autoComplete: "new-password",
        minLength: 8,
        visibilityLabel: "confirmação da senha",
        infoMessage: "Digite novamente a senha para confirmar.",
      },
    ],
  },
];

function FormFeedback({
  error,
  notice,
  picture,
}: {
  error: string | null;
  notice: string | null;
  picture: string | null;
}) {
  return (
    <div className="space-y-2" aria-live="polite">
      {error ? (
        <p
          className="rounded-md border border-[var(--destructive)]/40 px-3 py-2 text-sm text-[var(--destructive)] starting:translate-y-1 starting:opacity-0 transition-[opacity,transform] duration-200 ease-[cubic-bezier(0.2,0,0,1)] motion-reduce:transition-none motion-reduce:starting:translate-y-0 motion-reduce:starting:opacity-100"
          role="alert"
        >
          {error}
        </p>
      ) : null}
      {notice ? (
        <div
          className="flex items-center gap-3 rounded-md border border-[var(--border)] bg-[var(--card-secondary)] px-3 py-2 text-sm starting:translate-y-1 starting:opacity-0 transition-[opacity,transform] duration-200 ease-[cubic-bezier(0.2,0,0,1)] motion-reduce:transition-none motion-reduce:starting:translate-y-0 motion-reduce:starting:opacity-100"
          role="status"
        >
          {picture ? <UserAvatar url={picture} className="h-11 w-11 shrink-0" /> : null}
          <p className="m-0">{notice}</p>
        </div>
      ) : null}
    </div>
  );
}

function RegistrationSuccess({ message }: { message: string }) {
  return (
    <div className="mt-8 space-y-4 starting:translate-y-2 starting:scale-[0.98] starting:opacity-0 transition-[opacity,transform] duration-300 ease-[cubic-bezier(0.2,0,0,1)] motion-reduce:transition-none motion-reduce:starting:translate-y-0 motion-reduce:starting:scale-100 motion-reduce:starting:opacity-100">
      <p className="text-sm">{message}</p>
      <Link href="/login" className="btn-primary inline-flex min-h-11 items-center transition-transform duration-150 ease-out hover:-translate-y-px active:translate-y-0 active:scale-[0.98] motion-reduce:transition-none motion-reduce:hover:translate-y-0 motion-reduce:active:scale-100">
        Ir para o login
      </Link>
    </div>
  );
}

export default function CadastroPage() {
  const cardRef = useRef<HTMLDivElement>(null);
  const headingRef = useRef<HTMLDivElement>(null);
  const signupOptionsRef = useRef<HTMLDivElement>(null);
  const auth = useAuth();
  const router = useRouter();
  const form = useForm<SignupFormValues>({
    defaultValues: SIGNUP_INITIAL_VALUES,
    resolver: zodResolver(signupSchema),
    mode: "onChange",
    shouldUnregister: false,
  });
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [googlePicture] = useState<string | null>(null);
  const googleBusy = auth.googleSignInPending;
  const busy = saving || form.formState.isSubmitting || googleBusy;

  useEffect(() => {
    if (!Element.prototype.animate || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const animations = [
      cardRef.current?.animate(
        [
          { opacity: 0, transform: "translateY(8px)" },
          { opacity: 1, transform: "translateY(0)" },
        ],
        { duration: 360, easing: "cubic-bezier(0.2, 0, 0, 1)", fill: "both" },
      ),
      headingRef.current?.animate(
        [
          { opacity: 0, transform: "translateY(4px)" },
          { opacity: 1, transform: "translateY(0)" },
        ],
        { duration: 280, delay: 60, easing: "cubic-bezier(0.2, 0, 0, 1)", fill: "both" },
      ),
      signupOptionsRef.current?.animate(
        [
          { opacity: 0, transform: "translateY(4px)" },
          { opacity: 1, transform: "translateY(0)" },
        ],
        { duration: 280, delay: 110, easing: "cubic-bezier(0.2, 0, 0, 1)", fill: "both" },
      ),
    ].filter((animation): animation is Animation => animation != null);

    animations.forEach((animation) => {
      animation.onfinish = () => animation.cancel();
    });

    return () => animations.forEach((animation) => animation.cancel());
  }, []);

  const onGoogleCredential = async (credential: string) => {
    setError(null);
    setNotice(null);
    try {
      const session = await auth.loginWithGoogle(credential, true);
      router.push(postLoginRoute(session));
    } catch (caught) {
      setError(userFacingError(caught));
    }
  };

  const onSubmit = async (values: SignupFormValues) => {
    setError(null);
    try {
      const sealed = await sealPassword(values.password);
      const response = await apiFetch<{ message: string }>("/auth/signup", {
        method: "POST",
        body: JSON.stringify({
          firstName: values.firstName,
          lastName: values.lastName,
          email: values.email,
          phone: values.phone,
          birthDate: values.birthDate,
          username: values.username,
          password: sealed,
        }),
      });
      setMessage(response.message);
    } catch (caught) {
      setError(userFacingError(caught));
    }
  };

  return (
    <div className="mx-auto max-w-md px-4 py-10 lg:max-w-6xl lg:py-6">
      <div ref={cardRef} className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-6 shadow-[var(--shadow-soft)] sm:p-8">
        <div ref={headingRef}>
          <p className="text-xs uppercase tracking-[0.2em] text-[var(--muted)]">Faça parte da nossa comunidade</p>
          <h1 className="mt-2 text-3xl font-semibold">Criar cadastro</h1>
          <p className="mt-2 text-sm text-[var(--muted)]">
            Com Google, criamos seu perfil Amigos na hora — você só completa telefone e usuário. Pelo formulário abaixo,
            a conta aguarda autorização da banda.
          </p>
        </div>
        {message ? (
          <RegistrationSuccess message={message} />
        ) : (
          <>
            <div ref={signupOptionsRef}>
              <div className="mt-8 lg:mt-6">
                <GoogleSignInButton
                  text="continue_with"
                  onCredential={(credential) => void onGoogleCredential(credential)}
                  disabled={busy}
                />
              </div>
              <div
                className="my-6 flex items-center gap-3 text-xs uppercase tracking-[0.2em] text-[var(--muted)] lg:my-4"
                aria-hidden="true"
              >
                <span className="h-px flex-1 bg-[var(--border)]" />
                ou
                <span className="h-px flex-1 bg-[var(--border)]" />
              </div>
              <FormProvider {...form}>
                <form className="mt-6 space-y-6" onSubmit={form.handleSubmit(onSubmit)} noValidate>
                <div className="space-y-1">
                  {STAGES.map((stage, index) => (
                    <FormStageBlock
                      key={stage.title}
                      id={`form-stage-${index}`}
                      number={index + 1}
                      title={stage.title}
                      description={stage.description}
                      surface="plain"
                    >
                      <div className="grid grid-cols-1 gap-x-4 gap-y-6 pt-2 sm:grid-cols-2">
                        {stage.fields.map((field) => (
                          <FormStageField<SignupFormValues> key={field.name} {...field} onEdit={() => setError(null)} />
                        ))}
                      </div>
                    </FormStageBlock>
                  ))}
                </div>
                <FormFeedback error={error} notice={notice} picture={googlePicture} />
                <div className="flex flex-col-reverse gap-3 border-t border-[var(--border)] pt-5 sm:flex-row sm:items-center sm:justify-between">
                  <p className="m-0 text-xs leading-5 text-[var(--muted)]">
                    Os campos com * são obrigatórios. Menores de idade devem fazer o cadastro pela secretaria.
                  </p>
                  <button
                    type="submit"
                    disabled={busy}
                    className="btn-primary inline-flex min-h-12 w-full items-center justify-center rounded-xl px-5 text-sm font-semibold transition-[transform,box-shadow] duration-150 ease-out hover:-translate-y-px active:translate-y-0 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50 motion-reduce:transition-none motion-reduce:hover:translate-y-0 motion-reduce:active:scale-100 sm:w-auto"
                  >
                    {busy ? <MusicLoader compact label="Enviando…" /> : "Enviar cadastro"}
                  </button>
                </div>
                <div className="flex justify-center">
                  <Link href="/login" className="inline-flex min-h-11 items-center justify-center text-sm">
                    Já tenho conta
                  </Link>
                </div>
                </form>
              </FormProvider>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
