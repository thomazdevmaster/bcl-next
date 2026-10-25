"use client";

import { useCallback, useEffect, useState } from "react";
import { getNotificationPreferences, saveNotificationPreferences } from "@/domains/notifications/api";
import { notificationPreferencesSchema } from "@/domains/notifications/schemas/preferences.schema";
import {
  NOTIFICATION_TYPES,
  NOTIFICATION_TYPE_LABELS,
  type NotificationPreferences,
  type NotificationType,
} from "@/domains/notifications/types";

type Values = Record<NotificationType, { portalEnabled: boolean; emailEnabled: boolean }>;

function defaults(): Values {
  return Object.fromEntries(
    NOTIFICATION_TYPES.map((type) => [type, { portalEnabled: true, emailEnabled: true }]),
  ) as Values;
}

function fromResponse(items: NotificationPreferences[]): Values {
  const next = defaults();
  items.forEach((item) => {
    next[item.type] = {
      portalEnabled: item.type === "admin_message" || item.portalEnabled,
      emailEnabled: item.emailEnabled,
    };
  });
  return next;
}

export function NotificationPreferencesSection() {
  const [values, setValues] = useState<Values | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setValues(fromResponse(await getNotificationPreferences()));
    } catch {
      setError("Não foi possível carregar suas preferências de notificação.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const toggle = async (type: NotificationType, channel: "portalEnabled" | "emailEnabled") => {
    if (!values || saving || (type === "admin_message" && channel === "portalEnabled")) return;
    const previous = values;
    const next = {
      ...values,
      [type]: { ...values[type], [channel]: !values[type][channel] },
    };
    const parsed = notificationPreferencesSchema.safeParse(next);
    if (!parsed.success) {
      setError("Confira as preferências selecionadas.");
      return;
    }

    setValues(next);
    setSaving(true);
    setError(null);
    setStatus(null);
    try {
      const payload = NOTIFICATION_TYPES.map((preferenceType) => ({
        type: preferenceType,
        ...next[preferenceType],
      }));
      setValues(fromResponse(await saveNotificationPreferences(payload)));
      setStatus("Preferências salvas.");
    } catch {
      setValues(previous);
      setError("Não foi possível salvar. Suas preferências anteriores foram mantidas.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <section
      className="mt-8 rounded-2xl border border-[var(--border)] bg-[var(--card)] p-4 shadow-[var(--shadow-soft)] sm:p-6"
      aria-labelledby="notification-preferences-title"
    >
      <div>
        <h2 id="notification-preferences-title" className="text-xl font-semibold">
          Notificações
        </h2>
        <p className="mt-1 text-sm leading-6 text-[var(--muted)]">
          Escolha os tipos e canais dos avisos automáticos. Alertas enviados pela gestão sempre aparecem no portal.
        </p>
      </div>

      {error ? (
        <p className="mt-4 rounded-lg bg-[var(--destructive)]/10 p-3 text-sm text-[var(--destructive)]" role="alert">
          {error}
        </p>
      ) : null}
      <p className="sr-only" role="status" aria-live="polite">
        {status ?? (saving ? "Salvando preferências…" : "")}
      </p>

      {loading ? (
        <p className="mt-5 text-sm text-[var(--muted)]" role="status">
          Carregando preferências…
        </p>
      ) : null}
      {!loading && !values && !error ? (
        <button
          type="button"
          className="mt-4 min-h-11 rounded-lg border border-[var(--border)] px-4"
          onClick={() => {
            void load();
          }}
        >
          Tentar novamente
        </button>
      ) : null}

      {values ? (
        <div className="mt-5 divide-y divide-[var(--border)]" aria-busy={saving}>
          {NOTIFICATION_TYPES.map((type) => (
            <fieldset
              key={type}
              className="grid gap-3 py-4 first:pt-0 sm:grid-cols-[minmax(0,1fr)_auto_auto] sm:items-center"
            >
              <legend className="sr-only">{NOTIFICATION_TYPE_LABELS[type]}</legend>
              <p className="font-medium">{NOTIFICATION_TYPE_LABELS[type]}</p>
              <label className="flex min-h-11 items-center gap-3 rounded-lg px-2 text-sm">
                <input
                  type="checkbox"
                  className="h-5 w-5 accent-[var(--primary)]"
                  checked={values[type].portalEnabled}
                  disabled={saving || type === "admin_message"}
                  onChange={() => {
                    void toggle(type, "portalEnabled");
                  }}
                />
                <span>Portal{type === "admin_message" ? " (obrigatório)" : ""}</span>
              </label>
              <label className="flex min-h-11 items-center gap-3 rounded-lg px-2 text-sm">
                <input
                  type="checkbox"
                  className="h-5 w-5 accent-[var(--primary)]"
                  checked={values[type].emailEnabled}
                  disabled={saving}
                  onChange={() => {
                    void toggle(type, "emailEnabled");
                  }}
                />
                <span>E-mail</span>
              </label>
            </fieldset>
          ))}
        </div>
      ) : null}
    </section>
  );
}
