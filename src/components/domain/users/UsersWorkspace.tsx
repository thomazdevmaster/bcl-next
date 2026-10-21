"use client";

import { useState } from "react";
import { UserManagementWorkspace } from "./UserManagementWorkspace";

/** Fluxo de contas fica isolado do CRUD genérico de domínios. */
export function UsersWorkspace({ createHeading }: { createHeading?: string } = {}) {
  const [usersRefreshKey, setUsersRefreshKey] = useState(0);

  const workspace = (
    <>
      <UserManagementWorkspace
        resource="people"
        createOnly
        createButtonFullWidth={false}
        createOnlyHeading={createHeading}
        createButtonLabel="Novo integrante"
        createDialogTitle="Novo integrante"
        combinedUser
        onCreated={() => setUsersRefreshKey((current) => current + 1)}
      />
      <UserManagementWorkspace
        resource="users"
        hideCreateAction
        hideDomainHeading={Boolean(createHeading)}
        refreshKey={usersRefreshKey}
      />
    </>
  );

  return createHeading ? <div className="space-y-2">{workspace}</div> : workspace;
}
