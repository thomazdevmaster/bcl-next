"use client";

import { useCallback, useEffect, useState } from "react";

import {
  IconSelect,
  type IconSelectOption,
} from "@/components/shared/IconSelect";
import { useAuth } from "@/contexts/AuthContext";
import { can } from "@/core/auth/permissions";
import {
  getNotificationPreferences,
  saveNotificationPreferences,
} from "@/domains/notifications/api";
import { notificationPreferencesSchema } from "@/domains/notifications/schemas/preferences.schema";
import {
  NOTIFICATION_TYPES,
  NOTIFICATION_TYPE_LABELS,
  type NotificationPreferences,
  type NotificationType,
} from "@/domains/notifications/types";

type Values = Record<
  NotificationType,
  { portalEnabled: boolean; emailEnabled: boolean }
>;

const NOTIFICATION_MODULES: Record<NotificationType, string> = {
  signup_approval_pending: "Usuários",
  signup_completed: "Usuários",
  password_changed: "Conta",
  admin_message: "Gestão",
  blog_post_published: "Blog",
  agenda_event_published: "Agenda",
  repertoire_song_created: "Repertório",
  board_message: "Diretoria",
  rehearsal_reminder: "Ensaios",
};

type PreferenceVisibility = "account" | "users:approve" | "admin" | "required";

const NOTIFICATION_PREFERENCE_VISIBILITY: Record<
  NotificationType,
  PreferenceVisibility
> = {
  signup_approval_pending: "users:approve",
  signup_completed: "users:approve",
  password_changed: "account",
  admin_message: "required",
  blog_post_published: "account",
  agenda_event_published: "account",
  repertoire_song_created: "admin",
  board_message: "admin",
  rehearsal_reminder: "admin",
};

function defaults(): Values {
  return Object.fromEntries(
    NOTIFICATION_TYPES.map((type) => [
      type,
      { portalEnabled: true, emailEnabled: true },
    ]),
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
  const auth = useAuth();
  const isAdmin = auth.roles.includes("admin");
  const canApproveUsers = can(auth.roles, "users", "approve", auth.permissions);
  const visibleTypes = NOTIFICATION_TYPES.filter((type) => {
    const visibility = NOTIFICATION_PREFERENCE_VISIBILITY[type];
    if (visibility === "required") return false;
    if (isAdmin) return true;
    if (visibility === "users:approve") return canApproveUsers;
    return visibility === "account";
  });
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
    const frame = window.requestAnimationFrame(() => {
      void load();
    });
    return () => window.cancelAnimationFrame(frame);
  }, [load]);

  const saveSelection = async (selectedTypes: NotificationType[]) => {
    if (!values || saving) return;
    const previous = values;
    const selectedSet = new Set(selectedTypes);
    const next = { ...values };
    visibleTypes.forEach((type) => {
      next[type] = {
        ...next[type],
        portalEnabled: selectedSet.has(type),
      };
    });
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
      setError(
        "Não foi possível salvar. Suas preferências anteriores foram mantidas.",
      );
    } finally {
      setSaving(false);
    }
  };

  const options: IconSelectOption<NotificationType>[] = visibleTypes.map(
    (type) => ({
      value: type,
      label: `${NOTIFICATION_MODULES[type]} · ${NOTIFICATION_TYPE_LABELS[type]}`,
    }),
  );

  return (
    <section
      className="mt-8 rounded-2xl border border-[var(--border)] bg-[var(--card)] p-4 shadow-[var(--shadow-soft)] sm:p-6"
      aria-labelledby="notification-preferences-title"
    >
      <div>
        <h2
          id="notification-preferences-title"
          className="text-xl font-semibold"
        >
          Notificações
        </h2>
        <p className="mt-1 text-sm leading-6 text-[var(--muted)]">
          Escolha quais avisos quer receber no portal. As opções disponíveis
          dependem das permissões da sua conta.
        </p>
      </div>

      {error ? (
        <p
          className="mt-4 rounded-lg bg-[var(--destructive)]/10 p-3 text-sm text-[var(--destructive)]"
          role="alert"
        >
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
        <div className="mt-5" aria-busy={saving}>
          <IconSelect
            label="Avisos que quero receber"
            options={options}
            value={visibleTypes.filter((type) => values[type].portalEnabled)}
            multiple
            allowEmptySelection
            selectedSummary={(selected) =>
              selected.length === 0
                ? "Nenhum aviso selecionado"
                : `${selected.length} ${selected.length === 1 ? "aviso selecionado" : "avisos selecionados"}`
            }
            disabled={saving}
            onChange={(selectedTypes) => {
              void saveSelection(selectedTypes);
            }}
          />
          <p className="mt-2 text-xs leading-5 text-[var(--muted)]">
            Os avisos marcados na lista serão recebidos no portal.
          </p>
        </div>
      ) : null}
    </section>
  );
}
