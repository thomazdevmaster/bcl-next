import { ACTION_LABEL, permissionKeysForRole, type Action, type Resource } from "@/core/auth/permissions";
import { DOMAINS } from "@/domains/catalog";

type CatalogAction = { action: string; label: string };
type CatalogResource = { resource: string; label: string; hint: string; actions: CatalogAction[] };
export type RolesCatalogGroup = { id: string; label: string; resources: CatalogResource[] };

const RESOURCE_ACTIONS: Partial<Record<Resource, Action[]>> = {
  portal: ["read"],
  study: ["read"],
  users: ["read", "create", "update", "delete", "approve"],
  people: ["read", "create", "update", "delete", "read_members", "view_sensitive"],
  songs: ["read", "read_private_student", "read_private_musician", "create", "update", "delete"],
  patrimony: ["read", "create", "update", "delete"],
  instruments: ["read", "create", "update", "delete"],
  presentations: ["read", "create", "update", "delete"],
  media: ["read", "create", "update", "delete"],
  notifications: ["create"],
  homepage: ["read", "update"],
  blogpage: ["read", "update"],
};

const PORTAL_RESOURCES: Resource[] = ["portal", "homepage", "blogpage"];
const MY_AREA_RESOURCES: Resource[] = ["study", "songs"];
const GESTAO_RESOURCES: Resource[] = [
  "users",
  "people",
  "songs",
  "patrimony",
  "instruments",
  "presentations",
  "media",
  "notifications",
];

function catalogResource(id: Resource): CatalogResource {
  const domain = DOMAINS.find((item) => item.id === id);
  const actions = RESOURCE_ACTIONS[id] ?? [];
  return {
    resource: id,
    label: domain?.label ?? id,
    hint: domain?.description ?? "",
    actions: actions.map((action) => ({ action, label: ACTION_LABEL[action] })),
  };
}

export function allPermissionKeys(): string[] {
  return Object.entries(RESOURCE_ACTIONS).flatMap(([resource, actions]) =>
    (actions ?? []).map((action) => `${resource}:${action}`),
  );
}

export function buildRolesCatalog(): RolesCatalogGroup[] {
  return [
    { id: "portal", label: "Portal público", resources: PORTAL_RESOURCES.map(catalogResource) },
    { id: "myarea", label: "Minha Área", resources: MY_AREA_RESOURCES.map(catalogResource) },
    { id: "gestao", label: "Gestão", resources: GESTAO_RESOURCES.map(catalogResource) },
  ];
}

export function defaultPermissionsForCode(code: string): string[] {
  if (code === "admin") return allPermissionKeys();
  const fromMatrix = permissionKeysForRole(code);
  if (fromMatrix.length > 0) return fromMatrix;
  return [];
}
