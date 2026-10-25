"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Controller, FormProvider, useForm, useWatch } from "react-hook-form";

import { FormStageActions } from "@/components/forms/FormStageActions";
import { FormStageBlock } from "@/components/forms/FormStageBlock";
import { FormStageField } from "@/components/forms/FormStageField";
import { FormView } from "@/components/forms/core/FormView";
import { FormFieldValidationShell } from "@/components/forms/validations/FormFieldValidationShell";
import { useAuth } from "@/contexts/AuthContext";
import { can } from "@/core/auth/permissions";
import {
  findNotificationRecipients,
  getNotificationEmailFailures,
  retryNotificationEmail,
  sendNotification,
} from "@/domains/notifications/api";
import {
  type SendNotificationValues,
  sendNotificationSchema,
} from "@/domains/notifications/schemas/send-notification.schema";
import type {
  NotificationEmailFailure,
  NotificationRecipient,
} from "@/domains/notifications/types";
import { failureMessage } from "@/lib/userMessages";

const defaults: SendNotificationValues = {
  allApproved: false,
  recipientIds: [],
  title: "",
  body: "",
  targetUrl: "",
};

export default function NotificationManagementPage() {
  const auth = useAuth();
  const router = useRouter();
  const allowed = can(auth.roles, "notifications", "create", auth.permissions);

  useEffect(() => {
    if (auth.isHydrated && !allowed)
      router.replace(auth.isLoggedIn ? "/" : "/login");
  }, [allowed, auth.isHydrated, auth.isLoggedIn, router]);

  if (!auth.isHydrated || !allowed) return null;
  return <NotificationManagement />;
}

function NotificationManagement() {
  const form = useForm<SendNotificationValues>({
    defaultValues: defaults,
    resolver: zodResolver(sendNotificationSchema),
    mode: "onChange",
  });
  const allApproved = useWatch({ control: form.control, name: "allApproved" });
  const selectedIds = useWatch({ control: form.control, name: "recipientIds" });
  const [recipients, setRecipients] = useState<NotificationRecipient[]>([]);
  const [recipientSearch, setRecipientSearch] = useState("");
  const [recipientError, setRecipientError] = useState<string | null>(null);
  const [loadingRecipients, setLoadingRecipients] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [emailFailures, setEmailFailures] = useState<
    NotificationEmailFailure[]
  >([]);
  const [retryingId, setRetryingId] = useState<number | null>(null);
  const selectedSet = useMemo(() => new Set(selectedIds), [selectedIds]);

  const loadRecipients = useCallback(async (search: string) => {
    setLoadingRecipients(true);
    setRecipientError(null);
    try {
      setRecipients(await findNotificationRecipients(search));
    } catch (caught) {
      setRecipientError(
        failureMessage(caught, "Não foi possível carregar as contas."),
      );
    } finally {
      setLoadingRecipients(false);
    }
  }, []);

  useEffect(() => {
    if (allApproved) return;
    const timeout = window.setTimeout(
      () => {
        void loadRecipients(recipientSearch);
      },
      recipientSearch ? 250 : 0,
    );
    return () => window.clearTimeout(timeout);
  }, [allApproved, loadRecipients, recipientSearch]);

  useEffect(() => {
    void getNotificationEmailFailures()
      .then(setEmailFailures)
      .catch(() => setEmailFailures([]));
  }, []);

  const submit = async (values: SendNotificationValues) => {
    setSaving(true);
    setError(null);
    setSuccess(null);
    try {
      const response = await sendNotification({
        ...values,
        title: values.title.trim(),
        body: values.body.trim(),
        targetUrl: values.targetUrl.trim() || null,
      });
      setSuccess(
        `Alerta enviado para ${response.recipientCount} ${response.recipientCount === 1 ? "conta" : "contas"}.`,
      );
      form.reset(defaults);
    } catch (caught) {
      setError(failureMessage(caught, "Não foi possível enviar o alerta."));
    } finally {
      setSaving(false);
    }
  };

  const retryEmail = async (failure: NotificationEmailFailure) => {
    setRetryingId(failure.outboxId);
    setError(null);
    try {
      await retryNotificationEmail(failure.outboxId);
      setEmailFailures((current) =>
        current.filter((item) => item.outboxId !== failure.outboxId),
      );
      setSuccess(
        `Novo envio de e-mail solicitado para ${failure.recipientName}.`,
      );
    } catch (caught) {
      setError(failureMessage(caught, "Não foi possível solicitar o reenvio."));
    } finally {
      setRetryingId(null);
    }
  };

  return (
    <div className="mx-auto w-full max-w-3xl">
      <FormProvider {...form}>
        <FormView
          eyebrow="Gestão"
          title="Enviar notificação"
          description="Envie um alerta pelo portal para uma ou mais contas ativas e aprovadas. O e-mail segue as preferências de cada destinatário."
          onSubmit={form.handleSubmit(submit)}
          noValidate
          formClassName="space-y-5"
        >
          {error ? (
            <p
              className="rounded-lg bg-[var(--destructive)]/10 p-3 text-sm text-[var(--destructive)]"
              role="alert"
            >
              {error}
            </p>
          ) : null}
          {success ? (
            <p
              className="rounded-lg bg-[var(--accent)] p-3 text-sm"
              role="status"
            >
              {success}
            </p>
          ) : null}

          <FormStageBlock
            title="Destinatários"
            description="O remetente consegue consultar o alerta enviado; não recebe um e-mail para si mesmo."
            surface="plain"
          >
            <Controller
              control={form.control}
              name="recipientIds"
              render={({ field, fieldState }) => (
                <FormFieldValidationShell
                  label="Contas que receberão o alerta"
                  name={field.name}
                  description="Somente contas ativas e aprovadas aparecem nesta seleção."
                  state={fieldState.invalid ? "invalid" : "info"}
                  message={fieldState.error?.message}
                  labelForControl={false}
                  renderControl={({ id, labelId, describedBy }) => (
                    <div
                      id={id}
                      role="group"
                      aria-labelledby={labelId}
                      aria-describedby={describedBy}
                      className="min-h-14 rounded-xl border border-[var(--border)] bg-[var(--input)] p-3"
                    >
                      <Controller
                        control={form.control}
                        name="allApproved"
                        render={({ field: allField }) => (
                          <label className="flex min-h-11 cursor-pointer items-center gap-3 rounded-lg px-2 text-sm font-medium">
                            <input
                              type="checkbox"
                              checked={allField.value}
                              className="h-5 w-5 accent-[var(--primary)]"
                              onChange={(event) => {
                                allField.onChange(event.target.checked);
                                field.onChange([]);
                              }}
                            />
                            Enviar para todos os ativos e aprovados
                          </label>
                        )}
                      />
                      {!allApproved ? (
                        <div className="mt-3 space-y-2">
                          <label
                            htmlFor="notification-recipient-search"
                            className="text-sm font-medium"
                          >
                            Buscar contas
                          </label>
                          <input
                            id="notification-recipient-search"
                            type="search"
                            value={recipientSearch}
                            onChange={(event) =>
                              setRecipientSearch(event.target.value)
                            }
                            placeholder="Nome ou usuário"
                            className="min-h-11 w-full rounded-lg border border-[var(--border)] bg-[var(--card)] px-3 text-sm"
                          />
                          {recipientError ? (
                            <p
                              className="text-sm text-[var(--destructive)]"
                              role="alert"
                            >
                              {recipientError}
                            </p>
                          ) : null}
                          <div
                            className="max-h-56 overflow-y-auto rounded-lg border border-[var(--border)]"
                            aria-busy={loadingRecipients}
                          >
                            {loadingRecipients ? (
                              <p
                                className="p-3 text-sm text-[var(--muted)]"
                                role="status"
                              >
                                Buscando contas…
                              </p>
                            ) : null}
                            {!loadingRecipients && recipients.length === 0 ? (
                              <p className="p-3 text-sm text-[var(--muted)]">
                                Nenhuma conta encontrada.
                              </p>
                            ) : null}
                            {recipients.map((recipient) => (
                              <label
                                key={recipient.id}
                                className="flex min-h-11 cursor-pointer items-center gap-3 border-b border-[var(--border)] px-3 last:border-b-0 hover:bg-[var(--accent)]"
                              >
                                <input
                                  type="checkbox"
                                  checked={selectedSet.has(recipient.id)}
                                  className="h-5 w-5 accent-[var(--primary)]"
                                  onChange={(event) => {
                                    const next = event.target.checked
                                      ? [...field.value, recipient.id]
                                      : field.value.filter(
                                          (id) => id !== recipient.id,
                                        );
                                    field.onChange(next);
                                  }}
                                />
                                <span className="min-w-0 truncate text-sm">
                                  {recipient.name}{" "}
                                  <span className="text-[var(--muted)]">
                                    @{recipient.username}
                                  </span>
                                </span>
                              </label>
                            ))}
                          </div>
                          <p
                            className="text-sm text-[var(--muted)]"
                            aria-live="polite"
                          >
                            {selectedIds.length} selecionadas
                          </p>
                        </div>
                      ) : null}
                    </div>
                  )}
                />
              )}
            />
          </FormStageBlock>

          <FormStageBlock
            title="Mensagem"
            description="O alerta é enviado imediatamente como texto simples. Anexos e agendamento não estão disponíveis."
            surface="plain"
          >
            <div className="space-y-5">
              <FormStageField<SendNotificationValues>
                name="title"
                label="Título"
                maxLength={120}
              />
              <Controller
                control={form.control}
                name="body"
                render={({ field, fieldState }) => (
                  <FormFieldValidationShell
                    label="Mensagem"
                    name={field.name}
                    description="Até 5.000 caracteres."
                    value={field.value}
                    onValueChange={field.onChange}
                    onBlur={field.onBlur}
                    state={fieldState.invalid ? "invalid" : "info"}
                    message={fieldState.error?.message}
                    renderControl={({
                      id,
                      name,
                      describedBy,
                      invalid,
                      className,
                    }) => (
                      <textarea
                        id={id}
                        name={name}
                        value={field.value}
                        onChange={field.onChange}
                        onBlur={field.onBlur}
                        maxLength={5000}
                        aria-describedby={describedBy}
                        aria-invalid={invalid || undefined}
                        className={`${className} min-h-36 resize-y py-3`}
                      />
                    )}
                  />
                )}
              />
              <FormStageField<SendNotificationValues>
                name="targetUrl"
                label="Link interno (opcional)"
                required={false}
                optionalMessage="O link precisa começar com / e apontar para o portal."
                maxLength={2048}
              />
            </div>
          </FormStageBlock>

          <FormStageActions
            active={0}
            total={1}
            busy={saving}
            onBack={() => undefined}
            onNext={() => undefined}
            submitLabel="Enviar alerta"
            pendingLabel="Enviando…"
            submitDisabled={!form.formState.isValid}
            desktop
          />
        </FormView>
      </FormProvider>

      {emailFailures.length > 0 ? (
        <section
          className="mt-6 rounded-2xl border border-[var(--border)] bg-[var(--card)] p-4 shadow-[var(--shadow-soft)] sm:p-6"
          aria-labelledby="failed-email-title"
        >
          <h2 id="failed-email-title" className="text-lg font-semibold">
            E-mails que falharam
          </h2>
          <p className="mt-1 text-sm text-[var(--muted)]">
            O alerta continua disponível no portal. Você pode solicitar uma nova
            tentativa de e-mail.
          </p>
          <ul className="mt-4 divide-y divide-[var(--border)]">
            {emailFailures.map((failure) => (
              <li
                key={failure.outboxId}
                className="flex flex-col gap-3 py-3 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="min-w-0">
                  <p className="font-medium">{failure.recipientName}</p>
                  <p className="break-all text-sm text-[var(--muted)]">
                    {failure.recipientEmail ?? "Sem e-mail cadastrado"} ·{" "}
                    {failure.lastError}
                  </p>
                </div>
                <button
                  type="button"
                  className="min-h-11 shrink-0 rounded-lg border border-[var(--border)] px-4 text-sm font-medium hover:bg-[var(--accent)] disabled:opacity-60"
                  disabled={retryingId === failure.outboxId}
                  onClick={() => {
                    void retryEmail(failure);
                  }}
                >
                  {retryingId === failure.outboxId
                    ? "Solicitando…"
                    : "Tentar novamente"}
                </button>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}
