"use client";

import { useCallback, useState } from "react";
import { UserManagementWorkspace } from "./UserManagementWorkspace";

/** Fluxo de contas fica isolado do CRUD genérico de domínios. */
export function UsersWorkspace({
  createHeading,
}: { createHeading?: string } = {}) {
  const [usersRefreshKey, setUsersRefreshKey] = useState(0);
  const [createHandler, setCreateHandler] = useState<(() => void) | null>(null);
  const registerCreateHandler = useCallback((handler: (() => void) | null) => {
    setCreateHandler(() => handler);
  }, []);

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
        onCreateHandlerReady={registerCreateHandler}
        onCreated={() => setUsersRefreshKey((current) => current + 1)}
      />
      <UserManagementWorkspace
        resource="users"
        hideCreateAction
        hideDomainHeading={Boolean(createHeading)}
        refreshKey={usersRefreshKey}
        mobilePrimaryAction={
          createHandler ? (
            <button
              type="button"
              className="btn-primary min-h-11 w-full"
              onClick={createHandler}
            >
              Novo integrante
            </button>
          ) : undefined
        }
      />
    </>
  );

  return createHeading ? (
    <div className="space-y-2">{workspace}</div>
  ) : (
    workspace
  );
}
