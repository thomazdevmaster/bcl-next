"use client";

import { useEffect, useState } from "react";
import { useController, useFormContext } from "react-hook-form";

import { FormFieldStatusMessage } from "@/components/forms/validations/FormFieldStatusMessage";
import { IconCheckbox } from "@/components/shared/IconCheckbox";
import { IconSelect } from "@/components/shared/IconSelect";
import type { Person } from "@/domains/people/types";
import { personFullName } from "@/domains/people/types";
import { apiFetch } from "@/lib/api";
import { userFacingError } from "@/lib/userMessages";

export const SONG_NOTIFY_ROLES = [
  { value: "amigos", label: "Amigos", icon: "groups" },
  { value: "aluno", label: "Alunos", icon: "school" },
  { value: "musico", label: "Músicos", icon: "music_note" },
  { value: "maestro", label: "Maestros", icon: "queue_music" },
  { value: "admin", label: "Administradores", icon: "admin_panel_settings" },
] as const;

type NotifyFormValues = {
  notifySong: boolean;
  notifyRoles: string[];
  notifyRecipientIds: string[];
};

type AccountOption = {
  value: string;
  label: string;
  icon: string;
};

export function SongNotifyFields({ readOnly = false }: { readOnly?: boolean }) {
  const { control, setValue } = useFormContext<NotifyFormValues>();
  const notify = useController({ name: "notifySong", control });
  const roles = useController({ name: "notifyRoles", control });
  const recipients = useController({ name: "notifyRecipientIds", control });
  const [accounts, setAccounts] = useState<AccountOption[]>([]);
  const [accountsError, setAccountsError] = useState<string | null>(null);
  const [loadingAccounts, setLoadingAccounts] = useState(false);
  const enabled = notify.field.value === true;
  const selectedRoles = Array.isArray(roles.field.value) ? roles.field.value : [];
  const selectedAccounts = Array.isArray(recipients.field.value)
    ? recipients.field.value.map(String)
    : [];
  const audienceError =
    typeof roles.fieldState.error?.message === "string"
      ? roles.fieldState.error.message
      : undefined;

  useEffect(() => {
    if (!enabled) return;
    let active = true;
    setLoadingAccounts(true);
    setAccountsError(null);
    apiFetch<
      Array<
        Pick<Person, "firstName" | "lastName" | "userId"> & {
          user?: { username?: string } | null;
        }
      >
    >("/people")
      .then((people) => {
        if (!active) return;
        const options = people.flatMap((person) => {
          if (person.userId == null || person.userId === "") return [];
          const name = personFullName(person);
          const username = person.user?.username?.trim();
          return [
            {
              value: String(person.userId),
              label: username ? `${name} (${username})` : name,
              icon: "person",
            },
          ];
        });
        options.sort((left, right) =>
          left.label.localeCompare(right.label, "pt-BR"),
        );
        setAccounts(options);
      })
      .catch((caught) => {
        if (!active) return;
        setAccounts([]);
        setAccountsError(
          userFacingError(
            caught,
            "Não foi possível carregar as pessoas com conta.",
          ),
        );
      })
      .finally(() => {
        if (active) setLoadingAccounts(false);
      });
    return () => {
      active = false;
    };
  }, [enabled]);

  return (
    <div className="flex min-w-0 flex-col gap-3 md:col-span-2">
      <IconCheckbox
        id="song-notify"
        checked={enabled}
        icon="notifications"
        label="Enviar notificação"
        disabled={readOnly}
        aria-describedby="song-notify-help"
        onBlur={notify.field.onBlur}
        onChange={(checked) => {
          notify.field.onChange(checked);
          if (!checked) {
            setValue("notifyRoles", [], { shouldValidate: true });
            setValue("notifyRecipientIds", [], { shouldValidate: true });
          }
        }}
      />
      <p id="song-notify-help" className="text-sm text-[var(--muted)]">
        {enabled
          ? "Escolha perfis, pessoas com conta ou os dois. Quem salva a música não recebe o aviso."
          : "A música é salva sem avisar ninguém."}
      </p>
      {enabled ? (
        <>
          <div
            role="group"
            aria-labelledby="song-notify-roles"
            className="grid gap-2 sm:grid-cols-2"
          >
            <p
              id="song-notify-roles"
              className="text-sm font-semibold text-[var(--foreground)] sm:col-span-2"
            >
              Perfis
            </p>
            {SONG_NOTIFY_ROLES.map((role) => (
              <IconCheckbox
                key={role.value}
                checked={selectedRoles.includes(role.value)}
                icon={role.icon}
                label={role.label}
                disabled={readOnly}
                onChange={(checked) => {
                  const next = checked
                    ? [...selectedRoles, role.value]
                    : selectedRoles.filter((item) => item !== role.value);
                  roles.field.onChange(next);
                }}
              />
            ))}
          </div>
          <FormFieldStatusMessage
            id="song-notify-roles-error"
            state={audienceError ? "invalid" : "info"}
            message={audienceError}
          />
          <IconSelect
            id="song-notify-people"
            label="Pessoas específicas"
            multiple
            allowEmptySelection
            options={accounts}
            value={selectedAccounts}
            disabled={readOnly || loadingAccounts || accountsError != null}
            describedBy="song-notify-people-help"
            selectedSummary={(selected) =>
              selected.length === 0
                ? "Selecione…"
                : selected.length === 1
                  ? "1 selecionado"
                  : `${selected.length} selecionados`
            }
            onBlur={recipients.field.onBlur}
            onChange={(value) => recipients.field.onChange(value)}
          />
          <p id="song-notify-people-help" className="text-sm text-[var(--muted)]">
            {loadingAccounts
              ? "Carregando pessoas com conta…"
              : "Só entram contas ativas. A lista mostra nome e usuário."}
          </p>
          {accountsError ? (
            <p className="text-sm text-[var(--destructive)]" role="alert">
              {accountsError}
            </p>
          ) : null}
        </>
      ) : null}
    </div>
  );
}
