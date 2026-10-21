"use client";

import { UserManagementWorkspace } from "./UserManagementWorkspace";

/** Fluxo de contas fica isolado do CRUD genérico de domínios. */
export function UsersWorkspace() {
  return (
    <>
      <UserManagementWorkspace
        resource="people"
        createOnly
        createButtonFullWidth={false}
        createButtonLabel="Novo integrante"
        createDialogTitle="Novo integrante"
        combinedUser
      />
      <UserManagementWorkspace resource="users" hideCreateAction />
    </>
  );
}
