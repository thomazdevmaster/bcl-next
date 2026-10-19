"use client";

import { IconSelect, type IconSelectOption } from "@/components/shared/IconSelect";
import { AUTHENTICATED_ROLES, ROLE_LABEL, type AccessRoles, type Role } from "@/core/auth/roles";

const ROLE_ICON: Partial<Record<Role, string>> = {
  amigos: "groups",
  aluno: "school",
  musico: "music_note",
  maestro: "library_music",
  admin: "admin_panel_settings",
};

function sortAccountRoles(roles: AccessRoles): AccessRoles {
  const order = new Map<string, number>(AUTHENTICATED_ROLES.map((role, index) => [role, index]));
  return [...roles].sort((a, b) => (order.get(a) ?? 99) - (order.get(b) ?? 99));
}

export function ActiveRolesSelector({
  accountRoles,
  activeRoles,
  onChange,
  disabled = false,
}: {
  accountRoles: AccessRoles;
  activeRoles: AccessRoles;
  onChange: (roles: AccessRoles) => void;
  disabled?: boolean;
}) {
  const sorted = sortAccountRoles(accountRoles);
  if (sorted.length === 0) return null;

  const options: IconSelectOption<string>[] = sorted.map((role) => ({
    value: role,
    label: ROLE_LABEL[role as Role] ?? role,
    icon: ROLE_ICON[role as Role] ?? "badge",
  }));
  const activeSet = new Set(activeRoles.filter((role) => sorted.includes(role)));
  const selectedRoles = activeSet.size > 0 ? [...activeSet] : sorted;

  if (sorted.length === 1) {
    const onlyRole = sorted[0];
    return (
      <IconSelect
        label="Perfil de acesso"
        options={options}
        value={onlyRole}
        disabled={disabled}
        onChange={(role) => onChange([role])}
      />
    );
  }

  return (
    <fieldset className="flex flex-col gap-2 border-0 p-0">
      <legend className="text-sm font-medium text-[var(--foreground)]">Perfis de acesso</legend>
      <p className="text-xs text-[var(--muted)]">
        Escolha um ou mais perfis para usar o menu e as permissões do sistema. Pelo menos um deve ficar ativo.
      </p>
      <IconSelect
        label="Perfis de acesso"
        options={options}
        value={selectedRoles}
        multiple
        disabled={disabled}
        onChange={onChange}
      />
    </fieldset>
  );
}
